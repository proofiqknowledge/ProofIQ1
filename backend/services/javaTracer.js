// services/javaTracer.js
const { executeWithJudge0 } = require('./judge0Service');
const { instrumentJava } = require('./instrumentation/javaInstrumenter');

/**
 * Execute Java code via Judge0 with Instrumentation
 */
async function traceJava(code, input = '') {
    try {
        const instrumentedCode = instrumentJava(code);
        const execResult = await executeWithJudge0('java', instrumentedCode, input);

        console.log('JAVA RAW OUTPUT:', execResult.output);
        console.log('JAVA RAW ERROR:', execResult.error);

        if (!execResult.success && !execResult.output) {
            return {
                steps: [
                    {
                        currentLine: 1,
                        executedLines: [],
                        frames: [{ name: 'Global frame', variables: {} }],
                        objects: {},
                        output: execResult.output || '',
                        error: execResult.error || 'Execution failed'
                    }
                ]
            };
        }

        // -----------------------------
        // Parse Instrumented Output
        // -----------------------------
        const rawOutput = execResult.output || '';
        const lines = rawOutput.split('\n');

        const steps = [];
        let accumulatedOutput = '';

        let currentVars = {};
        const heap = {}; // 🔥 Stable heap across steps

        // Initial step
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

                    heap[objId] = {
                        type: objData.type || 'Object',
                        value: objData.value
                    };
                } catch (e) {
                    // Ignore malformed heap logs
                }
            }
            else if (traceMatch) {
                const lineNum = parseInt(traceMatch[1], 10);

                steps.push({
                    currentLine: lineNum,
                    executedLines: steps.length > 0 ? [...steps[steps.length - 1].executedLines, lineNum] : [lineNum],
                    frames: [
                        {
                            name: 'Execution',
                            variables: { ...currentVars } // Use current state
                        }
                    ],
                    objects: Object.entries(heap).map(([id, obj]) => ({
                        id,
                        ...obj
                    })),
                    output: accumulatedOutput
                });
            }
            else if (varMatch) {
                const name = varMatch[1];
                let value = varMatch[2];

                if (value.startsWith('"') && value.endsWith('"') && !value.startsWith('"obj')) {
                    value = value.slice(1, -1).replace(/\\\\"/g, '"');
                }
                else if (value.startsWith('[') || value.startsWith('{')) {
                    try {
                        value = JSON.parse(value);
                    } catch (e) { }
                }
                else if (value.startsWith('"obj')) {
                    value = value.slice(1, -1);
                }

                currentVars[name] = value;

                // Update the variables in the current step (the one that triggered this PT_VAR)
                if (steps.length > 0) {
                    const lastStep = steps[steps.length - 1];
                    if (lastStep.frames && lastStep.frames.length > 0) {
                        lastStep.frames[0].variables[name] = value;
                    }
                }
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

        if (steps.length <= 1) {
            return {
                steps: [
                    {
                        currentLine: 1,
                        executedLines: [1],
                        frames: [
                            {
                                name: 'Program Output',
                                variables: {}
                            }
                        ],
                        objects: {},
                        output: execResult.output,
                        error: execResult.error
                    }
                ]
            };
        }

        return { steps };

    } catch (error) {
        throw error;
    }
}

module.exports = {
    traceJava
};
