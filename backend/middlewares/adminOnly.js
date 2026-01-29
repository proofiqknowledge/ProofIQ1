/**
 * Admin/Master Only Middleware
 * 
 * Restricts access to Admin and Master roles only.
 * Use this middleware for sensitive operations like config management.
 */
const adminOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    const allowedRoles = ['Admin', 'Master'];

    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            message: 'Access denied. Admin or Master role required.',
            yourRole: req.user.role
        });
    }

    next();
};

module.exports = adminOnly;
