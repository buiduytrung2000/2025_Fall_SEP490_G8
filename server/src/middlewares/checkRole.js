const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                err: 1,
                msg: 'Unauthorized - No user information found'
            });
        }

        const userRole = req.user.role;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                err: 1,
                msg: `Access denied. Required roles: ${allowedRoles.join(', ')}`
            });
        }

        next();
    };
};

module.exports = checkRole;
