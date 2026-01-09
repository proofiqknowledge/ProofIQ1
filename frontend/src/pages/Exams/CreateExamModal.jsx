import React, { useState } from "react";

const CreateExamModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: "",
    duration: 60,
    questions: [],
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    title: "",
    type: "mcq",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "duration" ? parseInt(value) : value,
    }));
  };

  const handleQuestionInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentQuestion((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMCQOptions = (index, field, value) => {
    const options = currentQuestion.options ? [...currentQuestion.options] : [];
    options[index] = { ...options[index], [field]: value };
    setCurrentQuestion((prev) => ({
      ...prev,
      options,
    }));
  };

  const handleTestCaseChange = (index, field, value) => {
    const testCases = currentQuestion.testCases ? [...currentQuestion.testCases] : [];
    testCases[index] = { ...testCases[index], [field]: value };
    setCurrentQuestion((prev) => ({
      ...prev,
      testCases,
    }));
  };

  const addMCQOption = () => {
    setCurrentQuestion((prev) => ({
      ...prev,
      options: [...(prev.options || []), { text: "", isCorrect: false }],
    }));
  };

  const removeMCQOption = (index) => {
    setCurrentQuestion((prev) => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== index),
    }));
  };

  const addTestCase = () => {
    setCurrentQuestion((prev) => ({
      ...prev,
      testCases: [...(prev.testCases || []), { input: "", expectedOutput: "" }],
    }));
  };

  const removeTestCase = (index) => {
    setCurrentQuestion((prev) => ({
      ...prev,
      testCases: (prev.testCases || []).filter((_, i) => i !== index),
    }));
  };

  const addQuestion = () => {
    if (!currentQuestion.title.trim()) {
      alert("Please enter question title");
      return;
    }

    if (currentQuestion.type === "mcq") {
      if (!currentQuestion.options || currentQuestion.options.length < 2) {
        alert("MCQ must have at least 2 options");
        return;
      }
      if (!currentQuestion.options.some((opt) => opt.isCorrect)) {
        alert("Please select at least one correct option");
        return;
      }
    }

    if (currentQuestion.type === "coding") {
      if (!currentQuestion.language) {
        alert("Please select a programming language");
        return;
      }
      if (!currentQuestion.testCases || currentQuestion.testCases.length === 0) {
        alert("Coding question must have at least one test case");
        return;
      }
    }

    const newQuestion = {
      ...currentQuestion,
      marks: 1,
    };

    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));

    setCurrentQuestion({
      title: "",
      type: "mcq",
    });
  };

  const removeQuestion = (index) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("Please enter Assessment title");
      return;
    }

    if (formData.questions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    const computedTotalMarks = formData.questions.reduce(
      (sum, q) => sum + (q.marks || 1),
      0
    );

    onSubmit({
      ...formData,
      totalMarks: computedTotalMarks,
    });
    setFormData({
      title: "",
      duration: 60,
      questions: [],
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content create-exam-modal">
        <div className="modal-header">
          <h2>Create New Assessment</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {/* Exam Details */}
            <div className="form-section">
              <h3>Assessment Details</h3>

              <div className="form-group">
                <label htmlFor="title">Assessment Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter Assessment title"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="duration">Duration (minutes) *</label>
                  <input
                    type="number"
                    id="duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    min="1"
                    max="480"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="examType">Assessment Type *</label>
                  <select
                    id="examType"
                    name="examType"
                    value={formData.examType || 'mcq'}
                    onChange={handleInputChange}
                  >
                    <option value="mcq">MCQ (Multiple Choice)</option>
                    <option value="coding">Coding (Programming)</option>
                    <option value="theory">Theory (Written)</option>
                  </select>
                  <small style={{ display: 'block', marginTop: '5px', color: '#64748b' }}>
                    Standard RAG thresholds apply: <span style={{ color: '#2ECC71' }}>Green ≥ 80%</span>, <span style={{ color: '#F39C12' }}>Amber ≥ 50%</span>, <span style={{ color: '#E74C3C' }}>Red &lt; 50%</span>.
                  </small>
                </div>
              </div>
            </div>

            {/* Question Builder */}
            <div className="form-section">
              <h3>Add Questions</h3>

              <div className="question-builder">
                <div className="form-group">
                  <label htmlFor="q-title">Question *</label>
                  <input
                    type="text"
                    id="q-title"
                    name="title"
                    value={currentQuestion.title}
                    onChange={handleQuestionInputChange}
                    placeholder="Enter question text"
                  />
                </div>

                {/* MCQ Options */}
                {currentQuestion.type === "mcq" && (
                  <div className="question-type-section">
                    <label>Options *</label>
                    <div className="options-list">
                      {(currentQuestion.options || []).map((option, idx) => (
                        <div key={idx} className="option-input">
                          <input
                            type="text"
                            value={option.text}
                            onChange={(e) => handleMCQOptions(idx, "text", e.target.value)}
                            placeholder={`Option ${idx + 1}`}
                          />
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={option.isCorrect || false}
                              onChange={(e) => handleMCQOptions(idx, "isCorrect", e.target.checked)}
                            />
                            Correct
                          </label>
                          <button
                            type="button"
                            className="btn-remove"
                            onClick={() => removeMCQOption(idx)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn-add-option"
                      onClick={addMCQOption}
                    >
                      + Add Option
                    </button>
                  </div>
                )}

                {/* Coding Question */}
                {currentQuestion.type === "coding" && (
                  <div className="question-type-section">
                    <div className="form-group">
                      <label htmlFor="q-language">Programming Language *</label>
                      <select
                        id="q-language"
                        name="language"
                        value={currentQuestion.language || ""}
                        onChange={handleQuestionInputChange}
                      >
                        <option value="">Select Language</option>
                        <option value="cpp">C++</option>
                        <option value="java">Java</option>
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="c">C</option>
                      </select>
                    </div>

                    {/* Function Template Fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label>Function Name</label>
                        <input
                          type="text"
                          name="functionName"
                          value={currentQuestion.functionName || ""}
                          onChange={handleQuestionInputChange}
                          placeholder="e.g., add"
                        />
                      </div>
                      <div className="form-group">
                        <label>Function Signature</label>
                        <input
                          type="text"
                          name="functionSignature"
                          value={currentQuestion.functionSignature || ""}
                          onChange={handleQuestionInputChange}
                          placeholder="e.g., def add(a, b):"
                          style={{ fontFamily: "'Courier New', monospace" }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Hidden Main Block (Executes logic)</label>
                      <textarea
                        name="mainBlock"
                        value={currentQuestion.mainBlock || ""}
                        onChange={handleQuestionInputChange}
                        rows={6}
                        placeholder="# Hidden code that calls the student's function&#10;if __name__ == '__main__':&#10;    a = int(input())&#10;    b = int(input())&#10;    print(add(a, b))"
                        style={{
                          backgroundColor: "#f0fdf4",
                          fontFamily: "'Courier New', monospace",
                        }}
                      />
                      <small style={{ color: "#64748b" }}>This code is hidden from students. It reads input, calls the function, and prints output.</small>
                    </div>

                    <div className="form-group">
                      <label htmlFor="q-boilerplate">Boilerplate Code</label>
                      <textarea
                        id="q-boilerplate"
                        name="boilerplate"
                        value={currentQuestion.boilerplate || ""}
                        onChange={handleQuestionInputChange}
                        placeholder="Enter starter code (optional)"
                        rows={4}
                      />
                    </div>

                    <label>Test Cases *</label>
                    <div className="test-cases-list">
                      {(currentQuestion.testCases || []).map((testCase, idx) => (
                        <div key={idx} className="test-case-input">
                          <textarea
                            value={testCase.description || ""}
                            onChange={(e) => handleTestCaseChange(idx, "description", e.target.value)}
                            placeholder="Description (Optional)"
                            rows={1}
                            style={{ marginBottom: '5px' }}
                          />
                          <textarea
                            value={testCase.input}
                            onChange={(e) => handleTestCaseChange(idx, "input", e.target.value)}
                            placeholder="Input"
                            rows={2}
                          />
                          <textarea
                            value={testCase.expectedOutput}
                            onChange={(e) => handleTestCaseChange(idx, "expectedOutput", e.target.value)}
                            placeholder="Expected Output"
                            rows={2}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}>
                              <input
                                type="checkbox"
                                checked={testCase.isHidden || false}
                                onChange={(e) => handleTestCaseChange(idx, "isHidden", e.target.checked)}
                              />
                              Hidden Test Case
                            </label>
                            <button
                              type="button"
                              className="btn-remove"
                              onClick={() => removeTestCase(idx)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn-add-test-case"
                      onClick={addTestCase}
                    >
                      + Add Test Case
                    </button>
                  </div>
                )}

                {/* Theory Question */}
                {currentQuestion.type === "theory" && (
                  <div className="question-type-section">
                    <div className="form-group">
                      <label htmlFor="q-maxLength">Max Answer Length (characters)</label>
                      <input
                        type="number"
                        id="q-maxLength"
                        name="maxLength"
                        value={currentQuestion.maxLength ?? 10000}
                        onChange={handleQuestionInputChange}
                        min="100"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="btn-add-question"
                  onClick={addQuestion}
                >
                  + Add Question
                </button>
              </div>
            </div>

            {/* Questions Summary */}
            {formData.questions.length > 0 && (
              <div className="form-section">
                <h3>Added Questions ({formData.questions.length})</h3>
                <div className="questions-summary">
                  {formData.questions.map((q, idx) => (
                    <div key={idx} className="question-summary-item">
                      <div className="question-info">
                        <span className="question-number">{idx + 1}</span>
                        <div className="question-details">
                          <p className="question-title">{q.title}</p>
                          <div className="question-meta">
                            <span className="badge">{q.type.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-remove-question"
                        onClick={() => removeQuestion(idx)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create Assessment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateExamModal;
