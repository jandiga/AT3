import mongoose from 'mongoose';

const leagueSchema = new mongoose.Schema({
    leagueName: {
        type: String,
        required: true
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
    linkedUserIDs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    linkedTeamIDs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    }]
});

const League = mongoose.model('League', leagueSchema);
export default League;