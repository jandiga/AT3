import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import connectDB from './src/config/database.js';
import authRoutes from './src/routes/auth.js';
import dashboardRoutes from './src/routes/dashboard.js';
import playerRoutes from './src/routes/players.js';
import { isAuthenticated, isTeacher } from './src/middleware/auth.js';

// Configuration
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60 // Session TTL (1 day)
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // Cookie TTL (1 day)
    }
}));

// Middleware to make user available to all templates
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// Routes
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use(playerRoutes);

// Home route
app.get('/', (req, res) => {
    res.render('index');
});

// Add these routes before your 404 handler
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('login', { error: undefined });
});

app.get('/sign-up', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('signup');
});

app.get('/leagues', (req, res) => {
    res.render('leagues');
});

app.get('/leaderboard', (req, res) => {
    res.render('leaderboard');
});

app.get('/team-management', (req, res) => {
    res.render('team-management');
});

app.get('/settings', (req, res) => {
    res.render('settings');
});

app.get('/profile', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        
        let data = {
            user: req.session.user
        };

        if (req.session.user.role === 'Student') {
            // For students, fetch their team players
            const Player = (await import('./src/models/Player.js')).default;
            const players = await Player.find({ 
                teamID: req.session.user.linkedTeam 
            });
            data.players = players;
        }

        res.render('profile', data);
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { message: error.message });
    }
});

app.get('/FAQ', (req, res) => {
    res.render('faq');
});

app.get('/about', (req, res) => {
    res.render('about');
});

app.get('/create-player', isAuthenticated, isTeacher, (req, res) => {
    res.render('create-player', {
        user: req.session.user,
        success: req.query.success,
        playerId: req.query.playerId,
        error: req.query.error
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { 
        message: 'Something went wrong!' 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', { 
        message: 'Page not found' 
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 
