class PermissionService {
    static async checkPermissions(user, action) {
        switch (action) {
            case 'create_league':
                return user.role === "Teacher";
            case 'draft_player':
                return user.permissions.includes("team_management");
            case 'update_grades':
                return user.role === "Teacher";
            default:
                return false;
        }
    }
}

export default PermissionService;