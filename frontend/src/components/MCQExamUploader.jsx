import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Download, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import * as mammoth from 'mammoth';
import examService from '../services/examService';

const MCQExamUploader = ({ onSuccess }) => {
  // State Management
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============ STYLING CONSTANTS ============
  const colors = {
    primary: '#3b82f6',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    slate50: '#f8fafc',
    slate100: '#f1f5f9',
    slate200: '#e2e8f0',
    slate300: '#cbd5e1',
    slate600: '#475569',
    slate700: '#334155',
    slate900: '#0f172a',
  };

  const uploadZoneStyle = {
    border: `2px dashed ${isDragging ? colors.primary : colors.slate300}`,
    borderRadius: '12px',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: isDragging ? `${colors.primary}10` : colors.slate50,
  };

  const buttonStyle = (variant = 'primary') => ({
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    ...(variant === 'primary' && {
      backgroundColor: colors.primary,
      color: 'white',
    }),
    ...(variant === 'secondary' && {
      backgroundColor: colors.slate100,
      color: colors.slate700,
      border: `1px solid ${colors.slate300}`,
    }),
    ...(variant === 'success' && {
      backgroundColor: colors.success,
      color: 'white',
    }),
    ...(variant === 'danger' && {
      backgroundColor: colors.error,
      color: 'white',
    }),
  });

  const errorPanelStyle = {
    backgroundColor: `${colors.error}15`,
    border: `1px solid ${colors.error}40`,
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
  };

  const previewContainerStyle = {
    backgroundColor: colors.slate50,
    borderRadius: '12px',
    padding: '24px',
    marginTop: '24px',
    border: `1px solid ${colors.slate200}`,
  };

  const metadataGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  };

  const metadataCardStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    border: `1px solid ${colors.slate200}`,
  };

  const badgeStyle = (color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    fontSize: '12px',
    fontWeight: 700,
    color: 'white',
    backgroundColor: color,
    marginRight: '12px',
  });

  const questionItemStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    border: `1px solid ${colors.slate200}`,
  };

  const optionStyle = (isCorrect) => ({
    marginLeft: '20px',
    padding: '8px 12px',
    marginBottom: '8px',
    borderRadius: '6px',
    fontSize: '14px',
    color: isCorrect ? colors.success : colors.slate700,
    fontWeight: isCorrect ? 600 : 400,
    backgroundColor: isCorrect ? `${colors.success}10` : 'transparent',
  });

  // ============ EVENT HANDLERS ============

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const selectedFile = droppedFiles[0];
      validateAndSetFile(selectedFile);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setErrors([]);

    // Validate file type
    const validTypes = ['text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const isValidType = validTypes.includes(selectedFile.type) ||
      selectedFile.name.endsWith('.txt') ||
      selectedFile.name.endsWith('.docx');

    if (!isValidType) {
      setErrors(['Only .txt and .docx files are supported']);
      return;
    }

    // Validate file size (max 5MB)
    const maxSizeMB = 5;
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      setErrors([`File size must be less than ${maxSizeMB}MB`]);
      return;
    }

    setFile(selectedFile);
    setParsedData(null);
  };

  // ============ DOCUMENT PARSERS ============

  const extractTextFromDocx = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      throw new Error(`Failed to parse Word document: ${error.message}`);
    }
  };

  const parseTxtFormat = (text) => {
    // Split by newline but KEEP empty lines and indentation for code blocks
    const lines = text.split('\n');

    let metadata = {
      title: '',
      duration: 30, // Default duration
      thresholds: {
        good: 50,
        excellent: 80,
      },
    };

    let questions = [];
    let currentQuestion = null;
    let lineIndex = 0;
    let inFence = false;
    let fenceBuffer = null;

    // Parse metadata
    while (lineIndex < lines.length) {
      const line = lines[lineIndex];
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('TITLE:')) {
        metadata.title = trimmedLine.replace('TITLE:', '').trim();
        lineIndex++;
      } else if (trimmedLine.startsWith('DURATION:')) {
        const parsedDuration = parseInt(trimmedLine.replace('DURATION:', '').trim());
        if (!isNaN(parsedDuration) && parsedDuration > 0) {
          metadata.duration = parsedDuration;
        }
        lineIndex++;
      } else if (trimmedLine.startsWith('AMBER:')) {
        metadata.thresholds.good = parseInt(trimmedLine.replace('AMBER:', '').trim());
        lineIndex++;
      } else if (trimmedLine.startsWith('GREEN:')) {
        metadata.thresholds.excellent = parseInt(trimmedLine.replace('GREEN:', '').trim());
        lineIndex++;
      }
      else if (trimmedLine.startsWith('Q:') || /^\d+\./.test(trimmedLine)) {
        // Start of questions section
        break;
      } else {
        lineIndex++;
      }
    }

    // Parse questions
    while (lineIndex < lines.length) {
      const line = lines[lineIndex];
      const trimmedLine = line.trim();

      // Skip empty lines if we are NOT inside a question's code block
      // But if we are inside a question, empty lines might be part of the code/text
      // For simplicity, we'll generally skip empty lines unless they seem significant,
      // but usually trimming empty lines at the start/end of a question text is good.
      if (!trimmedLine && !currentQuestion) {
        lineIndex++;
        continue;
      }

      // If inside a fenced code block, capture until closing fence
      if (inFence) {
        if (trimmedLine.startsWith('```')) {
          // end fence
          inFence = false;
          if (currentQuestion && fenceBuffer) {
            currentQuestion.code = (currentQuestion.code ? currentQuestion.code + '\n' : '') + fenceBuffer.join('\n');
          }
          fenceBuffer = null;
          lineIndex++;
          continue;
        } else {
          // preserve raw line inside fence
          fenceBuffer.push(line);
          lineIndex++;
          continue;
        }
      }

      // Question line (Start of new question)
      if (trimmedLine.startsWith('Q:') || /^\d+\./.test(trimmedLine)) {
        if (currentQuestion) {
          questions.push(currentQuestion);
        }

        const questionText = trimmedLine.replace(/^Q:|^\d+\./, '').trim();
        currentQuestion = {
          text: questionText,
          code: '',
          options: [],
          correctAnswerIndex: null,
        };
        lineIndex++;
        continue;
      }
      // Option line (A), B), C), D))
      else if (/^[A-D]\)/.test(trimmedLine)) {
        if (currentQuestion) {
          const optionLetter = trimmedLine[0];
          let optionText = trimmedLine.replace(/^[A-D]\)\s*/, '').trim();

          // Check if marked as correct (*, [CORRECT], or ✓)
          const isCorrect = optionText.includes('*') ||
            optionText.includes('[CORRECT]') ||
            optionText.includes('✓');

          optionText = optionText.replace(/\*|\[CORRECT\]|✓/g, '').trim();

          const optionIndex = currentQuestion.options.length;
          currentQuestion.options.push({
            letter: optionLetter,
            text: optionText,
          });

          if (isCorrect) {
            currentQuestion.correctAnswerIndex = optionIndex;
          }
        }
      }
      // Start of fenced code block
      else if (trimmedLine.startsWith('```')) {
        if (!currentQuestion) {
          lineIndex++;
          continue;
        }
        inFence = true;
        fenceBuffer = [];
      }
      // Indented code block (4 spaces or a tab)
      else if (currentQuestion && (/^\s{4,}/.test(line) || /^\t+/.test(line))) {
        // collect consecutive indented lines as a code block
        const codeLines = [];
        while (lineIndex < lines.length && (/^\s{4,}/.test(lines[lineIndex]) || /^\t+/.test(lines[lineIndex]))) {
          // remove 4-space indent or a leading tab for display
          codeLines.push(lines[lineIndex].replace(/^\s{4}/, '').replace(/^\t/, ''));
          lineIndex++;
        }
        currentQuestion.code = (currentQuestion.code ? currentQuestion.code + '\n' : '') + codeLines.join('\n');
        continue; // already advanced lineIndex
      }
      // Support "Answer: A" format
      else if (trimmedLine.startsWith("Answer:")) {
        if (currentQuestion) {
          const letter = trimmedLine.replace("Answer:", "").trim().toUpperCase();
          const index = letter.charCodeAt(0) - 65; // Convert A->0, B->1...

          if (!isNaN(index) && currentQuestion.options[index]) {
            currentQuestion.correctAnswerIndex = index;
          }
        }
      }
      // Multi-line question text support
      // If we are inside a question, and it's not an option or answer, append to question text
      else if (currentQuestion && currentQuestion.options.length === 0) {
        // Detect inline code-like lines (eg. '#include', semicolons, printf, return, braces)
        const isCodeLine = (l) => {
          const t = l.trim();
          if (!t) return false;
          if (/^#include\b/.test(t)) return true;
          if (/\bprintf\s*\(/.test(t)) return true;
          if (/\breturn\b/.test(t)) return true;
          if (/[;{}]/.test(t) && /\(.+\)/.test(t)) return true; // function-like lines
          if (/^[\s]*int\s+main\s*\(|^void\s+main\s*\(/.test(t)) return true;
          // lines with many punctuation typical of code
          if (/[=<>+*-]/.test(t) && /;/.test(t)) return true;
          return false;
        };

        if (isCodeLine(line)) {
          // Collect subsequent lines that look like code until we hit an option / answer / blank line followed by option
          const codeLines = [];
          while (lineIndex < lines.length) {
            const look = lines[lineIndex];
            const lookTrim = look.trim();
            // stop if next section appears to be option or new question
            if (/^[A-D]\)/.test(lookTrim) || lookTrim.startsWith('Answer:') || lookTrim.startsWith('Q:') || /^\d+\./.test(lookTrim)) break;
            // if empty line followed by option ahead, break
            if (!lookTrim) {
              const ahead = (lines[lineIndex + 1] || '').trim();
              if (/^[A-D]\)/.test(ahead) || ahead.startsWith('Answer:') || ahead.startsWith('Q:') || /^\d+\./.test(ahead)) break;
            }
            codeLines.push(look);
            lineIndex++;
          }

          // Format inline code: split statements at ';' and braces to place on new lines
          let rawCode = codeLines.join('\n');
          // Normalize Windows CRLF
          rawCode = rawCode.replace(/\r/g, '')
            .replace(/;\s*/g, ';\n')
            .replace(/\{\s*/g, '{\n')
            .replace(/\s*\}/g, '\n}')
            .split('\n').map(l => l.replace(/^\s{4}/, '').replace(/^\t/, '')).join('\n')
            .trim();

          currentQuestion.code = (currentQuestion.code ? currentQuestion.code + '\n' : '') + rawCode;
          continue; // we've already advanced lineIndex appropriately
        }

        // If not code, append the RAW line to preserve indentation and spacing
        currentQuestion.text += '\n' + line; // Use raw line, not trimmed
      }

      lineIndex++;
    }

    // Add last question
    if (currentQuestion) {
      questions.push(currentQuestion);
    }

    // Post-processing: Trim trailing whitespace from question text
    questions.forEach(q => {
      q.text = q.text.trim();
    });

    return {
      metadata,
      questions,
    };
  };

  // ============ VALIDATION ============

  const validateExamData = (data) => {
    const validationErrors = [];

    // Title validation
    if (!data.metadata.title || data.metadata.title.trim().length === 0) {
      validationErrors.push('Exam title is required');
    }

    // Duration validation
    if (!data.metadata.duration || data.metadata.duration < 1) {
      validationErrors.push('Exam duration must be at least 1 minute');
    }

    // Questions validation
    if (!data.questions || data.questions.length === 0) {
      validationErrors.push('At least 1 question is required');
    }

    // Questions content validation
    data.questions.forEach((q, index) => {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return [];
      }

      if (q.correctAnswerIndex === null) {
        validationErrors.push(`Question ${index + 1}: Must have at least 1 correct answer`);
      }
    });

    // Grading thresholds validation
    const { good, excellent } = data.metadata.thresholds;
    if (good >= excellent) {
      validationErrors.push('Grading thresholds must be in ascending order (Amber < Green)');
    }

    return validationErrors;
  };

  // ============ PARSING HANDLER ============

  const handleParse = async () => {
    if (!file) return;

    setIsProcessing(true);
    setErrors([]);

    try {
      let text = '';

      if (file.name.endsWith('.docx')) {
        text = await extractTextFromDocx(file);
      } else {
        text = await file.text();
      }

      const parsed = parseTxtFormat(text);
      const validationErrors = validateExamData(parsed);

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setIsProcessing(false);
        return;
      }

      setParsedData(parsed);
      toast.success('Document parsed successfully!');
    } catch (error) {
      setErrors([error.message || 'Failed to parse document']);
      toast.error('Error parsing document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateExam = async () => {
    if (!parsedData) return;

    setIsSubmitting(true);

    try {
      // ⭐ Read URL parameters for module exam association
      const params = new URLSearchParams(window.location.search);
      const courseIdFromParams = params.get("courseId");
      const weekNumberFromParams = params.get("weekNumber");

      console.log('[MCQExamUploader] URL params:', {
        courseId: courseIdFromParams,
        weekNumber: weekNumberFromParams,
        fullURL: window.location.href
      });

      // Transform parsed data to match backend schema
      // NOTE: duration and scheduling are now handled during publishing in AdminExamsPage
      const examPayload = {
        title: parsedData.metadata.title,
        duration: parsedData.metadata.duration || 30,
        totalMarks: parsedData.questions.length,

        // Required by backend
        qualificationPercentage: parsedData.metadata.thresholds.good,
        goodMin: parsedData.metadata.thresholds.good,
        excellentMin: parsedData.metadata.thresholds.excellent,
        averageMin: parsedData.metadata.thresholds.good,

        // ⭐ Module association from URL params
        ...(courseIdFromParams ? { courseId: courseIdFromParams } : {}),
        ...(weekNumberFromParams ? { weekNumber: Number(weekNumberFromParams) } : {}),
        ...(courseIdFromParams && weekNumberFromParams ? { isInModule: true, published: true } : {}),

        questions: parsedData.questions.map((q) => ({
          title: q.text,
          code: q.code || '',
          type: "mcq",
          marks: 1,
          options: q.options.map((opt, i) => ({
            text: opt.text,
            isCorrect: i === q.correctAnswerIndex
          }))
        }))
      };

      console.log('[MCQExamUploader] Sending to backend:', {
        courseId: examPayload.courseId,
        weekNumber: examPayload.weekNumber,
        isInModule: examPayload.isInModule,
        title: examPayload.title
      });

      const response = await examService.createExam(examPayload);
      toast.success('Exam created successfully!');

      // Reset state
      setFile(null);
      setParsedData(null);
      setErrors([]);

      if (onSuccess) {
        // Pass the created exam object back to parent
        onSuccess(response?.data || response);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to create exam';
      setErrors([errorMsg]);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============ SAMPLE DOCUMENT GENERATOR ============

  const downloadSampleDocument = () => {
    const sampleContent = `TITLE: Basic Science Quiz
AMBER: 50
GREEN: 80

Q: What is the chemical symbol for Gold?
A) Au
B) Gd
C) Go
D) Gl
Answer: A

Q: Which planet is known as the Red Planet?
A) Venus
B) Jupiter
C) Mars
D) Saturn
Answer: C

Q: What is the boiling point of water at sea level?
A) 90°C
B) 100°C
C) 110°C
D) 120°C
Answer: B

Q: How many bones are in the adult human body?
A) 186
B) 206
C) 226
D) 246
Answer: B

Q: What is the smallest prime number?
A) 1
B) 2
C) 3
D) 5
Answer: B`;

    const blob = new Blob([sampleContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'MCQ_Sample_Format.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
    toast.success('Sample document downloaded!');
  };


  // ============ RENDER ============

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.slate900, marginBottom: '8px' }}>
        Create MCQ Exam from Document
      </h1>
      <p style={{ fontSize: '14px', color: colors.slate600, marginBottom: '24px' }}>
        Upload a Word or Text document containing MCQ questions to automatically create an exam.
      </p>

      {/* Error Panel */}
      {errors.length > 0 && (
        <div style={errorPanelStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertCircle size={20} style={{ color: colors.error, flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600, color: colors.error }}>
                Validation Errors
              </h3>
              <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '13px' }}>
                {errors.map((err, idx) => (
                  <li key={idx} style={{ color: colors.slate700, marginBottom: '4px' }}>
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Upload Zone - Show only if no parsed data */}
      {!parsedData && (
        <div>
          <div
            style={uploadZoneStyle}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <Upload size={48} style={{ color: colors.primary, margin: '0 auto 16px', opacity: 0.8 }} />
            <p style={{ fontSize: '16px', fontWeight: 600, color: colors.slate900, margin: '0 0 8px' }}>
              {isDragging ? 'Drop your file here' : 'Drag and drop your file here or click to select'}
            </p>
            <p style={{ fontSize: '13px', color: colors.slate600, margin: 0 }}>
              Supported formats: .txt, .docx (Max 5MB)
            </p>
          </div>

          <input
            id="file-input"
            type="file"
            accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* File Info */}
          {file && (
            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: colors.slate50, borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <FileText size={20} style={{ color: colors.primary }} />
                <div>
                  <p style={{ margin: '0', fontSize: '14px', fontWeight: 600, color: colors.slate900 }}>
                    {file.name}
                  </p>
                  <p style={{ margin: '0', fontSize: '12px', color: colors.slate600 }}>
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  style={buttonStyle('primary')}
                  onClick={handleParse}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Parsing...' : 'Parse Document'}
                </button>
                <button
                  style={buttonStyle('secondary')}
                  onClick={() => {
                    setFile(null);
                    setParsedData(null);
                    setErrors([]);
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Download Sample Button */}
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              style={buttonStyle('secondary')}
              onClick={downloadSampleDocument}
            >
              <Download size={16} />
              Download Sample Format
            </button>
          </div>
        </div>
      )}

      {/* Preview Section - Show only if parsed data exists */}
      {parsedData && (
        <div style={previewContainerStyle}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: colors.slate900, margin: '0 0 20px' }}>
            Preview
          </h2>

          {/* Metadata */}
          <div style={metadataGridStyle}>
            <div style={metadataCardStyle}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: colors.slate600, fontWeight: 500, textTransform: 'uppercase' }}>
                Title
              </p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: colors.slate900 }}>
                {parsedData.metadata.title}
              </p>
            </div>

            <div style={metadataCardStyle}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: colors.slate600, fontWeight: 500, textTransform: 'uppercase' }}>
                Total Questions
              </p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: colors.slate900 }}>
                {parsedData.questions.length}
              </p>
            </div>

            <div style={metadataCardStyle}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: colors.slate600, fontWeight: 500, textTransform: 'uppercase' }}>
                Total Marks
              </p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: colors.slate900 }}>
                {parsedData.questions.length}
              </p>
            </div>
          </div>


          {/* Grading Thresholds */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: colors.slate900, margin: '0 0 12px', textTransform: 'uppercase' }}>
              Grading Thresholds
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={badgeStyle('#ef4444')}>
                  {parsedData.metadata.thresholds.good}%
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: colors.slate600, fontWeight: 500 }}>RED (FAIL)</p>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: colors.slate900 }}>Below {parsedData.metadata.thresholds.good}%</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={badgeStyle('#f59e0b')}>
                  {parsedData.metadata.thresholds.good}%
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: colors.slate600, fontWeight: 500 }}>AMBER (GOOD)</p>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: colors.slate900 }}>{parsedData.metadata.thresholds.good}-{parsedData.metadata.thresholds.excellent - 1}%</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={badgeStyle('#10b981')}>
                  {parsedData.metadata.thresholds.excellent}%
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: colors.slate600, fontWeight: 500 }}>GREEN (EXCELLENT)</p>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: colors.slate900 }}>{parsedData.metadata.thresholds.excellent}% and above</p>
                </div>
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: colors.slate900, margin: '0 0 12px', textTransform: 'uppercase' }}>
              Questions ({parsedData.questions.length})
            </h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
              {parsedData.questions.map((question, qIdx) => (
                <div key={qIdx} style={questionItemStyle}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: colors.primary,
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '14px',
                        flexShrink: 0,
                      }}
                    >
                      {qIdx + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: colors.slate900, whiteSpace: 'pre-wrap' }}>
                        {question.text}
                      </p>
                      {question.code && (
                        <pre style={{ marginTop: '12px', background: '#0f172a0a', padding: '12px', borderRadius: '6px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace', overflowX: 'auto', fontSize: '13px', whiteSpace: 'pre' }}>
                          <code style={{ whiteSpace: 'pre' }}>{question.code}</code>
                        </pre>
                      )}
                    </div>
                  </div>

                  {question.options.map((option, oIdx) => (
                    <div key={oIdx} style={optionStyle(oIdx === question.correctAnswerIndex)}>
                      <span style={{ fontWeight: 600 }}>{option.letter})</span> {option.text}
                      {oIdx === question.correctAnswerIndex && (
                        <CheckCircle size={14} style={{ marginLeft: '8px', display: 'inline' }} />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
            <button
              style={buttonStyle('secondary')}
              onClick={() => {
                setFile(null);
                setParsedData(null);
                setErrors([]);
              }}
              disabled={isSubmitting}
            >
              Back
            </button>
            <button
              style={buttonStyle('success')}
              onClick={handleCreateExam}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Exam'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MCQExamUploader;
