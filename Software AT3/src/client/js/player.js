class Player {
    constructor() {
        this.playerID = null;
        this.name = '';
        this.role = 'Student';
        this.teamIDs = [];
        this.totalScore = 0;
        this.academicScore = 0;
        this.effortScore = 0;
        this.performanceBonuses = 0;
        this.academicHistory = [];
        this.weeklyEffortContributions = [];
        this.linkedUserID = null;
        this.createdByTeacherID = null;
        this.classCode = null;
        this.isEligibleForDraft = true;
        this.dateCreated = new Date();
    }

    static async createPlayer(teacherID, studentName, classCode) {
        const hasPermission = await this.checkPermissions(teacherID, "create_player");
        if (!hasPermission) {
            throw new Error("Unauthorized: Only teachers can create player profiles");
        }

        const player = new Player();
        player.playerID = this.generateUniqueId();
        player.name = studentName;
        player.classCode = classCode;
        player.createdByTeacherID = teacherID;

        return player;
    }

    async getStats(requestingUserID) {
        const basicStats = {
            name: this.name,
            totalScore: this.totalScore
        };

        const user = await this.fetchUser(requestingUserID);
        
        if (this.linkedUserID === requestingUserID || 
            user.role === "Teacher" || 
            user.permissions.includes("view_detailed_stats")) {
            return {
                ...basicStats,
                academicHistory: this.academicHistory,
                effortHistory: this.weeklyEffortContributions,
                academicScore: this.academicScore,
                effortScore: this.effortScore,
                performanceBonuses: this.performanceBonuses
            };
        }

        return basicStats;
    }

    convertGradeToScore(gradeInput) {
        if (typeof gradeInput === 'string') {
            gradeInput = gradeInput.toUpperCase();
            const gradeMap = {
                'A+': 100,
                'A': 95
                // Add other grade mappings as needed
            };
            return gradeMap[gradeInput] || 0;
        }
        return gradeInput;
    }

}

export default Player;