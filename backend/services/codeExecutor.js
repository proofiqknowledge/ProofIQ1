const { executeWithJudge0 } = require('./judge0Service');

/**
 * Universal Code Executor Service
 * Handles compilation and execution via Judge0 (Online Compiler)
 * ALSO stores last input for visualization reuse
 */

// 🔥 In-memory cache for last runner input (per user)
const lastRunInputs = new Map();

/**
 * Execute code using Judge0 (UNCHANGED behavior)
 * @param {string} language
 * @param {string} code
 * @param {string} input
 */
async function executeCode(language, code, input, userId = 'anonymous') {
    try {
        // 🔹 Store input for visualization reuse
        lastRunInputs.set(userId, input || '');

        return await executeWithJudge0(language, code, input);
    } catch (err) {
        return {
            success: false,
            output: '',
            error: err.message || 'Judge0 Execution Failed',
            time: '0ms',
            memory: '0MB'
        };
    }
}

/**
 * 🔁 Used by visualizeController
 * Returns last input used in code runner
 */
function getLastRunInput(userId = 'anonymous') {
    return lastRunInputs.get(userId) || '';
}

module.exports = {
    executeCode,
    getLastRunInput
};
