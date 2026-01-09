import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import './AdminDashboard.css';
import * as XLSX from 'xlsx';
import {
    FaDownload,
    FaSearch,
    FaFilter,
    FaUserGraduate,
    FaChalkboardTeacher,
    FaUser,
    FaUpload,
    FaTimes,
    FaBook,
    FaUserPlus,
    FaEdit,
    FaCheck,
    FaEye,
    FaEyeSlash,
    FaTrash,
    FaCog,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useUserManagement } from '../../hooks/useUserManagement';
import { useUserFiltering } from '../../hooks/useUserFiltering';
import BulkUserUpload from '../../components/BulkUserUpload';
import api from '../../services/api';
import { createSingleUser } from '../../services/userService';
import AssignTrainerModal from '../../components/AssignTrainerModal';

import {
    COLORS,
    FONT_SIZES,
    SPACING,
    SHADOWS,
    BORDER_RADIUS,
    TRANSITIONS,
} from '../../constants/designSystem';

export default function AdminDashboard() {
    const navigate = useNavigate();
    // Removed API_BASE - using api service instead

    // Redux
    const { token } = useSelector((state) => state.auth);
    const { users } = useSelector((state) => state.user);

    // Initialize user filtering hook
    const { searchTerm, setSearchTerm, filteredUsers } = useUserFiltering(users);

    // Filter users by role
    const filteredTrainers = filteredUsers.filter(user => user.role === 'Trainer');
    const filteredStudents = filteredUsers.filter(user => user.role === 'Student' && !user.batch);

    // ===== STATE VARIABLES =====
    const [selectedUser, setSelectedUser] = useState(null);
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
    const [batches, setBatches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [courseProposals, setCourseProposals] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [showBatchStudentsModal, setShowBatchStudentsModal] = useState(false);

    // Track whether any modal is open to pause auto-refreshes
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [batchStudents, setBatchStudents] = useState([]);

    // Edit Batch modal state
    const [showEditBatchModal, setShowEditBatchModal] = useState(false);
    const [editBatch, setEditBatch] = useState(null);
    const [editBatchName, setEditBatchName] = useState('');
    const [editTrainerId, setEditTrainerId] = useState('');
    const [editCourseId, setEditCourseId] = useState('');
    const [editAccessWeeks, setEditAccessWeeks] = useState(0);
    const [editAccessDays, setEditAccessDays] = useState(0);
    const [editAccessStart, setEditAccessStart] = useState('');
    const [savingBatchEdits, setSavingBatchEdits] = useState(false);
    const [editBatchFile, setEditBatchFile] = useState(null);
    const [addingTrainees, setAddingTrainees] = useState(false);

    // Assign Trainer modal state (AdminDashboard scope)
    const [showAssignTrainerModal, setShowAssignTrainerModal] = useState(false);
    // Create User Modal state
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        role: 'Student',
        adminPasskey: '',
        employeeId: '',
    });
    const [creatingUser, setCreatingUser] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    // ===== NEW STATES FOR COURSE PROPOSAL EDITING =====
    const [selectedProposal, setSelectedProposal] = useState(null);
    const [showProposalModal, setShowProposalModal] = useState(false);
    const [proposalStatus, setProposalStatus] = useState('pending'); // for filtering display
    const [proposalFeedback, setProposalFeedback] = useState('');
    const [updatingProposal, setUpdatingProposal] = useState(false);
    const [proposalFilterStatus, setProposalFilterStatus] = useState('pending'); // for filtering which proposals to show
    const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
    const [showAddCourseModal, setShowAddCourseModal] = useState(false);
    const [batchToAssignTrainer, setBatchToAssignTrainer] = useState(null);
    const [selectedTrainerId, setSelectedTrainerId] = useState('');
    const [batchNameInput, setBatchNameInput] = useState('');
    const [batchTrainer, setBatchTrainer] = useState('');
    const [batchCourse, setBatchCourse] = useState('');
    const [batchStart, setBatchStart] = useState('');
    const [batchEnd, setBatchEnd] = useState('');
    const [batchAccessWeeks, setBatchAccessWeeks] = useState(0);
    const [batchAccessDays, setBatchAccessDays] = useState(0);
    const [batchAccessStart, setBatchAccessStart] = useState('');
    const [batchFile, setBatchFile] = useState(null);
    const [creatingBatch, setCreatingBatch] = useState(false);
    const [batchFileError, setBatchFileError] = useState('');
    const [courseTitleInput, setCourseTitleInput] = useState('');
    const [courseDescInput, setCourseDescInput] = useState('');
    const [courseWeeksInput, setCourseWeeksInput] = useState(1);
    const [courseImage, setCourseImage] = useState(null);
    const [creatingCourse, setCreatingCourse] = useState(false);
    // Using filtered users from useUserFiltering hook instead of local state
    const [showTrainerDetailModal, setShowTrainerDetailModal] = useState(false);
    const [selectedTrainerForDetail, setSelectedTrainerForDetail] = useState(null);

    // Hooks
    const {
        fetchUsers,
        fetchUserDetails,
        generateUserCertificate,
    } = useUserManagement(token);

    const { trainers, students } = useUserFiltering(users);

    // ===== useEffect HOOKS =====
    useEffect(() => {
        fetchUsers();
        fetchAllBatches();
        fetchAllCourses();
        fetchUnassignedStudents();
        // eslint-disable-next-line
    }, [fetchUsers]);

    useEffect(() => {
        const handleOpenModal = () => setShowBulkUploadModal(true);
        window.addEventListener('openBulkUploadModal', handleOpenModal);
        return () =>
            window.removeEventListener('openBulkUploadModal', handleOpenModal);
    }, []);

    // Fetch batches
    const fetchAllBatches = useCallback(async () => {
        try {
            const res = await api.get('/batches/with-counts');
            setBatches(res.data);
        } catch (err) {
            console.error('fetchAllBatches error:', err);
        }
    }, []);

    // Fetch courses
    const fetchAllCourses = useCallback(async () => {
        try {
            const res = await api.get('/courses');
            setCourses(res.data);
        } catch (err) {
            console.error('fetchAllCourses error:', err);
        }
    }, []);

    const openAssignTrainerModal = (batch) => {
        setBatchToAssignTrainer(batch);
        setSelectedTrainerId(batch.trainer?._id || '');
        setShowAssignTrainerModal(true);
    };

    const openEditBatchModal = (batch) => {
        setEditBatch(batch);
        setEditBatchName(batch.name || '');
        setEditTrainerId(batch.trainer?._id || '');
        setEditCourseId(batch.course?._id || '');
        setEditAccessWeeks(batch.accessDurationWeeks || 0);
        setEditAccessDays(batch.accessDurationDays || 0);
        setEditAccessStart(batch.accessStartDate ? new Date(batch.accessStartDate).toISOString().slice(0, 10) : '');
        setShowEditBatchModal(true);
    };

    const handleSaveBatchEdits = async () => {
        if (!editBatch) return;
        const payload = {};
        if (editBatchName !== (editBatch.name || '')) payload.name = editBatchName;
        if (editTrainerId !== (editBatch.trainer?._id || '')) payload.trainer = editTrainerId || null;
        if (editCourseId !== (editBatch.course?._id || '')) payload.course = editCourseId || null;

        // If nothing changed, just close
        if (Object.keys(payload).length === 0) {
            setShowEditBatchModal(false);
            setEditBatch(null);
            return;
        }

        try {
            setSavingBatchEdits(true);
            const res = await api.put(`/batches/${editBatch._id}`, payload);
            toast.success(res.data?.message || 'Batch updated');
            setShowEditBatchModal(false);
            setEditBatch(null);
            // Refresh lists
            await fetchAllBatches();
            // If the currently-open batch students modal is for this batch, refresh its students
            if (showBatchStudentsModal && selectedBatch && selectedBatch._id === editBatch._id) {
                await fetchBatchStudents(editBatch._id);
            }
            // If access duration fields changed, call the access-duration endpoint
            const accessChanged = (
                (editAccessWeeks !== (editBatch.accessDurationWeeks || 0)) ||
                (editAccessDays !== (editBatch.accessDurationDays || 0)) ||
                ((editAccessStart || '') !== (editBatch.accessStartDate ? new Date(editBatch.accessStartDate).toISOString().slice(0, 10) : ''))
            );

            if (accessChanged) {
                try {
                    const accessPayload = {
                        accessDurationWeeks: Number(editAccessWeeks) || 0,
                        accessDurationDays: Number(editAccessDays) || 0,
                    };
                    if (editAccessStart) accessPayload.accessStartDate = editAccessStart;
                    const r2 = await api.put(`/batches/${editBatch._id}/access-duration`, accessPayload);
                    toast.success(r2.data?.message || 'Batch access duration updated');
                    await fetchAllBatches();
                } catch (err2) {
                    console.error('access-duration update error:', err2);
                    toast.error(err2.response?.data?.message || 'Failed to update access duration');
                }
            }
        } catch (err) {
            console.error('handleSaveBatchEdits error:', err);
            toast.error(err.response?.data?.message || 'Failed to save batch edits');
        } finally {
            setSavingBatchEdits(false);
        }
    };

    const assignTrainerToBatch = async (trainerId) => {
        if (!batchToAssignTrainer) return;
        try {
            // Use centralized api instance so auth header & error parsing are consistent
            const payload = { trainer: trainerId };
            const res = await api.put(`/batches/${batchToAssignTrainer._id}`, payload);
            toast.success(res.data?.message || 'Trainer assigned to batch');
            setShowAssignTrainerModal(false);
            setBatchToAssignTrainer(null);
            await fetchAllBatches();
        } catch (err) {
            console.error('assignTrainerToBatch error:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to assign trainer';
            toast.error(msg);
        }
    };

    const handleDeleteBatch = async (batchId) => {
        if (!window.confirm('Are you sure you want to delete this batch? Students will be moved to Unassigned but their progress will be preserved.')) return;
        try {
            await api.delete(`/batches/${batchId}`);
            toast.success('Batch deleted successfully');
            await fetchAllBatches();
            await fetchUnassignedStudents(); // Refresh unassigned list as students are moved there
        } catch (err) {
            console.error('handleDeleteBatch error:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to delete batch');
        }
    };
    // Handlers
    const handleUserDetail = useCallback(async (id) => {
        setSelectedUser(id);
        await fetchUserDetails(id);
    }, [fetchUserDetails]);

    // Fetch course proposals
    const fetchCourseProposals = useCallback(async () => {
        try {
            const res = await api.get("/course-content-proposals/admin/all");
            console.log('Course proposals fetched:', res.data);
            setCourseProposals(res.data || []);
        } catch (error) {
            console.error('Error fetching course proposals:', error.response?.data || error.message);
            toast.error('Failed to fetch course proposals: ' + (error.response?.data?.message || error.message));
            setCourseProposals([]);
        }
    }, []);

    const fetchUnassignedStudents = useCallback(async () => {
        try {
            await fetchUsers(); // Refresh users list, which updates filteredStudents
        } catch (err) {
            console.error('fetchUnassignedStudents error:', err);
        }
    }, [fetchUsers]);

    // Fetch students in a specific batch
    const fetchBatchStudents = useCallback(async (batchId) => {
        try {
            console.log('Fetching students for batch:', batchId);
            // Get users who are assigned to this batch
            const res = await api.get('/users');

            if (res.data && Array.isArray(res.data)) {
                // Filter users who are in this batch and are students
                const batchStudentsList = res.data.filter(user =>
                    user.role === 'Student' &&
                    user.batch === batchId
                );
                console.log('Batch students data:', batchStudentsList);
                setBatchStudents(batchStudentsList);
                setShowBatchStudentsModal(true);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            console.error('fetchBatchStudents error:', err);
            toast.error('Failed to fetch batch students: ' + (err.response?.data?.message || err.message));
        }
    }, []);

    // ===== AUTO-REFRESH UNASSIGNED STUDENTS EVERY 5 SECONDS =====
    useEffect(() => {
        if (isModalOpen) return; // pause auto-refresh while any modal is open
        const intervalId = setInterval(() => {
            if (!token) return; // 🛡 Avoid API calls if logged out
            console.log('🔄 Auto-refreshing unassigned students from database...');
            fetchUnassignedStudents();
        }, 5000); // Refresh every 5 seconds

        // Cleanup interval on unmount
        return () => clearInterval(intervalId);
    }, [isModalOpen, fetchUnassignedStudents]);

    // ===== AUTO-REFRESH ALL BATCHES EVERY 5 SECONDS =====
    useEffect(() => {
        if (isModalOpen) return; // pause auto-refresh while any modal is open
        const intervalId = setInterval(() => {
            if (!token) return; // 🛡 Avoid API calls if logged out
            console.log('🔄 Auto-refreshing batch counts from database...');
            fetchAllBatches();
        }, 5000);

        return () => clearInterval(intervalId);
    }, [isModalOpen, fetchAllBatches]);

    // ===== AUTO-REFRESH COURSE PROPOSALS EVERY 5 SECONDS =====
    useEffect(() => {
        if (isModalOpen) return; // pause auto-refresh while any modal is open
        const intervalId = setInterval(() => {
            if (!token) return; // 🛡 Avoid API calls if logged out
            console.log('🔄 Auto-refreshing course proposals from database...');
            fetchCourseProposals();
        }, 5000);

        return () => clearInterval(intervalId);
    }, [isModalOpen, fetchCourseProposals]);

    // Initial fetch (run after fetch* functions are defined)
    useEffect(() => {
        fetchUsers();
        fetchAllBatches();
        fetchAllCourses();
        fetchCourseProposals();
        fetchUnassignedStudents();
    }, [fetchUsers, fetchAllBatches, fetchAllCourses, fetchCourseProposals, fetchUnassignedStudents]);

    const handleAssignStudentToBatch = async (studentId, batchId) => {
        try {
            const res = await api.put(`/users/${studentId}/assign-batch`, { batch: batchId });

            toast.success(`${res.data.student.name} assigned successfully!`);
            // Refresh the users list to update unassigned students
            await fetchUsers();
            // Refresh batches to update student counts
            await fetchAllBatches();
            if (showBatchStudentsModal && selectedBatch) {
                await fetchBatchStudents(selectedBatch._id);
            }
        } catch (err) {
            console.error('handleAssignStudentToBatch error:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to assign student');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            await api.delete(`/users/${userId}`);
            toast.success('User deleted');
            // Refresh unassigned students list
            await fetchUnassignedStudents();
            // Refresh users list in global state
            fetchUsers();
        } catch (err) {
            console.error('handleDeleteUser error:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to delete user');
        }
    };

    const handleProposal = async (proposalId, status, feedback = '') => {
        try {
            const res = await api.put(`/course-content-proposals/admin/proposals/${proposalId}`, {
                status,
                feedback,
            });
            toast.success(
                res.data?.message || `Course proposal ${status} successfully`
            );
            fetchCourseProposals();
            if (status === 'approved') fetchAllCourses();
        } catch (err) {
            console.error('handleProposal error:', err);
            toast.error('Failed to update course proposal');
        }
    };

    const handleOpenProposalModal = (proposal) => {
        setSelectedProposal(proposal);
        setProposalStatus(proposal.status || 'pending');
        setProposalFeedback(proposal.adminFeedback || '');
        setShowProposalModal(true);
    };

    const handleReviewProposal = async (proposalId, status, feedback = '') => {
        setUpdatingProposal(true);
        try {
            const res = await api.post('/course-content-proposals/admin/review', {
                proposalId,
                status, // 'accepted' or 'rejected'
                feedback,
            });
            toast.success(`Proposal ${status} successfully!`);
            setShowProposalModal(false);
            await fetchCourseProposals();
        } catch (err) {
            console.error('handleReviewProposal error:', err);
            toast.error(err.response?.data?.message || `Failed to ${status} proposal`);
        } finally {
            setUpdatingProposal(false);
        }
    };

    const handleCreateUser = async () => {
        // ✅ Basic validation - only required fields
        if (!newUser.name || !newUser.email || !newUser.role) {
            toast.error('Please fill all required fields');
            return;
        }

        // ✅ Admin passkey validation (only for Admin role)
        if (newUser.role === 'Admin' && !newUser.adminPasskey) {
            toast.error('Admin passkey is required');
            return;
        }

        // ✅ Clean up userData - remove designation and yearsOfExperience
        const userData = {
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            employeeId: newUser.employeeId || undefined, // ✅ Send only if provided
            ...(newUser.role === 'Admin' && { adminPasskey: newUser.adminPasskey }),
        };

        setCreatingUser(true);
        try {
            const result = await createSingleUser(userData);
            toast.success(`${newUser.role} user created successfully!`);
            console.log('Created user:', result);
            setShowCreateUserModal(false);

            // ✅ Reset form
            setNewUser({
                name: '',
                email: '',
                role: 'Student',
                adminPasskey: '',
                employeeId: '',
            });

            await fetchUsers(); // Refresh user list
        } catch (error) {
            console.error('Create user error:', error);

            // Extract error message with multiple fallbacks
            let errorMessage = 'Failed to create user';

            if (error.response?.data) {
                // Check for message in response data
                if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response.data.error) {
                    errorMessage = error.response.data.error;
                } else if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast.error(errorMessage);
        } finally {
            setCreatingUser(false);
        }
    };

    // 1. Download Template Function
    const handleDownloadTemplate = () => {
        const sampleData = [
            { email: 'student1@example.com' },
            { email: 'student2@example.com' },
            { email: 'student3@example.com' }
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(sampleData);
        XLSX.utils.book_append_sheet(wb, ws, 'Students');
        XLSX.writeFile(wb, 'batch_students_template.xlsx');
        toast.success('Template downloaded successfully!');
    };

    // 2. File Change Handler
    const handleBatchFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const ext = selectedFile.name.split('.').pop().toLowerCase();
            if (!['xlsx', 'xls'].includes(ext)) {
                toast.error('Please upload only Excel files (.xlsx or .xls)');
                return;
            }
            setBatchFile(selectedFile);
        }
    };

    // 3. Update your existing handleCreateBatch function to this:
    const handleCreateBatch = async () => {
        // ✅ Validate all fields
        if (!batchNameInput || !batchTrainer || !batchCourse || !batchStart || !batchEnd) {
            toast.error('Please fill all required fields');
            return;
        }

        if (!batchFile) {
            setBatchFileError('Please upload an Excel file with student emails');
            return;
        }

        setCreatingBatch(true);
        try {
            const formData = new FormData();
            formData.append('name', batchNameInput);           // ✅ Using batchNameInput
            formData.append('startDate', batchStart);           // ✅ Using batchStart
            formData.append('endDate', batchEnd);               // ✅ Using batchEnd
            formData.append('trainerId', batchTrainer);         // ✅ Using batchTrainer
            formData.append('courseId', batchCourse);           // ✅ Using batchCourse
            // Access duration fields (optional)
            formData.append('accessDurationWeeks', String(batchAccessWeeks || 0));
            formData.append('accessDurationDays', String(batchAccessDays || 0));
            if (batchAccessStart) formData.append('accessStartDate', batchAccessStart);
            formData.append('file', batchFile);                 // ✅ Using batchFile

            const response = await api.post('/batches/create-with-excel', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success(
                `Batch created successfully! ${response.data.stats.added} students added${response.data.stats.skipped > 0 ? `, ${response.data.stats.skipped} skipped` : ''}`
            );

            // ✅ Close modal and reset form
            setShowCreateBatchModal(false);
            setBatchNameInput('');
            setBatchTrainer('');
            setBatchCourse('');
            setBatchStart('');
            setBatchEnd('');
            setBatchAccessWeeks(0);
            setBatchAccessDays(0);
            setBatchAccessStart('');
            setBatchFile(null);
            setBatchFileError('');

            fetchAllBatches(); // Refresh batch list
        } catch (err) {
            console.error('Create batch error:', err);
            toast.error(err.response?.data?.message || 'Error creating batch');
        } finally {
            setCreatingBatch(false);
        }
    };

    const normalizeDateForServer = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
        if (parts.length !== 3) return null;
        let year, month, day;
        if (parts[0].length === 4) {
            [year, month, day] = parts;
        } else if (parts[2].length === 4) {
            [day, month, year] = parts;
        } else {
            return null;
        }
        return `${year}-${month.padStart(2, '0')}-${day.padStart(
            2,
            '0'
        )}T00:00:00Z`;
    };

    const handleCreateCourse = async () => {
        if (!courseTitleInput) return toast.error('Course title is required');
        setCreatingCourse(true);
        try {
            const formData = new FormData();
            formData.append('title', courseTitleInput);
            formData.append('description', courseDescInput);
            if (batchTrainer) formData.append('trainerId', batchTrainer);

            const weeks = Array.from({ length: Number(courseWeeksInput) }, (_, i) => ({
                weekNumber: i + 1,
                days: [],
            }));
            formData.append('weeks', JSON.stringify(weeks));

            if (courseImage) {
                formData.append('image', courseImage);
            }

            const res = await api.post('/courses', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            toast.success(res.data?.message || 'Course created');
            fetchAllCourses();
            setShowAddCourseModal(false);
            setCourseTitleInput('');
            setCourseDescInput('');
            setCourseWeeksInput(1);
            setCourseImage(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create course');
        } finally {
            setCreatingCourse(false);
        }
    };

    const handleBulkUploadSuccess = () => {
        fetchUsers();
        setShowBulkUploadModal(false);
    };

    // Keep a single source of truth whether any modal is open; useful to pause auto-refresh
    useEffect(() => {
        const open = (
            showBulkUploadModal ||
            showBatchStudentsModal ||
            showCreateUserModal ||
            showProposalModal ||
            showCreateBatchModal ||
            showAddCourseModal ||
            showCreateUserModal ||
            showCreateBatchModal ||
            showAddCourseModal ||
            showAssignTrainerModal ||
            Boolean(selectedUser)
        );
        setIsModalOpen(open);
    }, [
        showBulkUploadModal,
        showBatchStudentsModal,
        showCreateUserModal,
        showProposalModal,
        showCreateBatchModal,
        showAddCourseModal,
        showAssignTrainerModal,
        selectedUser
    ]);

    const handleGenerateCertificate = useCallback(
        async (userId, courseId) => {
            try {
                await generateUserCertificate(userId, courseId);
                toast.success('Certificate generated successfully!');
            } catch (err) {
                toast.error(err.message || 'Failed to generate');
            }
        },
        [generateUserCertificate]
    );

    // ===== INLINE STYLES USING DESIGN SYSTEM =====
    const containerStyle = {
        padding: SPACING.lg,
        backgroundColor: COLORS.offWhite,
        minHeight: '100%',
    };

    const headerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
        flexWrap: 'wrap',
        gap: SPACING.md,
    };

    const titleStyle = {
        fontSize: FONT_SIZES.h2,
        fontWeight: 700,
        color: COLORS.textPrimary,
    };

    const subtitleStyle = {
        fontSize: FONT_SIZES.bodySm,
        color: COLORS.textSecondary,
        marginTop: SPACING.sm,
    };

    const buttonGroupStyle = {
        display: 'flex',
        gap: SPACING.md,
        flexWrap: 'wrap',
    };

    const btnPrimaryStyle = {
        padding: `${SPACING.sm} ${SPACING.md}`,
        backgroundColor: COLORS.primary,
        color: COLORS.white,
        border: 'none',
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.bodySm,
        fontWeight: 600,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: SPACING.sm,
    };

    const btnSecondaryStyle = {
        padding: `${SPACING.sm} ${SPACING.md}`,
        backgroundColor: COLORS.info,
        color: COLORS.white,
        border: 'none',
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.bodySm,
        fontWeight: 600,
        cursor: 'pointer',
        transition: `all ${TRANSITIONS.normal}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: SPACING.sm,
    };

    const searchBoxStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
        backgroundColor: COLORS.white,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        boxShadow: SHADOWS.sm,
    };

    const searchInputStyle = {
        flex: 1,
        padding: `${SPACING.sm} ${SPACING.md}`,
        border: `1px solid ${COLORS.lightGray}`,
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.body,
        fontFamily: 'inherit',
    };

    const sectionStyle = {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.xl,
        boxShadow: SHADOWS.sm,
    };

    const sectionTitleStyle = {
        fontSize: FONT_SIZES.h4,
        fontWeight: 600,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
    };

    const badgeStyle = {
        display: 'inline-block',
        backgroundColor: COLORS.success,
        color: COLORS.white,
        padding: `4px 12px`,
        borderRadius: BORDER_RADIUS.full,
        fontSize: FONT_SIZES.caption,
        fontWeight: 600,
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
        zIndex: 1000,
    };

    const modalContentStyle = {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.xl,
        maxWidth: '700px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: SHADOWS.xl,
    };

    const modalHeaderStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
        paddingBottom: SPACING.md,
        borderBottom: `1px solid ${COLORS.lightGray}`,
    };

    const modalTitleStyle = {
        fontSize: FONT_SIZES.h3,
        fontWeight: 600,
        color: COLORS.textPrimary,
    };

    const closeButtonStyle = {
        background: 'none',
        border: 'none',
        fontSize: FONT_SIZES.h4,
        color: COLORS.textSecondary,
        cursor: 'pointer',
        transition: `color ${TRANSITIONS.normal}`,
    };

    const formGroupStyle = {
        marginBottom: SPACING.md,
    };

    const labelStyle = {
        display: 'block',
        marginBottom: SPACING.sm,
        fontWeight: 600,
        fontSize: FONT_SIZES.bodySm,
        color: COLORS.textPrimary,
    };

    const inputStyle = {
        width: '100%',
        padding: `${SPACING.sm} ${SPACING.md}`,
        border: `1px solid ${COLORS.lightGray}`,
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.body,
        fontFamily: 'inherit',
    };

    const selectStyle = {
        width: '100%',
        padding: `${SPACING.sm} ${SPACING.md}`,
        border: `1px solid ${COLORS.lightGray}`,
        borderRadius: BORDER_RADIUS.md,
        fontSize: FONT_SIZES.body,
        fontFamily: 'inherit',
    };

    const modalFooterStyle = {
        display: 'flex',
        gap: SPACING.md,
        justifyContent: 'flex-end',
        marginTop: SPACING.lg,
        paddingTop: SPACING.md,
        borderTop: `1px solid ${COLORS.lightGray}`,
    };

    const tableActionButtonStyle = (bgColor = COLORS.info) => ({
        padding: '6px 12px',
        backgroundColor: bgColor,
        color: COLORS.white,
        border: 'none',
        borderRadius: BORDER_RADIUS.md,
        cursor: 'pointer',
        fontSize: FONT_SIZES.bodySm,
        fontWeight: 500,
        transition: `all ${TRANSITIONS.normal}`,
    });

    const statusBadgeStyle = (status) => {
        const colors = {
            pending: { bg: COLORS.warning, text: '#000' },
            approved: { bg: COLORS.success, text: COLORS.white },
            rejected: { bg: COLORS.danger, text: COLORS.white },
        };
        const color = colors[status] || colors.pending;
        return {
            display: 'inline-block',
            padding: '4px 12px',
            backgroundColor: color.bg,
            color: color.text,
            borderRadius: BORDER_RADIUS.full,
            fontSize: FONT_SIZES.caption,
            fontWeight: 600,
        };
    };

    // ===== JSX RENDER =====
    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={headerStyle}>
                <div>
                    <h1 style={titleStyle}>Admin Dashboard</h1>
                    <p style={subtitleStyle}>Manage your LMS platform</p>
                </div>

                {/* Header access-duration inputs removed — moved into Create Batch modal */}
                <div style={buttonGroupStyle}>
                    <button
                        style={btnSecondaryStyle}
                        onClick={() => setShowCreateUserModal(true)}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#0056b3')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = COLORS.info)}
                    >
                        <FaUserPlus /> Create User
                    </button>
                    <button
                        style={btnSecondaryStyle}
                        onClick={() => setShowBulkUploadModal(true)}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#0056b3')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = COLORS.info)}
                    >
                        <FaUpload /> Bulk Upload
                    </button>
                    <button
                        style={btnSecondaryStyle}
                        onClick={() => navigate('/admin/manage-users')}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#0056b3')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = COLORS.info)}
                    >
                        <FaUser /> Manage Users
                    </button>
                    <button
                        style={btnSecondaryStyle}
                        onClick={() => navigate('/admin/courses')}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#0056b3')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = COLORS.info)}
                    >
                        <FaBook /> Manage Courses
                    </button>
                    <button
                        style={btnSecondaryStyle}
                        onClick={() => navigate('/trainer/batches/progress')}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#0056b3')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = COLORS.info)}
                    >
                        <FaChalkboardTeacher /> Batch Progress
                    </button>
                    <button
                        style={btnSecondaryStyle}
                        onClick={() => setShowAddCourseModal(true)}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#0056b3')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = COLORS.info)}
                    >
                        <FaBook /> Add Course
                    </button>
                    <button
                        style={btnSecondaryStyle}
                        onClick={() => setShowCreateBatchModal(true)}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#0056b3')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = COLORS.info)}
                    >
                        <FaUserGraduate /> Create Batch
                    </button>
                    <button
                        style={{ ...btnPrimaryStyle, backgroundColor: '#6c5ce7' }}
                        onClick={() => navigate('/admin/points-config')}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#5f3dc4')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#6c5ce7')}
                    >
                        <FaCog /> Points Configuration
                    </button>
                </div>
            </div>

            {/* Search Box */}
            <div style={searchBoxStyle}>
                <FaSearch style={{ color: COLORS.textSecondary }} />
                <input
                    type="text"
                    placeholder="Search users by name or email..."
                    style={searchInputStyle}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Trainers Section */}
            <div style={sectionStyle}>
                <div style={sectionTitleStyle}>
                    <FaChalkboardTeacher
                        style={{ color: COLORS.primary, fontSize: FONT_SIZES.h4 }}
                    />
                    Trainers
                    <span style={badgeStyle}>{filteredTrainers.length}</span>
                </div>
                {filteredTrainers.length === 0 ? (
                    <p style={{ color: COLORS.textSecondary }}>
                        {searchTerm ? 'No trainers match your search' : 'No trainers found'}
                    </p>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Designation</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                filteredTrainers.map((trainer) => (
                                    <tr key={trainer._id}>
                                        <td>{trainer.name}</td>
                                        <td>{trainer.email}</td>
                                        <td>
                                            <span style={statusBadgeStyle('approved')}>{trainer.designation || 'Trainer'}</span>
                                        </td>
                                        <td>
                                            <button
                                                style={tableActionButtonStyle()}
                                                onClick={() => {
                                                    setSelectedTrainerForDetail(trainer);
                                                    setShowTrainerDetailModal(true);
                                                }}
                                                onMouseEnter={(e) =>
                                                    (e.target.style.backgroundColor = '#0056b3')
                                                }
                                                onMouseLeave={(e) =>
                                                    (e.target.style.backgroundColor = COLORS.info)
                                                }
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            }
                        </tbody >
                    </table >
                )}
            </div >

            {/* Unassigned Students Section */}
            < div style={sectionStyle} >
                <div style={sectionTitleStyle}>
                    <FaUserGraduate
                        style={{ color: COLORS.primary, fontSize: FONT_SIZES.h4 }}
                    />
                    Unassigned Students
                    <span style={badgeStyle}>{filteredStudents.length}</span>
                </div>
                {
                    filteredStudents.length === 0 ? (
                        <p style={{ color: COLORS.textSecondary }}>
                            {searchTerm
                                ? 'No students match your search'
                                : 'No unassigned students found'}
                        </p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Employee ID</th>
                                    <th>Assign to Batch</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student) => (
                                    <tr key={student._id}>
                                        <td>{student.name}</td>
                                        <td>{student.email}</td>
                                        <td style={{ fontFamily: 'monospace' }}>{student.employeeId || '-'}</td>
                                        <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <select
                                                style={{
                                                    padding: '6px 8px',
                                                    borderRadius: BORDER_RADIUS.md,
                                                    border: `1px solid ${COLORS.lightGray}`,
                                                    cursor: 'pointer',
                                                    fontSize: FONT_SIZES.bodySm,
                                                    minWidth: '160px',
                                                    maxWidth: '280px',
                                                    flex: '0 0 auto',
                                                }}
                                                defaultValue=""
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        handleAssignStudentToBatch(
                                                            student._id,
                                                            e.target.value
                                                        );
                                                        e.target.value = '';
                                                    }
                                                }}
                                            >
                                                <option value="">Select Batch</option>
                                                {batches.map((batch) => (
                                                    <option key={batch._id} value={batch._id}>
                                                        {batch.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                style={{
                                                    padding: '6px 10px',
                                                    backgroundColor: COLORS.danger,
                                                    color: COLORS.white,
                                                    border: 'none',
                                                    borderRadius: BORDER_RADIUS.sm,
                                                    cursor: 'pointer',
                                                    fontSize: FONT_SIZES.bodySm,
                                                    marginLeft: '12px',
                                                }}
                                                onClick={() => handleDeleteUser(student._id)}
                                                title="Delete user"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                }
            </div >

            {/* Course Proposals Section */}
            < div style={sectionStyle} >
                <div style={sectionTitleStyle}>
                    <FaBook
                        style={{ color: COLORS.primary, fontSize: FONT_SIZES.h4 }}
                    />
                    Course Content Proposals
                    <span style={badgeStyle}>{courseProposals.filter(p => p.status === proposalFilterStatus).length}</span>
                </div>

                {/* Status Filter Buttons */}
                <div style={{ marginBottom: SPACING.lg, display: 'flex', gap: SPACING.md }}>
                    <button
                        style={{
                            ...btnSecondaryStyle,
                            backgroundColor: proposalFilterStatus === 'pending' ? COLORS.warning : COLORS.lightGray,
                            color: proposalFilterStatus === 'pending' ? '#000' : COLORS.textSecondary,
                        }}
                        onClick={() => setProposalFilterStatus('pending')}
                    >
                        Pending
                    </button>
                    <button
                        style={{
                            ...btnSecondaryStyle,
                            backgroundColor: proposalFilterStatus === 'accepted' ? COLORS.success : COLORS.lightGray,
                            color: proposalFilterStatus === 'accepted' ? COLORS.white : COLORS.textSecondary,
                        }}
                        onClick={() => setProposalFilterStatus('accepted')}
                    >
                        Accepted
                    </button>
                    <button
                        style={{
                            ...btnSecondaryStyle,
                            backgroundColor: proposalFilterStatus === 'rejected' ? COLORS.danger : COLORS.lightGray,
                            color: proposalFilterStatus === 'rejected' ? COLORS.white : COLORS.textSecondary,
                        }}
                        onClick={() => setProposalFilterStatus('rejected')}
                    >
                        Rejected
                    </button>
                </div>

                {
                    courseProposals.filter(p => p.status === proposalFilterStatus).length === 0 ? (
                        <p style={{ color: COLORS.textSecondary }}>
                            No {proposalFilterStatus} proposals found
                        </p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Course</th>
                                    <th>Title</th>
                                    <th>Trainer</th>
                                    <th>Module</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {courseProposals.filter(p => p.status === proposalFilterStatus).map((proposal) => (
                                    <tr key={proposal._id}>
                                        <td>{proposal.course?.title || '—'}</td>
                                        <td>{proposal.title || '—'}</td>
                                        <td>{proposal.trainer?.name || '—'}</td>
                                        <td>
                                            {proposal.week && proposal.day ? `Week ${proposal.week}, Day ${proposal.day}` : 'Course Level'}
                                        </td>
                                        <td>
                                            <span style={statusBadgeStyle(proposal.status)}>
                                                {proposal.status}
                                            </span>
                                        </td>
                                        <td style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                                            <button
                                                style={{
                                                    ...tableActionButtonStyle(COLORS.primary),
                                                }}
                                                onClick={() => handleOpenProposalModal(proposal)}
                                                onMouseEnter={(e) =>
                                                    (e.target.style.backgroundColor = COLORS.primaryDark)
                                                }
                                                onMouseLeave={(e) =>
                                                    (e.target.style.backgroundColor = COLORS.primary)
                                                }
                                            >
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                }
            </div >

            {/* Batches Section */}
            < div style={sectionStyle} >
                <div style={sectionTitleStyle}>
                    <FaUserGraduate
                        style={{ color: COLORS.primary, fontSize: FONT_SIZES.h4 }}
                    />
                    Batches
                    <span style={badgeStyle}>{batches.length}</span>
                </div>
                {
                    batches.length === 0 ? (
                        <p style={{ color: COLORS.textSecondary }}>No batches found</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: SPACING.md }}>
                            {batches.map((batch) => (
                                <div
                                    key={batch._id}
                                    style={{
                                        border: `1px solid ${COLORS.lightGray}`,
                                        borderRadius: BORDER_RADIUS.md,
                                        padding: SPACING.md,
                                        backgroundColor: COLORS.offWhite,
                                    }}
                                >
                                    <h3 style={{ fontSize: FONT_SIZES.h4, fontWeight: 600, marginBottom: SPACING.sm }}>
                                        {batch.name}
                                    </h3>
                                    <p style={{ fontSize: FONT_SIZES.bodySm, color: COLORS.textSecondary, marginBottom: SPACING.xs }}>
                                        <strong>Course:</strong> {batch.course?.title || 'N/A'}
                                    </p>
                                    <p style={{ fontSize: FONT_SIZES.bodySm, color: COLORS.textSecondary, marginBottom: SPACING.xs }}>
                                        <strong>Trainer:</strong> {batch.trainer?.name || 'Unassigned'}
                                    </p>
                                    <p style={{ fontSize: FONT_SIZES.bodySm, color: COLORS.textSecondary, marginBottom: SPACING.md }}>
                                        <strong>Students:</strong> {batch.studentCount || 0}
                                    </p>
                                    <div style={{ display: 'flex', gap: SPACING.sm, flexWrap: 'wrap', alignItems: 'center', marginTop: SPACING.auto }}>
                                        <button
                                            style={{ ...tableActionButtonStyle(COLORS.secondary), flex: '1 1 auto', textAlign: 'center' }}
                                            onClick={() => {
                                                setSelectedBatch(batch);
                                                fetchBatchStudents(batch._id);
                                            }}
                                        >
                                            Students
                                        </button>
                                        <button
                                            style={{ ...tableActionButtonStyle(COLORS.warning), flex: '1 1 auto', textAlign: 'center' }}
                                            onClick={() => openAssignTrainerModal(batch)}
                                        >
                                            Assign
                                        </button>
                                        <div style={{ display: 'flex', gap: SPACING.sm }}>
                                            <button
                                                style={{ ...tableActionButtonStyle(COLORS.info), padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                onClick={() => openEditBatchModal(batch)}
                                                title="Edit Batch"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                style={{ ...tableActionButtonStyle(COLORS.danger), padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                onClick={() => handleDeleteBatch(batch._id)}
                                                title="Delete Batch"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                }
            </div >

            {/* Modals */}
            {
                showBulkUploadModal && (
                    <div style={modalOverlayStyle}>
                        <div style={modalContentStyle}>
                            <div style={modalHeaderStyle}>
                                <h2 style={modalTitleStyle}>Bulk Upload Users</h2>
                                <button
                                    style={closeButtonStyle}
                                    onClick={() => setShowBulkUploadModal(false)}
                                >
                                    <FaTimes />
                                </button>
                            </div>
                            <BulkUserUpload onSuccess={handleBulkUploadSuccess} />
                        </div>
                    </div>
                )
            }

            {
                showAssignTrainerModal && (
                    <AssignTrainerModal
                        isOpen={showAssignTrainerModal}
                        onClose={() => setShowAssignTrainerModal(false)}
                        onAssign={assignTrainerToBatch}
                        trainers={trainers}
                        currentTrainerId={selectedTrainerId}
                        setCurrentTrainerId={setSelectedTrainerId}
                    />
                )
            }

            {/* Create User Modal */}
            {
                showCreateUserModal && (
                    <div style={modalOverlayStyle}>
                        <div style={modalContentStyle}>
                            <div style={modalHeaderStyle}>
                                <h2 style={modalTitleStyle}>Create New User</h2>
                                <button
                                    style={closeButtonStyle}
                                    onClick={() => setShowCreateUserModal(false)}
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); handleCreateUser(); }}>
                                {/* Fake hidden inputs to trick Chrome's autofill heuristics */}
                                <input type="text" style={{ display: 'none' }} />
                                <input type="password" style={{ display: 'none' }} />

                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>Name</label>
                                    <input
                                        style={inputStyle}
                                        type="text"
                                        value={newUser.name}
                                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                        placeholder="Full Name"
                                        autoComplete="off"
                                        name="new_user_name_random"
                                    />
                                </div>

                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>Email</label>
                                    <input
                                        style={inputStyle}
                                        type="email"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        placeholder="Email Address"
                                        autoComplete="off"
                                        name="new_user_email_random"
                                    />
                                </div>

                                <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px', fontStyle: 'italic' }}>
                                    User will log in using Microsoft SSO. Password is not required.
                                </p>

                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>Role</label>
                                    <select
                                        style={selectStyle}
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                        autoComplete="off"
                                    >
                                        <option value="Student">Student</option>
                                        <option value="Trainer">Trainer</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>

                                {newUser.role === 'Admin' && (
                                    <div style={formGroupStyle}>
                                        <label style={labelStyle}>Admin Passkey</label>
                                        <input
                                            style={inputStyle}
                                            type="password"
                                            value={newUser.adminPasskey}
                                            onChange={(e) =>
                                                setNewUser({ ...newUser, adminPasskey: e.target.value })
                                            }
                                            placeholder="Required for creating Admin"
                                            autoComplete="new-password"
                                            name="admin_passkey_random"
                                        />
                                    </div>
                                )}

                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>Employee ID (Optional)</label>
                                    <input
                                        style={inputStyle}
                                        type="text"
                                        value={newUser.employeeId}
                                        onChange={(e) =>
                                            setNewUser({ ...newUser, employeeId: e.target.value })
                                        }
                                        placeholder="e.g. EMP123"
                                        autoComplete="off"
                                        name="employee_id_random"
                                    />
                                </div>
                            </form>

                            <div style={modalFooterStyle}>
                                <button
                                    style={{ ...btnPrimaryStyle, backgroundColor: COLORS.secondary }}
                                    onClick={() => setShowCreateUserModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    style={btnPrimaryStyle}
                                    onClick={handleCreateUser}
                                    disabled={creatingUser}
                                >
                                    {creatingUser ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit Batch Modal */}
            {
                showEditBatchModal && editBatch && (
                    <div style={modalOverlayStyle}>
                        <div style={modalContentStyle}>
                            <div style={modalHeaderStyle}>
                                <h2 style={modalTitleStyle}>Edit Batch: {editBatch.name}</h2>
                                <button
                                    style={closeButtonStyle}
                                    onClick={() => setShowEditBatchModal(false)}
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Batch Name</label>
                                <input
                                    style={inputStyle}
                                    type="text"
                                    value={editBatchName}
                                    onChange={(e) => setEditBatchName(e.target.value)}
                                />
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Trainer</label>
                                <select
                                    style={selectStyle}
                                    value={editTrainerId}
                                    onChange={(e) => setEditTrainerId(e.target.value)}
                                >
                                    <option value="">(No Trainer)</option>
                                    {trainers.map((t) => (
                                        <option key={t._id} value={t._id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Course</label>
                                <select
                                    style={selectStyle}
                                    value={editCourseId}
                                    onChange={(e) => setEditCourseId(e.target.value)}
                                >
                                    <option value="">(No Course)</option>
                                    {courses.map((c) => (
                                        <option key={c._id} value={c._id}>
                                            {c.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={modalFooterStyle}>
                                <button
                                    style={{ ...btnPrimaryStyle, backgroundColor: COLORS.secondary }}
                                    onClick={() => setShowEditBatchModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    style={btnPrimaryStyle}
                                    onClick={handleSaveBatchEdits}
                                    disabled={savingBatchEdits}
                                >
                                    {savingBatchEdits ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Proposal Review Modal */}
            {
                showProposalModal && selectedProposal && (
                    <div style={modalOverlayStyle}>
                        <div style={modalContentStyle}>
                            <div style={modalHeaderStyle}>
                                <h2 style={modalTitleStyle}>Review Proposal</h2>
                                <button
                                    style={closeButtonStyle}
                                    onClick={() => setShowProposalModal(false)}
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Course</label>
                                <p>{selectedProposal.course?.title || '—'}</p>
                            </div>
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Title</label>
                                <p>{selectedProposal.title}</p>
                            </div>
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Description</label>
                                <p>{selectedProposal.description}</p>
                            </div>
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Resources</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.sm }}>
                                    {selectedProposal.resources?.map((doc, idx) => (
                                        <a
                                            key={idx}
                                            href={`${api.defaults.baseURL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`.replace('/api', '') + doc}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                color: COLORS.primary,
                                                textDecoration: 'none',
                                                padding: `${SPACING.sm} ${SPACING.md}`,
                                                border: `1px solid ${COLORS.lightGray}`,
                                                borderRadius: BORDER_RADIUS.md,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: SPACING.sm,
                                                width: 'fit-content',
                                            }}
                                        >
                                            <FaDownload /> {doc.split('/').pop()}
                                        </a>
                                    ))}
                                </div>
                            </div>

                            <div style={modalFooterStyle}>
                                <button
                                    style={{ ...btnPrimaryStyle, backgroundColor: COLORS.secondary }}
                                    onClick={() => setShowProposalModal(false)}
                                    onMouseEnter={(e) =>
                                        (e.target.style.backgroundColor = COLORS.secondaryDark)
                                    }
                                    onMouseLeave={(e) =>
                                        (e.target.style.backgroundColor = COLORS.secondary)
                                    }
                                >
                                    Close
                                </button>
                                {selectedProposal.status === 'pending' && (
                                    <>
                                        <button
                                            style={{ ...btnPrimaryStyle, backgroundColor: COLORS.success }}
                                            onClick={() => handleReviewProposal(selectedProposal._id, 'accepted')}
                                            disabled={updatingProposal}
                                            onMouseEnter={(e) =>
                                                (e.target.style.backgroundColor = '#27ae60')
                                            }
                                            onMouseLeave={(e) =>
                                                (e.target.style.backgroundColor = COLORS.success)
                                            }
                                        >
                                            <FaCheck /> Accept
                                        </button>
                                        <button
                                            style={{ ...btnPrimaryStyle, backgroundColor: COLORS.danger }}
                                            onClick={() => handleReviewProposal(selectedProposal._id, 'rejected')}
                                            disabled={updatingProposal}
                                            onMouseEnter={(e) =>
                                                (e.target.style.backgroundColor = '#c0392b')
                                            }
                                            onMouseLeave={(e) =>
                                                (e.target.style.backgroundColor = COLORS.danger)
                                            }
                                        >
                                            <FaTimes /> Reject
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Batch Students Modal */}
            {
                showBatchStudentsModal && selectedBatch && (
                    <div style={modalOverlayStyle}>
                        <div style={modalContentStyle}>
                            <div style={modalHeaderStyle}>
                                <h2 style={modalTitleStyle}>{selectedBatch.name} - Students</h2>
                                <button
                                    style={closeButtonStyle}
                                    onClick={() => setShowBatchStudentsModal(false)}
                                    onMouseEnter={(e) =>
                                        (e.target.style.color = COLORS.textPrimary)
                                    }
                                    onMouseLeave={(e) =>
                                        (e.target.style.color = COLORS.textSecondary)
                                    }
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            {batchStudents.length === 0 ? (
                                <p style={{ color: COLORS.textSecondary }}>
                                    No students in this batch
                                </p>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Employee ID</th>
                                            <th>Email</th>
                                            <th>Points</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {batchStudents.map((student) => (
                                            <tr key={student._id}>
                                                <td>{student.name}</td>
                                                <td>{student.employeeId || '-'}</td>
                                                <td>{student.email}</td>
                                                <td>{student.rewardPoints || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            <div style={modalFooterStyle}>
                                <button
                                    style={btnPrimaryStyle}
                                    onClick={() => setShowBatchStudentsModal(false)}
                                    onMouseEnter={(e) =>
                                        (e.target.style.backgroundColor = COLORS.primaryDark)
                                    }
                                    onMouseLeave={(e) =>
                                        (e.target.style.backgroundColor = COLORS.primary)
                                    }
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Create Batch Modal */}
            {
                showCreateBatchModal && (
                    <div style={modalOverlayStyle}>
                        <div style={modalContentStyle}>
                            <div style={modalHeaderStyle}>
                                <h2 style={modalTitleStyle}>Create Batch</h2>
                                <button
                                    style={closeButtonStyle}
                                    onClick={() => setShowCreateBatchModal(false)}
                                    onMouseEnter={(e) =>
                                        (e.target.style.color = COLORS.textPrimary)
                                    }
                                    onMouseLeave={(e) =>
                                        (e.target.style.color = COLORS.textSecondary)
                                    }
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Batch Name</label>
                                <input
                                    style={inputStyle}
                                    type="text"
                                    placeholder="Batch name"
                                    value={batchNameInput}
                                    onChange={(e) => setBatchNameInput(e.target.value)}
                                />
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Trainer</label>
                                <select
                                    style={selectStyle}
                                    value={batchTrainer}
                                    onChange={(e) => setBatchTrainer(e.target.value)}
                                >
                                    <option value="">Select Trainer</option>
                                    {trainers.map((trainer) => (
                                        <option key={trainer._id} value={trainer._id}>
                                            {trainer.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Course</label>
                                <select
                                    style={selectStyle}
                                    value={batchCourse}
                                    onChange={(e) => setBatchCourse(e.target.value)}
                                >
                                    <option value="">Select Course</option>
                                    {courses.map((course) => (
                                        <option key={course._id} value={course._id}>
                                            {course.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Start Date</label>
                                <input
                                    style={inputStyle}
                                    type="date"
                                    placeholder="YYYY-MM-DD"
                                    value={batchStart}
                                    onChange={(e) => setBatchStart(e.target.value)}
                                />
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>End Date</label>
                                <input
                                    style={inputStyle}
                                    type="date"
                                    placeholder="YYYY-MM-DD"
                                    value={batchEnd}
                                    onChange={(e) => setBatchEnd(e.target.value)}
                                />
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Access Duration (weeks)</label>
                                <input
                                    style={inputStyle}
                                    type="number"
                                    min={0}
                                    value={batchAccessWeeks}
                                    onChange={(e) => setBatchAccessWeeks(Number(e.target.value))}
                                />
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Access Duration (days)</label>
                                <input
                                    style={inputStyle}
                                    type="number"
                                    min={0}
                                    value={batchAccessDays}
                                    onChange={(e) => setBatchAccessDays(Number(e.target.value))}
                                />
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Access Start Date</label>
                                <input
                                    style={inputStyle}
                                    type="date"
                                    value={batchAccessStart}
                                    onChange={(e) => setBatchAccessStart(e.target.value)}
                                />
                            </div>

                            {/* ✅ TEMPLATE DOWNLOAD SECTION */}
                            <div style={{
                                backgroundColor: '#EFF6FF',
                                padding: '16px',
                                borderRadius: '8px',
                                border: '1px solid #BFDBFE',
                                marginBottom: '16px'
                            }}>
                                <h4 style={{
                                    margin: '0 0 8px 0',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: COLORS.textPrimary
                                }}>
                                    Step 1: Download Template
                                </h4>
                                <p style={{
                                    margin: '0 0 12px 0',
                                    fontSize: '12px',
                                    color: '#6B7280'
                                }}>
                                    Download the Excel template, fill in student emails, then upload below
                                </p>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 16px',
                                        backgroundColor: '#10B981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#10B981'}
                                >
                                    <FaDownload />
                                    Download Student Email Template
                                </button>
                            </div>

                            {/* ✅ UPDATED FILE UPLOAD SECTION */}
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>
                                    📤 Step 2: Upload Excel File (Required)
                                </label>
                                {batchFileError && (
                                    <div style={{
                                        color: '#b91c1c',
                                        marginBottom: 8,
                                        fontSize: '0.92rem',
                                        backgroundColor: '#FEE2E2',
                                        padding: '8px',
                                        borderRadius: '4px'
                                    }}>
                                        {batchFileError}
                                    </div>
                                )}
                                <input
                                    style={inputStyle}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) => {
                                        setBatchFile(e.target.files?.[0] || null);
                                        if (e.target.files?.[0]) setBatchFileError('');
                                    }}
                                />
                                {batchFile && (
                                    <div style={{
                                        marginTop: '8px',
                                        fontSize: '12px',
                                        color: '#10B981',
                                        backgroundColor: '#D1FAE5',
                                        padding: '8px',
                                        borderRadius: '4px'
                                    }}>
                                        ✓ File selected: {batchFile.name} ({(batchFile.size / 1024).toFixed(2)} KB)
                                    </div>
                                )}
                            </div>

                            <div style={modalFooterStyle}>
                                <button
                                    style={{ ...btnPrimaryStyle, backgroundColor: COLORS.secondary }}
                                    onClick={() => {
                                        setShowCreateBatchModal(false);
                                        setBatchNameInput('');
                                        setBatchTrainer('');
                                        setBatchCourse('');
                                        setBatchStart('');
                                        setBatchEnd('');
                                        setBatchAccessWeeks(0);
                                        setBatchAccessDays(0);
                                        setBatchAccessStart('');
                                        setBatchFile(null);
                                        setBatchFileError('');
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.target.style.backgroundColor = COLORS.secondaryDark)
                                    }
                                    onMouseLeave={(e) =>
                                        (e.target.style.backgroundColor = COLORS.secondary)
                                    }
                                >
                                    Cancel
                                </button>
                                <button
                                    style={btnPrimaryStyle}
                                    onClick={handleCreateBatch}
                                    disabled={creatingBatch || !batchFile}
                                    onMouseEnter={(e) =>
                                        (e.target.style.backgroundColor = COLORS.primaryDark)
                                    }
                                    onMouseLeave={(e) =>
                                        (e.target.style.backgroundColor = COLORS.primary)
                                    }
                                >
                                    {creatingBatch ? 'Creating...' : 'Create Batch'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add Course Modal */}
            {
                showAddCourseModal && (
                    <div style={modalOverlayStyle}>
                        <div style={modalContentStyle}>
                            <div style={modalHeaderStyle}>
                                <h2 style={modalTitleStyle}>Add Course</h2>
                                <button
                                    style={closeButtonStyle}
                                    onClick={() => setShowAddCourseModal(false)}
                                    onMouseEnter={(e) =>
                                        (e.target.style.color = COLORS.textPrimary)
                                    }
                                    onMouseLeave={(e) =>
                                        (e.target.style.color = COLORS.textSecondary)
                                    }
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Course Title</label>
                                <input
                                    style={inputStyle}
                                    type="text"
                                    placeholder="Enter course title"
                                    value={courseTitleInput}
                                    onChange={(e) => setCourseTitleInput(e.target.value)}
                                />
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Description</label>
                                <textarea
                                    style={{ ...inputStyle, minHeight: '100px' }}
                                    placeholder="Enter course description"
                                    value={courseDescInput}
                                    onChange={(e) => setCourseDescInput(e.target.value)}
                                />
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Number of Weeks</label>
                                <input
                                    style={inputStyle}
                                    type="number"
                                    min="1"
                                    value={courseWeeksInput}
                                    onChange={(e) => setCourseWeeksInput(e.target.value)}
                                />
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Course Image</label>
                                <input
                                    style={inputStyle}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setCourseImage(e.target.files[0])}
                                />
                            </div>

                            <div style={modalFooterStyle}>
                                <button
                                    style={{ ...btnPrimaryStyle, backgroundColor: COLORS.secondary }}
                                    onClick={() => {
                                        setShowAddCourseModal(false);
                                        setCourseTitleInput('');
                                        setCourseDescInput('');
                                        setCourseWeeksInput(1);
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.target.style.backgroundColor = COLORS.secondaryDark)
                                    }
                                    onMouseLeave={(e) =>
                                        (e.target.style.backgroundColor = COLORS.secondary)
                                    }
                                >
                                    Cancel
                                </button>
                                <button
                                    style={btnPrimaryStyle}
                                    onClick={handleCreateCourse}
                                    disabled={creatingCourse}
                                    onMouseEnter={(e) =>
                                        (e.target.style.backgroundColor = COLORS.primaryDark)
                                    }
                                    onMouseLeave={(e) =>
                                        (e.target.style.backgroundColor = COLORS.primary)
                                    }
                                >
                                    {creatingCourse ? 'Creating...' : 'Add Course'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Trainer Detail Modal */}
            {
                showTrainerDetailModal && selectedTrainerForDetail && (
                    <div style={modalOverlayStyle}>
                        <div style={modalContentStyle}>
                            <div style={modalHeaderStyle}>
                                <h2 style={modalTitleStyle}>
                                    {selectedTrainerForDetail.name} - Details
                                </h2>
                                <button
                                    style={closeButtonStyle}
                                    onClick={() => {
                                        setShowTrainerDetailModal(false);
                                        setSelectedTrainerForDetail(null);
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.target.style.color = COLORS.textPrimary)
                                    }
                                    onMouseLeave={(e) =>
                                        (e.target.style.color = COLORS.textSecondary)
                                    }
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Name</label>
                                <p style={{ color: COLORS.textPrimary, fontWeight: 500 }}>
                                    {selectedTrainerForDetail.name}
                                </p>
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Email</label>
                                <p style={{ color: COLORS.textPrimary, fontWeight: 500 }}>
                                    {selectedTrainerForDetail.email}
                                </p>
                            </div>

                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Role</label>
                                <p style={{ color: COLORS.textPrimary, fontWeight: 500 }}>
                                    {selectedTrainerForDetail.role}
                                </p>
                            </div>

                            {/* Show designation and years of experience for trainers */}
                            {selectedTrainerForDetail.designation && (
                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>Designation</label>
                                    <p style={{ color: COLORS.textPrimary, fontWeight: 500 }}>
                                        {selectedTrainerForDetail.designation}
                                    </p>
                                </div>
                            )}

                            {selectedTrainerForDetail.phone && (
                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>Phone</label>
                                    <p style={{ color: COLORS.textPrimary, fontWeight: 500 }}>
                                        {selectedTrainerForDetail.phone}
                                    </p>
                                </div>
                            )}

                            {selectedTrainerForDetail.department && (
                                <div style={formGroupStyle}>
                                    <label style={labelStyle}>Department</label>
                                    <p style={{ color: COLORS.textPrimary, fontWeight: 500 }}>
                                        {selectedTrainerForDetail.department}
                                    </p>
                                </div>
                            )}

                            <div style={modalFooterStyle}>
                                <button
                                    style={btnPrimaryStyle}
                                    onClick={() => {
                                        setShowTrainerDetailModal(false);
                                        setSelectedTrainerForDetail(null);
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.target.style.backgroundColor = COLORS.primaryDark)
                                    }
                                    onMouseLeave={(e) =>
                                        (e.target.style.backgroundColor = COLORS.primary)
                                    }
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
