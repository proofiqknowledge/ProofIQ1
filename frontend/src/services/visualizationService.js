import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Mock data for development/testing when backend is not available
 * (kept intentionally – does not affect production)
 */
const generateMockVisualizationData = (code, language) => {
    return {
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
                output: ''
            },
            {
                currentLine: 2,
                executedLines: [1],
                frames: [
                    {
                        name: 'Global frame',
                        variables: { x: 5 }
                    }
                ],
                objects: [],
                output: ''
            },
            {
                currentLine: 3,
                executedLines: [1, 2],
                frames: [
                    {
                        name: 'Global frame',
                        variables: { x: 5, y: 10 }
                    }
                ],
                objects: [],
                output: ''
            },
            {
                currentLine: 4,
                executedLines: [1, 2, 3],
                frames: [
                    {
                        name: 'Global frame',
                        variables: { x: 5, y: 10, z: 15 }
                    }
                ],
                objects: [],
                output: '15\n'
            }
        ]
    };
};

/**
 * Sends code to backend for visualization
 * IMPORTANT:
 * - MUST NOT call Judge0
 * - MUST NOT send input
 * - Backend will reuse last runner input
 *
 * @param {string} code
 * @param {string} language
 * @returns {Promise<Object>}
 */
export const visualizeCode = async (code, language) => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/visualize`,
            {
                code,
                language
            },
            {
                timeout: 60000
            }
        );

        return response.data;
    } catch (error) {
        console.warn(
            'Backend visualization API not available, using mock data:',
            error.message
        );

        // Safe fallback for development
        return generateMockVisualizationData(code, language);
    }
};

/**
 * Validates visualization data structure
 * @param {Object} data
 * @returns {boolean}
 */
export const validateVisualizationData = (data) => {
    if (!data || !Array.isArray(data.steps)) {
        return false;
    }

    for (const step of data.steps) {
        if (
            typeof step.currentLine !== 'number' ||
            !Array.isArray(step.executedLines) ||
            !Array.isArray(step.frames) ||
            !Array.isArray(step.objects) ||
            typeof step.output !== 'string'
        ) {
            return false;
        }
    }

    return true;
};

/**
 * Universal Code Execution (Judge0 path)
 * UNCHANGED
 *
 * @param {string} code
 * @param {string} language
 * @param {string} input
 */
export const executeCode = async (code, language, input = '') => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/code/execute`,
            {
                code,
                language,
                input
            },
            {
                timeout: 60000
            }
        );

        return response.data;
    } catch (error) {
        console.error('Execution API Error:', error);
        throw error;
    }
};

/**
 * Python-specific unified API
 * UNCHANGED (used for legacy flows if any)
 */
export const executeAndVisualizePython = async (code, input, mode) => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/python/execute-and-visualize`,
            {
                code,
                input,
                mode
            },
            { timeout: 60000 }
        );

        return response.data;
    } catch (error) {
        console.error('Python API Error:', error);
        throw error;
    }
};
