import api from "./api";   // your axios instance

export const runCode = async ({ examId, questionId, source, runType, language, testCases, mainBlock }) => {
    const res = await api.post("/judge/run", {
        examId,  // ✅ Send examId for session tracking
        questionId,
        source,
        runType,
        language,
        testCases,
        mainBlock,
    });
    return res.data;
};

export const submitCode = async ({ examId, questionId, source, language, testCases }) => {
    const res = await api.post("/judge/submit", {
        examId,  // ✅ Send examId for session tracking
        questionId,
        source,
        language,
        testCases,
    });
    return res.data;
};

export const runSampleTests = async ({ examId, questionId, source, language, testCases, mainBlock }) => {
    const res = await api.post("/judge/run", {
        examId,  // ✅ Send examId for session tracking
        questionId,
        source,
        runType: "test_all", // Run all test cases (including hidden) without saving
        language,
        testCases,
        mainBlock,
    });
    return res.data;
};

export const submitFinalCode = async ({ examId, questionId, source, language, testCases, mainBlock }) => {
    const res = await api.post("/judge/run", {
        examId,  // ✅ Send examId for session tracking
        questionId,
        source,
        runType: "all",
        language,
        testCases,
        mainBlock,
    });
    return res.data;
};
