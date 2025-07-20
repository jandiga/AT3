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

        // Check if user is a participant in the same league
        let isLeagueParticipant = false;
        if (team.leagueID) {
            const League = (await import('../models/League.js')).default;
            const league = await League.findById(team.leagueID._id);
            if (league) {
                isLeagueParticipant = league.participants.some(p =>
                    p.userID.toString() === req.session.user.id && p.isActive
                );
            }
        }

        if (!isOwner && !isTeacher && !isLeagueParticipant) {
            return res.status(403).render('error', {
                user: req.session.user,
                error: 'Access denied - you must be in the same league to view this team'
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

        // Check if user is a participant in the same league
        let isLeagueParticipant = false;
        if (team.leagueID) {
            const League = (await import('../models/League.js')).default;
            const league = await League.findById(team.leagueID._id);
            if (league) {
                isLeagueParticipant = league.participants.some(p =>
                    p.userID.toString() === req.session.user.id && p.isActive
                );
            }
        }

        if (!isOwner && !isTeacher && !isLeagueParticipant) {
            return res.status(403).json({
                success: false,
                error: 'Access denied - you must be in the same league to view this team'
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

// API endpoint to get user's teams in active leagues
router.get('/api/teams/user/active', isAuthenticated, async (req, res) => {
    try {
        const teams = await Team.find({
            ownerID: req.session.user.id
        })
        .populate('leagueID', 'leagueName status')
        .populate({
            path: 'roster.playerID',
            select: 'name academicScore effortScore totalScore'
        })
        .sort({ dateCreated: -1 }); // Newest first

        // Filter to only include teams in active leagues
        const activeTeams = teams.filter(team =>
            team.leagueID && team.leagueID.status === 'active'
        );

        res.json({
            success: true,
            teams: activeTeams
        });

    } catch (error) {
        console.error('Error fetching user teams:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
