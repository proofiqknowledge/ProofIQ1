
// MENTYX Chatbot Configuration
// Defines roles, routes, and navigation keywords

export const BOT_NAME = "MENTYX";

export const ROLES = {
    ADMIN: 'Admin',
    TRAINER: 'Trainer',
    STUDENT: 'Student',
    MASTER: 'Master'
};

// Route Configuration Mapping
// Structure: Role -> Intent -> { label, path, keywords }
export const ROUTE_CONFIG = {
    [ROLES.STUDENT]: {
        'dashboard': {
            label: 'Student Dashboard',
            path: '/student',
            keywords: ['dashboard', 'home', 'main', 'start']
        },
        'my_courses': {
            label: 'My Library (Courses)',
            path: '/courses',
            keywords: ['library', 'course', 'learn', 'study', 'class']
        },
        'exams': {
            label: 'Assessments (Exams)',
            path: '/exams',
            keywords: ['exam', 'test', 'quiz', 'assessment', 'assessments']
        },
        'certificates': {
            label: 'Certificates',
            path: '/certificates/my',
            keywords: ['certificate', 'cert', 'diploma']
        },
        'leaderboard': {
            label: 'Leaderboard',
            path: '/leaderboard',
            keywords: ['leaderboard', 'rank', 'score']
        },
        'my_blogs': {
            label: 'My Blogs',
            path: '/community/blogs/my',
            keywords: ['my blog', 'write', 'post']
        },
        'community_blogs': {
            label: 'Community Blogs',
            path: '/community/blogs',
            keywords: ['blog', 'community', 'read']
        },
        'playground': {
            label: 'Coding Playground',
            path: '/playground',
            keywords: ['code', 'playground', 'ide']
        }
    },
    [ROLES.TRAINER]: {
        'dashboard': {
            label: 'Trainer Dashboard',
            path: '/trainer',
            keywords: ['dashboard', 'home']
        },
        'batches': {
            label: 'Batch Progress',
            path: '/trainer/batches/progress',
            keywords: ['batch', 'progress', 'class']
        },
        'courses': {
            label: 'Courses',
            path: '/courses',
            keywords: ['course', 'curriculum']
        },
        'evaluations': {
            label: 'Assessments Evaluations',
            path: '/trainer/exam-evaluations',
            keywords: ['evaluate', 'grade', 'assessment', 'checking']
        },
        'rewatch': {
            label: 'Rewatch Requests',
            path: '/trainer/rewatch-requests',
            keywords: ['rewatch', 'request', 'video']
        },
        'leaderboard': {
            label: 'Leaderboard',
            path: '/leaderboard',
            keywords: ['leaderboard']
        },
        'playground': {
            label: 'Coding Playground',
            path: '/playground',
            keywords: ['code', 'playground']
        }
    },
    [ROLES.ADMIN]: {
        'dashboard': {
            label: 'Admin Dashboard',
            path: '/admin',
            keywords: ['dashboard', 'home']
        },
        'manage_users': {
            label: 'Manage Users',
            path: '/admin/manage-users',
            keywords: ['user', 'student', 'trainer', 'add user']
        },
        'manage_courses': {
            label: 'Manage Courses',
            path: '/admin/courses',
            keywords: ['course', 'curriculum', 'add course']
        },
        'batch_progress': {
            label: 'Batch Progress',
            path: '/trainer/batches/progress',
            keywords: ['batch', 'progress']
        },
        'courses': {
            label: 'Courses',
            path: '/courses',
            keywords: ['view courses']
        },
        'manage_exams': {
            label: 'Assessments (Exams)',
            path: '/admin/exams',
            keywords: ['exam', 'test', 'assessment', 'create exam']
        },
        'reexam_requests': {
            label: 'Re-Assessment Requests',
            path: '/admin/reexam-requests',
            keywords: ['re-exam', 'request', 'retry']
        },
        'rewatch_requests': {
            label: 'Rewatch Requests',
            path: '/admin/rewatch-requests',
            keywords: ['rewatch', 'video request']
        },
        'leaderboard': {
            label: 'Leaderboard',
            path: '/leaderboard',
            keywords: ['leaderboard']
        },
        'playground': {
            label: 'Coding Playground',
            path: '/playground',
            keywords: ['code', 'playground']
        }
    }
};

// Also map Master to Admin routes for simplicity, or define separate if needed
ROUTE_CONFIG[ROLES.MASTER] = { ...ROUTE_CONFIG[ROLES.ADMIN] };

// Default / Fallback responses
export const FALLBACK_MESSAGES = [
    "I'm not sure about that. Try asking for 'My Library', 'Assessments', or 'Dashboard'.",
    "I can help you navigate! Where would you like to go?",
    "I didn't catch that. Try keywords like 'Assessments' or 'Certificates'."
];

export const GREETING_MESSAGE = "Where would you like to go?";

// Action Chips Actions
export const ROLE_ACTIONS = {
    [ROLES.STUDENT]: [
        { label: 'My Library (Courses)', path: '/courses' },
        { label: 'Assessments (Exams)', path: '/exams' },
        { label: 'Certificates', path: '/certificates/my' },
        { label: 'Leaderboard', path: '/leaderboard' },
        { label: 'My Blogs', path: '/community/blogs/my' },
        { label: 'Coding Playground', path: '/playground' }
    ],
    [ROLES.TRAINER]: [
        { label: 'Dashboard', path: '/trainer' },
        { label: 'Batch Progress', path: '/trainer/batches/progress' },
        { label: 'Courses', path: '/courses' },
        { label: 'Assessments Evaluations', path: '/trainer/exam-evaluations' },
        { label: 'Rewatch Requests', path: '/trainer/rewatch-requests' },
        { label: 'Leaderboard', path: '/leaderboard' },
        { label: 'Coding Playground', path: '/playground' }
    ],
    [ROLES.ADMIN]: [
        { label: 'Dashboard', path: '/admin' },
        { label: 'Manage Users', path: '/admin/manage-users' },
        { label: 'Manage Courses', path: '/admin/courses' },
        { label: 'Assessments (Exams)', path: '/admin/exams' },
        { label: 'Batch Progress', path: '/trainer/batches/progress' },
        { label: 'Re-Assessment Requests', path: '/admin/reexam-requests' },
        { label: 'Rewatch Requests', path: '/admin/rewatch-requests' },
        { label: 'Leaderboard', path: '/leaderboard' }
    ],
    'Guest': [
        { label: 'Login', path: '/login' },
        { label: 'Register', path: '/register' }
    ]
};
