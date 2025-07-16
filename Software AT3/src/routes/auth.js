import express from 'express';
import User from '../models/User.js';
import Player from '../models/Player.js';

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, playerID, classCode } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('signup', { error: 'Email already registered' });
        }

        const userData = {
            name,
            email,
            password,
            role
        };

        // Add classCode for teachers
        if (role === 'Teacher' && classCode) {
            userData.classCode = classCode;
        }

        // Link player ID for students
        if (role === 'Student' && playerID) {
            try {
                const player = await Player.findById(playerID);
                if (player) {
                    userData.linkedPlayerID = playerID;
                    // Also update the player record to link back to this user
                    player.linkedUserID = userData._id;
                    await player.save();
                    console.log(`Linked player ${playerID} to user account`);
                } else {
                    console.log(`Player with ID ${playerID} not found`);
                }
            } catch (err) {
                console.log('Invalid player ID provided:', err.message);
            }
        }

        const user = new User(userData);
        await user.save();
        
        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            linkedPlayerID: user.linkedPlayerID
        };

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).render('error', { message: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).render('login', { 
                error: 'Invalid email or password' 
            });
        }

        req.session.user = {
            id: user._id,
            name: user.name,
            role: user.role
        };

        res.redirect('/dashboard');
    } catch (error) {
        res.status(500).render('error', { message: error.message });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

export default router;