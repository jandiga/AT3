import express from 'express';
import { isAuthenticated, isTeacher } from '../middleware/auth.js';
import Player from '../models/Player.js';

const router = express.Router();

// Create new player
router.post('/api/players/create', isAuthenticated, isTeacher, async (req, res) => {
    try {
        const {
            studentName,
            classCode,
            notes,
        } = req.body;

        const player = new Player({
            name: studentName,
            classCode,
            notes,
            createdByTeacherID: req.session.user.id,
            academicHistory: [{
                score: Number(0),
                date: new Date()
            }],
            weeklyEffortContributions: [{
                points: Number(0),
                week: Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
            }]
        });

        await player.save();

        res.status(201).json({
            success: true,
            message: 'Player created successfully',
            playerId: player._id.toString()
        });
    } catch (error) {
        console.error('Error creating player:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;