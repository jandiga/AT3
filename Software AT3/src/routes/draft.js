import express from 'express';
import mongoose from 'mongoose';
import { isAuthenticated } from '../middleware/auth.js';
import League from '../models/League.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';

const router = express.Router();

// Track users currently making picks to prevent duplicates
const usersCurrentlyPicking = new Set();

// Get draft status and current state
router.get('/api/draft/:leagueId/status', isAuthenticated, async (req, res) => {
    // Set a timeout for the request
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            res.status(408).json({
                success: false,
                error: 'Request timeout - draft status took too long to load'
            });
        }
    }, 10000); // 10 second timeout

    try {
        const { leagueId } = req.params;

        console.log(`Fetching draft status for league: ${leagueId}`);

        const league = await League.findById(leagueId)
            .populate('draftState.currentTurnUserID', 'name')
            .populate('draftState.draftOrder', 'name')
            .populate('draftState.pickHistory.userID', 'name')
            .populate('draftState.pickHistory.playerID', 'name')
            .populate('draftPool', 'name academicHistory weeklyStudyContributions')
            .populate('participants.userID', 'name')
            .populate({
                path: 'participants.teamID',
                select: 'teamName roster',
                populate: {
                    path: 'roster.playerID',
                    select: 'name'
                }
            });

        if (!league) {
            console.log(`League not found: ${leagueId}`);
            return res.status(404).json({
                success: false,
                error: 'League not found'
            });
        }

        // Check if user is a participant
        const isParticipant = league.participants.some(p =>
            p.userID && p.userID._id && p.userID._id.toString() === req.session.user.id && p.isActive
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                error: 'You are not a participant in this league'
            });
        }

        // Check if league is in a valid state for drafting
        if (!['drafting', 'active'].includes(league.status)) {
            return res.status(400).json({
                success: false,
                error: `League is not in drafting mode. Current status: ${league.status}`
            });
        }

        // Get available players (not yet drafted)
        let draftedPlayerIds = [];
        let availablePlayers = [];

        try {
            draftedPlayerIds = league.draftState.pickHistory ?
                league.draftState.pickHistory.map(pick => {
                    if (pick.playerID && pick.playerID._id) {
                        return pick.playerID._id.toString();
                    }
                    return null;
                }).filter(Boolean) :
                [];

            availablePlayers = league.draftPool ?
                league.draftPool.filter(player => {
                    if (!player || !player._id) return false;
                    return !draftedPlayerIds.includes(player._id.toString());
                }) :
                [];
        } catch (playerError) {
            console.error('Error processing players:', playerError);
            availablePlayers = league.draftPool || [];
        }

        // Calculate current user's turn info
        const userParticipant = league.participants.find(p =>
            p.userID && p.userID._id && p.userID._id.toString() === req.session.user.id && p.isActive
        );

        const isUserTurn = league.draftState.currentTurnUserID &&
            league.draftState.currentTurnUserID._id &&
            league.draftState.currentTurnUserID._id.toString() === req.session.user.id;

        // Calculate if draft is complete manually to avoid virtual property issues
        let isDraftComplete = false;
        try {
            const activeParticipants = league.participants.filter(p => p.isActive).length;
            const totalPicks = activeParticipants * league.maxPlayersPerTeam;
            const currentPicks = league.draftState.pickHistory ? league.draftState.pickHistory.length : 0;

            // Draft is complete if:
            // 1. Draft is not active, OR
            // 2. We've reached the total number of picks, OR
            // 3. We've completed all rounds
            isDraftComplete = !league.draftState.isActive ||
                            currentPicks >= totalPicks ||
                            (league.draftState.currentRound > league.maxPlayersPerTeam);
        } catch (completeError) {
            console.error('Error calculating draft completion:', completeError);
            isDraftComplete = !league.draftState.isActive;
        }

        console.log(`Draft status loaded successfully for user ${req.session.user.id}`);

        // Clear the timeout since we're responding successfully
        clearTimeout(timeout);

        if (!res.headersSent) {
            res.json({
                success: true,
                draftState: {
                    isActive: league.draftState.isActive || false,
                    currentRound: league.draftState.currentRound || 1,
                    currentPick: league.draftState.currentPick || 1,
                    currentTurnUser: league.draftState.currentTurnUserID,
                    draftOrder: league.draftState.draftOrder || [],
                    pickHistory: league.draftState.pickHistory || [],
                    isDraftComplete: isDraftComplete
                },
                availablePlayers: availablePlayers,
                participants: league.participants || [],
                userTeam: userParticipant?.teamID,
                isUserTurn: isUserTurn,
                draftSettings: league.draftSettings || {}
            });
        }

    } catch (error) {
        console.error('Error fetching draft status:', error);

        // Clear the timeout
        clearTimeout(timeout);

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: `Database error: ${error.message}`
            });
        }
    }
});

// Make a draft pick
router.post('/api/draft/:leagueId/pick', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;

    // Check if user is already making a pick
    if (usersCurrentlyPicking.has(userId)) {
        console.log(`Duplicate pick request from user ${userId}, ignoring`);
        return res.status(429).json({
            success: false,
            error: 'Pick already in progress'
        });
    }

    // Mark user as currently picking
    usersCurrentlyPicking.add(userId);

    try {
        const { leagueId } = req.params;
        const { playerId } = req.body;

        console.log(`User ${userId} attempting to draft player ${playerId} in league ${leagueId}`);

        if (!playerId) {
            return res.status(400).json({
                success: false,
                error: 'Player ID is required'
            });
        }

        const league = await League.findById(leagueId)
            .populate({
                path: 'participants.teamID',
                populate: {
                    path: 'roster.playerID',
                    select: 'name'
                }
            });

        if (!league) {
            return res.status(404).json({
                success: false,
                error: 'League not found'
            });
        }

        // Check if draft is active
        if (!league.draftState.isActive) {
            return res.status(400).json({
                success: false,
                error: 'Draft is not currently active'
            });
        }

        // Check if it's the user's turn
        if (!league.draftState.currentTurnUserID ||
            league.draftState.currentTurnUserID.toString() !== req.session.user.id) {
            return res.status(400).json({
                success: false,
                error: 'It is not your turn to pick'
            });
        }

        // Check if player is available
        const draftedPlayerIds = league.draftState.pickHistory.map(pick => pick.playerID.toString());
        if (draftedPlayerIds.includes(playerId)) {
            return res.status(400).json({
                success: false,
                error: 'Player has already been drafted'
            });
        }

        if (!league.draftPool.includes(playerId)) {
            return res.status(400).json({
                success: false,
                error: 'Player is not available in this league'
            });
        }

        // Find user's team
        const userParticipant = league.participants.find(p =>
            p.userID.toString() === req.session.user.id && p.isActive
        );

        if (!userParticipant || !userParticipant.teamID) {
            return res.status(400).json({
                success: false,
                error: 'User team not found'
            });
        }

        const team = userParticipant.teamID;

        // Check if team has room for more players
        if (team.activeRosterCount >= league.maxPlayersPerTeam) {
            return res.status(400).json({
                success: false,
                error: 'Team roster is full'
            });
        }

        // Add player to team
        console.log(`Adding player ${playerId} to team ${team._id} (${team.teamName})`);
        await team.addPlayer(
            playerId,
            league.draftState.currentRound,
            league.draftState.currentPick
        );
        console.log(`Player added successfully. Team roster count: ${team.activeRosterCount}`);

        // Record the pick in league history
        league.draftState.pickHistory.push({
            userID: req.session.user.id,
            playerID: playerId,
            round: league.draftState.currentRound,
            pick: league.draftState.currentPick,
            timestamp: new Date()
        });

        // Check if draft is complete after adding the pick
        const totalParticipants = league.participants.filter(p => p.isActive).length;
        const totalPicks = totalParticipants * league.maxPlayersPerTeam;
        const currentPickCount = league.draftState.pickHistory.length;

        console.log(`Draft completion check: ${currentPickCount}/${totalPicks} picks completed`);

        if (currentPickCount >= totalPicks) {
            console.log('Draft completed! Setting league to active status');
            league.draftState.isActive = false;
            league.status = 'active';
            league.draftState.currentTurnUserID = null;
            league.draftState.currentTurnStartTime = null;
        } else {
            // Advance to next pick only if draft is not complete
            try {
                await advanceToNextPick(league);
            } catch (advanceError) {
                console.error('Error advancing to next pick:', advanceError);
                // Still save the current pick even if advancement fails
            }
        }

        try {
            await league.save();
            console.log(`League saved successfully. Status: ${league.status}, Draft Active: ${league.draftState.isActive}`);
        } catch (saveError) {
            console.error('Error saving league:', saveError);
            throw saveError;
        }

        // Get the drafted player info
        const draftedPlayer = await Player.findById(playerId);

        console.log(`Successfully drafted player ${playerId} for user ${userId}`);

        // Calculate draft completion status manually for response
        const isDraftCompleteForResponse = !league.draftState.isActive ||
                                          (league.status === 'active') ||
                                          (currentPickCount >= totalPicks);

        res.json({
            success: true,
            message: 'Player drafted successfully',
            pick: {
                player: draftedPlayer,
                round: league.draftState.currentRound,
                pick: league.draftState.currentPick - 1, // Previous pick number
                team: team.teamName
            },
            nextTurn: {
                currentRound: league.draftState.currentRound,
                currentPick: league.draftState.currentPick,
                currentTurnUserID: league.draftState.currentTurnUserID,
                isDraftComplete: isDraftCompleteForResponse
            }
        });
    } catch (error) {
        console.error('Error making draft pick:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        // Always remove user from picking set
        usersCurrentlyPicking.delete(userId);
    }
});

// Auto-pick for current user (random available player)
router.post('/api/draft/:leagueId/auto-pick', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;

    // Check if user is already making a pick
    if (usersCurrentlyPicking.has(userId)) {
        console.log(`Duplicate auto-pick request from user ${userId}, ignoring`);
        return res.status(429).json({
            success: false,
            error: 'Pick already in progress'
        });
    }

    // Mark user as currently picking
    usersCurrentlyPicking.add(userId);

    try {
        const { leagueId } = req.params;
        const league = await League.findById(leagueId);

        if (!league) {
            return res.status(404).json({
                success: false,
                error: 'League not found'
            });
        }

        // Check if it's the user's turn
        if (!league.draftState.currentTurnUserID ||
            league.draftState.currentTurnUserID.toString() !== req.session.user.id) {
            return res.status(400).json({
                success: false,
                error: 'It is not your turn to pick'
            });
        }

        // Get available players
        const draftedPlayerIds = league.draftState.pickHistory.map(pick => pick.playerID.toString());
        const availablePlayers = league.draftPool.filter(playerId =>
            !draftedPlayerIds.includes(playerId.toString())
        );

        if (availablePlayers.length === 0) {
            // No players available - check if we should end the draft early
            const totalParticipants = league.participants.filter(p => p.isActive).length;
            const totalPossiblePicks = totalParticipants * league.maxPlayersPerTeam;
            const currentPickCount = league.draftState.pickHistory.length;

            console.log(`No players available for auto-pick. Current picks: ${currentPickCount}/${totalPossiblePicks}`);

            // End the draft early since no more players are available
            league.draftState.isActive = false;
            league.draftState.isDraftComplete = true;
            league.status = 'active';
            league.draftState.currentTurnUserID = null;
            league.draftState.currentTurnStartTime = null;

            await league.save();

            return res.json({
                success: true,
                message: 'Draft completed early - no more players available',
                draftComplete: true
            });
        }

        // Pick a random available player
        const randomIndex = Math.floor(Math.random() * availablePlayers.length);
        const selectedPlayerId = availablePlayers[randomIndex];

        // Use the regular pick endpoint logic
        req.body.playerId = selectedPlayerId;

        // Call the pick route handler directly
        const pickHandler = router.stack.find(layer =>
            layer.route && layer.route.path === '/api/draft/:leagueId/pick' &&
            layer.route.methods.post
        );

        if (pickHandler) {
            return pickHandler.route.stack[0].handle(req, res);
        } else {
            throw new Error('Pick handler not found');
        }
    } catch (error) {
        console.error('Error with auto-pick:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        // Always remove user from picking set
        usersCurrentlyPicking.delete(userId);
    }
});



// Helper function to advance draft to next pick
async function advanceToNextPick(league) {
    try {
        const totalParticipants = league.participants.filter(p => p.isActive).length;
        const totalRounds = league.maxPlayersPerTeam;

        console.log(`Advancing draft: Current R${league.draftState.currentRound} P${league.draftState.currentPick}, Total participants: ${totalParticipants}, Total rounds: ${totalRounds}`);

        let nextPick = league.draftState.currentPick + 1;
        let nextRound = league.draftState.currentRound;

        // Check if we've completed the current round
        if (nextPick > totalParticipants) {
            nextRound++;
            nextPick = 1;
            console.log(`Moving to next round: ${nextRound}`);
        }

        // Note: Draft completion is now checked before calling this function
        // This function only handles advancing to the next pick

        // Validate draft order exists
        if (!league.draftState.draftOrder || league.draftState.draftOrder.length === 0) {
            throw new Error('Draft order is not set');
        }

        // Determine next user based on draft type
        let nextUserIndex;
        if (league.draftSettings.draftType === 'snake') {
            // Snake draft: reverse order on even rounds
            if (nextRound % 2 === 0) {
                // For even rounds, reverse the order
                nextUserIndex = totalParticipants - nextPick;
            } else {
                // For odd rounds, normal order
                nextUserIndex = nextPick - 1;
            }
        } else {
            // Linear draft: same order every round
            nextUserIndex = nextPick - 1;
        }

        // Ensure index is within bounds
        nextUserIndex = Math.max(0, Math.min(nextUserIndex, totalParticipants - 1));

        // Validate the next user index
        if (nextUserIndex < 0 || nextUserIndex >= league.draftState.draftOrder.length) {
            throw new Error(`Invalid next user index: ${nextUserIndex}, draft order length: ${league.draftState.draftOrder.length}`);
        }

        const nextUser = league.draftState.draftOrder[nextUserIndex];
        if (!nextUser) {
            throw new Error(`No user found at draft order index: ${nextUserIndex}`);
        }

        league.draftState.currentRound = nextRound;
        league.draftState.currentPick = nextPick;
        league.draftState.currentTurnUserID = nextUser;
        league.draftState.currentTurnStartTime = new Date();

        console.log(`Next turn: R${nextRound} P${nextPick}, User: ${nextUser}`);

    } catch (error) {
        console.error('Error in advanceToNextPick:', error);
        throw error;
    }
}

// Debug route to check league state
router.get('/api/draft/:leagueId/debug', isAuthenticated, async (req, res) => {
    try {
        const { leagueId } = req.params;
        const league = await League.findById(leagueId);

        if (!league) {
            return res.status(404).json({ error: 'League not found' });
        }

        const debugInfo = {
            leagueId: league._id,
            status: league.status,
            draftState: {
                isActive: league.draftState.isActive,
                currentRound: league.draftState.currentRound,
                currentPick: league.draftState.currentPick,
                currentTurnUserID: league.draftState.currentTurnUserID,
                draftOrderLength: league.draftState.draftOrder ? league.draftState.draftOrder.length : 0,
                pickHistoryLength: league.draftState.pickHistory ? league.draftState.pickHistory.length : 0
            },
            participants: league.participants.length,
            maxPlayersPerTeam: league.maxPlayersPerTeam,
            draftPoolSize: league.draftPool ? league.draftPool.length : 0
        };

        res.json(debugInfo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
