/**
 * Team Management JavaScript functionality
 * Handles display and management of user's fantasy teams across active leagues
 */

/**
 * Initialize team management page when DOM is fully loaded
 * Sets up initial data loading and event listeners
 */
document.addEventListener('DOMContentLoaded', function() {
    loadCurrentUserTeams();
});

/**
 * Fetches and displays the current user's teams in active leagues
 * Makes API call to retrieve team data and handles response
 */
async function loadCurrentUserTeams() {
    try {
        // Request user's active teams from the API
        const userTeamsResponse = await fetch('/api/teams/user/active');
        const userTeamsData = await userTeamsResponse.json();

        // Process successful API response
        if (userTeamsData.success) {
            displayUserTeams(userTeamsData.teams);
        } else {
            showErrorMessage('Failed to load teams: ' + userTeamsData.error);
        }
    } catch (networkError) {
        console.error('Error loading teams:', networkError);
        showErrorMessage('Failed to load teams');
    }
}

/**
 * Displays the user's teams in the team management interface
 * Creates HTML cards for each team with scores, roster info, and action buttons
 * @param {Array} userTeamsList - Array of team objects to display
 */
function displayUserTeams(userTeamsList) {
    const teamsDisplayContainer = document.getElementById('teamsContainer');

    // Handle case where user has no teams
    if (!userTeamsList || userTeamsList.length === 0) {
        teamsDisplayContainer.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> You don't have any teams in active leagues.
                <br><small>Join a league to create a team!</small>
            </div>
        `;
        return;
    }

    // Generate HTML for each team
    const teamsHtmlContent = userTeamsList.map(teamData => {
        const associatedLeague = teamData.leagueID;
        const teamTotalScore = teamData.currentScores?.totalScore || 0;
        const teamAcademicScore = teamData.currentScores?.academicScore || 0;
        const teamEffortScore = teamData.currentScores?.effortScore || 0;
        const activeTeamRoster = teamData.roster.filter(rosterEntry => rosterEntry.isActive);

        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <!-- Team Name and League Info -->
                        <div class="col-md-3">
                            <h5 class="mb-1">${escapeHtmlContent(teamData.teamName)}</h5>
                            <small class="text-muted">
                                League: <a href="/leagues/${associatedLeague._id}" class="text-decoration-none">
                                    ${escapeHtmlContent(associatedLeague.leagueName)}
                                </a>
                            </small>
                        </div>

                        <!-- Total Score Display -->
                        <div class="col-md-2">
                            <div class="text-center">
                                <div class="h6 mb-0">${teamTotalScore.toFixed(1)}</div>
                                <small class="text-muted">Total Score</small>
                            </div>
                        </div>

                        <!-- Academic Score Display -->
                        <div class="col-md-2">
                            <div class="text-center">
                                <div class="h6 mb-0">${teamAcademicScore.toFixed(1)}</div>
                                <small class="text-muted">Academic</small>
                            </div>
                        </div>

                        <!-- Effort Score Display -->
                        <div class="col-md-2">
                            <div class="text-center">
                                <div class="h6 mb-0">${teamEffortScore.toFixed(1)}</div>
                                <small class="text-muted">Effort</small>
                            </div>
                        </div>

                        <!-- Player Count Display -->
                        <div class="col-md-2">
                            <div class="text-center">
                                <div class="h6 mb-0">${activeTeamRoster.length}</div>
                                <small class="text-muted">Players</small>
                            </div>
                        </div>

                        <!-- Action Dropdown Menu -->
                        <div class="col-md-1">
                            <div class="dropdown">
                                <button class="btn btn-sm btn-outline-secondary dropdown-toggle"
                                        type="button" data-bs-toggle="dropdown" aria-label="Team actions">
                                    <i class="bi bi-three-dots"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="/teams/${teamData._id}">
                                        <i class="bi bi-eye"></i> View Details
                                    </a></li>
                                    <li><a class="dropdown-item" href="/leagues/${associatedLeague._id}">
                                        <i class="bi bi-trophy"></i> View League
                                    </a></li>
                                    ${associatedLeague.status === 'drafting' ? `
                                        <li><a class="dropdown-item" href="/draft/${associatedLeague._id}">
                                            <i class="bi bi-play-circle"></i> Join Draft
                                        </a></li>
                                    ` : ''}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Team Status and Ranking Badges -->
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <span class="badge bg-${getLeagueStatusColor(associatedLeague.status)}">
                                ${getLeagueStatusText(associatedLeague.status)}
                            </span>
                            ${teamData.stats?.rank ?
                                `<span class="badge bg-secondary ms-2">Rank: ${teamData.stats.rank}</span>` :
                                ''
                            }
                        </div>
                    </div>

                    <!-- Quick Roster Preview -->
                    ${activeTeamRoster.length > 0 ? `
                        <div class="row mt-3">
                            <div class="col-md-12">
                                <small class="text-muted">Players: </small>
                                ${activeTeamRoster.slice(0, 3).map(rosterEntry =>
                                    `<span class="badge bg-light text-dark me-1">
                                        ${escapeHtmlContent(rosterEntry.playerID?.name || 'Unknown')}
                                    </span>`
                                ).join('')}
                                ${activeTeamRoster.length > 3 ?
                                    `<span class="text-muted">+${activeTeamRoster.length - 3} more</span>` :
                                    ''
                                }
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    teamsDisplayContainer.innerHTML = teamsHtmlContent;
}

/**
 * Helper functions for team management interface
 */

/**
 * Returns the appropriate Bootstrap color class for league status badges
 * @param {string} leagueStatus - Current status of the league
 * @returns {string} Bootstrap color class name
 */
function getLeagueStatusColor(leagueStatus) {
    const statusColorMapping = {
        'setup': 'secondary',
        'open': 'info',
        'drafting': 'warning',
        'active': 'success',
        'completed': 'dark'
    };
    return statusColorMapping[leagueStatus] || 'secondary';
}

/**
 * Returns human-readable text for league status
 * @param {string} leagueStatus - Current status of the league
 * @returns {string} Display text for the status
 */
function getLeagueStatusText(leagueStatus) {
    const statusTextMapping = {
        'setup': 'Setup',
        'open': 'Open for Registration',
        'drafting': 'Drafting',
        'active': 'Active',
        'completed': 'Completed'
    };
    return statusTextMapping[leagueStatus] || leagueStatus;
}

/**
 * Escapes HTML characters to prevent XSS attacks
 * @param {string} textContent - Text to escape
 * @returns {string} HTML-escaped text
 */
function escapeHtmlContent(textContent) {
    if (!textContent) return '';
    const temporaryDiv = document.createElement('div');
    temporaryDiv.textContent = textContent;
    return temporaryDiv.innerHTML;
}

/**
 * Refreshes the teams display by reloading data from the API
 */
function refreshUserTeams() {
    loadCurrentUserTeams();
}

/**
 * Displays an error message in the teams container
 * @param {string} errorMessage - Error message to display
 */
function showErrorMessage(errorMessage) {
    const teamsContainer = document.getElementById('teamsContainer');
    teamsContainer.innerHTML = `
        <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle"></i> ${errorMessage}
        </div>
    `;
}

/**
 * Displays a success message to the user
 * @param {string} successMessage - Success message to display
 */
function showSuccessMessage(successMessage) {
    // Create a temporary success alert
    const teamsContainer = document.getElementById('teamsContainer');
    const successAlert = document.createElement('div');
    successAlert.className = 'alert alert-success alert-dismissible fade show';
    successAlert.innerHTML = `
        <i class="bi bi-check-circle"></i> ${successMessage}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    // Insert at the top of the container
    teamsContainer.insertBefore(successAlert, teamsContainer.firstChild);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (successAlert.parentNode) {
            successAlert.remove();
        }
    }, 5000);
}
