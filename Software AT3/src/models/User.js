import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['Student', 'Teacher'],
        required: true
    },
    classCode: {
        type: String,
        required: function() {
            return this.role === 'Teacher';
        }
    },
    linkedPlayerID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
    },
    linkedLeagues: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'League'
    }],
    pastLeagues: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'League'
        // add placement
    }],
    linkedTeams: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    }],
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12);
    }
    next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;