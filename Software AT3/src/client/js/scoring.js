/**
 * Student Fantasy Scoring System
 * Calculates fantasy scores based on academic improvement, consistency, and performance trends
 */

/**
 * Calculates a student's fantasy score based on grade improvement, consistency, and long-term performance
 * @param {number[]} academicGrades - Array of grades sorted chronologically (0-100 scale)
 * @returns {number} Total fantasy score rounded to 2 decimal places
 */
function calculateStudentFantasyScore(academicGrades) {
    // Validate input - need at least 2 grades to calculate improvement
    if (!academicGrades || academicGrades.length < 2) {
        return 0; // Not enough data to calculate meaningful improvement
    }

    let improvementScore = 0;
    let consistencyBonus = 0;
    let trendBonus = 0;

    // Calculate improvement score by comparing consecutive grades
    for (let gradeIndex = 1; gradeIndex < academicGrades.length; gradeIndex++) {
        const gradeDifference = academicGrades[gradeIndex] - academicGrades[gradeIndex - 1];

        if (gradeDifference > 0) {
            // Reward improvement with double points
            improvementScore += gradeDifference * 2;
        } else {
            // Apply soft penalty for grade decline
            improvementScore += gradeDifference;
        }
    }

    // Calculate consistency bonus based on recent performance
    if (academicGrades.length >= 3) {
        const lastThreeGrades = academicGrades.slice(-3);

        if (lastThreeGrades.every(grade => grade >= 85)) {
            consistencyBonus = 5; // High performance consistency
        } else if (lastThreeGrades.every(grade => grade >= 70)) {
            consistencyBonus = 3; // Good performance consistency
        } else if (lastThreeGrades.every(grade => grade < 50)) {
            consistencyBonus = -2; // Penalty for consistently poor performance
        }
    }

    // Calculate long-term performance trend bonus
    if (academicGrades.length >= 5) {
        const lastFiveGrades = academicGrades.slice(-5);
        const averageOfLastFive = lastFiveGrades.reduce((sum, grade) => sum + grade, 0) / 5;

        // Only reward performance above 70%
        trendBonus = Math.max(0, averageOfLastFive - 70);
    }

    // Calculate total fantasy score
    const totalFantasyScore = improvementScore + consistencyBonus + trendBonus;

    return Math.round(totalFantasyScore * 100) / 100; // Round to 2 decimal places
}

/**
 * Example usage and testing function
 * Demonstrates how to use the scoring system
 */
function demonstrateScoring() {
    const sampleGrades = [72, 78, 85, 88, 90];
    const calculatedScore = calculateStudentFantasyScore(sampleGrades);

    console.log(`Sample grades: [${sampleGrades.join(', ')}]`);
    console.log(`Calculated fantasy score: ${calculatedScore}`);

    return calculatedScore;
}

// Export for use in other modules
export { calculateStudentFantasyScore, demonstrateScoring };
