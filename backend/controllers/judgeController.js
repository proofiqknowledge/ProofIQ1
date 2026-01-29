// backend/controllers/judgeController.js
const axios = require("axios");
const Submission = require("../models/Submission");
const ExamSubmission = require("../models/ExamSubmission");
const TestCase = require("../models/TestCase");
const ExamQuestion = require("../models/ExamQuestion");

// Use public Judge0 API (no authentication required)
const JUDGE0_BASE = process.env.JUDGE0_PUBLIC_URL || "https://ce.judge0.com";

const TIMEOUT_MS = parseInt(process.env.JUDGE0_TIMEOUT_MS || "12000", 10);
const POLL_MS = parseInt(process.env.JUDGE0_WAIT_MS || "1000", 10);

// Language mapping
const languageToJudge0Id = (lang) => {
    const map = {
        python: 71,
        python3: 71,
        javascript: 63,
        node: 63,
        c: 50,
        cpp: 54,
        "c++": 54,
        java: 62,
    };
    return map[String(lang).toLowerCase()] || 71;
};

// Normalize output for safe comparison
const normalize = (s) => (s || "").replace(/\r\n/g, "\n").trim();

// Poll Judge0 result
async function pollJudge0(token) {
    const start = Date.now();

    while (Date.now() - start < TIMEOUT_MS) {
        await new Promise((r) => setTimeout(r, POLL_MS));

        const res = await axios.get(`${JUDGE0_BASE}/submissions/${token}`, {
            params: { base64_encoded: true, fields: "*" }
        });

        const data = res.data;
        if (data.status && data.status.id > 2) {
            return data;
        }
    }

    return { status: { description: "Time Limit" } };
}

//
// MAIN CONTROLLER
//
exports.runCode = async (req, res) => {
    try {
        const { questionId, source, runType, language, testCases: providedTestCases, mainBlock } = req.body;
        const userId = req.user?.id;

        if (!source) {
            return res.status(400).json({ message: "Missing source code" });
        }

        // ✅ AUTO-SAVE: Update ExamSubmission with latest code state
        // This ensures final submission sees this code even if "Run" was used (which doesn't save to Submission log)
        if (req.body.examId && userId) {
            try {
                const activeSubmission = await ExamSubmission.findOne({
                    exam: req.body.examId,
                    student: userId,
                    status: { $in: ['in_progress', 'pending'] }
                });

                if (activeSubmission) {
                    // Normalize questionId
                    const qId = String(questionId);
                    const answerData = {
                        questionId: qId,
                        questionType: 'coding', // Assume coding since this is judge controller
                        code: source,
                        language: language,
                        answered: true // Mark as answered since they wrote code
                    };

                    const existingIndex = activeSubmission.answers.findIndex(a => String(a.questionId) === qId);
                    if (existingIndex >= 0) {
                        // Merge fields to preserved other props like marks
                        activeSubmission.answers[existingIndex].code = source;
                        activeSubmission.answers[existingIndex].language = language;
                        activeSubmission.answers[existingIndex].answered = true;
                    } else {
                        activeSubmission.answers.push(answerData);
                    }
                    await activeSubmission.save();
                    console.log(`[Judge0] Auto-saved code for student ${userId} exam ${req.body.examId} question ${qId}`);
                }
            } catch (saveErr) {
                console.warn("[Judge0] Failed to auto-save to ExamSubmission:", saveErr.message);
                // Non-blocking error
            }
        }

        // If testCases are provided directly (for embedded exam questions), use them
        // Otherwise, try to fetch from ExamQuestion model
        let testCases = [];
        let questionLanguage = language;
        let questionMarks = 10; // default
        let questionMainBlock = mainBlock || ""; // Hidden code block

        if (providedTestCases && Array.isArray(providedTestCases)) {
            // Test cases provided directly (embedded exam questions)
            testCases = providedTestCases;
        } else if (questionId) {
            // Try to fetch from ExamQuestion model
            try {
                const question = await ExamQuestion.findById(questionId).populate("testCases");
                if (question) {
                    testCases = question.testCases || [];
                    questionLanguage = questionLanguage || question.language;
                    questionMarks = question.marks || 10;
                    questionMainBlock = questionMainBlock || question.mainBlock || "";
                }
            } catch (err) {
                // If questionId is not a valid ObjectId, just continue with empty testCases
                console.log("Could not fetch question by ID, using provided data");
            }

        }

        // Combine student code with main block (if provided)
        // This allows admin to        // HTML decode function to fix &lt; &gt; etc.
        const decodeHTMLEntities = (str) => {
            if (!str) return str;
            return str
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
        };

        // Decode HTML entities in code before combining
        const decodedStudentCode = decodeHTMLEntities(source);
        const decodedMainBlock = decodeHTMLEntities(questionMainBlock);

        // Debug: Log if HTML entities were found and decoded
        if (source !== decodedStudentCode) {
            console.log('🔍 HTML entities decoded in student code');
            console.log('Before:', source.substring(0, 200));
            console.log('After:', decodedStudentCode.substring(0, 200));
        }

        // Combine student code + main block
        // IMPORTANT: For C/C++, struct definitions must come BEFORE student function
        let fullCode;
        if (questionMainBlock && questionMainBlock.trim()) {
            // For C language, reorder to ensure struct definitions come before student code
            if (questionLanguage === 'c' || questionLanguage === 'cpp') {
                // Extract struct definitions from main block (they're at the top after includes)
                const mainBlockLines = decodedMainBlock.split('\n');
                let includes = '';
                let structDefs = '';
                let restOfMain = '';
                let inStructDef = false;
                let structBraceCount = 0;
                let afterStructs = false;

                for (let i = 0; i < mainBlockLines.length; i++) {
                    const line = mainBlockLines[i];

                    // Collect includes
                    if (line.trim().startsWith('#include')) {
                        includes += line + '\n';
                        continue;
                    }

                    // Detect start of struct definition
                    if (line.includes('struct ') && line.includes('{')) {
                        inStructDef = true;
                        structDefs += line + '\n';
                        structBraceCount = 1;
                        continue;
                    }

                    // Inside struct definition
                    if (inStructDef) {
                        structDefs += line + '\n';
                        structBraceCount += (line.match(/{/g) || []).length;
                        structBraceCount -= (line.match(/}/g) || []).length;

                        if (structBraceCount === 0) {
                            inStructDef = false;
                            afterStructs = true;
                        }
                        continue;
                    }

                    // Everything after structs (helper functions, main, etc.)
                    if (afterStructs || line.trim().startsWith('int main') || line.includes('Node*') || line.includes('void print')) {
                        afterStructs = true;
                        restOfMain += line + '\n';
                    } else if (!line.trim().startsWith('#include') && line.trim()) {
                        // Non-include, non-struct lines before main (helper functions)
                        structDefs += line + '\n';
                    } else {
                        restOfMain += line + '\n';
                    }
                }

                // Proper order: includes → struct definitions → student code → rest of main
                fullCode = includes + '\n' + structDefs + '\n' + decodedStudentCode + '\n\n' + restOfMain;
                console.log("Combined C/C++ code: includes + structs + student code + main");
            } else {
                // For other languages, main block first
                fullCode = decodedMainBlock + "\n\n" + decodedStudentCode;
                console.log("Combined code: main block + student code");
            }
        } else {
            fullCode = decodedStudentCode;
            console.log("Using student code only (no main block)");
        }

        // Also decode the full code to ensure no nested encoding
        fullCode = decodeHTMLEntities(fullCode);
        // SELECT TEST CASES
        let selectedTestCases = [];
        if (runType === "sample") {
            selectedTestCases = testCases.filter((t) => !t.isHidden);
        } else if (runType === "all" || runType === "test_all") {
            selectedTestCases = testCases;
        }

        // For simple run (no testcases)
        const lang = questionLanguage || "python";
        const langId = languageToJudge0Id(lang);

        let results = [];
        let passed = 0;

        //
        // CASE 1 — JUST RUN CODE without testcases
        //
        if (runType === "run") {
            const payload = {
                source_code: Buffer.from(fullCode).toString('base64'),
                language_id: langId,
                stdin: "",
            };

            const createResp = await axios.post(
                `${JUDGE0_BASE}/submissions?wait=false&base64_encoded=true`,
                payload,
                {
                    headers: { "Content-Type": "application/json" }
                }
            );

            const token = createResp.data.token;
            const judgeRes = await pollJudge0(token);

            const result = {
                testCaseId: null,
                stdout: judgeRes.stdout ? Buffer.from(judgeRes.stdout, 'base64').toString('utf-8') : "",
                stderr: judgeRes.stderr ? Buffer.from(judgeRes.stderr, 'base64').toString('utf-8') : "",
                compile_output: judgeRes.compile_output ? Buffer.from(judgeRes.compile_output, 'base64').toString('utf-8') : "",
                status: judgeRes.status?.description || "Unknown",
                time: judgeRes.time || 0,
            };

            return res.json({
                submission: {
                    results: [result],
                    passed: 0,
                    total: 0,
                    status: result.status,
                },
            });
        }

        //
        // CASE 2 & 3 — SAMPLE or ALL testcases
        //
        for (const tc of selectedTestCases) {
            const payload = {
                source_code: Buffer.from(fullCode).toString('base64'),
                language_id: langId,
                stdin: Buffer.from(tc.input || "").toString('base64'),
                expected_output: Buffer.from(tc.expectedOutput || "").toString('base64'),
            };

            const createResp = await axios.post(
                `${JUDGE0_BASE}/submissions?wait=false&base64_encoded=true`,
                payload,
                {
                    headers: { "Content-Type": "application/json" }
                }
            );

            const token = createResp.data.token;
            const judgeRes = await pollJudge0(token);

            const stdout = normalize(judgeRes.stdout ? Buffer.from(judgeRes.stdout, 'base64').toString('utf-8') : "");
            const expected = normalize(tc.expectedOutput);

            const isAccepted =
                stdout === expected && judgeRes.status?.description === "Accepted";

            if (isAccepted) passed++;

            const resultItem = {
                testCaseId: tc._id,
                isHidden: tc.isHidden || false,
                passed: isAccepted,  // ✅ Add passed boolean for UI display
                input: tc.input || "",  // Add input for results page
                expectedOutput: tc.expectedOutput || "",  // Add expected output for results page
                // CRITICAL: Only hide output for "test_all" (Run Tests button)
                // For "all" (Submit Code button), show actual output so submission is scored correctly
                stdout: (tc.isHidden && runType === "test_all")
                    ? "🔒 Hidden test case - Submit the exam to see the output"
                    : stdout,
                stderr: (tc.isHidden && runType === "test_all") ? "" : (judgeRes.stderr ? Buffer.from(judgeRes.stderr, 'base64').toString('utf-8') : ""),
                compile_output: (tc.isHidden && runType === "test_all") ? "" : (judgeRes.compile_output ? Buffer.from(judgeRes.compile_output, 'base64').toString('utf-8') : ""),
                status: isAccepted ? "accepted" : (judgeRes.status?.description || "").toLowerCase(),
                time: judgeRes.time || 0,
            };

            results.push(resultItem);
        }

        //
        // SAVE SUBMISSION IF FINAL OR TEST_ALL
        // ✅ FIX: Also save for test_all so exam submissions can find results
        //
        let submissionDoc = null;

        if ((runType === "all" || runType === "test_all") && userId) {
            submissionDoc = new Submission({
                examId: req.body.examId || null,  // ✅ Save examId for session tracking
                questionId: questionId,
                userId,
                language: lang,
                source,
                results,
                passed,
                total: results.length,
                score: (passed / (results.length || 1)) * questionMarks,
                runType: runType || 'final'  // ✅ Save runType for filtering
            });

            await submissionDoc.save();
        }

        res.json({
            submission:
                submissionDoc ||
                {
                    results,
                    passed,
                    total: results.length,
                    status: passed === results.length ? "accepted" : "failed",
                },
        });
    } catch (err) {
        console.error("Judge runCode error:", err);
        console.error("Error details:", {
            message: err.message,
            response: err.response?.data,
            status: err.response?.status,
            config: {
                url: err.config?.url,
                method: err.config?.method,
                data: err.config?.data ? JSON.parse(err.config.data) : null
            }
        });
        res.status(500).json({
            message: "Server error",
            error: err.message,
            details: err.response?.data || "No additional details"
        });
    }
};
