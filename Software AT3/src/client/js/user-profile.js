class UserProfile {
    constructor() {
        this.userID = null;
        this.name = null;
        this.email = null;
        this.role = null;
        this.classCode = null;
        this.profileCreated = false;
        this.linkedLeague = null;
        this.linkedTeam = null;
        this.linkedPlayerID = null;
    }

    async createProfile(userID, name, email, role, classCode) {
        this.userID = userID;
        this.name = name;
        this.email = email;
        this.role = role;
        this.classCode = classCode;
        this.profileCreated = true;

        if (role === "Student") {
            await this.assignToLeague(classCode);
        } else if (role === "Teacher") {
            await this.allowLeagueCreation();
        }

        return "Profile successfully created!";
    }
}

export default UserProfile;