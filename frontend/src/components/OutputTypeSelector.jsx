import React from 'react';
import './OutputTypeSelector.css';

/**
 * Output Type Selector Component
 * Allows admins to define the expected output type for coding questions
 */
export default function OutputTypeSelector({ outputType, onChange }) {
    const outputTypes = [
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
        { value: 'void', label: 'Void (No Return)', icon: '∅' },
    ];

    const handleTypeChange = (type) => {
        onChange({ type, description: outputType?.description || '' });
    };

    const handleDescriptionChange = (description) => {
        onChange({ type: outputType?.type || 'int', description });
    };

    return (
        <div className="output-type-selector">
            <h3>Output Type</h3>

            <div className="output-field-group">
                <label>Return Type</label>
                <select
                    value={outputType?.type || 'int'}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="output-select"
                >
                    {outputTypes.map(type => (
                        <option key={type.value} value={type.value}>
                            {type.icon} {type.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="output-field-group">
                <label>Description (Optional)</label>
                <input
                    type="text"
                    value={outputType?.description || ''}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="e.g., Return the maximum value found"
                    className="output-input"
                />
            </div>
        </div>
    );
}
