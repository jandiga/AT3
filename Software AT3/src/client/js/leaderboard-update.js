import cron from 'node-cron';

class SchedulerService {
    constructor() {
        this.initializeScheduledTasks();
    }

    initializeScheduledTasks() {
        // Every Monday at 00:00
        cron.schedule('0 0 * * 1', async () => {
            await this.weeklyLeaderboardUpdate();
            await this.calculateAllTeamScores();
            await this.resetWeeklyEffortMetrics();
        });

        // First day of every month
        cron.schedule('0 0 1 * *', async () => {
            await this.gradeImportCycle();
            await this.academicScoreUpdates();
        });
    }

}

export default SchedulerService;