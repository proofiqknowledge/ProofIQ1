import React from 'react';
import Editor from '@monaco-editor/react';

/**
 * Professional code editor component using Monaco Editor (VS Code's editor)
 * Handles raw text without HTML encoding - fixes the &lt; &gt; issue
 */
export default function CodeEditor({
    value,
    onChange,
    language = 'javascript',
    height = '500px',
    readOnly = false,
    theme = 'vs-dark'
}) {

    const handleEditorChange = (newValue) => {
        // Monaco returns raw text - no HTML encoding!
        if (onChange) {
            onChange(newValue || '');
        }
    };

    return (
        <Editor
            height={height}
            language={language}
            value={value}
            onChange={handleEditorChange}
            theme={theme}
            options={{
                readOnly: readOnly,
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'Consolas, "Courier New", monospace',
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderWhitespace: 'selection',
                tabSize: 2,
                insertSpaces: true,
                formatOnPaste: true,
                formatOnType: true,
                // Accessibility
                accessibilitySupport: 'auto',
                // Performance
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
            }}
            loading={
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    background: '#1e1e1e',
                    color: '#fff'
                }}>
                    Loading editor...
                </div>
            }
        />
    );
}
