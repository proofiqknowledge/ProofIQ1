// services/cppTracer.js
const { executeWithJudge0 } = require('./judge0Service');
const { instrumentCpp } = require('./instrumentation/cppInstrumenter');

/**
 * Execute C/C++ code via Judge0 with Instrumentation Tracing
 */
async function traceCpp(code, language = 'cpp', input = '') {
    try {
        // 1. Instrument the code
        // We handle C by treating it as C++ so we can use the advanced C++ instrumenter (templates, iostream)
        const shouldInstrument = language === 'cpp' || language === 'c++' || language === 'c';

        const instrumentedCode = shouldInstrument ? instrumentCpp(code) : code;

        // If we instrumented usage of C++ features, we MUST run as CPP
        const executionLanguage = shouldInstrument ? 'cpp' : language;

        // 2. Execute
        const execResult = await executeWithJudge0(executionLanguage, instrumentedCode, input);

        if (!execResult.success && !execResult.output) {
            return {
                steps: [
                    {
                        currentLine: 1,
                        executedLines: [],
                        frames: [{ name: 'Global frame', variables: {} }],
                        objects: {},
                        output:
                            (execResult.output || '') +
                            '\nError:\n' +
                            (execResult.error || 'Execution failed'),
                        error: execResult.error || 'Execution failed'
                    }
                ]
            };
        }

        // 3. Parse Output
        const rawOutput = execResult.output || '';
        const lines = rawOutput.split('\n');
        const steps = [];

        let accumulatedOutput = '';
        let currentVars = {};

        // 🔥 Stable heap across steps
        const heap = {}; // objId -> { type, value }

        // Initial Step
        steps.push({
            currentLine: 1,
            executedLines: [],
            frames: [{ name: 'Global frame', variables: {} }],
            objects: {},
            output: ''
        });

        lines.forEach(line => {
            const traceMatch = line.match(/^PT_TRACE:(\d+)/);
            const varMatch = line.match(/^PT_VAR:([^:]+):(.*)/);
            const heapMatch = line.match(/^PT_HEAP:([^:]+):(.*)/);

            if (heapMatch) {
                try {
                    const objId = heapMatch[1];
                    const jsonStr = heapMatch[2];
                    const objData = JSON.parse(jsonStr);

                    // 🔥 Stable heap update
                    heap[objId] = {
                        type: objData.type || 'object',
                        value: objData.value
                    };
                } catch (e) {
                    // Ignore malformed heap traces safely
                }
            }
            else if (varMatch) {
                const name = varMatch[1];
                let value = varMatch[2];

                // Clean quotes
                if (
                    value.startsWith('"') &&
                    value.endsWith('"') &&
                    !value.startsWith('"obj0x')
                ) {
                    value = value.slice(1, -1);
                }

                // Pointer reference
                if (value.startsWith('"obj0x')) {
                    value = value.slice(1, -1);
                }

                currentVars[name] = value;
            }
            else if (traceMatch) {
                const lineNum = parseInt(traceMatch[1], 10);

                const frameVars = { ...currentVars };
                currentVars = {}; // reset for next trace

                steps.push({
                    currentLine: lineNum,
                    executedLines: [lineNum],
                    frames: [
                        {
                            name: 'Execution',
                            variables:
                                Object.keys(frameVars).length > 0
                                    ? frameVars
                                    : { Message: 'No local variables' }
                        }
                    ],
                    objects: Object.entries(heap).map(([id, obj]) => ({
                        id,
                        ...obj
                    })),
                    output: accumulatedOutput
                });
            }
            else {
                if (line) {
                    accumulatedOutput += line + '\n';
                    if (steps.length > 0) {
                        steps[steps.length - 1].output = accumulatedOutput;
                    }
                }
            }
        });

        return { steps };

    } catch (error) {
        throw error;
    }
}

module.exports = {
    traceCpp
};
