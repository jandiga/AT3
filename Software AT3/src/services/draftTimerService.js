import League from '../models/League.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';

class DraftTimerService {
    constructor() {
        this.checkInterval = null;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) {
            console.log('Draft timer service is already running');
            return;
        }

        console.log('Starting draft timer service...');
        this.isRunning = true;
        
        // Check every 10 seconds for expired turns
        this.checkInterval = setInterval(() => {
            this.checkExpiredTurns();
        }, 10000);
    }

    stop() {
        if (!this.isRunning) {
            console.log('Draft timer service is not running');
            return;
        }

        console.log('Stopping draft timer service...');
        this.isRunning = false;
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    async checkExpiredTurns() {
        try {
            // Find all active drafts
            const activeLeagues = await League.find({
                'draftState.isActive': true,
                status: 'drafting'
            }).populate('draftState.currentTurnUserID', 'name');

            for (const league of activeLeagues) {
                await this.checkLeagueForExpiredTurn(league);
            }
        } catch (error) {
            console.error('Error checking expired turns:', error);
        }
    }

    async checkLeagueForExpiredTurn(league) {
        try {
            // Check if there's a current turn and it has a start time
            if (!league.draftState.currentTurnUserID || !league.draftState.currentTurnStartTime) {
                return;
            }

            const now = new Date();
            const turnStartTime = new Date(league.draftState.currentTurnStartTime);
            const timeLimitMs = league.draftSettings.timeLimitPerPick * 1000;
            const elapsedMs = now.getTime() - turnStartTime.getTime();

            // Check if the turn has expired (add 5 second buffer to account for processing time)
            if (elapsedMs > (timeLimitMs + 5000)) {
                console.log(`Turn expired for league ${league._id}, user ${league.draftState.currentTurnUserID._id}, elapsed: ${Math.floor(elapsedMs / 1000)}s`);
                await this.autoPickForUser(league);
            }
        } catch (error) {
            console.error(`Error checking expired turn for league ${league._id}:`, error);
        }
    }

    async autoPickForUser(league) {
        try {
            // Get available players for this league
            const availablePlayers = await Player.find({
                _id: { $in: league.draftPool },
                classCode: league.classCode
            });

            if (availablePlayers.length === 0) {
                console.error(`No available players for auto-pick in league ${league._id}`);
                return;
            }

            // Pick a random available player
            const randomIndex = Math.floor(Math.random() * availablePlayers.length);
            const selectedPlayer = availablePlayers[randomIndex];

            // Find the user's team
            const userParticipant = league.participants.find(p =>
                p.userID.toString() === league.draftState.currentTurnUserID._id.toString() && p.isActive
            );

            if (!userParticipant || !userParticipant.teamID) {
                console.error(`User team not found for auto-pick in league ${league._id}`);
                return;
            }

            const team = await Team.findById(userParticipant.teamID);
            if (!team) {
                console.error(`Team not found for auto-pick in league ${league._id}`);
                return;
            }

            // Check if team has room for more players
            if (team.activeRosterCount >= league.maxPlayersPerTeam) {
                console.error(`Team roster is full for auto-pick in league ${league._id}`);
                return;
            }

            // Add player to team
            await team.addPlayer(
                selectedPlayer._id,
                league.draftState.currentRound,
                league.draftState.currentPick
            );

            // Remove player from draft pool
            league.draftPool = league.draftPool.filter(
                playerId => playerId.toString() !== selectedPlayer._id.toString()
            );

            // Add to pick history
            league.draftState.pickHistory.push({
                userID: league.draftState.currentTurnUserID._id,
                playerID: selectedPlayer._id,
                round: league.draftState.currentRound,
                pick: league.draftState.currentPick,
                timestamp: new Date()
            });

            // Check if draft is complete after adding the pick
            const totalParticipants = league.participants.filter(p => p.isActive).length;
            const totalPicks = totalParticipants * league.maxPlayersPerTeam;
            const currentPickCount = league.draftState.pickHistory.length;

            console.log(`Auto-pick completion check: ${currentPickCount}/${totalPicks} picks completed`);

            if (currentPickCount >= totalPicks) {
                console.log(`Draft completed for league ${league._id}! Setting league to active status`);
                league.draftState.isActive = false;
                league.status = 'active';
                league.draftState.currentTurnUserID = null;
                league.draftState.currentTurnStartTime = null;
            } else {
                // Advance to next pick only if draft is not complete
                await this.advanceToNextPick(league);
            }

            await league.save();

            console.log(`Auto-picked player ${selectedPlayer.name} for user ${league.draftState.currentTurnUserID.name} in league ${league._id}`);

        } catch (error) {
            console.error(`Error auto-picking for league ${league._id}:`, error);
        }
    }

    async advanceToNextPick(league) {
        try {
            const totalParticipants = league.participants.filter(p => p.isActive).length;
            const totalRounds = league.maxPlayersPerTeam;

            let nextPick = league.draftState.currentPick + 1;
            let nextRound = league.draftState.currentRound;

            // Check if we've completed the current round
            if (nextPick > totalParticipants) {
                nextRound++;
                nextPick = 1;
            }

            // Note: Draft completion is now checked before calling this function
            // This function only handles advancing to the next pick

            // Determine next user based on draft type
            let nextUserIndex;
            if (league.draftSettings.draftType === 'snake') {
                // Snake draft: reverse order on even rounds
                if (nextRound % 2 === 0) {
                    nextUserIndex = totalParticipants - nextPick;
                } else {
                    nextUserIndex = nextPick - 1;
                }
            } else {
                // Linear draft: same order every round
                nextUserIndex = nextPick - 1;
            }

            // Ensure index is within bounds
            nextUserIndex = Math.max(0, Math.min(nextUserIndex, totalParticipants - 1));

            const nextUser = league.draftState.draftOrder[nextUserIndex];
            if (!nextUser) {
                throw new Error(`No user found at draft order index: ${nextUserIndex}`);
            }

            league.draftState.currentRound = nextRound;
            league.draftState.currentPick = nextPick;
            league.draftState.currentTurnUserID = nextUser;
            league.draftState.currentTurnStartTime = new Date();

        } catch (error) {
            console.error('Error in advanceToNextPick:', error);
            throw error;
        }
    }
}

// Create singleton instance
const draftTimerService = new DraftTimerService();

export default draftTimerService;
