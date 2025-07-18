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
            academicHistory: [], // Start with empty array to avoid skewing results
            weeklyStudyContributions: [] // Start with empty array
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

// Get single player details
router.get('/api/players/:playerId', isAuthenticated, isTeacher, async (req, res) => {
    try {
        const { playerId } = req.params;

        const player = await Player.findById(playerId);

        if (!player) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }

        // Check if teacher created this player
        if (player.createdByTeacherID.toString() !== req.session.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        res.json({
            success: true,
            player: player
        });
    } catch (error) {
        console.error('Error fetching player:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update player (simple endpoint for dashboard)
router.put('/api/players/:playerId', isAuthenticated, isTeacher, async (req, res) => {
    try {
        const { playerId } = req.params;
        const { name, academicHistory, weeklyStudyContributions } = req.body;

        const player = await Player.findById(playerId);

        if (!player) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }

        // Check if teacher created this player
        if (player.createdByTeacherID.toString() !== req.session.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        // Update player data
        if (name) player.name = name;
        if (academicHistory) player.academicHistory = academicHistory;
        if (weeklyStudyContributions) player.weeklyStudyContributions = weeklyStudyContributions;

        await player.save();

        // Update team scores in all leagues this player is part of
        await updateTeamScoresForPlayer(playerId);

        res.json({
            success: true,
            message: 'Player updated successfully',
            player: player
        });
    } catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update player profile (for teachers)
router.put('/api/players/:playerId/update', isAuthenticated, isTeacher, async (req, res) => {
    try {
        const { playerId } = req.params;
        const { academicScore, effortHours, notes } = req.body;

        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }

        // Check if teacher created this player
        if (player.createdByTeacherID.toString() !== req.session.user.id) {
            return res.status(403).json({
                success: false,
                error: 'You can only update players you created'
            });
        }

        // Update academic history if provided
        if (academicScore !== undefined && academicScore !== null) {
            if (academicScore < 0 || academicScore > 100) {
                return res.status(400).json({
                    success: false,
                    error: 'Academic score must be between 0 and 100'
                });
            }

            player.academicHistory.push({
                grade_percent: academicScore,
                date: new Date()
            });
        }

        // Update effort contributions if provided
        if (effortHours !== undefined && effortHours !== null) {
            if (effortHours < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Effort hours cannot be negative'
                });
            }

            const currentWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));

            // Check if there's already an entry for this week
            const existingWeekIndex = player.weeklyStudyContributions.findIndex(
                entry => entry.week === currentWeek
            );

            if (existingWeekIndex >= 0) {
                // Update existing week entry
                player.weeklyStudyContributions[existingWeekIndex].hours = effortHours;
            } else {
                // Add new week entry
                player.weeklyStudyContributions.push({
                    hours: effortHours,
                    week: currentWeek
                });
            }
        }

        // Update notes if provided
        if (notes !== undefined) {
            player.notes = notes;
        }

        await player.save();

        res.json({
            success: true,
            message: 'Player profile updated successfully',
            player: {
                _id: player._id,
                name: player.name,
                academicHistory: player.academicHistory,
                weeklyStudyContributions: player.weeklyStudyContributions,
                notes: player.notes
            }
        });
    } catch (error) {
        console.error('Error updating player profile:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get player details
router.get('/api/players/:playerId', isAuthenticated, async (req, res) => {
    try {
        const { playerId } = req.params;
        const player = await Player.findById(playerId);

        if (!player) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }

        // Check permissions - teachers can see their own players, students can see basic info
        let playerData = {
            _id: player._id,
            name: player.name,
            role: player.role
        };

        if (req.session.user.role === 'Teacher' &&
            player.createdByTeacherID.toString() === req.session.user.id) {
            // Teacher can see full details of their players
            playerData = {
                ...playerData,
                academicHistory: player.academicHistory,
                weeklyStudyContributions: player.weeklyStudyContributions,
                notes: player.notes,
                classCode: player.classCode,
                createdByTeacherID: player.createdByTeacherID,
                linkedUserID: player.linkedUserID
            };
        } else if (req.session.user.linkedPlayerID &&
                   req.session.user.linkedPlayerID.toString() === playerId) {
            // Student can see their own player details
            playerData = {
                ...playerData,
                academicHistory: player.academicHistory,
                weeklyStudyContributions: player.weeklyStudyContributions
            };
        }

        res.json({
            success: true,
            player: playerData
        });
    } catch (error) {
        console.error('Error fetching player details:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all players for a teacher
router.get('/api/players/teacher/:teacherId', isAuthenticated, isTeacher, async (req, res) => {
    try {
        const { teacherId } = req.params;

        // Teachers can only get their own players
        if (teacherId !== req.session.user.id) {
            return res.status(403).json({
                success: false,
                error: 'You can only access your own players'
            });
        }

        const players = await Player.find({
            createdByTeacherID: teacherId
        }).sort({ name: 1 });

        res.json({
            success: true,
            players: players
        });
    } catch (error) {
        console.error('Error fetching teacher players:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Bulk update players (for batch operations)
router.put('/api/players/bulk-update', isAuthenticated, isTeacher, async (req, res) => {
    try {
        const { updates } = req.body; // Array of { playerId, academicScore, effortHours }

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Updates array is required'
            });
        }

        const results = [];
        const errors = [];

        for (const update of updates) {
            try {
                const { playerId, academicScore, effortHours } = update;

                const player = await Player.findById(playerId);
                if (!player) {
                    errors.push(`Player ${playerId} not found`);
                    continue;
                }

                // Check if teacher created this player
                if (player.createdByTeacherID.toString() !== req.session.user.id) {
                    errors.push(`No permission to update player ${player.name}`);
                    continue;
                }

                let updated = false;

                // Update academic score
                if (academicScore !== undefined && academicScore !== null) {
                    if (academicScore >= 0 && academicScore <= 100) {
                        player.academicHistory.push({
                            grade_percent: academicScore,
                            date: new Date()
                        });
                        updated = true;
                    } else {
                        errors.push(`Invalid academic score for ${player.name}`);
                        continue;
                    }
                }

                // Update effort hours
                if (effortHours !== undefined && effortHours !== null) {
                    if (effortHours >= 0) {
                        const currentWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));

                        const existingWeekIndex = player.weeklyStudyContributions.findIndex(
                            entry => entry.week === currentWeek
                        );

                        if (existingWeekIndex >= 0) {
                            player.weeklyStudyContributions[existingWeekIndex].hours = effortHours;
                        } else {
                            player.weeklyStudyContributions.push({
                                hours: effortHours,
                                week: currentWeek
                            });
                        }
                        updated = true;
                    } else {
                        errors.push(`Invalid effort hours for ${player.name}`);
                        continue;
                    }
                }

                if (updated) {
                    await player.save();
                    results.push({
                        playerId: player._id,
                        name: player.name,
                        updated: true
                    });
                }
            } catch (error) {
                errors.push(`Error updating player: ${error.message}`);
            }
        }

        res.json({
            success: true,
            message: `Updated ${results.length} players`,
            results: results,
            errors: errors
        });
    } catch (error) {
        console.error('Error in bulk update:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper function to update team scores when a player's score changes
async function updateTeamScoresForPlayer(playerId) {
    try {
        // Import models here to avoid circular dependencies
        const League = (await import('../models/League.js')).default;

        // Find all leagues where this player is drafted
        const leagues = await League.find({
            'participants.teamID': { $exists: true }
        }).populate({
            path: 'participants.teamID',
            populate: {
                path: 'roster.playerID',
                select: '_id'
            }
        });

        for (const league of leagues) {
            for (const participant of league.participants) {
                if (participant.teamID && participant.teamID.roster) {
                    // Check if this team has the updated player
                    const hasPlayer = participant.teamID.roster.some(rosterEntry =>
                        rosterEntry.playerID && rosterEntry.playerID._id.toString() === playerId.toString()
                    );

                    if (hasPlayer) {
                        // Update team scores
                        await participant.teamID.updateCurrentScores();
                        console.log(`Updated scores for team ${participant.teamID.teamName} in league ${league.leagueName}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error updating team scores for player:', error);
    }
}

export default router;