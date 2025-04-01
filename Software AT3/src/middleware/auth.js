export const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect('/login');
};

export const isTeacher = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'Teacher') {
        return next();
    }
    return res.status(403).render('error', { 
        message: 'Access denied. This feature is only available to teachers.' 
    });
};
