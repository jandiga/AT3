/**
 * Permission Management Service
 * Handles authorization checks for various user actions in the Fantasy Academic League
 */

class UserPermissionService {
    /**
     * Checks if a user has permission to perform a specific action
     * @param {Object} userObject - User object containing role and permissions
     * @param {string} requestedAction - Action to check permission for
     * @returns {boolean} True if user has permission, false otherwise
     */
    static async checkUserPermissions(userObject, requestedAction) {
        // Validate input parameters
        if (!userObject || !requestedAction) {
            console.warn('Invalid parameters provided to permission check');
            return false;
        }

        // Check permissions based on action type
        switch (requestedAction) {
            case 'create_league':
                return this.canCreateLeague(userObject);

            case 'manage_league':
                return this.canManageLeague(userObject);

            case 'draft_player':
                return this.canDraftPlayer(userObject);

            case 'update_grades':
                return this.canUpdateGrades(userObject);

            case 'view_detailed_stats':
                return this.canViewDetailedStats(userObject);

            case 'create_player':
                return this.canCreatePlayer(userObject);

            case 'join_league':
                return this.canJoinLeague(userObject);

            default:
                console.warn(`Unknown action requested: ${requestedAction}`);
                return false;
        }
    }

    /**
     * Checks if user can create leagues
     * @param {Object} userObject - User object
     * @returns {boolean} Permission result
     */
    static canCreateLeague(userObject) {
        return userObject.role === "Teacher";
    }

    /**
     * Checks if user can manage leagues
     * @param {Object} userObject - User object
     * @returns {boolean} Permission result
     */
    static canManageLeague(userObject) {
        return userObject.role === "Teacher" ||
               (userObject.permissions && userObject.permissions.includes("manage_league"));
    }

    /**
     * Checks if user can draft players
     * @param {Object} userObject - User object
     * @returns {boolean} Permission result
     */
    static canDraftPlayer(userObject) {
        return userObject.permissions && userObject.permissions.includes("team_management");
    }

    /**
     * Checks if user can update academic grades
     * @param {Object} userObject - User object
     * @returns {boolean} Permission result
     */
    static canUpdateGrades(userObject) {
        return userObject.role === "Teacher";
    }

    /**
     * Checks if user can view detailed player statistics
     * @param {Object} userObject - User object
     * @returns {boolean} Permission result
     */
    static canViewDetailedStats(userObject) {
        return userObject.role === "Teacher" ||
               (userObject.permissions && userObject.permissions.includes("view_detailed_stats"));
    }

    /**
     * Checks if user can create player profiles
     * @param {Object} userObject - User object
     * @returns {boolean} Permission result
     */
    static canCreatePlayer(userObject) {
        return userObject.role === "Teacher";
    }

    /**
     * Checks if user can join leagues as a participant
     * @param {Object} userObject - User object
     * @returns {boolean} Permission result
     */
    static canJoinLeague(userObject) {
        return userObject.role === "Student" ||
               (userObject.permissions && userObject.permissions.includes("league_participation"));
    }

    /**
     * Gets all available permissions for a user role
     * @param {string} userRole - Role to get permissions for
     * @returns {string[]} Array of permission strings
     */
    static getDefaultPermissionsForRole(userRole) {
        const rolePermissions = {
            "Teacher": [
                "create_league",
                "manage_league",
                "oversee_teams",
                "monitor_metrics",
                "create_player",
                "update_grades",
                "view_detailed_stats"
            ],
            "Student": [
                "player_scoring",
                "team_management",
                "league_participation"
            ]
        };

        return rolePermissions[userRole] || [];
    }
}

export default UserPermissionService;