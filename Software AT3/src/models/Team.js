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
    console.log(`Team.addPlayer called: playerID=${playerID}, team=${this._id}, teamName=${this.teamName}`);

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

    console.log(`Player added to roster. New roster length: ${this.roster.length}`);

    return this.save().then(savedTeam => {
        console.log(`Team saved successfully. Roster count: ${savedTeam.roster.length}`);
        return savedTeam;
    }).catch(error => {
        console.error(`Error saving team: ${error.message}`);
        throw error;
    });
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

            // Use the player's virtual properties for consistent scoring
            academicScore += player.academicScore || 0;
            effortScore += player.effortScore || 0;
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

// Method to update current scores (alias for calculateCurrentScore)
teamSchema.methods.updateCurrentScores = async function() {
    return await this.calculateCurrentScore();
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

// Create indexes for better query performance
teamSchema.index({ ownerID: 1, dateCreated: -1 }); // For user's teams
teamSchema.index({ leagueID: 1, 'currentScores.totalScore': -1 }); // For league leaderboards
teamSchema.index({ 'roster.playerID': 1 }); // For player lookups
teamSchema.index({ classCode: 1 }); // For class-based queries

const Team = mongoose.model('Team', teamSchema);
export default Team;