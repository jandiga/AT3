import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import Team from '../models/Team.js';

const router = express.Router();

// Get team details page
router.get('/teams/:teamId', isAuthenticated, async (req, res) => {
    try {
        const { teamId } = req.params;
        
        const team = await Team.findById(teamId)
            .populate('ownerID', 'name email')
            .populate('leagueID', 'leagueName status')
            .populate({
                path: 'roster.playerID',
                select: 'name academicHistory weeklyStudyContributions'
            });
        
        if (!team) {
            return res.status(404).render('error', {
                user: req.session.user,
                error: 'Team not found'
            });
        }
        
        // Check if user has access to view this team
        const isOwner = team.ownerID._id.toString() === req.session.user.id;
        const isTeacher = req.session.user.role === 'Teacher';
        
        if (!isOwner && !isTeacher) {
            return res.status(403).render('error', {
                user: req.session.user,
                error: 'Access denied'
            });
        }
        
        res.render('team-details', {
            user: req.session.user,
            team: team,
            isOwner: isOwner
        });
        
    } catch (error) {
        console.error('Error loading team details:', error);
        res.status(500).render('error', {
            user: req.session.user,
            error: 'Failed to load team details'
        });
    }
});

// API endpoint to get team details
router.get('/api/teams/:teamId', isAuthenticated, async (req, res) => {
    try {
        const { teamId } = req.params;
        
        const team = await Team.findById(teamId)
            .populate('ownerID', 'name email')
            .populate('leagueID', 'leagueName status')
            .populate({
                path: 'roster.playerID',
                select: 'name academicHistory weeklyStudyContributions'
            });
        
        if (!team) {
            return res.status(404).json({
                success: false,
                error: 'Team not found'
            });
        }
        
        // Check if user has access to view this team
        const isOwner = team.ownerID._id.toString() === req.session.user.id;
        const isTeacher = req.session.user.role === 'Teacher';
        
        if (!isOwner && !isTeacher) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }
        
        res.json({
            success: true,
            team: team,
            isOwner: isOwner
        });
        
    } catch (error) {
        console.error('Error fetching team details:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
