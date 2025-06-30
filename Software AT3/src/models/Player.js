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
        grade_percent: Number,
        date: Date
    }],
    studyContributions: [{
        studied: Boolean,
        date: Date
    }],
    weeklyStudyContributions: [{
        hours: Number,
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
    linkedUserID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

const Player = mongoose.model('Player', playerSchema);
export default Player;