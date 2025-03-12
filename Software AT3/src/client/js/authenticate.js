import bcrypt from 'bcrypt';

class AuthService {
    async signUp(name, email, password, role, classCode) {
        if (!this.validateEmail(email)) {
            throw new Error("Invalid email format");
        }

        if (!this.checkPasswordStrength(password)) {
            throw new Error("Password does not meet requirements");
        }

        const defaultPermissions = role === "Student" 
            ? ["player_scoring", "team_management", "league_participation"]
            : ["create_league", "manage_league", "oversee_teams", "monitor_metrics"];

        const hashedPassword = await this.hash(password);

        // Store user in database
        const user = {
            name,
            email,
            password: hashedPassword,
            role,
            classCode,
            permissions: defaultPermissions
        };

        await this.sendEmailConfirmation(email);

        if (role === "Student") {
            // Create user profile
            const userProfile = new UserProfile();
            await userProfile.createProfile(user.id, name, email, role, classCode);
        }

        return user;
    }

    async login(email, password, rememberMe = false) {
        if (await this.validateCredentials(email, password)) {
            if (await this.captchaPassed()) {
                return { success: true, redirect: '/dashboard' };
            }
            throw new Error("Failed CAPTCHA. Please try again.");
        }
        throw new Error("Invalid email or password.");
    }


}

export default AuthService;