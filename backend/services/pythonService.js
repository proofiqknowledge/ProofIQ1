

const { executeCode } = require('./codeExecutor');
const { tracePython, runPythonInteractive } = require('./pythonTracer');

/**
 * Enhanced Python Service
 * Handles 'run' (Performance) and 'visualize' (Deep Trace) modes.
 */

async function executeAndVisualizePython(code, input, mode) {
    // 1. Run Mode (Interactive Runner - Local)
    // We utilize the local interactive runner for Python to support "waiting_for_input" popup.
    // For other languages, the Frontend calls executeCode directly. But since we are here,
    // this handles Python specifically.
    if (mode === 'run') {
        const result = await runPythonInteractive(code, input);

        return {
            success: !result.error && result.status !== 'error',
            output: result.output,
            error: result.error,
            time: result.time,
            memory: 'N/A', // Python runner doesn't track memory yet
            status: result.status, // Important: Passes 'waiting_for_input'
            trace: []
        };
    }

    // 2. Visualize Mode
    if (mode === 'visualize') {
        // Use the Python Tracer
        const traceResult = await tracePython(code, input);

        let success = true;
        let lastError = '';
        let lastOutput = '';

        if (traceResult.steps && traceResult.steps.length > 0) {
            const lastStep = traceResult.steps[traceResult.steps.length - 1];
            lastOutput = lastStep.output;
            if (lastStep.error) {
                success = false;
                lastError = lastStep.error;
            }
        }

        return {
            success: success,
            output: lastOutput,
            error: lastError,
            trace: traceResult.steps || [],
            status: traceResult.status || 'complete',
            time: 'N/A', // Tracing is slow, time is irrelevant
            memory: 'N/A'
        };
    }

    throw new Error("Invalid mode. Use 'run' or 'visualize'");
}

module.exports = { executeAndVisualizePython };
