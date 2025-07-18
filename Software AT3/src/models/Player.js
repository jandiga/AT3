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
    academicHistory: [{
        subject: String,
        score: Number,
        date: Date
    }],
    studyContributions: [{
        studied: Boolean,
        date: Date
    }],
    weeklyStudyContributions: [{
        week: String,
        hoursStudied: Number
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
    linkedUserID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

// Virtual for academic score (average of recent academic history)
playerSchema.virtual('academicScore').get(function() {
    if (!this.academicHistory || this.academicHistory.length === 0) {
        return 0;
    }

    // Calculate average of last 5 academic entries
    const recentEntries = this.academicHistory
        .filter(entry => entry.score !== null && entry.score !== undefined)
        .slice(-5);

    if (recentEntries.length === 0) {
        return 0;
    }

    const sum = recentEntries.reduce((total, entry) => total + entry.score, 0);
    return Math.round((sum / recentEntries.length) * 100) / 100; // Round to 2 decimal places
});

// Virtual for effort score (sum of recent weekly contributions)
playerSchema.virtual('effortScore').get(function() {
    if (!this.weeklyStudyContributions || this.weeklyStudyContributions.length === 0) {
        return 0;
    }

    // Sum of last 4 weeks of study contributions
    const recentContributions = this.weeklyStudyContributions
        .filter(entry => entry.hoursStudied !== null && entry.hoursStudied !== undefined)
        .slice(-4);

    if (recentContributions.length === 0) {
        return 0;
    }

    const sum = recentContributions.reduce((total, entry) => total + entry.hoursStudied, 0);
    return Math.round(sum * 100) / 100; // Round to 2 decimal places
});

// Virtual for total score (academic + effort)
playerSchema.virtual('totalScore').get(function() {
    return Math.round((this.academicScore + this.effortScore) * 100) / 100;
});

// Ensure virtual fields are serialized
playerSchema.set('toJSON', { virtuals: true });
playerSchema.set('toObject', { virtuals: true });

const Player = mongoose.model('Player', playerSchema);
export default Player;