class League {
    constructor() {
        this.leagueID = null;
        this.leagueName = null;
        this.maxParticipants = null;
        this.draftOrder = [];
        this.teams = [];
        this.draftPool = [];
        this.timeLimitPerPick = 30;
        this.isDraftComplete = false;
    }

    async setupDraft(maxParticipants, draftType, timeLimit) {
        this.maxParticipants = maxParticipants;
        this.draftOrder = await this.generateDraftOrder(draftType);
        this.timeLimitPerPick = timeLimit;
        this.draftPool = await this.fetchAvailablePlayers();
    }

   
}

export default League;