import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import CodeEditor from './Editor';
import LanguageSelector from './LanguageSelector';
import ControlButtons from './ControlButtons';
import VisualizationPane from './VisualizationPane';
import { executeCode, visualizeCode } from '../../services/visualizationService';
import { getSavedFiles, saveFile, deleteFile } from '../../services/savedFileService';
import { COLORS, SPACING, SHADOWS } from '../../constants/designSystem';
import { FaSave, FaTrash, FaFile, FaPlus, FaFolderOpen, FaEdit } from 'react-icons/fa';

const DEFAULT_CODE = {
    python: `x = 5
y = 10
z = x + y
print(z)`,
    javascript: `let x = 5;
let y = 10;
let z = x + y;
console.log(z);`,
    c: `#include <stdio.h>

int main() {
    int x = 5;
    int y = 10;
    int z = x + y;
    printf("%d\\n", z);
    return 0;
}`,
    cpp: `#include <iostream>
using namespace std;

int main() {
    int x = 5;
    int y = 10;
    int z = x + y;
    cout << z << endl;
    return 0;
}`,
    java: `public class Main {
    public static void main(String[] args) {
        int x = 5;
        int y = 10;
        int z = x + y;
        System.out.println(z);
    }
}`
};

// Input Prompt Component
const InputPrompt = ({ onSubmit }) => {
    const [val, setVal] = React.useState('');
    const inputRef = React.useRef(null);

    React.useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(val);
        setVal('');
    };

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <form onSubmit={handleSubmit} style={{
                backgroundColor: COLORS.white, padding: SPACING.lg, borderRadius: '8px',
                boxShadow: SHADOWS.lg, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: SPACING.md
            }}>
                <h3 style={{ margin: 0, color: COLORS.primary }}>Input Required</h3>
                <p style={{ margin: 0, color: COLORS.textSecondary, fontSize: '14px' }}>The program is requesting input.</p>
                <input
                    ref={inputRef}
                    type="text"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '4px', border: `1px solid ${COLORS.primary}`, fontSize: '16px' }}
                    placeholder="Type input value here..."
                />
                <button type="submit" style={{
                    padding: '8px 16px', backgroundColor: COLORS.primary, color: COLORS.white,
                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600
                }}>Submit Input</button>
            </form>
        </div>
    );
};

const CodePlayground = () => {
    const [language, setLanguage] = useState('python');
    const [code, setCode] = useState(DEFAULT_CODE.python);
    const [isRunning, setIsRunning] = useState(false);
    const [isVisualizing, setIsVisualizing] = useState(false);
    const [visualizationMode, setVisualizationMode] = useState(false);
    const [visualizationData, setVisualizationData] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [runOutput, setRunOutput] = useState('');

    // Input handling state
    const [accumulatedInput, setAccumulatedInput] = useState('');
    const [isWaitingForInput, setIsWaitingForInput] = useState(false);

    // Initial Manual Input Box
    const [input, setInput] = useState('');
    const [runMetrics, setRunMetrics] = useState(null);

    // Saved Files State
    const [savedFiles, setSavedFiles] = useState([]);
    const [currentFileId, setCurrentFileId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [newFileName, setNewFileName] = useState('');
    const [isCreatingFile, setIsCreatingFile] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({ type: '', message: '', onConfirm: null, inputValue: '' });

    useEffect(() => {
        loadSavedFiles();
    }, []);

    const loadSavedFiles = async () => {
        try {
            const files = await getSavedFiles();
            setSavedFiles(files);
        } catch (error) {
            console.error("Failed to load saved files", error);
        }
    };

    const handleSave = async () => {
        if (!code) return;

        if (!currentFileId) {
            // Show modal to get filename
            setModalConfig({
                type: 'input',
                message: 'Enter file name to save (e.g., myscript.py):',
                inputValue: '',
                onConfirm: async (fileName) => {
                    if (!fileName) return;
                    await performSave(fileName);
                }
            });
            setShowModal(true);
        } else {
            const currentFile = savedFiles.find(f => f._id === currentFileId);
            const fileName = currentFile ? currentFile.name : '';
            await performSave(fileName);
        }
    };

    const performSave = async (fileName) => {
        try {
            const savedFile = await saveFile({
                _id: currentFileId,
                name: fileName,
                language: language,
                code: code
            });
            setSavedFiles(prev => {
                const exists = prev.find(f => f._id === savedFile._id);
                if (exists) return prev.map(f => f._id === savedFile._id ? savedFile : f);
                return [savedFile, ...prev];
            });
            setCurrentFileId(savedFile._id);
        } catch (error) {
            toast.error('Failed to save file');
        }
    };

    const handleFileClick = (file) => {
        setCurrentFileId(file._id);
        setCode(file.code);
        setLanguage(file.language); // Switch language
        setVisualizationMode(false);
    };

    const handleDeleteFile = async (e, id) => {
        e.stopPropagation();
        setModalConfig({
            type: 'confirm',
            message: 'Are you sure you want to delete this file?',
            onConfirm: async () => {
                try {
                    await deleteFile(id);
                    setSavedFiles(prev => prev.filter(f => f._id !== id));
                    if (currentFileId === id) {
                        setCurrentFileId(null);
                        setCode('');
                    }
                } catch (error) {
                    toast.error('Failed to delete file');
                }
            }
        });
        setShowModal(true);
    };

    const handleRenameFile = (e, file) => {
        e.stopPropagation();
        setModalConfig({
            type: 'input',
            message: 'Enter new file name:',
            inputValue: file.name,
            onConfirm: async (newName) => {
                if (!newName || newName === file.name) return;

                try {
                    const updatedFile = await saveFile({
                        _id: file._id,
                        name: newName,
                        language: file.language,
                        code: file.code
                    });
                    setSavedFiles(prev => prev.map(f => f._id === file._id ? updatedFile : f));
                } catch (error) {
                    toast.error('Failed to rename file');
                }
            }
        });
        setShowModal(true);
    };

    const handleCreateNewFile = () => {
        setModalConfig({
            type: 'input',
            message: 'Enter new file name with extension (e.g., script.js, main.c):',
            inputValue: '',
            onConfirm: async (name) => {
                if (!name) return;

                // Detect language from extension
                const ext = name.split('.').pop().toLowerCase();
                let newLang = 'python';
                if (ext === 'js' || ext === 'javascript') newLang = 'javascript';
                else if (ext === 'c') newLang = 'c';
                else if (ext === 'cpp' || ext === 'cc') newLang = 'cpp';
                else if (ext === 'java') newLang = 'java';
                else if (ext === 'py') newLang = 'python';

                setLanguage(newLang);
                setCode(DEFAULT_CODE[newLang] || '');
                setCurrentFileId(null);

                try {
                    const saved = await saveFile({
                        name: name,
                        language: newLang,
                        code: DEFAULT_CODE[newLang] || ''
                    });
                    setSavedFiles(prev => [saved, ...prev]);
                    setCurrentFileId(saved._id);
                } catch (err) {
                    toast.error("Failed to create file");
                }
            }
        });
        setShowModal(true);
    };


    const handleLanguageChange = (newLanguage) => {
        setLanguage(newLanguage);
        setCode(DEFAULT_CODE[newLanguage] || '');
        setVisualizationMode(false);
        setVisualizationData(null);
        setRunOutput('');
        setAccumulatedInput('');
        setIsWaitingForInput(false);
    };

    const handleInputSubmit = (newInput) => {
        // Decide which function to call based on mode
        if (visualizationMode) {
            handleVisualize(newInput);
        } else {
            handleRun(newInput);
        }
    };

    const handleRun = async (newInput = null) => {
        if (!code.trim()) {
            toast.warning('Please enter some code first');
            return;
        }

        // Logic to simulate Interactivity for Batch Languages (C, C++, Java)
        // If code has input keywords but no input is provided, ask BEFORE running.
        if (newInput === null && !input && !accumulatedInput) { // Only check on initial run, not re-runs with input
            const inputPatterns = {
                'c': /scanf\s*\(/,
                'cpp': /cin\s*>>/,
                'c++': /cin\s*>>/,
                'java': /Scanner\s+.*System\.in/,
                'javascript': /readline|prompt/ // Node/Web
            };

            const pattern = inputPatterns[language.toLowerCase()];
            if (pattern && pattern.test(code)) {
                setIsWaitingForInput(true);
                toast.info("Input required detected. Please enter input.");
                return;
            }
        }

        setIsRunning(true);
        if (newInput === null && !isWaitingForInput) {
            setRunOutput(''); // Clear output only on fresh start
        }
        setRunMetrics(null);

        try {
            let currentInputs = accumulatedInput;
            if (newInput !== null) {
                currentInputs = currentInputs ? currentInputs + '\n' + newInput : newInput;
                setAccumulatedInput(currentInputs);
            } else {
                if (!isWaitingForInput) {
                    currentInputs = input;
                    setAccumulatedInput(input);
                    // Retain input here too
                }
            }

            let result;
            result = await executeCode(code, language, currentInputs);
            setIsWaitingForInput(false);


            if (result.success || result.status === 'waiting_for_input') {
                setRunOutput(result.output);
                setRunMetrics({
                    time: result.time,
                    memory: result.memory
                });
                if (result.status !== 'waiting_for_input') {
                    toast.success('Execution successful');
                }
            } else {
                setRunOutput(result.error || result.output);
                toast.error('Execution failed');
            }
        } catch (error) {
            console.error('Run failed:', error);
            setRunOutput(`System Error: ${error.message}`);
            toast.error('Execution failed');
        } finally {
            setIsRunning(false);
        }
    };

    const handleVisualize = async (newInput = null) => {
        if (!code.trim()) {
            toast.warning('Please enter some code first');
            return;
        }

        setIsVisualizing(true);

        try {
            let currentInputs = accumulatedInput;

            // Logic to accumulate inputs or reset
            if (newInput !== null) {
                currentInputs = currentInputs ? currentInputs + '\n' + newInput : newInput;
                setAccumulatedInput(currentInputs);
            } else {
                if (!isWaitingForInput) {
                    // Start fresh if not in a wait loop
                    currentInputs = input; // Use standard input box as initial input
                    setAccumulatedInput(input);
                    // Retain input for better UX (don't clear)
                }
            }

            let data;
            data = await visualizeCode(code, language, currentInputs);
            setIsWaitingForInput(false);


            if (data && data.steps && data.steps.length > 0) {
                setVisualizationData(data);

                // If we provided input, we likely want to see the latest step
                if (newInput !== null) {
                    setCurrentStep(data.steps.length - 1);
                } else if (!isWaitingForInput && currentStep === 0) {
                    // Initial run
                    setCurrentStep(0);
                }

                setVisualizationMode(true);
                if (!isWaitingForInput && newInput === null) {
                    toast.success('Visualization ready!');
                }

                // Sync inputs back to main box if process is complete

            } else {
                toast.error('No visualization data');
            }
        } catch (error) {
            toast.error(`Visualization failed: ${error.message}`);
            setIsWaitingForInput(false);
        } finally {
            setIsVisualizing(false);
        }
    };

    const handleExitVisualization = () => {
        setVisualizationMode(false);
        setCurrentStep(0);
        setIsWaitingForInput(false);
        setAccumulatedInput('');
        setRunMetrics(null);
    };

    const handleStop = () => {
        setIsRunning(false);
        setIsVisualizing(false);
        setVisualizationMode(false);
        setIsWaitingForInput(false);
        setVisualizationData(null); // Clear data
        toast.info('Execution stopped');
    };

    // Auto-terminate if waiting for input for too long (60 seconds)
    useEffect(() => {
        let timeoutId;
        if (isWaitingForInput) {
            timeoutId = setTimeout(() => {
                handleStop();
                toast.info('Execution stopped due to inactivity (Input Timeout)');
            }, 600000);
        }
        return () => clearTimeout(timeoutId);
    }, [isWaitingForInput]);

    // Custom Modal Component
    const CustomModal = () => {
        if (!showModal) return null;

        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    backgroundColor: COLORS.white,
                    padding: SPACING.lg,
                    borderRadius: '12px',
                    boxShadow: SHADOWS.lg,
                    minWidth: '400px',
                    maxWidth: '500px'
                }}>
                    <h3 style={{ margin: '0 0 16px 0', color: COLORS.primary, fontSize: '18px' }}>
                        {modalConfig.type === 'confirm' ? 'Confirm' : 'Input Required'}
                    </h3>
                    <p style={{ margin: '0 0 20px 0', color: COLORS.textSecondary, fontSize: '14px' }}>
                        {modalConfig.message}
                    </p>
                    {modalConfig.type === 'input' && (
                        <input
                            type="text"
                            value={modalConfig.inputValue}
                            onChange={(e) => setModalConfig(prev => ({ ...prev, inputValue: e.target.value }))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    modalConfig.onConfirm(modalConfig.inputValue);
                                    setShowModal(false);
                                }
                            }}
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                border: `1px solid ${COLORS.mediumGray}`,
                                fontSize: '14px',
                                marginBottom: '20px'
                            }}
                            placeholder="Enter filename..."
                        />
                    )}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => setShowModal(false)}
                            style={{
                                padding: '8px 20px',
                                backgroundColor: COLORS.mediumGray,
                                color: COLORS.textPrimary,
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '14px'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                if (modalConfig.type === 'input') {
                                    modalConfig.onConfirm(modalConfig.inputValue);
                                } else {
                                    modalConfig.onConfirm();
                                }
                                setShowModal(false);
                            }}
                            style={{
                                padding: '8px 20px',
                                backgroundColor: COLORS.primary,
                                color: COLORS.white,
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '14px'
                            }}
                        >
                            {modalConfig.type === 'confirm' ? 'Delete' : 'OK'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: COLORS.offWhite,
                overflow: 'hidden',
                position: 'relative' // For global overlay
            }}
        >
            {/* (InputPrompt removed as per user request) */}

            {/* Header */}
            <div
                style={{
                    backgroundColor: COLORS.white,
                    borderBottom: `2px solid ${COLORS.mediumGray}`,
                    padding: SPACING.md,
                    boxShadow: SHADOWS.sm
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: SPACING.md
                    }}
                >
                    <div>
                        <h2
                            style={{
                                margin: 0,
                                color: COLORS.primary,
                                fontSize: '24px',
                                fontWeight: 700
                            }}
                        >
                            Coding Playground
                        </h2>
                        <p
                            style={{
                                margin: '4px 0 0 0',
                                color: COLORS.textSecondary,
                                fontSize: '14px'
                            }}
                        >
                            Universal Code Runner (C, C++, Java, Python, JS)
                        </p>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: SPACING.md,
                            flexWrap: 'wrap'
                        }}
                    >
                        <button
                            onClick={handleSave}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                backgroundColor: '#1e1e1e', // Dark button as per image
                                color: COLORS.white,
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '14px'
                            }}
                        >
                            <FaSave /> Save
                        </button>

                        <LanguageSelector

                            value={language}
                            onChange={handleLanguageChange}
                            disabled={visualizationMode}
                        />

                        {visualizationMode ? (
                            <button
                                onClick={handleExitVisualization}
                                style={{
                                    padding: '10px 20px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: COLORS.secondary,
                                    color: COLORS.white,
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                Exit Visualization
                            </button>
                        ) : (
                            <ControlButtons
                                onRun={() => handleRun(null)}
                                onVisualize={() => handleVisualize(null)}
                                isRunning={isRunning}
                                isVisualizing={isVisualizing}
                                disabled={!code.trim()}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                {visualizationMode ? (
                    <VisualizationPane
                        code={code}
                        language={language}
                        visualizationData={visualizationData}
                        currentStep={currentStep}
                        onStepChange={setCurrentStep}
                        isWaitingForInput={isWaitingForInput}
                        onInputSubmit={handleVisualize}
                    />
                ) : (
                    <div
                        style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'row', // Side by Side for Editor and IO
                            padding: SPACING.md,
                            gap: SPACING.md
                        }}
                    >

                        {/* Left: Sidebar (Saved Files) */}
                        <div style={{
                            width: '250px',
                            backgroundColor: '#1e1e1e',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            color: COLORS.white,
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                padding: '10px 15px',
                                borderBottom: '1px solid #333',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontWeight: 600, fontSize: '14px' }}>SAVED FILES</span>
                                <button
                                    onClick={handleCreateNewFile}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: COLORS.white,
                                        cursor: 'pointer',
                                        fontSize: '16px'
                                    }}
                                >
                                    +
                                </button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {savedFiles.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '12px' }}>
                                        No saved files
                                    </div>
                                ) : (
                                    savedFiles.map(file => (
                                        <div
                                            key={file._id}
                                            onClick={() => handleFileClick(file)}
                                            style={{
                                                padding: '8px 15px',
                                                cursor: 'pointer',
                                                backgroundColor: currentFileId === file._id ? '#37373d' : 'transparent',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                fontSize: '13px'
                                            }}
                                            className="file-item"
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                <FaFile size={12} color="#aaa" />
                                                {file.name}
                                            </span>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <button
                                                    onClick={(e) => handleRenameFile(e, file)}
                                                    style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', opacity: 0.8, padding: '2px', transition: 'all 0.2s' }}
                                                    title="Rename file"
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.opacity = '1';
                                                        e.currentTarget.style.color = '#4fc3f7';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.opacity = '0.8';
                                                        e.currentTarget.style.color = '#bbb';
                                                    }}
                                                >
                                                    <FaEdit size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteFile(e, file._id)}
                                                    style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', opacity: 0.8, fontSize: '18px', transition: 'all 0.2s' }}
                                                    title="Delete file"
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.opacity = '1';
                                                        e.currentTarget.style.color = '#f44336';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.opacity = '0.8';
                                                        e.currentTarget.style.color = '#bbb';
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Middle: Code Editor */}
                        <div
                            style={{
                                flex: 7, // Take remaining space
                                display: 'flex',
                                flexDirection: 'column',
                                gap: SPACING.sm,
                                minWidth: 0 // Prevent flex overflow
                            }}
                        >
                            <div
                                style={{
                                    flex: 1,
                                    backgroundColor: COLORS.white,
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    boxShadow: SHADOWS.md,
                                    border: `1px solid ${COLORS.mediumGray}`
                                }}
                            >
                                <CodeEditor
                                    code={code}
                                    language={language}
                                    onChange={(value) => setCode(value || '')}
                                    readOnly={false}
                                    height="100%"
                                />
                            </div>
                        </div>

                        {/* Right: Console (33%) - Unified Terminal */}
                        {/* Right: Console (33%) - Unified Terminal */}
                        <div
                            style={{
                                flex: 3.5,
                                display: 'flex',
                                flexDirection: 'column',
                                backgroundColor: COLORS.white,
                                borderRadius: '4px',
                                overflow: 'hidden',
                                border: `1px solid ${COLORS.mediumGray}`,
                                boxShadow: 'none' // Flat look as per image
                            }}
                        >
                            {/* Terminal Header */}
                            <div
                                style={{
                                    backgroundColor: COLORS.white,
                                    padding: '8px 12px',
                                    borderBottom: '1px solid #333333',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <span style={{ color: COLORS.textSecondary, fontSize: '14px', fontFamily: 'sans-serif' }}>
                                    Print output (drag lower right corner to resize)
                                </span>

                                {/* Stop Button - kept for functionality but made minimal */}
                                {(isRunning || isWaitingForInput || isVisualizing || visualizationMode) && (
                                    <button
                                        onClick={handleStop}
                                        title="Stop Execution"
                                        style={{
                                            backgroundColor: '#ef5350',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            color: 'white',
                                            fontSize: '10px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        STOP
                                    </button>
                                )}
                            </div>

                            {/* Output Area */}
                            <div
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    overflow: 'auto',
                                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                    fontSize: '14px',
                                    color: COLORS.textPrimary, // Black/Dark text
                                    whiteSpace: 'pre-wrap',
                                    backgroundColor: COLORS.white
                                }}
                            >
                                {!runOutput && !isRunning ? (
                                    // Empty state
                                    null
                                ) : (
                                    runOutput
                                )}
                                {/* Blinker for running state if needed, or inline with input */}
                            </div>

                            {/* Input Area (Bottom Prompt) - Visually merged */}
                            <div
                                style={{
                                    padding: '12px',
                                    backgroundColor: '#1e1e1e', // DARK terminal background
                                    borderTop: '1px solid #333',
                                }}
                            >
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleInputSubmit(input);
                                            setInput('');
                                        }
                                    }}
                                    placeholder="Type input here..."
                                    rows={1}
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#1e1e1e',   // DARK background
                                        color: '#ffffff',             // WHITE text
                                        border: '1px solid #444',     // ALWAYS visible border
                                        borderRadius: '6px',
                                        padding: '8px 10px',
                                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                        fontSize: '14px',
                                        resize: 'none',
                                        outline: 'none',              // ❌ remove focus outline
                                        boxShadow: 'none',            // ❌ remove pink glow
                                        caretColor: '#ffffff',        // white cursor
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <CustomModal />
        </div>
    );
};

export default CodePlayground;
