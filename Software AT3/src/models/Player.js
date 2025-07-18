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
        hoursStudied: Number,
        date: {
            type: Date,
            default: Date.now
        }
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

// Virtual for academic score (average of last N grades, rounded to whole number)
playerSchema.virtual('academicScore').get(function() {
    if (!this.academicHistory || this.academicHistory.length === 0) {
        return 0;
    }

    // Calculate average of last 5 academic entries (N = 5)
    const recentEntries = this.academicHistory
        .filter(entry => entry.score !== null && entry.score !== undefined && entry.score >= 0)
        .slice(-5); // Last N grades (N = 5)

    if (recentEntries.length === 0) {
        return 0;
    }

    const sum = recentEntries.reduce((total, entry) => total + entry.score, 0);
    const average = sum / recentEntries.length;

    return Math.round(average); // Round to whole number
});

// Virtual for effort score (based on grade improvement over time, 1-100 scale)
playerSchema.virtual('effortScore').get(function() {
    if (!this.academicHistory || this.academicHistory.length < 2) {
        return 1; // Minimum score if not enough data for improvement calculation
    }

    // Get valid academic scores sorted by date
    const validScores = this.academicHistory
        .filter(entry => entry.score !== null && entry.score !== undefined && entry.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(entry => entry.score);

    if (validScores.length < 2) {
        return 1; // Minimum score if not enough valid data
    }

    // Calculate improvement over time
    let totalImprovement = 0;
    let improvementCount = 0;

    for (let i = 1; i < validScores.length; i++) {
        const improvement = validScores[i] - validScores[i - 1];
        if (improvement > 0) { // Only count positive improvements
            totalImprovement += improvement;
            improvementCount++;
        }
    }

    if (improvementCount === 0) {
        return 1; // Minimum score if no positive improvements
    }

    // Calculate average improvement per grade change
    const averageImprovement = totalImprovement / improvementCount;

    // Scale to 1-100 range
    // Assume maximum reasonable improvement per grade is 30 points
    const maxImprovement = 30;
    let effortScore = Math.min(100, Math.max(1, (averageImprovement / maxImprovement) * 100));

    return Math.round(effortScore);
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