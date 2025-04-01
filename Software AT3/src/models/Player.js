import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'Student'
    },
    teamID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
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
    academicHistory: [{
        score: Number,
        date: Date
    }],
    weeklyEffortContributions: [{
        points: Number,
        week: Number
    }],
    createdByTeacherID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    classCode: {
        type: String,
        required: true
    },
    isEligibleForDraft: {
        type: Boolean,
        default: true
    },
    linkedUserID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

const Player = mongoose.model('Player', playerSchema);
export default Player;