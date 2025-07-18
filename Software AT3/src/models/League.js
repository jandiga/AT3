import mongoose from 'mongoose';

const leagueSchema = new mongoose.Schema({
    leagueName: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    createdByTeacherID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    classCode: {
        type: String,
        required: true
    },
    // League settings
    maxParticipants: {
        type: Number,
        default: 12,
        min: 4,
        max: 20
    },
    maxPlayersPerTeam: {
        type: Number,
        default: 5,
        min: 3,
        max: 10
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    // League status
    status: {
        type: String,
        enum: ['setup', 'open', 'drafting', 'active', 'completed'],
        default: 'setup'
    },
    // Draft configuration
    draftSettings: {
        draftType: {
            type: String,
            enum: ['snake', 'linear'],
            default: 'snake'
        },
        timeLimitPerPick: {
            type: Number,
            default: 60, // seconds
            min: 30,
            max: 300
        },
        draftStartTime: {
            type: Date
        },
        autoDraft: {
            type: Boolean,
            default: false
        }
    },
    // Draft state
    draftState: {
        isActive: {
            type: Boolean,
            default: false
        },
        currentRound: {
            type: Number,
            default: 1
        },
        currentPick: {
            type: Number,
            default: 1
        },
        currentTurnUserID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        currentTurnStartTime: {
            type: Date
        },
        draftOrder: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        pickHistory: [{
            userID: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            playerID: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Player'
            },
            round: Number,
            pick: Number,
            timestamp: {
                type: Date,
                default: Date.now
            }
        }]
    },
    // Participants and teams
    participants: [{
        userID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        teamID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    // Available players for draft
    draftPool: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
    }],
    // League timeline
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

// Virtual for participant count
leagueSchema.virtual('participantCount').get(function() {
    return this.participants.filter(p => p.isActive).length;
});

// Virtual for available spots
leagueSchema.virtual('availableSpots').get(function() {
    return this.maxParticipants - this.participantCount;
});

// Virtual for draft completion status
leagueSchema.virtual('isDraftComplete').get(function() {
    // If draft is not active, it means it's either not started or completed
    if (!this.draftState.isActive) {
        // If status is 'active', it means draft was completed
        return this.status === 'active';
    }
    const totalPicks = this.participantCount * this.maxPlayersPerTeam;
    return this.draftState.pickHistory.length >= totalPicks;
});

// Method to check if user can join league
leagueSchema.methods.canUserJoin = function(userID) {
    // Check if league is open for joining
    if (this.status !== 'open') return false;

    // Check if there are available spots
    if (this.participantCount >= this.maxParticipants) return false;

    // Check if user is already a participant
    const isAlreadyParticipant = this.participants.some(p =>
        p.userID.toString() === userID.toString() && p.isActive
    );

    return !isAlreadyParticipant;
};

// Method to add participant
leagueSchema.methods.addParticipant = function(userID) {
    if (!this.canUserJoin(userID)) {
        throw new Error('User cannot join this league');
    }

    this.participants.push({
        userID: userID,
        joinedAt: new Date(),
        isActive: true
    });

    return this.save();
};

// Method to generate draft order
leagueSchema.methods.generateDraftOrder = function() {
    const activeParticipants = this.participants.filter(p => p.isActive);

    // Shuffle participants randomly
    for (let i = activeParticipants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [activeParticipants[i], activeParticipants[j]] = [activeParticipants[j], activeParticipants[i]];
    }

    this.draftState.draftOrder = activeParticipants.map(p => p.userID);
};

// Method to start draft
leagueSchema.methods.startDraft = function() {
    if (this.status !== 'open') {
        throw new Error('League must be open to start draft');
    }

    // Use the actual participants array length instead of virtual
    const activeParticipants = this.participants.filter(p => p.isActive);
    if (activeParticipants.length < 2) {
        throw new Error('Need at least 2 participants to start draft');
    }

    this.status = 'drafting';
    this.draftState.isActive = true;
    this.draftState.currentRound = 1;
    this.draftState.currentPick = 1;
    this.draftState.currentTurnUserID = this.draftState.draftOrder[0];
};

const League = mongoose.model('League', leagueSchema);
export default League;