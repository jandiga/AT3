// Team Management JavaScript functionality

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadUserTeams();
});

// Load user's teams in active leagues
async function loadUserTeams() {
    try {
        const response = await fetch('/api/teams/user/active');
        const data = await response.json();
        
        if (data.success) {
            displayTeams(data.teams);
        } else {
            showError('Failed to load teams: ' + data.error);
        }
    } catch (error) {
        console.error('Error loading teams:', error);
        showError('Failed to load teams');
    }
}

// Display teams
function displayTeams(teams) {
    const container = document.getElementById('teamsContainer');
    
    if (!teams || teams.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> You don't have any teams in active leagues.
                <br><small>Join a league to create a team!</small>
            </div>
        `;
        return;
    }
    
    const teamsHtml = teams.map(team => {
        const league = team.leagueID;
        const totalScore = team.currentScores?.totalScore || 0;
        const academicScore = team.currentScores?.academicScore || 0;
        const effortScore = team.currentScores?.effortScore || 0;
        const activeRoster = team.roster.filter(r => r.isActive);
        
        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <h5 class="mb-1">${escapeHtml(team.teamName)}</h5>
                            <small class="text-muted">
                                League: <a href="/leagues/${league._id}" class="text-decoration-none">${escapeHtml(league.leagueName)}</a>
                            </small>
                        </div>
                        <div class="col-md-2">
                            <div class="text-center">
                                <div class="h6 mb-0">${totalScore}</div>
                                <small class="text-muted">Total Score</small>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="text-center">
                                <div class="h6 mb-0">${academicScore}</div>
                                <small class="text-muted">Academic</small>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="text-center">
                                <div class="h6 mb-0">${effortScore}</div>
                                <small class="text-muted">Effort</small>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="text-center">
                                <div class="h6 mb-0">${activeRoster.length}</div>
                                <small class="text-muted">Players</small>
                            </div>
                        </div>
                        <div class="col-md-1">
                            <div class="dropdown">
                                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                    <i class="bi bi-three-dots"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="/teams/${team._id}">
                                        <i class="bi bi-eye"></i> View Details
                                    </a></li>
                                    <li><a class="dropdown-item" href="/leagues/${league._id}">
                                        <i class="bi bi-trophy"></i> View League
                                    </a></li>
                                    ${league.status === 'drafting' ? `
                                        <li><a class="dropdown-item" href="/draft/${league._id}">
                                            <i class="bi bi-play-circle"></i> Join Draft
                                        </a></li>
                                    ` : ''}
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Team Status Badge -->
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <span class="badge bg-${getLeagueStatusColor(league.status)}">${getLeagueStatusText(league.status)}</span>
                            ${team.stats?.rank ? `<span class="badge bg-secondary ms-2">Rank: ${team.stats.rank}</span>` : ''}
                        </div>
                    </div>
                    
                    <!-- Quick Roster Preview -->
                    ${activeRoster.length > 0 ? `
                        <div class="row mt-3">
                            <div class="col-md-12">
                                <small class="text-muted">Players: </small>
                                ${activeRoster.slice(0, 3).map(r => 
                                    `<span class="badge bg-light text-dark me-1">${escapeHtml(r.playerID?.name || 'Unknown')}</span>`
                                ).join('')}
                                ${activeRoster.length > 3 ? `<span class="text-muted">+${activeRoster.length - 3} more</span>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = teamsHtml;
}

// Helper functions
function getLeagueStatusColor(status) {
    const colors = {
        'setup': 'secondary',
        'open': 'info',
        'drafting': 'warning',
        'active': 'success',
        'completed': 'dark'
    };
    return colors[status] || 'secondary';
}

function getLeagueStatusText(status) {
    const texts = {
        'setup': 'Setup',
        'open': 'Open for Registration',
        'drafting': 'Drafting',
        'active': 'Active',
        'completed': 'Completed'
    };
    return texts[status] || status;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function refreshTeams() {
    loadUserTeams();
}

function showError(message) {
    const container = document.getElementById('teamsContainer');
    container.innerHTML = `
        <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle"></i> ${message}
        </div>
    `;
}

function showSuccess(message) {
    // Could be enhanced with toast notifications
    alert(message);
}
