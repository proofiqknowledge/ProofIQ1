const { executeCode } = require('../services/codeExecutor');
const { validateCode } = require('../utils/sandboxUtils');

/**
 * Handle Code Execution Request
 * POST /api/code/execute
 */
exports.executeCodeController = async (req, res) => {
    try {
        const { language, code, input } = req.body;

        // 1. Validation
        if (!language || !code) {
            return res.status(400).json({
                success: false,
                output: '',
                error: 'Language and Code are required',
                time: '0ms',
                memory: '0MB'
            });
        }

        const validLanguages = ['c', 'cpp', 'c++', 'java', 'python', 'python3', 'javascript', 'js', 'node'];
        if (!validLanguages.includes(language.toLowerCase())) {
            return res.status(400).json({
                success: false,
                output: '',
                error: `Unsupported language. Supported: ${validLanguages.join(', ')}`,
                time: '0ms',
                memory: '0MB'
            });
        }

        // 2. Security Check
        const securityCheck = validateCode(code, language.toLowerCase());
        if (!securityCheck.valid) {
            return res.status(400).json({
                success: false,
                output: '',
                error: `Security Violation: ${securityCheck.error}`,
                time: '0ms',
                memory: '0MB'
            });
        }

        // 3. Execution
        const result = await executeCode(language, code, input || '');

        // 4. Response
        res.json(result);

    } catch (error) {
        console.error('Execution Controller Error:', error);
        res.status(500).json({
            success: false,
            output: '',
            error: 'Internal Server Error',
            time: '0ms',
            memory: '0MB'
        });
    }
};
