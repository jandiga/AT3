import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
    scoreHistory: [{
        grade_percent: Number,
        date: Date
    }],
    weeklyScore: [{
        score: Number,
        week: Number
    }],
    creatorID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    classCode: {
        type: String,
        required: true
    },
    linkedLeagueID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'League'
    }
});

const Team = mongoose.model('Team', teamSchema);
export default Team;