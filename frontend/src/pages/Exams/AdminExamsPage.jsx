import MCQExamUploader from '../../components/MCQExamUploader';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ExternalLink, Users, UserMinus, BadgeCheck, Trash2, CheckCircle, Calendar, Clock, X, Edit } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as examService from '../../services/examService';
import * as userService from '../../services/userService';
import * as batchService from '../../services/batchService';
import AssignExamModal from '../../components/AssignExamModal';
import UnassignExamModal from '../../components/UnassignExamModal';  // ✅ NEW
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import InputSchemaBuilder from '../../components/InputSchemaBuilder';
import OutputTypeSelector from '../../components/OutputTypeSelector';

import { Upload } from 'lucide-react';
import { getTemplate } from '../../utils/codeTemplates';
import { problemTemplates } from '../../utils/problemTemplates';


const determineQuestionType = (examType) => {
  switch (examType) {
    case 'coding':
      return 'coding';
    case 'theory':
      return 'theory';
    default:
      return 'mcq';
  }
};

const ExamCardActionButton = ({ title, onClick, icon: Icon, variant = 'default' }) => {
  const [hover, setHover] = useState(false);

  const style = {
    padding: '0.5rem',
    backgroundColor: variant === 'danger'
      ? (hover ? '#fecaca' : '#fee2e2')
      : (hover ? '#e5e7eb' : '#f3f4f6'),
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    color: variant === 'danger' ? '#dc2626' : '#374151'
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={style}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Icon size={18} />
    </button>
  );
};

const ExamCard = ({
  exam,
  onOpen,
  onAssign,
  onManageAssignments,  // ✅ NEW
  onEdit,  // ✅ NEW
  onPublishToggle,
  onDelete,
  styles: {
    examCardStyle,
    examCardHeaderStyle,
    examTitleStyle,
    statusBadgeStyle,
    examDetailsStyle,
    detailRowStyle,
    detailLabelStyle,
    detailValueStyle,
    actionsStyle,
    viewDetailsButtonStyle,
  }
}) => (
  <div
    style={examCardStyle}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
  >
    <div style={examCardHeaderStyle}>
      <h3 style={examTitleStyle}>{exam.title}</h3>
      <span style={statusBadgeStyle(exam.published)}>
        {exam.published ? '✓ Published' : '◯ Draft'}
      </span>
    </div>

    <div style={examDetailsStyle}>
      <div style={detailRowStyle}>
        <span style={detailLabelStyle}>RAG Thresholds</span>
        <span style={detailValueStyle}>
          Green ≥ {exam.excellentMin ?? 80}% | Amber ≥ {exam.goodMin ?? 50}%
        </span>
      </div>
      <div style={detailRowStyle}>
        <span style={detailLabelStyle}>Scheduling</span>
        <span style={detailValueStyle}>
          {exam.startDate || exam.endDate ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              {exam.startDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#10b981', fontWeight: '500' }}>
                  <Calendar size={12} /> {new Date(exam.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              )}
              {exam.endDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#ef4444', fontWeight: '500' }}>
                  <Clock size={12} /> {new Date(exam.endDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              )}
            </div>
          ) : (
            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Not scheduled</span>
          )}
        </span>
      </div>
      <div style={detailRowStyle}>
        <span style={detailLabelStyle}>Duration</span>
        <span style={detailValueStyle}>{exam.duration} min</span>
      </div>
      <div style={detailRowStyle}>
        <span style={detailLabelStyle}>Questions</span>
        <span style={detailValueStyle}>{exam.questions?.length || 0}</span>
      </div>
      <div style={detailRowStyle}>
        <span style={detailLabelStyle}>Assigned To</span>
        <span style={detailValueStyle}>
          {exam.assignedTo?.users?.length + exam.assignedTo?.batches?.length > 0 ? (
            <>
              {exam.assignedTo.users.length > 0 && `${exam.assignedTo.users.length} users`}
              {exam.assignedTo.users.length > 0 && exam.assignedTo.batches.length > 0 && ', '}
              {exam.assignedTo.batches.length > 0 && `${exam.assignedTo.batches.length} batches`}
            </>
          ) : (
            'Not assigned'
          )}
        </span>
      </div>
    </div>

    <div style={actionsStyle}>
      <button
        style={viewDetailsButtonStyle}
        onClick={() => onOpen(exam)}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bfdbfe'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
        title="Open exam analytics"
      >
        <ExternalLink size={18} />
        <span>Open</span>
      </button>

      <ExamCardActionButton
        title={exam.published ? 'Unpublish' : 'Publish'}
        icon={BadgeCheck}
        onClick={() => onPublishToggle(exam)}
      />

      <ExamCardActionButton
        title="Assign to users or batches"
        icon={Users}
        onClick={() => onAssign(exam)}
      />

      <ExamCardActionButton
        title="Edit exam"
        icon={Edit}
        onClick={() => onEdit(exam)}
      />

      <ExamCardActionButton
        title="Manage assignments"
        icon={UserMinus}
        onClick={() => onManageAssignments(exam)}
      />

      <ExamCardActionButton
        title="Delete exam"
        icon={Trash2}
        variant="danger"
        onClick={() => onDelete(exam)}
      />
    </div>
  </div >
);

const PublishExamModal = ({ isOpen, onClose, onConfirm, exam }) => {
  const [duration, setDuration] = useState(exam?.duration || 60);
  const [schedule, setSchedule] = useState({
    startDate: exam?.startDate ? new Date(exam.startDate).toISOString().slice(0, 10) : '',
    startTime: exam?.startDate ? new Date(exam.startDate).toTimeString().slice(0, 5) : '09:00',
    endDate: exam?.endDate ? new Date(exam.endDate).toISOString().slice(0, 10) : '',
    endTime: exam?.endDate ? new Date(exam.endDate).toTimeString().slice(0, 5) : '18:00',
  });

  if (!isOpen) return null;

  const handleScheduleChange = (field, value) => {
    setSchedule(prev => ({ ...prev, [field]: value }));
  };

  const onPublish = () => {
    // Validation
    const startDateTime = new Date(`${schedule.startDate}T${schedule.startTime}`);
    const endDateTime = new Date(`${schedule.endDate}T${schedule.endTime}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      toast.error('Please provide valid start and end dates/times');
      return;
    }

    if (startDateTime >= endDateTime) {
      toast.error('Start time must be before end time');
      return;
    }

    if (duration < 1) {
      toast.error('Duration must be at least 1 minute');
      return;
    }

    onConfirm({
      duration,
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
    });
  };

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    backdropFilter: 'blur(4px)',
  };

  const modalContentStyle = {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '32px',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    border: '1px solid #e2e8f0',
  };

  const inputGroupStyle = {
    marginBottom: '20px',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '8px',
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={24} color="#3b82f6" />
            Schedule & Publish Exam
          </h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', borderRadius: '4px', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
            <X size={20} />
          </button>
        </div>

        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '28px', lineHeight: '1.6' }}>
          Define the participation window and duration for <strong>{exam?.title}</strong>. Students can only start the exam within this timeframe.
        </p>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} /> Exam Duration (Minutes)
            </div>
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
            style={inputStyle}
            min="1"
            placeholder="e.g. 60"
          />
        </div>

        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} /> Scheduling Window
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ ...labelStyle, fontSize: '12px', color: '#64748b' }}>Start Date</label>
              <input
                type="date"
                value={schedule.startDate}
                onChange={(e) => handleScheduleChange('startDate', e.target.value)}
                style={{ ...inputStyle, backgroundColor: '#fff' }}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: '12px', color: '#64748b' }}>Start Time</label>
              <input
                type="time"
                value={schedule.startTime}
                onChange={(e) => handleScheduleChange('startTime', e.target.value)}
                style={{ ...inputStyle, backgroundColor: '#fff' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ ...labelStyle, fontSize: '12px', color: '#64748b' }}>End Date</label>
              <input
                type="date"
                value={schedule.endDate}
                onChange={(e) => handleScheduleChange('endDate', e.target.value)}
                style={{ ...inputStyle, backgroundColor: '#fff' }}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: '12px', color: '#64748b' }}>End Time</label>
              <input
                type="time"
                value={schedule.endTime}
                onChange={(e) => handleScheduleChange('endTime', e.target.value)}
                style={{ ...inputStyle, backgroundColor: '#fff' }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              color: '#334155',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onPublish}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#fff',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
            }}
          >
            <CheckCircle size={18} />
            Publish Now
          </button>
        </div>
      </div>
    </div>
  );
};

const ManageExamsGrid = ({ exams, onOpenExam, onAssign, onEdit, onManageAssignments, onPublishToggle, onDelete, styles }) => (
  <div style={styles.examsGridStyle}>
    {exams.map((exam) => (
      <ExamCard
        key={exam._id}
        exam={exam}
        onOpen={onOpenExam}
        onAssign={onAssign}
        onEdit={onEdit}  // ✅ NEW
        onManageAssignments={onManageAssignments}  // ✅ NEW
        onPublishToggle={onPublishToggle}
        onDelete={onDelete}
        styles={styles}
      />
    ))}
  </div>
);



export default function AdminExamsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  // Qualification & grade configuration
  const [qualificationPercentage, setQualificationPercentage] = useState(50);
  const [excellentMin, setExcellentMin] = useState(80);
  const [goodMin, setGoodMin] = useState(50);
  const [averageMin, setAverageMin] = useState(50);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);

  // Publish Modal State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [examToPublish, setExamToPublish] = useState(null);

  // ✅ NEW: Manage Assignments Modal State
  const [manageAssignmentsExam, setManageAssignmentsExam] = useState(null);

  // ✅ NEW: Track which exam is being edited (null = creating new, ID = editing existing)
  const [editingExamId, setEditingExamId] = useState(null);

  const location = useLocation();


  // Create Exam Form States
  const [formData, setFormData] = useState({
    title: '',
    type: 'mcq',
    duration: 60,
    startTime: '',
    endTime: '',
    questions: [],
  });

  const [currentQuestion, setCurrentQuestion] = useState(() => ({
    title: '',
    type: determineQuestionType('mcq'),
  }));

  // ✅ NEW: Track which question is being edited (null = adding new question)
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);

  // Advanced coding question states
  const [inputSchema, setInputSchema] = useState([]);
  const [outputType, setOutputType] = useState({ type: 'int', description: '' });
  const [problemType, setProblemType] = useState('simple');

  useEffect(() => {
    fetchExams();
    const params = new URLSearchParams(location.search);
    if (params.get("create") === "1") {
      setShowCreateForm(true);
    }
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await examService.getAllExams();
      setExams(response.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersAndBatches = async () => {
    if (fetchingData) return;

    try {
      setFetchingData(true);
      const usersRes = await userService.getAllUsers();
      const users = Array.isArray(usersRes) ? usersRes : (usersRes.data || usersRes || []);
      const studentUsers = users.filter(u => u.role === 'Student');
      setAvailableUsers(studentUsers);

      const batchesRes = await batchService.getAllBatches();
      const batches = Array.isArray(batchesRes) ? batchesRes : (batchesRes.data || batchesRes || []);
      setAvailableBatches(batches);
    } catch (err) {
      console.error('Error fetching users/batches:', err);
      toast.error('Failed to load users and batches');
    } finally {
      setFetchingData(false);
    }
  };

  const handleAssignExam = async (assignmentData) => {
    if (!selectedExam) return;

    try {
      await examService.assignExam(selectedExam._id, assignmentData);
      toast.success('Exam assigned successfully!');
      setShowAssignModal(false);
      fetchExams();
    } catch (err) {
      console.error('Error assigning exam:', err);
      toast.error(err.response?.data?.message || 'Failed to assign exam');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: name === 'duration' ? parseInt(value) : value,
      };

      if (name === 'type') {
        updated.questions = [];
      }

      return updated;
    });

    if (name === 'type') {
      const derivedType = determineQuestionType(value);
      setCurrentQuestion({
        title: '',
        type: derivedType,
      });
      if (formData.questions.length > 0) {
        toast.info('Existing questions were cleared because exam type changed.');
      }
    }
  };

  const handleQuestionInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentQuestion((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGenerateTemplate = async () => {
    // Validation
    if (!currentQuestion.language) {
      toast.error('Please select a language first');
      return;
    }

    if (inputSchema.length === 0) {
      toast.error('Please define at least one input parameter using the Input Schema Builder below');
      return;
    }

    if (!currentQuestion.functionName || currentQuestion.functionName.trim() === '') {
      toast.error('Please enter a function name');
      return;
    }

    try {
      // Call the new advanced template generation API
      const response = await examService.generateTemplate({
        language: currentQuestion.language,
        problemType,
        inputSchema,
        outputType,
        functionName: currentQuestion.functionName
      });

      if (response.success && response.data) {
        // Populate the form fields with generated template
        setCurrentQuestion(prev => ({
          ...prev,
          functionSignature: response.data.functionSignature,
          mainBlock: response.data.hiddenMainBlock,  // Already includes struct definitions
          boilerplate: response.data.starterCode,
        }));

        toast.success('✨ Template generated successfully!');
      } else {
        toast.error('Failed to generate template');
      }
    } catch (error) {
      console.error('Template generation error:', error);
      toast.error(error.response?.data?.message || 'Failed to generate template');
    }
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
      options: [...(prev.options || []), { text: '', isCorrect: false }],
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
      testCases: [...(prev.testCases || []), { input: '', expectedOutput: '' }],
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
      toast.error('Please enter question title');
      return;
    }

    if (currentQuestion.type === 'mcq') {
      if (!currentQuestion.options || currentQuestion.options.length < 2) {
        toast.error('MCQ must have at least 2 options');
        return;
      }
      if (!currentQuestion.options.some((opt) => opt.isCorrect)) {
        toast.error('Please select at least one correct option');
        return;
      }
    }

    if (currentQuestion.type === 'coding') {
      if (!currentQuestion.language) {
        toast.error('Please select a programming language');
        return;
      }
      if (!currentQuestion.testCases || currentQuestion.testCases.length === 0) {
        toast.error('Coding question must have at least one test case');
        return;
      }
    }

    // ✅ MODIFIED: Handle both add and update
    if (editingQuestionIndex !== null) {
      // Update existing question
      setFormData((prev) => {
        const updatedQuestions = [...prev.questions];
        updatedQuestions[editingQuestionIndex] = {
          ...currentQuestion,
          id: prev.questions[editingQuestionIndex].id, // Preserve original ID
          marks: 1,
        };
        return {
          ...prev,
          questions: updatedQuestions,
        };
      });
      toast.success('Question updated!');
      setEditingQuestionIndex(null);
    } else {
      // Add new question
      const newQuestion = {
        ...currentQuestion,
        id: Date.now().toString(),
        marks: 1,
      };

      setFormData((prev) => ({
        ...prev,
        questions: [...prev.questions, newQuestion],
      }));
      toast.success('Question added!');
    }

    // Reset form
    setCurrentQuestion({
      title: '',
      type: determineQuestionType(formData.type),
    });

  };

  const removeQuestion = (index) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  // ✅ NEW: Edit existing question
  const handleEditQuestion = (index) => {
    const question = formData.questions[index];
    setCurrentQuestion(question);
    setEditingQuestionIndex(index);

    // Scroll to form
    setTimeout(() => {
      const formElement = document.querySelector('[data-question-form]');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    toast.info(`Editing Question #${index + 1}`);
  };

  // ✅ NEW: Cancel editing mode
  const cancelEdit = () => {
    setEditingQuestionIndex(null);
    setCurrentQuestion({
      title: '',
      type: determineQuestionType(formData.type),
    });
    toast.info('Edit cancelled');
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter exam title');
      return;
    }

    if (formData.questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    try {
      const computedTotalMarks = formData.questions.reduce(
        (sum, q) => sum + (q.marks || 1),
        0
      );

      const params = new URLSearchParams(location.search);
      const courseIdFromParams = params.get("courseId");
      const weekNumberFromParams = params.get("weekNumber");

      // ⭐ DEBUG: Log what we're reading from URL
      console.log('[AdminExamsPage] URL params:', {
        courseId: courseIdFromParams,
        weekNumber: weekNumberFromParams,
        fullURL: window.location.href
      });

      const submitData = {
        ...formData,
        totalMarks: computedTotalMarks,
        createdBy: JSON.parse(localStorage.getItem('user'))?.id || null,
        qualificationPercentage: Number(qualificationPercentage) || 50,
        excellentMin: Number(excellentMin) || 80,
        goodMin: Number(goodMin) || 50,
        averageMin: Number(averageMin) || 50,
        ...(courseIdFromParams ? { courseId: courseIdFromParams } : {}),
        ...(weekNumberFromParams ? { weekNumber: Number(weekNumberFromParams) } : {}),
        ...(courseIdFromParams && weekNumberFromParams ? { isInModule: true, published: true } : {}), // Auto-publish for in-module
      };

      // ⭐ DEBUG: Log what we're sending to backend
      console.log('[AdminExamsPage] Sending to backend:', {
        courseId: submitData.courseId,
        weekNumber: submitData.weekNumber,
        isInModule: submitData.isInModule,
        title: submitData.title
      });

      // ✅ MODIFIED: Handle both create and update
      let res;
      if (editingExamId) {
        // Update existing exam
        res = await examService.updateExam(editingExamId, submitData);
        toast.success('Exam updated successfully');
      } else {
        // Create new exam
        res = await examService.createExam(submitData);
        toast.success('Exam created successfully');
      }

      // NEW: trigger examCreated event
      try {
        const params = new URLSearchParams(location.search);
        const placeholderId = params.get("placeholderId");
        const courseIdFromParams = params.get("courseId");
        const weekNumberFromParams = params.get("weekNumber");

        window.dispatchEvent(new CustomEvent("examCreated", {
          detail: {
            exam: res?.data || null,
            placeholderId,
            courseId: courseIdFromParams,
            weekNumber: weekNumberFromParams
          }
        }));
      } catch (err) {
        // ignore
      }

      // Redirect to Course Page if created from Module
      if (courseIdFromParams) {
        navigate(`/courses/${courseIdFromParams}`);
        return;
      }

      setShowCreateForm(false);
      setEditingExamId(null);  // ✅ NEW: Reset editing state
      setFormData({
        title: '',
        type: 'mcq',
        duration: 60,
        startTime: '',
        endTime: '',
        questions: [],
      });
      setQualificationPercentage(50);
      setExcellentMin(80);
      setGoodMin(50);
      setAverageMin(50);
      setCurrentQuestion({
        title: '',
        type: determineQuestionType('mcq'),
      });
      fetchExams();

      // Auto-open publish modal for the new exam (SKIP if in-module, as it's auto-published)
      if (res?.data && (!courseIdFromParams || !weekNumberFromParams)) {
        setExamToPublish(res.data);
        setShowPublishModal(true);
      }
    } catch (err) {
      console.error('Error creating exam:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to create exam');
    }
  };

  const handlePublishExam = async (exam) => {
    // If we are unpublishing, we can just toggle it
    if (exam.published) {
      if (!window.confirm("Are you sure you want to unpublish this exam? It will be hidden from students.")) return;
      try {
        await examService.updateExam(exam._id, { published: false });
        toast.success('Exam unpublished successfully!');
        fetchExams();
      } catch (err) {
        toast.error('Failed to unpublish exam');
      }
      return;
    }

    // If publishing, open the scheduling modal
    setExamToPublish(exam);
    setShowPublishModal(true);
  };

  const confirmPublish = async (schedulingData) => {
    if (!examToPublish) return;

    try {
      // 1. Update duration, scheduling AND publish in one go
      await examService.updateExam(examToPublish._id, {
        duration: schedulingData.duration,
        startDate: schedulingData.startDate,
        endDate: schedulingData.endDate,
        published: true,
      });

      toast.success('Exam scheduled and published successfully!');
      setShowPublishModal(false);
      setExamToPublish(null);
      fetchExams();
    } catch (err) {
      console.error('Error publishing exam:', err);
      toast.error(err.response?.data?.message || 'Failed to publish exam');
    }
  };

  const handleDeleteExam = (exam) => {
    console.log("handleDeleteExam called with:", exam);
    if (exam) {
      setExamToDelete(exam);
      setShowDeleteModal(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!examToDelete) return;

    try {
      await examService.deleteExam(examToDelete._id);
      toast.success('Exam deleted successfully');
      setExams(prev => prev.filter(e => e._id !== examToDelete._id));
      setShowDeleteModal(false);
      setExamToDelete(null);
    } catch (err) {
      console.error('Error deleting exam:', err);
      toast.error(err.response?.data?.message || 'Failed to delete exam');
    }
  };

  // ✅ NEW: Load exam data for editing
  const handleEditExam = (exam) => {
    // Load exam data into form
    setFormData({
      title: exam.title || '',
      type: exam.type || 'mcq',
      duration: exam.duration || 60,
      startTime: exam.startTime || '',
      endTime: exam.endTime || '',
      questions: exam.questions || [],
    });

    // Load threshold values
    setQualificationPercentage(exam.qualificationPercentage || 50);
    setExcellentMin(exam.excellentMin || 80);
    setGoodMin(exam.goodMin || 50);
    setAverageMin(exam.averageMin || 50);

    // Set editing mode
    setEditingExamId(exam._id);
    setShowCreateForm(true);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    toast.info(`Editing: ${exam.title}`);
  };

  const pageStyle = {
    padding: '2rem',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  };

  const loadingContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '1rem'
  };

  const spinnerStyle = {
    width: '48px',
    height: '48px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  };

  const titleStyle = {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0',
    letterSpacing: '-0.02em',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const createButtonStyle = {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const emptyStateStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40vh',
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
  };

  const emptyIconStyle = {
    fontSize: '4rem',
    marginBottom: '1rem',
    opacity: '0.5'
  };

  const emptyTextStyle = {
    fontSize: '1.125rem',
    color: '#64748b',
    margin: '0'
  };

  const examsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem'
  };

  const examCardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  };

  const examCardHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem'
  };

  const examTitleStyle = {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0',
    flex: '1'
  };

  const statusBadgeStyle = (published) => ({
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    backgroundColor: published ? '#d1fae5' : '#f3f4f6',
    color: published ? '#065f46' : '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  });

  const examDetailsStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0'
  };

  const detailRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const detailLabelStyle = {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const detailValueStyle = {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1e293b'
  };

  const actionsStyle = {
    display: 'flex',
    gap: '0.5rem',
    marginTop: 'auto',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0'
  };

  const viewDetailsButtonStyle = {
    padding: '0.5rem 0.85rem',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem'
  };

  const iconButtonStyle = {
    padding: '0.5rem',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    color: '#374151'
  };

  const dangerButtonStyle = {
    ...iconButtonStyle,
    backgroundColor: '#fee2e2',
    color: '#dc2626'
  };

  const formContainerStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    maxWidth: '1200px',
    margin: '0 auto'
  };

  const formHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #e2e8f0'
  };

  const formTitleStyle = {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0'
  };

  const cancelButtonStyle = {
    padding: '0.5rem 1rem',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const formSectionStyle = {
    marginBottom: '2rem',
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  };

  const sectionTitleStyle = {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 1.5rem 0'
  };

  const formRowStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
  };

  const formGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  };

  const labelStyle = {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151'
  };

  const inputStyle = {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const textareaStyle = {
    ...inputStyle,
    resize: 'vertical',
    minHeight: '80px'
  };

  const addButtonStyle = {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const removeButtonStyle = {
    padding: '0.5rem 1rem',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const optionRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    marginBottom: '0.5rem',
    border: '1px solid #e2e8f0'
  };

  const checkboxLabelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    cursor: 'pointer'
  };

  const questionsSummaryStyle = {
    marginTop: '2rem',
    padding: '1.5rem',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  };

  const questionItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '0.75rem',
    border: '1px solid #e2e8f0'
  };

  const questionNumberStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.875rem',
    flexShrink: '0'
  };

  const questionTitleStyle = {
    flex: '1',
    fontSize: '0.875rem',
    color: '#1e293b',
    fontWeight: '500'
  };

  const questionTypeBadgeStyle = {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    textTransform: 'uppercase'
  };

  const formActionsStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '2px solid #e2e8f0'
  };

  const submitButtonStyle = {
    padding: '0.75rem 2rem',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={loadingContainerStyle}>
          <div style={spinnerStyle}></div>
          <p style={{ color: '#64748b', fontSize: '1rem', margin: '0' }}>Loading exams...</p>
        </div>
      </div>
    );
  }

  // Render Create Form View
  if (showCreateForm) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        padding: '2rem',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '2.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          maxWidth: '1000px',
          margin: '2rem auto',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2.5rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <div>
              <h2 style={{
                fontSize: '2rem',
                fontWeight: '800',
                color: '#0f172a',
                margin: '0',
                letterSpacing: '-0.02em',
                background: 'linear-gradient(to right, #0f172a, #334155)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>{editingExamId ? 'Edit Assessment' : 'Create New Assessment'}</h2>
              <p style={{ margin: '0.5rem 0 0', color: '#64748b' }}>
                {editingExamId ? 'Update exam details, grading, and questions.' : 'Configure exam details, grading, and questions.'}
              </p>
            </div>

            <button
              style={{
                padding: '0.6rem 1.25rem',
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
              onClick={() => setShowCreateForm(false)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.borderColor = '#94a3b8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateExam}>
            {/* Basic Details Section */}
            <div style={{
              marginBottom: '2rem',
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#1e293b',
                margin: '0 0 1.25rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ width: '4px', height: '24px', backgroundColor: '#3b82f6', borderRadius: '4px' }}></span>
                Exam Details
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gap: '1.5rem',
              }}>
                <div style={{ gridColumn: 'span 12' }}>
                  <label style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#475569',
                    marginBottom: '0.5rem',
                    display: 'block'
                  }}>Exam Title <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g. Final Semester Physics Assessment"
                    required
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                      backgroundColor: '#f8fafc',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.backgroundColor = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ gridColumn: 'span 6' }}>
                  <label style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#475569',
                    marginBottom: '0.5rem',
                    display: 'block'
                  }}>Exam Type <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.backgroundColor = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="mcq">MCQ Only</option>
                    <option value="coding">Coding Only</option>
                    <option value="theory">Theory Only</option>
                  </select>
                </div>

                <div style={{ gridColumn: 'span 6' }}>
                  <label style={{
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#475569',
                    marginBottom: '0.5rem',
                    display: 'block'
                  }}>Duration (minutes) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    min="1"
                    max="480"
                    required
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                      backgroundColor: '#f8fafc',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.backgroundColor = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Qualification & Grade Boundaries */}
            <div style={{
              marginTop: '1.5rem',
              padding: '2rem',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                background: 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)'
              }}></div>

              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#1e293b',
                margin: '0 0 1.5rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                Grading Configuration
                <span style={{
                  fontSize: '0.75rem',
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '20px',
                  fontWeight: '500'
                }}>RAG Model</span>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                {/* Qualification */}
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem', display: 'block' }}>
                    Min Qualification % <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={qualificationPercentage}
                      onChange={(e) => setQualificationPercentage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: '#334155',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#10b981'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                      required
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem' }}>%</span>
                  </div>
                </div>

                {/* Green Threshold */}
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#15803d', marginBottom: '0.5rem', display: 'block' }}>
                    Green Threshold (Excellent) ≥
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={excellentMin}
                      onChange={(e) => setExcellentMin(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '2px solid #bbf7d0',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: '#15803d',
                        backgroundColor: '#f0fdf4',
                        outline: 'none'
                      }}
                      required
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#15803d', fontSize: '0.9rem' }}>%</span>
                  </div>
                </div>

                {/* Amber Threshold */}
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#b45309', marginBottom: '0.5rem', display: 'block' }}>
                    Amber Threshold (Good) ≥
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={goodMin}
                      onChange={(e) => setGoodMin(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '2px solid #fde68a',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: '#b45309',
                        backgroundColor: '#fffbeb',
                        outline: 'none'
                      }}
                      required
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#b45309', fontSize: '0.9rem' }}>%</span>
                  </div>
                </div>

                {/* Average/Min Amber Range */}
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#b45309', marginBottom: '0.5rem', display: 'block' }}>
                    Min Amber Range ≥
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={averageMin}
                      onChange={(e) => setAverageMin(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        color: '#475569',
                        outline: 'none'
                      }}
                      required
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem' }}>%</span>
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#fef2f2',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: '#991b1b',
                fontSize: '0.9rem'
              }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <span>Any score below the <strong>Amber Threshold</strong> will be automatically marked as <strong style={{ color: '#dc2626' }}>Red (Not Qualified)</strong>.</span>
              </div>
            </div>


            {/* Question Builder Section */}
            <div
              data-question-form
              style={{
                marginBottom: "2rem",
                padding: "2rem",
                backgroundColor: "#f0f9ff", // Very light blue background to distinguish
                borderRadius: "16px",
                border: "1px solid #bae6fd",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
                position: 'relative'
              }}
            >
              {/* Header Row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "2rem",
                  paddingBottom: "1.5rem",
                  borderBottom: "1px solid #bfdbfe",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      color: "#0369a1",
                      margin: "0 0 0.5rem 0",
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <span style={{ fontSize: '1.4rem' }}>✏️</span>
                    Add Question
                  </h3>
                  <p style={{ margin: 0, color: '#3b82f6', fontSize: '0.9rem', fontWeight: '500' }}>
                    {currentQuestion.type === 'mcq' ? 'Multiple Choice Question' :
                      currentQuestion.type === 'coding' ? 'Programming Challenge' : 'Theoretical Question'}
                  </p>
                </div>

                {formData.type === "mcq" && (
                  <button
                    type="button"
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#ffffff",
                      color: "#2563eb",
                      border: "1px solid #60a5fa",
                      borderRadius: "10px",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      transition: "all 0.2s ease",
                    }}
                    onClick={() => setShowUploadModal(true)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#eff6ff';
                      e.currentTarget.style.borderColor = '#3b82f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#60a5fa';
                    }}
                  >
                    <Upload size={18} />
                    Upload MCQ Document
                  </button>
                )}
              </div>

              {/* Question Input */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: "600",
                    color: "#0369a1",
                    marginBottom: "0.75rem",
                    display: "block",
                  }}
                >
                  Question Text <span style={{ color: '#ef4444' }}>*</span>
                </label>

                <textarea
                  name="title"
                  value={currentQuestion.title}
                  onChange={handleQuestionInputChange}
                  placeholder="Type your question here..."
                  rows="3"
                  style={{
                    width: "100%",
                    padding: "1rem",
                    border: "1px solid #bfdbfe",
                    borderRadius: "12px",
                    fontSize: "1rem",
                    fontFamily: "inherit",
                    background: "#ffffff",
                    transition: "all 0.2s ease",
                    outline: 'none',
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#bfdbfe';
                    e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                  }}
                />
              </div>

              {/* 📌 MCQ Options */}
              {currentQuestion.type === "mcq" && (
                <div style={{ marginTop: "1.5rem" }}>
                  <label
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "#334155",
                      display: "block",
                      marginBottom: "0.75rem",
                    }}
                  >
                    Options *
                  </label>

                  {(currentQuestion.options || []).map((option, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.9rem",
                        backgroundColor: "#f8fafc",
                        borderRadius: "10px",
                        marginBottom: "0.75rem",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "700",
                          color: "#2563eb",
                          minWidth: "26px",
                          fontSize: "1rem",
                        }}
                      >
                        {String.fromCharCode(65 + idx)}.
                      </span>

                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => handleMCQOptions(idx, "text", e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        style={{
                          flex: 1,
                          padding: "0.75rem",
                          border: "1px solid #cbd5e1",
                          borderRadius: "8px",
                          fontSize: "0.9rem",
                          backgroundColor: "#ffffff",
                        }}
                      />

                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          color: "#334155",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={option.isCorrect || false}
                          onChange={(e) =>
                            handleMCQOptions(idx, "isCorrect", e.target.checked)
                          }
                        />
                        Correct
                      </label>

                      <button
                        type="button"
                        onClick={() => removeMCQOption(idx)}
                        style={{
                          padding: "0.5rem 1rem",
                          backgroundColor: "#fee2e2",
                          color: "#dc2626",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addMCQOption}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#10b981",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      marginTop: "0.5rem",
                    }}
                  >
                    + Add Option
                  </button>
                </div>
              )}

              {/* 📌 Coding Question */}
              {currentQuestion.type === "coding" && (
                <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {/* Language */}
                  <div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <label
                          style={{
                            fontSize: "0.9rem",
                            fontWeight: "600",
                            color: "#334155",
                            marginBottom: "0.5rem",
                            display: "block",
                          }}
                        >
                          Programming Language *
                        </label>
                        <select
                          name="language"
                          value={currentQuestion.language || ""}
                          onChange={handleQuestionInputChange}
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            fontSize: "0.9rem",
                            background: "#f8fafc",
                          }}
                        >
                          <option value="">Select Language</option>
                          <option value="cpp">C++</option>
                          <option value="java">Java</option>
                          <option value="python">Python</option>
                          <option value="javascript">JavaScript</option>
                          <option value="c">C</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateTemplate}
                        style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          height: '42px',
                          marginBottom: '2px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Generate Template
                      </button>
                    </div>
                  </div>

                  {/* Problem Type Selector */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "#334155", marginBottom: "0.5rem", display: "block" }}>
                      Problem Type *
                    </label>
                    <select
                      value={problemType}
                      onChange={(e) => setProblemType(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "0.9rem",
                        background: "#f8fafc",
                        cursor: "pointer"
                      }}
                    >
                      <option value="simple">Simple Function</option>
                      <option value="array">Array Problem</option>
                      <option value="linkedlist">LinkedList Problem</option>
                      <option value="doublylinkedlist">Doubly Linked List Problem</option>
                      <option value="tree">Binary Tree Problem</option>
                      <option value="graph">Graph Problem</option>
                      <option value="algorithm">Algorithm Problem</option>
                    </select>
                  </div>

                  {/* Input Schema Builder Component */}
                  <InputSchemaBuilder
                    schema={inputSchema}
                    onChange={setInputSchema}
                    language={currentQuestion.language}
                  />

                  {/* Output Type Selector Component */}
                  <OutputTypeSelector
                    outputType={outputType}
                    onChange={setOutputType}
                  />

                  {/* Function Template Fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "#334155", marginBottom: "0.5rem", display: "block" }}>
                        Function Name
                      </label>
                      <input
                        type="text"
                        name="functionName"
                        value={currentQuestion.functionName || ""}
                        onChange={handleQuestionInputChange}
                        placeholder="e.g., add"
                        style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "#334155", marginBottom: "0.5rem", display: "block" }}>
                        Function Signature
                      </label>
                      <input
                        type="text"
                        name="functionSignature"
                        value={currentQuestion.functionSignature || ""}
                        onChange={handleQuestionInputChange}
                        placeholder="e.g., def add(a, b):"
                        style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "8px", fontFamily: "'Courier New', monospace" }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "#334155", marginBottom: "0.5rem", display: "block" }}>
                      Hidden Main Block (Executes logic)
                    </label>
                    <textarea
                      name="mainBlock"
                      value={currentQuestion.mainBlock || ""}
                      onChange={handleQuestionInputChange}
                      rows="6"
                      placeholder="# Hidden code that calls the student's function&#10;if __name__ == '__main__':&#10;    a = int(input())&#10;    b = int(input())&#10;    print(add(a, b))"
                      style={{
                        width: "100%",
                        padding: "1rem",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#f0fdf4", // Light green to indicate it's special/hidden
                        borderRadius: "8px",
                        fontFamily: "'Courier New', monospace",
                      }}
                    />
                    <small style={{ color: "#64748b" }}>This code is hidden from students. It reads input, calls the function, and prints output.</small>
                  </div>

                  {/* Starter Code */}
                  <div>
                    <label
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        color: "#334155",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      Starter Code (Optional)
                    </label>
                    <textarea
                      name="boilerplate"
                      value={currentQuestion.boilerplate || ""}
                      onChange={handleQuestionInputChange}
                      rows="4"
                      placeholder="// starter code"
                      style={{
                        width: "100%",
                        padding: "1rem",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#f8fafc",
                        borderRadius: "8px",
                        fontFamily: "'Courier New', monospace",
                      }}
                    />
                  </div>

                  {/* Test Cases */}
                  <div>
                    <label
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        color: "#334155",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      Test Cases *
                    </label>

                    {(currentQuestion.testCases || []).map((tc, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "1rem",
                          borderRadius: "10px",
                          backgroundColor: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          marginBottom: "1rem",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr auto",
                            gap: "1rem",
                          }}
                        >
                          <div style={{ gridColumn: "1 / -1", marginBottom: "0.5rem" }}>
                            <label style={{ fontSize: "0.8rem", color: "#64748b" }}>
                              Description (Optional)
                            </label>
                            <input
                              type="text"
                              value={tc.description || ""}
                              onChange={(e) =>
                                handleTestCaseChange(idx, "description", e.target.value)
                              }
                              placeholder="e.g., Basic addition test"
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                border: "1px solid #cbd5e1",
                                borderRadius: "6px",
                                fontSize: "0.9rem",
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "0.8rem", color: "#64748b" }}>
                              Input
                            </label>
                            <textarea
                              value={tc.input}
                              rows="2"
                              onChange={(e) =>
                                handleTestCaseChange(idx, "input", e.target.value)
                              }
                              style={{
                                width: "100%",
                                padding: "0.75rem",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                background: "#ffffff",
                                fontFamily: "'Courier New', monospace",
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "0.8rem", color: "#64748b" }}>
                              Expected Output
                            </label>
                            <textarea
                              rows="2"
                              value={tc.expectedOutput}
                              onChange={(e) =>
                                handleTestCaseChange(idx, "expectedOutput", e.target.value)
                              }
                              style={{
                                width: "100%",
                                padding: "0.75rem",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                background: "#ffffff",
                                fontFamily: "'Courier New', monospace",
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: '#64748b' }}>
                              <input
                                type="checkbox"
                                checked={tc.isHidden || false}
                                onChange={(e) => handleTestCaseChange(idx, "isHidden", e.target.checked)}
                                style={{ cursor: 'pointer' }}
                              />
                              Hidden
                            </label>
                            <button
                              type="button"
                              onClick={() => removeTestCase(idx)}
                              style={{
                                height: "40px",
                                padding: "0 1rem",
                                backgroundColor: "#fee2e2",
                                color: "#dc2626",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontWeight: "600",
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addTestCase}
                      style={{
                        padding: "0.75rem 1.5rem",
                        backgroundColor: "#10b981",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      + Add Test Case
                    </button>
                  </div>
                </div>
              )}

              {/* 📌 Theory Question */}
              {currentQuestion.type === "theory" && (
                <div style={{ marginTop: "1.5rem" }}>
                  <label
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      color: "#334155",
                      display: "block",
                      marginBottom: "0.75rem",
                    }}
                  >
                    Max Answer Length (characters)
                  </label>

                  <input
                    type="number"
                    name="maxLength"
                    value={currentQuestion.maxLength ?? 10000}
                    onChange={handleQuestionInputChange}
                    min="100"
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      background: "#f8fafc",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>
              )}

              {/* Add/Update Question Button */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
                <button
                  type="button"
                  onClick={addQuestion}
                  style={{
                    padding: "0.85rem 1.8rem",
                    backgroundColor: editingQuestionIndex !== null ? "#10b981" : "#3b82f6",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                >
                  {editingQuestionIndex !== null
                    ? `✓ Update Question #${editingQuestionIndex + 1}`
                    : '+ Add Question'}
                </button>

                {editingQuestionIndex !== null && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    style={{
                      padding: "0.85rem 1.8rem",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>


            {/* Questions Summary */}
            {formData.questions.length > 0 && (
              <div
                style={{
                  marginTop: "2.5rem",
                  padding: "2rem",
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: "700",
                    color: "#1e293b",
                    marginBottom: "1.75rem",
                    paddingBottom: "0.75rem",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Added Questions ({formData.questions.length})
                </h3>

                {formData.questions.map((q, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "1.25rem",
                      backgroundColor: "#f8fafc",
                      borderRadius: "12px",
                      marginBottom: "1rem",
                      border: "1px solid #e2e8f0",
                      transition: "0.25s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f1f5f9";
                      e.currentTarget.style.border = "1px solid #bfdbfe";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#f8fafc";
                      e.currentTarget.style.border = "1px solid #e2e8f0";
                    }}
                  >
                    {/* Number Circle */}
                    <span
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        backgroundColor: "#3b82f6",
                        color: "#ffffff",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        fontWeight: "700",
                        fontSize: "1rem",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>

                    {/* Title */}
                    <span
                      style={{
                        flex: 1,
                        fontSize: "1rem",
                        color: "#1e293b",
                        fontWeight: "500",
                      }}
                    >
                      {q.title.substring(0, 80)}
                      {q.title.length > 80 ? "..." : ""}
                    </span>

                    {/* Type Badge */}
                    <span
                      style={{
                        padding: "6px 14px",
                        backgroundColor: "#dbeafe",
                        color: "#1e40af",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        borderRadius: "50px",
                      }}
                    >
                      {q.type.toUpperCase()}
                    </span>

                    {/* ✅ NEW: Edit Button */}
                    <button
                      type="button"
                      style={{
                        padding: "0.45rem 0.9rem",
                        backgroundColor: "#dbeafe",
                        color: "#1e40af",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#bfdbfe")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#dbeafe")}
                      onClick={() => handleEditQuestion(idx)}
                    >
                      ✎ Edit
                    </button>

                    {/* Remove */}
                    <button
                      type="button"
                      style={{
                        padding: "0.45rem 0.9rem",
                        backgroundColor: "#fee2e2",
                        color: "#dc2626",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fecaca")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fee2e2")}
                      onClick={() => removeQuestion(idx)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}


            {/* Form Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "1rem",
                marginTop: "2.5rem",
                paddingTop: "2rem",
                borderTop: "2px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e5e7eb")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                style={{
                  padding: "0.85rem 2rem",
                  backgroundColor: "#3b82f6",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  transition: "0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#3b82f6")}
              >
                Create Assessment
              </button>
            </div>

          </form>
          {
            showUploadModal && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "rgba(0,0,0,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(2px)",
                  zIndex: 9999,
                }}
              >
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    width: "90%",
                    maxWidth: "850px",
                    padding: "28px",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
                  }}
                >
                  {/* Modal Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "18px",
                      paddingBottom: "12px",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: "700",
                        color: "#111827",
                        margin: 0,
                      }}
                    >
                      Upload Exam Document
                    </h2>

                    <button
                      onClick={() => setShowUploadModal(false)}
                      style={{
                        background: "transparent",
                        border: "none",
                        fontSize: "22px",
                        cursor: "pointer",
                        color: "#6b7280",
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <MCQExamUploader
                    onSuccess={(createdExam) => {
                      setShowUploadModal(false);
                      setShowCreateForm(false); // ✅ Fix: Return to main view so Publish Modal can appear
                      fetchExams();
                      toast.success("Exams uploaded successfully");

                      // Auto-open publish modal if a single exam was created AND it's not an in-module exam
                      const params = new URLSearchParams(location.search);
                      const courseId = params.get("courseId");
                      const weekNumber = params.get("weekNumber");
                      const isModuleExam = courseId && weekNumber;

                      if (createdExam && createdExam._id) {
                        if (isModuleExam) {
                          // Navigate back to course if in-module
                          navigate(`/courses/${courseId}`);
                        } else {
                          setExamToPublish(createdExam);
                          setShowPublishModal(true);
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )
          }


        </div >
      </div >
    );
  }

  // Render Main View with Exam List
  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          <span role="img" aria-label="Clipboard"></span> Manage Assessments
        </h1>

        {/* WRAP BUTTONS INSIDE A FLEX BOX */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>

          {/* Upload Document Button
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#ffffff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
          >
            <Upload size={18} />
            Upload Document
          </button> */}

          {/* Create Exam Button */}
          <button
            style={createButtonStyle}
            onClick={() => setShowCreateForm(true)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            + Create Assessment
          </button>
        </div>
      </div>


      {exams.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={emptyIconStyle}>📝</div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: '0 0 0.5rem 0' }}>
            No Exams Created
          </h3>
          <p style={emptyTextStyle}>Create your first exam to get started!</p>
        </div>
      ) : (
        <>
          <ManageExamsGrid
            exams={exams}
            onOpenExam={(exam) => navigate(`/admin/exams/${exam._id}`)}
            onAssign={(exam) => {
              setSelectedExam(exam);
              fetchUsersAndBatches();
              setShowAssignModal(true);
            }}
            onEdit={handleEditExam}  // ✅ NEW
            onManageAssignments={(exam) => setManageAssignmentsExam(exam)}  // ✅ NEW
            onPublishToggle={handlePublishExam}
            onDelete={handleDeleteExam}
            styles={{
              examsGridStyle,
              examCardStyle,
              examCardHeaderStyle,
              examTitleStyle,
              statusBadgeStyle,
              examDetailsStyle,
              detailRowStyle,
              detailLabelStyle,
              detailValueStyle,
              actionsStyle,
              viewDetailsButtonStyle,
            }}
          />

          <PublishExamModal
            isOpen={showPublishModal}
            onClose={() => setShowPublishModal(false)}
            onConfirm={confirmPublish}
            exam={examToPublish}
          />
        </>
      )}

      {showAssignModal && selectedExam && (
        <AssignExamModal
          exam={selectedExam}
          onClose={() => setShowAssignModal(false)}
          onAssign={handleAssignExam}
          availableUsers={availableUsers}
          availableBatches={availableBatches}
        />
      )}
      {showUploadModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '900px',
              padding: '24px',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '12px'
            }}>
              <h2 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Upload Assessment Document
              </h2>

              <button
                onClick={() => setShowUploadModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            </div>

            {/* Uploader Component
            <MCQExamUploader
              onSuccess={() => {
                setShowUploadModal(false);
                fetchExams();
                toast.success("Exams uploaded successfully");
              }}
            /> */}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Assessment"
        message="Are you sure you want to delete this assessment? This action cannot be undone and will remove all associated data including student results."
        itemName={examToDelete?.title}
      />

      {/* ✅ NEW: Manage Assignments Modal */}
      <UnassignExamModal
        isOpen={!!manageAssignmentsExam}
        onClose={() => setManageAssignmentsExam(null)}
        examId={manageAssignmentsExam?._id}
        examTitle={manageAssignmentsExam?.title}
        onSuccess={fetchExams}
      />
    </div>
  );
}
