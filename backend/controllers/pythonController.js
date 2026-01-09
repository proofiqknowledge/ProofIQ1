const { executeAndVisualizePython } = require('../services/pythonService');
const { validateCode } = require('../utils/sandboxUtils');

/**
 * Handle Python Execution & Visualization
 * POST /api/python/execute-and-visualize
 */
exports.executePythonController = async (req, res) => {
    try {
        const { code, input, mode } = req.body;

        if (!code) {
            return res.status(400).json({ success: false, error: 'Code is required' });
        }

        const validMode = mode || 'run'; // Default to run

        // Security Check
        const security = validateCode(code, 'python');
        if (!security.valid) {
            return res.status(400).json({ success: false, error: security.error });
        }

        const result = await executeAndVisualizePython(code, input || '', validMode);
        res.json(result);

    } catch (error) {
        console.error('Python API Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
