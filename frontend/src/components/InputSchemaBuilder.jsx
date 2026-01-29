import React, { useState } from 'react';
import './InputSchemaBuilder.css';

/**
 * Input Schema Builder Component
 * Allows admins to define input parameters for coding questions
 * Supports unlimited parameters with various data types
 */
export default function InputSchemaBuilder({ schema, onChange, language }) {
    const [parameters, setParameters] = useState(schema || []);

    // Available parameter types
    const parameterTypes = [
        { value: 'int', label: 'Integer', icon: '123' },
        { value: 'float', label: 'Float/Double', icon: '1.5' },
        { value: 'string', label: 'String', icon: 'Abc' },
        { value: 'bool', label: 'Boolean', icon: 'T/F' },
        { value: 'array<int>', label: 'Array of Integers', icon: '[1,2,3]' },
        { value: 'array<string>', label: 'Array of Strings', icon: '["a","b"]' },
        { value: 'linkedlist', label: 'Linked List', icon: '1→2→3' },
        { value: 'doublylinkedlist', label: 'Doubly Linked List', icon: '1↔2↔3' },
        { value: 'tree', label: 'Binary Tree', icon: '🌳' },
        { value: 'graph', label: 'Graph', icon: '🕸' },
    ];

    // Add new parameter
    const addParameter = () => {
        const newParam = {
            name: `param${parameters.length + 1}`,
            type: 'int',
            description: ''
        };
        const updated = [...parameters, newParam];
        setParameters(updated);
        onChange(updated);
    };

    // Remove parameter
    const removeParameter = (index) => {
        const updated = parameters.filter((_, i) => i !== index);
        setParameters(updated);
        onChange(updated);
    };

    // Update parameter
    const updateParameter = (index, field, value) => {
        const updated = parameters.map((param, i) =>
            i === index ? { ...param, [field]: value } : param
        );
        setParameters(updated);
        onChange(updated);
    };

    // Move parameter up/down
    const moveParameter = (index, direction) => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === parameters.length - 1)
        ) {
            return;
        }

        const updated = [...parameters];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];

        setParameters(updated);
        onChange(updated);
    };

    // Generate function signature preview
    const getFunctionSignature = () => {
        if (parameters.length === 0) return 'No parameters defined';

        const paramNames = parameters.map(p => p.name).join(', ');

        switch (language) {
            case 'python':
            case 'python3':
                return `def solution(${paramNames}):`;
            case 'javascript':
                return `function solution(${paramNames}) {`;
            case 'java':
                return `public ReturnType solution(${paramNames}) {`;
            case 'cpp':
            case 'c':
                return `ReturnType solution(${paramNames}) {`;
            default:
                return `solution(${paramNames})`;
        }
    };

    return (
        <div className="input-schema-builder">
            <div className="schema-header">
                <h3>Input Parameters</h3>
                <button
                    type="button"
                    className="add-param-btn"
                    onClick={addParameter}
                >
                    ➕ Add Parameter
                </button>
            </div>

            {parameters.length === 0 && (
                <div className="empty-state">
                    <p>No parameters defined. Click "Add Parameter" to start.</p>
                </div>
            )}

            <div className="parameters-list">
                {parameters.map((param, index) => (
                    <div key={index} className="parameter-item">
                        <div className="param-controls">
                            <span className="param-number">#{index + 1}</span>
                            <button
                                type="button"
                                className="move-btn"
                                onClick={() => moveParameter(index, 'up')}
                                disabled={index === 0}
                                title="Move up"
                            >
                                ↑
                            </button>
                            <button
                                type="button"
                                className="move-btn"
                                onClick={() => moveParameter(index, 'down')}
                                disabled={index === parameters.length - 1}
                                title="Move down"
                            >
                                ↓
                            </button>
                            <button
                                type="button"
                                className="remove-btn"
                                onClick={() => removeParameter(index)}
                                title="Remove parameter"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="param-fields">
                            <div className="field-group">
                                <label>Parameter Name</label>
                                <input
                                    type="text"
                                    value={param.name}
                                    onChange={(e) => updateParameter(index, 'name', e.target.value)}
                                    placeholder="e.g., nums, head, root"
                                    className="param-input"
                                />
                            </div>

                            <div className="field-group">
                                <label>Data Type</label>
                                <select
                                    value={param.type}
                                    onChange={(e) => updateParameter(index, 'type', e.target.value)}
                                    className="param-select"
                                >
                                    {parameterTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.icon} {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="field-group full-width">
                                <label>Description (Optional)</label>
                                <input
                                    type="text"
                                    value={param.description || ''}
                                    onChange={(e) => updateParameter(index, 'description', e.target.value)}
                                    placeholder="e.g., Array of integers representing..."
                                    className="param-input"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {parameters.length > 0 && (
                <div className="function-preview">
                    <label>Function Signature Preview:</label>
                    <div className="preview-code">
                        <code>{getFunctionSignature()}</code>
                    </div>
                </div>
            )}
        </div>
    );
}
