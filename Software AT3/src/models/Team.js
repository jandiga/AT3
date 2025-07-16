import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
    teamName: {
        type: String,
        required: true,
        trim: true
    },
    ownerID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    leagueID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'League',
        required: true
    },
    classCode: {
        type: String,
        required: true
    },
    // Team roster
    roster: [{
        playerID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Player',
            required: true
        },
        draftedAt: {
            type: Date,
            default: Date.now
        },
        draftRound: {
            type: Number
        },
        draftPick: {
            type: Number
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    // Scoring history
    scoreHistory: [{
        totalScore: {
            type: Number,
            default: 0
        },
        academicScore: {
            type: Number,
            default: 0
        },
        effortScore: {
            type: Number,
            default: 0
        },
        bonusScore: {
            type: Number,
            default: 0
        },
        week: {
            type: Number,
            required: true
        },
        calculatedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Current scores
    currentScores: {
        totalScore: {
            type: Number,
            default: 0
        },
        academicScore: {
            type: Number,
            default: 0
        },
        effortScore: {
            type: Number,
            default: 0
        },
        bonusScore: {
            type: Number,
            default: 0
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    // Team statistics
    stats: {
        wins: {
            type: Number,
            default: 0
        },
        losses: {
            type: Number,
            default: 0
        },
        ties: {
            type: Number,
            default: 0
        },
        rank: {
            type: Number
        }
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

// Virtual for active roster count
teamSchema.virtual('activeRosterCount').get(function() {
    return this.roster.filter(player => player.isActive).length;
});

// Virtual for roster spots available
teamSchema.virtual('rosterSpotsAvailable').get(function() {
    // This will be populated from the league's maxPlayersPerTeam setting
    return true; // Will be calculated based on league settings
});

// Method to add player to roster
teamSchema.methods.addPlayer = function(playerID, draftRound, draftPick) {
    // Check if player is already on roster
    const existingPlayer = this.roster.find(p =>
        p.playerID.toString() === playerID.toString() && p.isActive
    );

    if (existingPlayer) {
        throw new Error('Player is already on this team');
    }

    this.roster.push({
        playerID: playerID,
        draftedAt: new Date(),
        draftRound: draftRound,
        draftPick: draftPick,
        isActive: true
    });

    return this.save();
};

// Method to remove player from roster
teamSchema.methods.removePlayer = function(playerID) {
    const playerIndex = this.roster.findIndex(p =>
        p.playerID.toString() === playerID.toString() && p.isActive
    );

    if (playerIndex === -1) {
        throw new Error('Player not found on this team');
    }

    this.roster[playerIndex].isActive = false;
    return this.save();
};

// Method to calculate current team score
teamSchema.methods.calculateCurrentScore = async function() {
    await this.populate('roster.playerID');

    let totalScore = 0;
    let academicScore = 0;
    let effortScore = 0;
    let bonusScore = 0;

    for (const rosterEntry of this.roster) {
        if (rosterEntry.isActive && rosterEntry.playerID) {
            const player = rosterEntry.playerID;

            // Calculate academic score from recent academic history
            if (player.academicHistory && player.academicHistory.length > 0) {
                const recentAcademic = player.academicHistory
                    .slice(-5) // Last 5 entries
                    .reduce((sum, entry) => sum + (entry.grade_percent || 0), 0) /
                    Math.min(player.academicHistory.length, 5);
                academicScore += recentAcademic;
            }

            // Calculate effort score from recent contributions
            if (player.weeklyStudyContributions && player.weeklyStudyContributions.length > 0) {
                const recentEffort = player.weeklyStudyContributions
                    .slice(-4) // Last 4 weeks
                    .reduce((sum, entry) => sum + (entry.hours || 0), 0);
                effortScore += recentEffort;
            }
        }
    }

    totalScore = academicScore + effortScore + bonusScore;

    this.currentScores = {
        totalScore,
        academicScore,
        effortScore,
        bonusScore,
        lastUpdated: new Date()
    };

    return this.save();
};

// Method to record weekly score
teamSchema.methods.recordWeeklyScore = function(week) {
    const weeklyEntry = {
        totalScore: this.currentScores.totalScore,
        academicScore: this.currentScores.academicScore,
        effortScore: this.currentScores.effortScore,
        bonusScore: this.currentScores.bonusScore,
        week: week,
        calculatedAt: new Date()
    };

    // Remove existing entry for this week if it exists
    this.scoreHistory = this.scoreHistory.filter(entry => entry.week !== week);
    this.scoreHistory.push(weeklyEntry);

    return this.save();
};

const Team = mongoose.model('Team', teamSchema);
export default Team;