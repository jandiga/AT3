/**
 * Authentication middleware that requires user to be logged in
 * Redirects to login page if not authenticated
 */
export const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect('/login');
};

/**
 * Optional authentication middleware that allows both authenticated and non-authenticated access
 * Sets req.user to null if not authenticated, but continues processing
 */
export const optionalAuthentication = (req, res, next) => {
    // User is already set in res.locals by global middleware
    // Just continue to next middleware
    return next();
};

/**
 * Authentication middleware that requires user to be a teacher
 * Returns 403 error if not authenticated or not a teacher
 */
export const isTeacher = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'Teacher') {
        return next();
    }
    return res.status(403).render('error', {
        message: 'Access denied. This feature is only available to teachers.'
    });
};

/**
 * API authentication middleware for JSON responses
 * Returns JSON error instead of redirecting
 */
export const isAuthenticatedAPI = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({
        success: false,
        error: 'Authentication required'
    });
};

/**
 * Optional API authentication middleware
 * Continues processing even if not authenticated, but sets user context
 */
export const optionalAuthenticationAPI = (req, res, next) => {
    // User session is already available in req.session
    // Continue processing regardless of authentication status
    return next();
};
