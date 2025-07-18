import express from 'express';
import { isAuthenticated, isTeacher } from '../middleware/auth.js';
import League from '../models/League.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import User from '../models/User.js';

const router = express.Router();

// Get all leagues (for browsing)
router.get('/api/leagues', isAuthenticated, async (req, res) => {
    try {
        const { status, classCode } = req.query;
        let query = {};
        
        // Filter by status if provided
        if (status) {
            query.status = status;
        }
        
        // Filter by classCode if provided
        if (classCode) {
            query.classCode = classCode;
        }
        
        // If user is a student, only show public leagues or leagues they're in
        if (req.session.user.role === 'Student') {
            query.$or = [
                { isPublic: true },
                { 'participants.userID': req.session.user.id }
            ];
        }
        
        const leagues = await League.find(query)
            .populate('createdByTeacherID', 'name')
            .populate('participants.userID', 'name')
            .sort({ dateCreated: -1 });
        
        res.json({
            success: true,
            leagues: leagues
        });
    } catch (error) {
        console.error('Error fetching leagues:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get leagues created by teacher
router.get('/api/leagues/my-leagues', isAuthenticated, isTeacher, async (req, res) => {
    try {
        const leagues = await League.find({ 
            createdByTeacherID: req.session.user.id 
        })
        .populate('participants.userID', 'name email')
        .populate('participants.teamID', 'teamName')
        .sort({ dateCreated: -1 });
        
        res.json({
            success: true,
            leagues: leagues
        });
    } catch (error) {
        console.error('Error fetching teacher leagues:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create new league
router.post('/api/leagues/create', isAuthenticated, isTeacher, async (req, res) => {
    try {
        const {
            leagueName,
            description,
            classCode,
            maxParticipants,
            maxPlayersPerTeam,
            isPublic,
            draftType,
            timeLimitPerPick,
            autoDraft,
            duration
        } = req.body;

        // Validate required fields
        if (!leagueName || !classCode) {
            return res.status(400).json({
                success: false,
                error: 'League name and class code are required'
            });
        }

        // Get available players for this class
        const availablePlayers = await Player.find({ 
            classCode: classCode,
            createdByTeacherID: req.session.user.id 
        });

        const leagueDuration = duration ? parseInt(duration) : 30;
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + leagueDuration * 24 * 60 * 60 * 1000);

        const league = new League({
            leagueName,
            description,
            createdByTeacherID: req.session.user.id,
            classCode,
            maxParticipants: maxParticipants || 12,
            maxPlayersPerTeam: maxPlayersPerTeam || 5,
            isPublic: isPublic !== false,
            duration: leagueDuration,
            endDate: endDate,
            draftSettings: {
                draftType: draftType || 'snake',
                timeLimitPerPick: timeLimitPerPick || 60,
                autoDraft: autoDraft || false
            },
            draftPool: availablePlayers.map(player => player._id),
            status: 'setup'
        });

        await league.save();

        res.status(201).json({
            success: true,
            message: 'League created successfully',
            leagueId: league._id.toString(),
            league: league
        });
    } catch (error) {
        console.error('Error creating league:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update league settings
router.put('/api/leagues/:leagueId', isAuthenticated, isTeacher, async (req, res) => {
    try {
        const { leagueId } = req.params;
        const league = await League.findById(leagueId);

        if (!league) {
            return res.status(404).json({
                success: false,
                error: 'League not found'
            });
        }

        // Check if user is the creator
        if (league.createdByTeacherID.toString() !== req.session.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Only the league creator can update settings'
            });
        }

        // Can only update if league is in setup or open status
        if (!['setup', 'open'].includes(league.status)) {
            return res.status(400).json({
                success: false,
                error: 'Cannot update league settings after draft has started'
            });
        }

        const allowedUpdates = [
            'leagueName', 'description', 'maxParticipants', 'maxPlayersPerTeam',
            'isPublic', 'draftSettings'
        ];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'draftSettings') {
                    league.draftSettings = { ...league.draftSettings, ...req.body[field] };
                } else {
                    league[field] = req.body[field];
                }
            }
        });

        await league.save();

        res.json({
            success: true,
            message: 'League updated successfully',
            league: league
        });
    } catch (error) {
        console.error('Error updating league:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Open league for participants
router.post('/api/leagues/:leagueId/open', isAuthenticated, isTeacher, async (req, res) => {
    try {
        const { leagueId } = req.params;
        const league = await League.findById(leagueId);

        if (!league) {
            return res.status(404).json({
                success: false,
                error: 'League not found'
            });
        }

        // Check if user is the creator
        if (league.createdByTeacherID.toString() !== req.session.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Only the league creator can open the league'
            });
        }

        if (league.status !== 'setup') {
            return res.status(400).json({
                success: false,
                error: 'League can only be opened from setup status'
            });
        }

        league.status = 'open';
        await league.save();

        res.json({
            success: true,
            message: 'League is now open for participants',
            league: league
        });
    } catch (error) {
        console.error('Error opening league:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get league details
router.get('/api/leagues/:leagueId', isAuthenticated, async (req, res) => {
    try {
        const { leagueId } = req.params;
        const league = await League.findById(leagueId)
            .populate('createdByTeacherID', 'name')
            .populate('participants.userID', 'name email')
            .populate({
                path: 'participants.teamID',
                select: 'teamName currentScores roster',
                populate: {
                    path: 'roster.playerID',
                    select: 'name'
                }
            })
            .populate('draftPool', 'name academicHistory weeklyStudyContributions');

        if (!league) {
            return res.status(404).json({
                success: false,
                error: 'League not found'
            });
        }

        // Check if user has access to this league
        const isCreator = league.createdByTeacherID._id.toString() === req.session.user.id;
        const isParticipant = league.participants.some(p => 
            p.userID._id.toString() === req.session.user.id
        );

        if (!league.isPublic && !isCreator && !isParticipant) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this league'
            });
        }

        res.json({
            success: true,
            league: league,
            userRole: {
                isCreator,
                isParticipant
            }
        });
    } catch (error) {
        console.error('Error fetching league details:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update player profile (for teachers)
router.put('/api/leagues/:leagueId/players/:playerId', isAuthenticated, isTeacher, async (req, res) => {
    try {
        const { leagueId, playerId } = req.params;
        const { academicScore, effortHours, notes } = req.body;

        const league = await League.findById(leagueId);
        if (!league) {
            return res.status(404).json({
                success: false,
                error: 'League not found'
            });
        }

        // Check if user is the creator
        if (league.createdByTeacherID.toString() !== req.session.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Only the league creator can update player profiles'
            });
        }

        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }

        // Check if player is in the league's draft pool
        if (!league.draftPool.includes(playerId)) {
            return res.status(400).json({
                success: false,
                error: 'Player is not in this league'
            });
        }

        // Update academic history if provided
        if (academicScore !== undefined) {
            player.academicHistory.push({
                score: academicScore,
                date: new Date()
            });
        }

        // Update effort contributions if provided
        if (effortHours !== undefined) {
            player.weeklyStudyContributions.push({
                hoursStudied: effortHours,
                date: new Date()
            });
        }

        await player.save();

        // Update team scores in all leagues this player is part of
        await updateTeamScoresForPlayer(playerId);

        res.json({
            success: true,
            message: 'Player profile updated successfully',
            player: player
        });
    } catch (error) {
        console.error('Error updating player profile:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Join league (for students)
router.post('/api/leagues/:leagueId/join', isAuthenticated, async (req, res) => {
    try {
        const { leagueId } = req.params;
        const { teamName } = req.body;

        if (!teamName || teamName.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Team name is required'
            });
        }

        const league = await League.findById(leagueId);
        if (!league) {
            return res.status(404).json({
                success: false,
                error: 'League not found'
            });
        }

        // Check if user can join
        if (!league.canUserJoin(req.session.user.id)) {
            return res.status(400).json({
                success: false,
                error: 'Cannot join this league'
            });
        }

        // Create team for the user
        const team = new Team({
            teamName: teamName.trim(),
            ownerID: req.session.user.id,
            leagueID: leagueId,
            classCode: league.classCode
        });

        await team.save();

        // Add user to league participants
        league.participants.push({
            userID: req.session.user.id,
            teamID: team._id,
            joinedAt: new Date(),
            isActive: true
        });

        await league.save();

        // Update user's linked leagues
        await User.findByIdAndUpdate(req.session.user.id, {
            $addToSet: {
                linkedLeagues: leagueId,
                linkedTeams: team._id
            }
        });

        res.json({
            success: true,
            message: 'Successfully joined league',
            team: team,
            league: league
        });
    } catch (error) {
        console.error('Error joining league:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Leave league
router.post('/api/leagues/:leagueId/leave', isAuthenticated, async (req, res) => {
    try {
        const { leagueId } = req.params;

        const league = await League.findById(leagueId);
        if (!league) {
            return res.status(404).json({
                success: false,
                error: 'League not found'
            });
        }

        // Can't leave if draft has started
        if (['drafting', 'active'].includes(league.status)) {
            return res.status(400).json({
                success: false,
                error: 'Cannot leave league after draft has started'
            });
        }

        // Find and deactivate participant
        const participant = league.participants.find(p =>
            p.userID.toString() === req.session.user.id && p.isActive
        );

        if (!participant) {
            return res.status(400).json({
                success: false,
                error: 'You are not a participant in this league'
            });
        }

        participant.isActive = false;
        await league.save();

        // Remove team if it exists
        if (participant.teamID) {
            await Team.findByIdAndDelete(participant.teamID);
        }

        // Update user's linked leagues
        await User.findByIdAndUpdate(req.session.user.id, {
            $pull: {
                linkedLeagues: leagueId,
                linkedTeams: participant.teamID
            }
        });

        res.json({
            success: true,
            message: 'Successfully left league'
        });
    } catch (error) {
        console.error('Error leaving league:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start draft (for teachers)
router.post('/api/leagues/:leagueId/start-draft', isAuthenticated, isTeacher, async (req, res) => {
    try {
        const { leagueId } = req.params;
        const league = await League.findById(leagueId);

        if (!league) {
            return res.status(404).json({
                success: false,
                error: 'League not found'
            });
        }

        // Check if user is the creator
        if (league.createdByTeacherID.toString() !== req.session.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Only the league creator can start the draft'
            });
        }

        // Check if league can start draft
        if (league.status !== 'open') {
            return res.status(400).json({
                success: false,
                error: 'League must be open to start draft'
            });
        }

        const activeParticipants = league.participants.filter(p => p.isActive);
        if (activeParticipants.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Need at least 2 participants to start draft'
            });
        }

        // Generate draft order
        for (let i = activeParticipants.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [activeParticipants[i], activeParticipants[j]] = [activeParticipants[j], activeParticipants[i]];
        }

        league.draftState.draftOrder = activeParticipants.map(p => p.userID);

        // Start draft
        league.status = 'drafting';
        league.draftState.isActive = true;
        league.draftState.currentRound = 1;
        league.draftState.currentPick = 1;
        league.draftState.currentTurnUserID = league.draftState.draftOrder[0];
        league.draftState.currentTurnStartTime = new Date();

        await league.save();

        res.json({
            success: true,
            message: 'Draft started successfully',
            league: league
        });
    } catch (error) {
        console.error('Error starting draft:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// End league (for teachers)
router.post('/api/leagues/:leagueId/end', isAuthenticated, isTeacher, async (req, res) => {
    try {
        const { leagueId } = req.params;
        const league = await League.findById(leagueId);

        if (!league) {
            return res.status(404).json({
                success: false,
                error: 'League not found'
            });
        }

        // Check if user is the creator
        if (league.createdByTeacherID.toString() !== req.session.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Only the league creator can end the league'
            });
        }

        // Can only end active leagues
        if (league.status !== 'active') {
            return res.status(400).json({
                success: false,
                error: 'League must be active to be ended'
            });
        }

        // Set league to completed
        league.status = 'completed';
        league.endDate = new Date();

        await league.save();

        res.json({
            success: true,
            message: 'League ended successfully',
            league: league
        });
    } catch (error) {
        console.error('Error ending league:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper function to update team scores when a player's score changes
async function updateTeamScoresForPlayer(playerId) {
    try {
        console.log(`Updating team scores for player: ${playerId}`);

        // Find all teams that have this player in their roster
        const teams = await Team.find({
            'roster.playerID': playerId,
            'roster.isActive': true
        });

        console.log(`Found ${teams.length} teams containing player ${playerId}`);

        for (const team of teams) {
            try {
                console.log(`Updating scores for team: ${team.teamName} (${team._id})`);

                // Update the team's current scores
                await team.updateCurrentScores();

                console.log(`Successfully updated team ${team.teamName} scores:`, {
                    totalScore: team.currentScores.totalScore,
                    academicScore: team.currentScores.academicScore,
                    effortScore: team.currentScores.effortScore
                });

                // Find leagues containing this team and update rankings
                const leagues = await League.find({
                    'participants.teamID': team._id
                });

                for (const league of leagues) {
                    console.log(`Updating rankings for league: ${league.leagueName}`);
                    await updateLeagueRankings(league._id);
                }

            } catch (teamError) {
                console.error(`Error updating team ${team.teamName}:`, teamError);
            }
        }

    } catch (error) {
        console.error('Error updating team scores for player:', error);
    }
}

// Helper function to update league rankings
async function updateLeagueRankings(leagueId) {
    try {
        const league = await League.findById(leagueId).populate({
            path: 'participants.teamID',
            select: 'teamName currentScores'
        });

        if (!league) {
            console.error(`League not found: ${leagueId}`);
            return;
        }

        // Get all teams with scores
        const teamsWithScores = league.participants
            .filter(p => p.teamID && p.isActive)
            .map(p => ({
                teamId: p.teamID._id,
                teamName: p.teamID.teamName,
                totalScore: p.teamID.currentScores?.totalScore || 0
            }))
            .sort((a, b) => b.totalScore - a.totalScore); // Sort by score descending

        // Update team rankings
        for (let i = 0; i < teamsWithScores.length; i++) {
            await Team.findByIdAndUpdate(teamsWithScores[i].teamId, {
                'stats.rank': i + 1
            });
        }

        console.log(`Updated rankings for league ${league.leagueName}:`,
            teamsWithScores.map((t, i) => `${i + 1}. ${t.teamName}: ${t.totalScore}`));

    } catch (error) {
        console.error('Error updating league rankings:', error);
    }
}

export default router;
