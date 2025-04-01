import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import Player from '../models/Player.js';

const router = express.Router();

router.get('/', isAuthenticated, async (req, res) => {
    try {
        let data = {
            user: req.session.user
        };

        if (req.session.user.role === 'Teacher') {
            const players = await Player.find({ 
                createdByTeacherID: req.session.user.id 
            });
            data.players = players;
        } else {
            const player = await Player.findOne({ 
                name: req.session.user.name 
            });
            data.playerStats = player;
        }

        res.render('dashboard', data);
    } catch (error) {
        res.status(500).render('error', { message: error.message });
    }
});

export default router;