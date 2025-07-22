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
    /**
     * Calculate the fantasy score of a player based on their academic grades
     * @param {number[]} academicGrades - Array of grades sorted chronologically
     * @returns {number} Calculated fantasy score
     */
    calculatePlayerScore(academicGrades) {
        // Validate input data
        if (!academicGrades || academicGrades.length < 2) {
            return 0;
        }

        const improvementScore = this.calculateImprovementOverTime(academicGrades, 1);
        let consistencyBonus = 0;

        // Calculate consistency bonus for recent performance
        if (academicGrades.length >= 3) {
            const lastThreeGrades = academicGrades.slice(-3);
            if (lastThreeGrades.every(grade => grade >= 85)) {
                consistencyBonus = 5; // High performance bonus
            } else if (lastThreeGrades.every(grade => grade >= 70)) {
                consistencyBonus = 3; // Good performance bonus
            }
        }

        return improvementScore + consistencyBonus;
    }

    /**
     * Calculate improvement score over a specified time period
     * @param {number[]} academicGrades - Array of grades sorted chronologically
     * @param {number} numberOfWeeks - Number of weeks to look back for comparison
     * @returns {number} Improvement ratio
     */
    calculateImprovementOverTime(academicGrades, numberOfWeeks) {
        if (academicGrades.length < numberOfWeeks + 1) {
            return 0;
        }

        const currentGrade = academicGrades[academicGrades.length - 1];
        const previousGrade = academicGrades[academicGrades.length - 1 - numberOfWeeks];

        // Avoid division by zero
        if (previousGrade === 0) {
            return currentGrade > 0 ? 1 : 0;
        }

        return currentGrade / previousGrade;
    }
}

export default Player;