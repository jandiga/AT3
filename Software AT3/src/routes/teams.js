import express from 'express';
import mongoose from 'mongoose';
import { isAuthenticated, optionalAuthenticationAPI } from '../middleware/auth.js';
import Team from '../models/Team.js';

const router = express.Router();

// Get team details page - allows public access for teams in public leagues
router.get('/teams/:teamId', async (req, res) => {
    try {
        const { teamId } = req.params;

        const team = await Team.findById(teamId)
            .select('-scoreHistory') // Exclude heavy score history
            .populate('ownerID', 'name email')
            .populate('leagueID', 'leagueName status isPublic')
            .populate({
                path: 'roster.playerID',
                select: 'name academicScore effortScore totalScore' // Only essential fields
            })
            .lean();

        if (!team) {
            return res.status(404).render('error', {
                user: req.session.user,
                error: 'Team not found'
            });
        }

        // Check if user has access to view this team
        let isOwner = false;
        let isTeacher = false;
        let isLeagueParticipant = false;

        if (req.session.user) {
            isOwner = team.ownerID._id.toString() === req.session.user.id;
            isTeacher = req.session.user.role === 'Teacher';

            // Check if user is a participant in the same league
            if (team.leagueID) {
                const League = (await import('../models/League.js')).default;
                const league = await League.findById(team.leagueID._id);
                if (league) {
                    isLeagueParticipant = league.participants.some(p =>
                        p.userID.toString() === req.session.user.id && p.isActive
                    );
                }
            }
        }

        // Check access permissions
        const isPublicLeague = team.leagueID && team.leagueID.isPublic;

        if (!isPublicLeague && !isOwner && !isTeacher && !isLeagueParticipant) {
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

// API endpoint to get team details - allows public access for teams in public leagues
router.get('/api/teams/:teamId', optionalAuthenticationAPI, async (req, res) => {
    try {
        const { teamId } = req.params;
        
        const team = await Team.findById(teamId)
            .select('-scoreHistory') // Exclude heavy score history
            .populate('ownerID', 'name email')
            .populate('leagueID', 'leagueName status')
            .populate({
                path: 'roster.playerID',
                select: 'name academicScore effortScore totalScore' // Only essential fields
            })
            .lean();
        
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
        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Ensure user ID is properly converted to ObjectId
        const userId = new mongoose.Types.ObjectId(req.session.user.id);

        const teams = await Team.find({
            ownerID: userId
        })
        .select('-scoreHistory') // Exclude heavy score history
        .populate('leagueID', 'leagueName status')
        .populate({
            path: 'roster.playerID',
            select: 'name' // Only get name, scores are in currentScores
        })
        .sort({ dateCreated: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(); // Use lean for better performance

        // Filter to only include teams in active leagues
        const activeTeams = teams.filter(team =>
            team.leagueID && team.leagueID.status === 'active'
        );

        // Add roster count for each team
        const teamsWithCounts = activeTeams.map(team => ({
            ...team,
            activeRosterCount: team.roster ? team.roster.filter(p => p.isActive).length : 0
        }));

        res.json({
            success: true,
            teams: teamsWithCounts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: teams.length === parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error fetching user teams:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint to get all user's teams (not just active leagues) - optimized for performance
router.get('/api/teams/user/all', isAuthenticated, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Ensure user ID is properly converted to ObjectId
        const userId = new mongoose.Types.ObjectId(req.session.user.id);

        const teams = await Team.find({
            ownerID: userId
        })
        .select('teamName leagueID currentScores dateCreated roster') // Only essential fields
        .populate('leagueID', 'leagueName status')
        .sort({ dateCreated: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

        // Add roster count for each team without populating players
        const teamsWithCounts = teams.map(team => ({
            ...team,
            activeRosterCount: team.roster ? team.roster.filter(p => p.isActive).length : 0
        }));

        res.json({
            success: true,
            teams: teamsWithCounts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: teams.length === parseInt(limit)
            }
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
