// utils/sandboxUtils.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const temp = require('temp').track(); // Auto-cleanup temp files

/**
 * Create a temporary file with the given content
 * @param {string} code - Code content to write
 * @param {string} extension - File extension (e.g., '.py', '.js')
 * @returns {Promise<string>} - Path to the created temp file
 */
async function createTempFile(code, extension) {
    return new Promise((resolve, reject) => {
        temp.open({ suffix: extension }, (err, info) => {
            if (err) return reject(err);

            fs.write(info.fd, code, (err) => {
                if (err) return reject(err);

                fs.close(info.fd, (err) => {
                    if (err) return reject(err);
                    resolve(info.path);
                });
            });
        });
    });
}

/**
 * Clean up a temporary file
 * @param {string} filepath - Path to file to delete
 */
function cleanupTempFile(filepath) {
    try {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
    } catch (err) {
        console.error('Failed to cleanup temp file:', err);
    }
}

/**
 * Execute a command with timeout
 * @param {string} command - Command to execute
 * @param {Array<string>} args - Command arguments
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} stdin - Optional stdin input
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
function executeWithTimeout(command, args = [], timeoutMs = 2000, stdin = '') {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args, {
            timeout: timeoutMs,
            killSignal: 'SIGKILL'
        });

        let stdout = '';
        let stderr = '';
        let timedOut = false;

        const timeout = setTimeout(() => {
            timedOut = true;
            process.kill('SIGKILL');
        }, timeoutMs);

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        // Send stdin if provided
        if (stdin) {
            process.stdin.write(stdin);
            process.stdin.end();
        }

        process.on('close', (exitCode) => {
            clearTimeout(timeout);

            if (timedOut) {
                resolve({
                    stdout: stdout,
                    stderr: 'Error: Execution timed out (2 second limit)',
                    exitCode: -1,
                    timedOut: true
                });
            } else {
                resolve({
                    stdout: stdout,
                    stderr: stderr,
                    exitCode: exitCode || 0,
                    timedOut: false
                });
            }
        });

        process.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

/**
 * Validate code for dangerous patterns
 * @param {string} code - Code to validate
 * @param {string} language - Programming language
 * @returns {{valid: boolean, error?: string}}
 */
function validateCode(code, language) {
    // Check code length
    if (!code || code.trim().length === 0) {
        return { valid: false, error: 'Code cannot be empty' };
    }

    if (code.length > 50000) {
        return { valid: false, error: 'Code is too long (max 50KB)' };
    }

    // Language-specific dangerous patterns
    const dangerousPatterns = {
        python: [
            /import\s+os/i,
            /import\s+subprocess/i,
            /import\s+sys/i,
            /from\s+os\s+import/i,
            /from\s+subprocess\s+import/i,
            /__import__/i,
            /eval\s*\(/i,
            /exec\s*\(/i,
            /open\s*\(/i,
            /file\s*\(/i,
        ],
        javascript: [
            /require\s*\(\s*['"](fs|child_process|os|vm|net|http|https)['"]\s*\)/i, // Block specific dangerous modules
            /import\s+.*\s+from/i,
            /eval\s*\(/i,
            /Function\s*\(/i,
            /process\.env/i,
            /process\.kill/i,
            /process\.dlopen/i,
            // process. is otherwise allowed (stdin, stdout, exit)
        ],
        c: [
            /system\s*\(/i,
            /exec/i,
            /fork\s*\(/i,
        ],
        cpp: [
            /system\s*\(/i,
            /exec/i,
            /fork\s*\(/i,
        ],
        java: [
            /Runtime\.getRuntime/i,
            /ProcessBuilder/i,
            /System\.exit/i,
        ]
    };

    const patterns = dangerousPatterns[language] || [];

    for (const pattern of patterns) {
        if (pattern.test(code)) {
            return {
                valid: false,
                error: `Code contains potentially dangerous operation: ${pattern.source}`
            };
        }
    }

    return { valid: true };
}

/**
 * Limit the number of steps returned
 * @param {Array} steps - Array of execution steps
 * @param {number} maxSteps - Maximum number of steps
 * @returns {Array}
 */
function limitSteps(steps, maxSteps = 1000) {
    if (steps.length <= maxSteps) {
        return steps;
    }

    return steps.slice(0, maxSteps);
}

module.exports = {
    createTempFile,
    cleanupTempFile,
    executeWithTimeout,
    validateCode,
    limitSteps
};
