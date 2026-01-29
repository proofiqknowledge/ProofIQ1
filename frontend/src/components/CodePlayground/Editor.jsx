import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { COLORS, TYPOGRAPHY } from '../../constants/designSystem';

const CodeEditor = ({
    code,
    language,
    onChange,
    readOnly = false,
    currentLine = null,
    executedLines = [],
    height = '500px'
}) => {
    const editorRef = useRef(null);
    const decorationsRef = useRef([]);

    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
    };

    // Update decorations when currentLine or executedLines change
    useEffect(() => {
        if (!editorRef.current) return;

        const editor = editorRef.current;
        const newDecorations = [];

        // Add green background for executed lines
        executedLines.forEach((lineNum) => {
            newDecorations.push({
                range: {
                    startLineNumber: lineNum,
                    startColumn: 1,
                    endLineNumber: lineNum,
                    endColumn: 1
                },
                options: {
                    isWholeLine: true,
                    className: 'executed-line',
                    glyphMarginClassName: 'executed-line-glyph'
                }
            });
        });

        // Add red arrow and highlight for current line
        if (currentLine !== null && currentLine > 0) {
            newDecorations.push({
                range: {
                    startLineNumber: currentLine,
                    startColumn: 1,
                    endLineNumber: currentLine,
                    endColumn: 1
                },
                options: {
                    isWholeLine: true,
                    className: 'current-line',
                    glyphMarginClassName: 'current-line-glyph',
                    glyphMarginHoverMessage: { value: 'Next line to execute' }
                }
            });
        }

        // Apply decorations
        decorationsRef.current = editor.deltaDecorations(
            decorationsRef.current,
            newDecorations
        );
    }, [currentLine, executedLines]);

    // Map language names to Monaco language IDs
    const getMonacoLanguage = (lang) => {
        const languageMap = {
            'python': 'python',
            'javascript': 'javascript',
            'c': 'c',
            'cpp': 'cpp',
            'java': 'java'
        };
        return languageMap[lang] || 'plaintext';
    };

    return (
        <>
            <style>
                {`
          .executed-line {
            background-color: rgba(16, 185, 129, 0.1) !important;
          }
          
          .executed-line-glyph {
            background-color: rgba(16, 185, 129, 0.3) !important;
          }
          
          .current-line {
            background-color: rgba(239, 68, 68, 0.1) !important;
            border-left: 3px solid ${COLORS.danger} !important;
          }
          
          .current-line-glyph::after {
            content: "→";
            color: ${COLORS.danger};
            font-weight: bold;
            font-size: 16px;
            position: absolute;
            left: 5px;
          }
        `}
            </style>
            <Editor
                height={height}
                language={getMonacoLanguage(language)}
                value={code}
                onChange={onChange}
                onMount={handleEditorDidMount}
                theme="vs-light"
                options={{
                    readOnly: readOnly,
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    glyphMargin: true,
                    folding: false,
                    lineDecorationsWidth: 10,
                    lineNumbersMinChars: 3,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    fontFamily: TYPOGRAPHY.fontFamilyCode
                }}
            />
        </>
    );
};

export default CodeEditor;
