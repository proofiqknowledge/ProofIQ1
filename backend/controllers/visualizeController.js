// controllers/visualizeController.js
const { validateCode, limitSteps } = require('../utils/sandboxUtils');
const { tracePython } = require('../services/pythonTracer');
const { traceJavaScript } = require('../services/jsTracer');
const { traceCpp } = require('../services/cppTracer');
const { traceJava } = require('../services/javaTracer');
const { getLastRunInput } = require('../services/codeExecutor');

/**
 * Main controller for code visualization
 * POST /api/visualize
 * Body: { code: string, language: string }
 */
exports.visualizeCode = async (req, res) => {
    try {
        const { code, language } = req.body;

        // Validate input
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Code is required'
            });
        }

        if (!language) {
            return res.status(400).json({
                success: false,
                message: 'Language is required'
            });
        }

        // Normalize language
        const normalizedLang = language.toLowerCase().trim();
        const supportedLanguages = ['python', 'javascript', 'js', 'c', 'cpp', 'c++', 'java'];

        if (!supportedLanguages.includes(normalizedLang)) {
            return res.status(400).json({
                success: false,
                message: `Unsupported language: ${language}. Supported: ${supportedLanguages.join(', ')}`
            });
        }

        // Validate code for dangerous patterns
        const validation = validateCode(code, normalizedLang);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        // 🔥 REUSE INPUT FROM CODE RUNNER (Judge0 path)
        const input = getLastRunInput(req.user?.id) || '';

        // Route to appropriate tracer
        let result;

        try {
            switch (normalizedLang) {
                case 'python':
                    result = await tracePython(code, input);
                    break;

                case 'javascript':
                case 'js':
                    result = await traceJavaScript(code, input);
                    break;

                case 'c':
                    result = await traceCpp(code, 'c', input);
                    break;

                case 'cpp':
                case 'c++':
                    result = await traceCpp(code, 'cpp', input);
                    break;

                case 'java':
                    result = await traceJava(code, input);
                    break;

                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Unsupported language'
                    });
            }

            // Limit steps to prevent huge responses
            if (result.steps) {
                result.steps = limitSteps(result.steps, 1000);
            }

            // Return result
            return res.json({
                success: true,
                language: normalizedLang,
                ...result
            });

        } catch (tracerError) {
            // Handle tracer-specific errors
            return res.status(500).json({
                success: false,
                message: tracerError.message,
                steps: [
                    {
                        currentLine: 1,
                        executedLines: [],
                        frames: [
                            {
                                name: 'Global frame',
                                variables: {}
                            }
                        ],
                        objects: [],
                        output: '',
                        error: tracerError.message
                    }
                ]
            });
        }

    } catch (error) {
        console.error('Visualize controller error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};
