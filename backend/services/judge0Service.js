// backend/services/judge0Service.js

const axios = require("axios");

// -----------------------------------------------------------------------------
// Pick the correct Judge0 Base URL depending on mode
// -----------------------------------------------------------------------------
function getJudge0BaseURL() {
  const mode = process.env.JUDGE0_MODE || "public";

  if (mode === "self") {
    // Self-hosted Judge0 on Azure (production)
    return process.env.JUDGE0_SELF_HOSTED_URL;
  }

  if (mode === "rapidapi") {
    // RapidAPI Judge0 (optional development mode)
    return process.env.JUDGE0_PUBLIC_URL;
  }

  // Default: FREE Public Judge0 for development
  return process.env.JUDGE0_PUBLIC_URL;
}

// -----------------------------------------------------------------------------
// Language mapping (Judge0 needs numeric language IDs)
// -----------------------------------------------------------------------------
const languageMap = {
  python: 71,
  python3: 71,
  cpp: 54,
  'c++': 54, // Added for compatibility
  c: 50,
  java: 62,
  javascript: 63,
  node: 63,
  js: 63 // Added for compatibility
};

// -----------------------------------------------------------------------------
// Main function to execute code in Judge0
// -----------------------------------------------------------------------------
async function runJudge0({ source_code, language, stdin }) {
  const baseURL = getJudge0BaseURL();
  const langId = languageMap[language.toLowerCase()] || 71;

  const timeoutMs = parseInt(process.env.JUDGE0_TIMEOUT_MS || "10000");
  const pollMs = parseInt(process.env.JUDGE0_WAIT_MS || "1000");

  // ---------------------------------------
  // Build headers based on mode
  // ---------------------------------------
  const headers = { "Content-Type": "application/json" };

  // RapidAPI mode (if key exists)
  if (process.env.JUDGE0_RAPIDAPI_KEY) {
    headers["X-RapidAPI-Key"] = process.env.JUDGE0_RAPIDAPI_KEY;
    headers["X-RapidAPI-Host"] = process.env.JUDGE0_RAPIDAPI_HOST;
  }

  try {
    // ---------------------------------------
    // 1. Create submission (async execution)
    // ---------------------------------------
    const createResp = await axios.post(
      `${baseURL}/submissions?wait=false`,
      {
        source_code,
        language_id: langId,
        stdin,
      },
      { headers }
    );

    const token = createResp.data.token;

    // ---------------------------------------
    // 2. Poll submission results
    // ---------------------------------------
    let result = null;
    const start = Date.now();

    while (!result && Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, pollMs));

      const pollResp = await axios.get(`${baseURL}/submissions/${token}`, {
        headers,
      });

      const statusId = pollResp.data?.status?.id;

      // 1 = In Queue, 2 = Processing
      if (statusId !== 1 && statusId !== 2) {
        result = pollResp.data;
      }
    }

    if (!result) {
      return {
        stdout: "",
        stderr: "Execution timed out",
        status: "timeout",
        time: 0,
        statusId: 0
      };
    }

    return {
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      compile_output: result.compile_output || "",  // ← Compilation errors
      status: result.status?.description || "Unknown",
      statusId: result.status?.id,
      time: result.time || 0,
      memory: result.memory || 0
    };
  } catch (err) {
    console.error("Judge0 error:", err.message);
    return {
      stdout: "",
      stderr: err.message,
      status: "error",
      statusId: 0,
      time: 0,
    };
  }
}

/**
 * Legacy Adapter for backward compatibility with codeExecutor.js and tracers
 * Maps the old signature (language, code, input) to new runJudge0
 * And maps the return object to the old format
 */
async function executeWithJudge0(language, code, input) {
  const result = await runJudge0({ source_code: code, language, stdin: input });

  // Status ID 3 usually means "Accepted" in Judge0
  const isSuccess = result.statusId === 3 || result.status === 'Accepted';

  return {
    success: isSuccess,
    output: result.stdout,
    error: result.stderr + (isSuccess ? '' : (result.stdout ? '' : `\nStatus: ${result.status}`)),
    time: `${result.time}s`,
    memory: `${result.memory}KB`
  };
}

module.exports = { runJudge0, executeWithJudge0 };
