// def calculate_student_score(grades):
//     """
//     Calculates a student's fantasy score based on grade improvement, consistency, and long-term performance.
    
//     :param grades: List of grades (sorted chronologically)
//     :return: Total fantasy score
//     """
//     if len(grades) < 2:
//         return 0  # Not enough data to calculate improvement
    
//     improvement_score = 0
//     consistency_bonus = 0
    
//     # Calculate improvement score
//     for i in range(1, len(grades)):
//         delta = grades[i] - grades[i - 1]
//         if delta > 0:
//             improvement_score += delta * 2  # Reward improvement
//         else:
//             improvement_score += delta  # Soft penalty for decline
    
//     # Calculate consistency bonus
//     if len(grades) >= 3:
//         last_three = grades[-3:]
//         if all(g >= 85 for g in last_three):
//             consistency_bonus = 5
//         elif all(g >= 70 for g in last_three):
//             consistency_bonus = 3
//         elif all(g < 50 for g in last_three):
//             consistency_bonus = -2
    
//     # Calculate long-term performance score (average of last 5 grades)
//     trend_bonus = 0
//     if len(grades) >= 5:
//         avg_last_five = sum(grades[-5:]) / 5
//         trend_bonus = avg_last_five - 70  # Only rewards above 70%
    
//     total_score = improvement_score + consistency_bonus + trend_bonus
//     return round(total_score, 2)

// # Example usage
// grades = [72, 78, 85, 88, 90]  # Sample student grades
// score = calculate_student_score(grades)
// print(f"Student Fantasy Score: {score}")
