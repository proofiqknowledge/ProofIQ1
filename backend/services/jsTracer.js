// services/jsTracer.js
const { VM } = require('vm2');

/**
 * Execute JavaScript code with step-by-step tracing
 * @param {string} code - JavaScript code to execute
 * @returns {Promise<{steps: Array}>}
 */
async function traceJavaScript(code) {
    const steps = [];
    const executedLines = new Set();
    let outputBuffer = '';

    // 🔥 Stable heap tracking
    let objectIdCounter = 0;
    const objectMap = new Map();

    // Parse code to get line numbers
    const lines = code.split('\n');

    function getObjectId(obj) {
        if (!objectMap.has(obj)) {
            objectMap.set(obj, `obj${objectIdCounter++}`);
        }
        return objectMap.get(obj);
    }

    function serializeValue(val, depth = 0) {
        if (depth > 3) return '...';

        if (val === null || val === undefined) {
            return val;
        }
        if (typeof val === 'boolean' || typeof val === 'number') {
            return val;
        }
        if (typeof val === 'string') {
            return val.length > 100 ? val.substring(0, 100) + '...' : val;
        }
        if (Array.isArray(val) || typeof val === 'object') {
            return getObjectId(val);
        }
        if (typeof val === 'function') {
            return '<function>';
        }
        return String(val);
    }

    function extractObjects(scope) {
        const heap = {};

        for (const [varName, varValue] of Object.entries(scope)) {
            if (varName.startsWith('__')) continue;
            if (varValue === null || typeof varValue !== 'object') continue;

            const objId = getObjectId(varValue);

            // Array handling
            if (Array.isArray(varValue)) {
                heap[objId] = {
                    type: 'Array',
                    value: varValue.slice(0, 20).map(v => serializeValue(v, 1))
                };
            }
            // Object handling
            else {
                const fields = {};
                Object.entries(varValue).slice(0, 20).forEach(([k, v]) => {
                    if (!k.startsWith('__')) {
                        fields[k] = serializeValue(v, 1);
                    }
                });

                const typeName = varValue.constructor
                    ? varValue.constructor.name
                    : 'Object';

                heap[objId] = {
                    type: typeName,
                    value: fields
                };
            }
        }

        return heap;
    }

    function captureState(lineNum, scope) {
        if (steps.length >= 1000) {
            throw new Error('Step limit exceeded');
        }

        executedLines.add(lineNum);

        const variables = {};
        for (const [key, value] of Object.entries(scope)) {
            if (!key.startsWith('__')) {
                variables[key] = serializeValue(value);
            }
        }

        const frames = [
            {
                name: 'Global frame',
                variables
            }
        ];

        const objects = extractObjects(scope);

        steps.push({
            currentLine: lineNum,
            executedLines: Array.from(executedLines).sort((a, b) => a - b),
            frames,
            objects: Object.entries(objects).map(([id, obj]) => ({
                id,
                ...obj
            })),
            output: outputBuffer
        });
    }

    // -------------------------
    // Instrument code
    // -------------------------
    const instrumentedLines = [];
    let lineNum = 1;

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === '' || trimmed.startsWith('//')) {
            instrumentedLines.push(line);
            lineNum++;
            continue;
        }

        instrumentedLines.push(line);

        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
        instrumentedLines.push(
            `${indent}__captureState(${lineNum}, __getScope());`
        );

        lineNum++;
    }

    const instrumentedCode = instrumentedLines.join('\n');

    // -------------------------
    // Sandbox
    // -------------------------
    const sandbox = {
        __captureState: captureState,
        __getScope: function () {
            const scope = {};
            for (const key in sandbox) {
                if (!key.startsWith('__') && key !== 'console') {
                    scope[key] = sandbox[key];
                }
            }
            return scope;
        },
        console: {
            log: (...args) => {
                const message =
                    args
                        .map(arg => {
                            if (typeof arg === 'object') {
                                try {
                                    return JSON.stringify(arg);
                                } catch {
                                    return String(arg);
                                }
                            }
                            return String(arg);
                        })
                        .join(' ') + '\n';

                outputBuffer += message;
            }
        }
    };

    try {
        const vm = new VM({
            timeout: 2000,
            sandbox,
            eval: false,
            wasm: false
        });

        // Initial state
        captureState(1, {});

        vm.run(instrumentedCode);

        return { steps };

    } catch (error) {
        if (error.message === 'Step limit exceeded') {
            return {
                steps: steps.length
                    ? steps
                    : [
                        {
                            currentLine: 1,
                            executedLines: [],
                            frames: [{ name: 'Global frame', variables: {} }],
                            objects: {},
                            output: outputBuffer,
                            error: 'Step limit exceeded (max 1000 steps)'
                        }
                    ]
            };
        }

        if (steps.length > 0) {
            steps[steps.length - 1].error = error.message;
            return { steps };
        }

        return {
            steps: [
                {
                    currentLine: 1,
                    executedLines: [],
                    frames: [{ name: 'Global frame', variables: {} }],
                    objects: {},
                    output: outputBuffer,
                    error: error.message
                }
            ]
        };
    }
}

module.exports = {
    traceJavaScript
};
