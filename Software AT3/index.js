// Core Express.js imports for server functionality
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Application-specific imports
import connectDB from './src/config/database.js';
import authRoutes from './src/routes/auth.js';
import dashboardRoutes from './src/routes/dashboard.js';
import playerRoutes from './src/routes/players.js';
import leagueRoutes from './src/routes/leagues.js';
import draftRoutes from './src/routes/draft.js';
import teamRoutes from './src/routes/teams.js';
import { isAuthenticated, isTeacher, optionalAuthentication } from './src/middleware/auth.js';
import draftTimerService from './src/services/draftTimerService.js';

// Load environment variables from .env file
dotenv.config();

// ES6 module compatibility for __dirname
const currentFileUrl = fileURLToPath(import.meta.url);
const currentDirectoryPath = path.dirname(currentFileUrl);

// Initialize Express application
const expressApplication = express();
const serverPort = process.env.PORT || 3000;

// Establish database connection
connectDB();

// Configure Express application settings
expressApplication.set('view engine', 'ejs');
expressApplication.use(express.static(path.join(currentDirectoryPath, 'public')));
expressApplication.use(express.urlencoded({ extended: true }));
expressApplication.use(express.json());

// Configure session management with MongoDB store
const sessionTimeToLiveInSeconds = 24 * 60 * 60; // 24 hours in seconds
const cookieMaxAgeInMilliseconds = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

expressApplication.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: sessionTimeToLiveInSeconds
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        maxAge: cookieMaxAgeInMilliseconds
    }
}));

// Global middleware to make user session data available to all EJS templates
expressApplication.use((requestObject, responseObject, nextFunction) => {
    responseObject.locals.user = requestObject.session.user;
    nextFunction();
});

// Register application routes
expressApplication.use('/', authRoutes);
expressApplication.use('/dashboard', dashboardRoutes);
expressApplication.use(playerRoutes);
expressApplication.use(leagueRoutes);
expressApplication.use(draftRoutes);
expressApplication.use(teamRoutes);

// Home page route - displays main landing page
expressApplication.get('/', (requestObject, responseObject) => {
    responseObject.render('index');
});

// Authentication routes with redirect logic for logged-in users
expressApplication.get('/login', (requestObject, responseObject) => {
    // Redirect to dashboard if user is already authenticated
    if (requestObject.session.user) {
        return responseObject.redirect('/dashboard');
    }
    responseObject.render('login', { error: undefined });
});

expressApplication.get('/sign-up', (requestObject, responseObject) => {
    // Redirect to dashboard if user is already authenticated
    if (requestObject.session.user) {
        return responseObject.redirect('/dashboard');
    }
    responseObject.render('signup');
});

// Leagues overview page - allows public access
expressApplication.get('/leagues', (requestObject, responseObject) => {
    responseObject.render('leagues', { user: requestObject.session.user });
});

// League detail view - allows public access for public leagues
expressApplication.get('/leagues/:leagueId', async (requestObject, responseObject) => {
    try {
        const { leagueId } = requestObject.params;
        // Render detailed league view with user context and league ID
        responseObject.render('league-detail', {
            user: requestObject.session.user,
            leagueId: leagueId
        });
    } catch (errorObject) {
        responseObject.status(500).render('error', { message: errorObject.message });
    }
});

// Draft interface - handles live drafting functionality
expressApplication.get('/draft/:leagueId', isAuthenticated, async (requestObject, responseObject) => {
    try {
        const { leagueId } = requestObject.params;
        // Render drafting interface with user session and league context
        responseObject.render('drafting', {
            user: requestObject.session.user,
            leagueId: leagueId
        });
    } catch (errorObject) {
        responseObject.status(500).render('error', { message: errorObject.message });
    }
});

// Leaderboard page - displays league rankings and statistics
expressApplication.get('/leaderboard', (requestObject, responseObject) => {
    responseObject.render('leaderboard');
});

// Team management interface - allows users to manage their teams
expressApplication.get('/team-management', isAuthenticated, (requestObject, responseObject) => {
    responseObject.render('team-management', { user: requestObject.session.user });
});

// User settings page - handles account preferences and configuration
expressApplication.get('/settings', (requestObject, responseObject) => {
    responseObject.render('settings');
});

// User profile page - displays user information and associated teams
expressApplication.get('/profile', async (requestObject, responseObject) => {
    try {
        // Redirect unauthenticated users to login page
        if (!requestObject.session.user) {
            return responseObject.redirect('/login');
        }

        // Fetch complete user data from database
        const UserModel = (await import('./src/models/User.js')).default;
        const fullUserData = await UserModel.findById(requestObject.session.user.id);

        if (!fullUserData) {
            return responseObject.redirect('/login');
        }

        // Initialize profile data with complete user information
        let profileData = {
            user: fullUserData
        };

        // For student users, fetch their team information and player details
        if (fullUserData.role === 'Student') {
            // Dynamic imports for database models
            const TeamModel = (await import('./src/models/Team.js')).default;

            // Query teams owned by this user
            const userTeamsWithDetails = await TeamModel.find({
                ownerID: fullUserData._id
            })
            .populate('roster.playerID', 'name academicHistory weeklyStudyContributions')
            .populate('leagueID', 'leagueName status')
            .sort({ dateCreated: -1 }); // Sort by creation date, newest first

            profileData.teams = userTeamsWithDetails;
        }

        responseObject.render('profile', profileData);
    } catch (errorObject) {
        console.error(errorObject);
        responseObject.status(500).render('error', { message: errorObject.message });
    }
});

// Frequently Asked Questions page
expressApplication.get('/FAQ', (requestObject, responseObject) => {
    responseObject.render('faq');
});

// About page - provides information about the application
expressApplication.get('/about', (requestObject, responseObject) => {
    responseObject.render('about');
});

// Player creation interface - restricted to authenticated teachers only
expressApplication.get('/create-player', isAuthenticated, isTeacher, (requestObject, responseObject) => {
    responseObject.render('create-player', {
        user: requestObject.session.user,
        success: requestObject.query.success,
        playerId: requestObject.query.playerId,
        error: requestObject.query.error
    });
});

// Global error handling middleware - catches and handles application errors
expressApplication.use((errorObject, requestObject, responseObject, nextFunction) => {
    console.error(errorObject.stack);
    responseObject.status(500).render('error', {
        message: 'Something went wrong!'
    });
});

// 404 Not Found handler - handles requests to non-existent routes
expressApplication.use((requestObject, responseObject) => {
    responseObject.status(404).render('error', {
        message: 'Page not found'
    });
});

// Start the Express server and initialize background services
expressApplication.listen(serverPort, () => {
    console.log(`Fantasy Academic League server running on port ${serverPort}`);

    // Initialize the draft timer service for automated draft management
    draftTimerService.start();
});
