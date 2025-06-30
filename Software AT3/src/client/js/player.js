class Player {
    constructor() {
        this.playerID = null;
        this.name = '';
        this.role = 'Student';
        this.lifetimeTotalScore = 0;
        this.improvementScore = 0;
        this.grades = [];
        this.linkedUserID = null;
        this.createdByTeacherID = null;
        this.classCode = null;
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
    score(grades) {
        // Calculate the score of a player relative to the newest grade
        if (grades.length < 2) {
            return 0;
        }
        let improvementScore = this.improvementOverTime(grades, 1);
        let consistencyBonus = 0;

        // Calculate consistency bonus
        if (grades.length >= 3) {
            last_three = grades.slice(-3);
            if (last_three.every(g => g >= 85)) {
                consistencyBonus = 5;
            } else if (last_three.every(g => g >= 70)) {
                consistencyBonus = 3;
            }
        }

    }
    improvementOverTime(grades, weeks) {
        return grades(grades.length)/grades(grades.length - weeks);
    }
}

export default Player;