// League detail page JavaScript

let leagueData = null;
let selectedPlayerId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    if (!leagueId) {
        showError('League ID not found');
        return;
    }
    
    loadLeagueDetails();
    
    // Set up event listeners
    document.getElementById('updatePlayerForm')?.addEventListener('submit', handleUpdatePlayer);
    
    // Tab change listeners
    document.getElementById('players-tab')?.addEventListener('shown.bs.tab', loadPlayersTab);
    document.getElementById('standings-tab')?.addEventListener('shown.bs.tab', loadStandingsTab);
    document.getElementById('manage-tab')?.addEventListener('shown.bs.tab', loadManageTab);
});

// Load league details
async function loadLeagueDetails() {
    try {
        const response = await fetch(`/api/leagues/${leagueId}`);
        const data = await response.json();
        
        if (data.success) {
            leagueData = data.league;
            updateLeagueDisplay();
            loadTeamsTab(); // Load teams by default
        } else {
            showError('Failed to load league details: ' + data.error);
        }
    } catch (error) {
        console.error('Error loading league details:', error);
        showError('Failed to load league details');
    }
}

// Update league display
function updateLeagueDisplay() {
    // Update basic info
    document.getElementById('leagueName').textContent = leagueData.leagueName;
    document.getElementById('leagueDescription').textContent = leagueData.description || 'No description provided';
    
    // Update status
    const statusBadge = document.getElementById('leagueStatus');
    statusBadge.textContent = getStatusText(leagueData.status);
    statusBadge.className = `badge bg-${getStatusColor(leagueData.status)}`;
    
    // Update stats
    document.getElementById('participantCount').textContent = 
        `${leagueData.participants.length}/${leagueData.maxParticipants}`;
    document.getElementById('playersPerTeam').textContent = leagueData.maxPlayersPerTeam;
    document.getElementById('draftType').textContent = 
        leagueData.draftSettings.draftType === 'snake' ? 'Snake Draft' : 'Linear Draft';
    
    // Update actions
    updateLeagueActions();
    
    // Show manage tab if user is creator
    if (leagueData.createdByTeacherID._id === currentUser.id) {
        document.getElementById('manage-tab-li').style.display = 'block';
    }
}

// Update league actions
function updateLeagueActions() {
    const actionsDiv = document.getElementById('leagueActions');
    let actions = '';
    
    const isCreator = leagueData.createdByTeacherID._id === currentUser.id;
    const isParticipant = leagueData.participants.some(p =>
        p.userID._id === currentUser.id && p.isActive
    );
    
    if (leagueData.status === 'open' && !isParticipant && currentUser.role === 'Student') {
        actions += `
            <button class="btn btn-success" onclick="joinLeague()">
                <i class="bi bi-plus-circle"></i> Join League
            </button>
        `;
    }
    
    if (leagueData.status === 'drafting') {
        actions += `
            <button class="btn btn-warning" onclick="goToDraft()">
                <i class="bi bi-play-circle"></i> Join Draft
            </button>
        `;
    }
    
    if (isCreator && leagueData.status === 'setup') {
        actions += `
            <button class="btn btn-success" onclick="openLeague()">
                <i class="bi bi-unlock"></i> Open League
            </button>
        `;
    }
    
    if (isCreator && leagueData.status === 'open' && leagueData.participants.length >= 2) {
        actions += `
            <button class="btn btn-warning" onclick="startDraft()">
                <i class="bi bi-play-circle"></i> Start Draft
            </button>
        `;
    }

    if (isCreator && leagueData.status === 'active') {
        actions += `
            <button class="btn btn-danger" onclick="endLeague()">
                <i class="bi bi-stop-circle"></i> End League
            </button>
        `;
    }

    actionsDiv.innerHTML = actions;
}

// Load teams tab
function loadTeamsTab() {
    const teamsDiv = document.getElementById('teamsContent');

    if (!leagueData.participants || leagueData.participants.length === 0) {
        teamsDiv.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> No teams have joined this league yet.
            </div>
        `;
        return;
    }

    // Sort teams by total score (descending)
    const sortedTeams = [...leagueData.participants].sort((a, b) => {
        const scoreA = a.teamID?.currentScores?.totalScore || 0;
        const scoreB = b.teamID?.currentScores?.totalScore || 0;
        return scoreB - scoreA;
    });

    const teamsHtml = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Team</th>
                        <th>Manager</th>
                        <th>Players</th>
                        <th>Total Score</th>
                        <th>Academic Score</th>
                        <th>Effort Score</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedTeams.map((participant, index) => {
                        const team = participant.teamID;
                        const isMyTeam = participant.userID._id === currentUser.id;
                        const scores = team?.currentScores || {};
                        const playerCount = team?.roster?.filter(r => r.isActive).length || 0;

                        return `
                            <tr class="${isMyTeam ? 'table-primary' : ''}">
                                <td>
                                    <span class="badge ${index === 0 ? 'bg-warning' : index === 1 ? 'bg-secondary' : index === 2 ? 'bg-dark' : 'bg-light text-dark'}">
                                        ${index + 1}
                                    </span>
                                </td>
                                <td>
                                    <a href="/teams/${team?._id}" class="text-decoration-none fw-bold">
                                        ${escapeHtml(team?.teamName || 'Unknown Team')}
                                    </a>
                                    ${isMyTeam ? '<small class="text-muted"> (Your Team)</small>' : ''}
                                </td>
                                <td>${escapeHtml(participant.userID.name)}</td>
                                <td>
                                    <span class="badge bg-info">
                                        ${playerCount}/${leagueData.maxPlayersPerTeam}
                                    </span>
                                </td>
                                <td><strong>${(scores.totalScore || 0).toFixed(1)}</strong></td>
                                <td>${(scores.academicScore || 0).toFixed(1)}</td>
                                <td>${(scores.effortScore || 0).toFixed(1)}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary" onclick="viewTeamDetails('${team?._id}')">
                                        <i class="bi bi-eye"></i> View
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    teamsDiv.innerHTML = teamsHtml;
}

// View team details
function viewTeamDetails(teamId) {
    if (teamId && teamId !== 'undefined') {
        window.open(`/teams/${teamId}`, '_blank');
    } else {
        showError('Team details not available');
    }
}

// Load players tab
function loadPlayersTab() {
    const playersDiv = document.getElementById('playersContent');
    
    if (!leagueData.draftPool || leagueData.draftPool.length === 0) {
        playersDiv.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> No players available in this league.
            </div>
        `;
        return;
    }
    
    const isCreator = leagueData.createdByTeacherID._id === currentUser.id;
    
    const playersHtml = leagueData.draftPool.map(player => {
        const academicScore = calculateAverageScore(player.academicHistory);
        const effortScore = calculateTotalEffort(player.weeklyStudyContributions);
        
        return `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-4">
                            <h6 class="mb-1">${escapeHtml(player.name)}</h6>
                        </div>
                        <div class="col-md-3">
                            <small class="text-muted">Academic: ${academicScore.toFixed(1)}%</small>
                        </div>
                        <div class="col-md-3">
                            <small class="text-muted">Effort: ${effortScore.toFixed(1)} hrs</small>
                        </div>
                        <div class="col-md-2 text-end">
                            ${isCreator ? `
                                <button class="btn btn-sm btn-outline-primary" onclick="showUpdatePlayerModal('${player._id}', '${escapeHtml(player.name)}')">
                                    <i class="bi bi-pencil"></i> Update
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    playersDiv.innerHTML = playersHtml;
}

// Load standings tab
function loadStandingsTab() {
    const standingsDiv = document.getElementById('standingsContent');
    
    if (!leagueData.participants || leagueData.participants.length === 0) {
        standingsDiv.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> No standings available yet.
            </div>
        `;
        return;
    }
    
    // Sort teams by total score (if available)
    const sortedTeams = [...leagueData.participants].sort((a, b) => {
        const scoreA = a.teamID?.currentScores?.totalScore || 0;
        const scoreB = b.teamID?.currentScores?.totalScore || 0;
        return scoreB - scoreA;
    });
    
    const standingsHtml = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Team</th>
                        <th>Manager</th>
                        <th>Total Score</th>
                        <th>Academic Score</th>
                        <th>Effort Score</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedTeams.map((participant, index) => {
                        const team = participant.teamID;
                        const scores = team?.currentScores || {};
                        
                        return `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${escapeHtml(team?.teamName || 'Unknown Team')}</td>
                                <td>${escapeHtml(participant.userID.name)}</td>
                                <td>${(scores.totalScore || 0).toFixed(1)}</td>
                                <td>${(scores.academicScore || 0).toFixed(1)}</td>
                                <td>${(scores.effortScore || 0).toFixed(1)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    standingsDiv.innerHTML = standingsHtml;
}

// Load manage tab
function loadManageTab() {
    const manageDiv = document.getElementById('manageContent');
    
    manageDiv.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">League Settings</h6>
                    </div>
                    <div class="card-body">
                        <p><strong>Status:</strong> ${getStatusText(leagueData.status)}</p>
                        <p><strong>Participants:</strong> ${leagueData.participants.length}/${leagueData.maxParticipants}</p>
                        <p><strong>Draft Type:</strong> ${leagueData.draftSettings.draftType}</p>
                        <p><strong>Time per Pick:</strong> ${leagueData.draftSettings.timeLimitPerPick}s</p>
                        <p><strong>Created:</strong> ${new Date(leagueData.dateCreated).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">Quick Actions</h6>
                    </div>
                    <div class="card-body">
                        <div class="d-grid gap-2">
                            ${leagueData.status === 'setup' ? `
                                <button class="btn btn-success" onclick="openLeague()">
                                    <i class="bi bi-unlock"></i> Open League for Participants
                                </button>
                            ` : ''}
                            ${leagueData.status === 'open' && leagueData.participants.length >= 2 ? `
                                <button class="btn btn-warning" onclick="startDraft()">
                                    <i class="bi bi-play-circle"></i> Start Draft
                                </button>
                            ` : ''}
                            <button class="btn btn-outline-primary" onclick="refreshLeague()">
                                <i class="bi bi-arrow-clockwise"></i> Refresh Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Show update player modal
function showUpdatePlayerModal(playerId, playerName) {
    selectedPlayerId = playerId;
    document.getElementById('playerNameDisplay').value = playerName;
    
    // Clear form
    document.getElementById('updatePlayerForm').reset();
    document.getElementById('playerNameDisplay').value = playerName;
    
    const modal = new bootstrap.Modal(document.getElementById('updatePlayerModal'));
    modal.show();
}

// Handle update player form submission
async function handleUpdatePlayer(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {};

    // Only include non-empty values
    const academicScore = formData.get('academicScore');
    const effortHours = formData.get('effortHours');
    const notes = formData.get('notes');

    if (academicScore && academicScore.trim() !== '') {
        data.academicScore = parseFloat(academicScore);
    }
    if (effortHours && effortHours.trim() !== '') {
        data.effortHours = parseFloat(effortHours);
    }
    if (notes && notes.trim() !== '') {
        data.notes = notes.trim();
    }

    // Check if at least one field is being updated
    if (Object.keys(data).length === 0) {
        showError('Please enter at least one value to update');
        return;
    }

    try {
        const response = await fetch(`/api/leagues/${leagueId}/players/${selectedPlayerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Player updated successfully!');
            bootstrap.Modal.getInstance(document.getElementById('updatePlayerModal')).hide();
            loadLeagueDetails(); // Refresh data
        } else {
            showError('Failed to update player: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating player:', error);
        showError('Failed to update player');
    }
}

// Action functions
async function joinLeague() {
    const teamName = prompt('Enter your team name:');
    if (teamName && teamName.trim().length > 0) {
        try {
            const response = await fetch(`/api/leagues/${leagueId}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ teamName: teamName.trim() })
            });

            const result = await response.json();

            if (result.success) {
                showSuccess('Successfully joined league!');
                loadLeagueDetails(); // Refresh the page data
            } else {
                showError('Failed to join league: ' + result.error);
            }
        } catch (error) {
            console.error('Error joining league:', error);
            showError('Failed to join league');
        }
    }
}

function goToDraft() {
    window.location.href = `/draft/${leagueId}`;
}

async function openLeague() {
    if (confirm('Are you sure you want to open this league for participants?')) {
        try {
            const response = await fetch(`/api/leagues/${leagueId}/open`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSuccess('League opened successfully!');
                loadLeagueDetails();
            } else {
                showError('Failed to open league: ' + result.error);
            }
        } catch (error) {
            console.error('Error opening league:', error);
            showError('Failed to open league');
        }
    }
}

async function startDraft() {
    if (confirm('Are you sure you want to start the draft? This cannot be undone.')) {
        try {
            const response = await fetch(`/api/leagues/${leagueId}/start-draft`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                showSuccess('Draft started successfully!');
                window.location.href = `/draft/${leagueId}`;
            } else {
                showError('Failed to start draft: ' + result.error);
            }
        } catch (error) {
            console.error('Error starting draft:', error);
            showError('Failed to start draft');
        }
    }
}

async function endLeague() {
    if (confirm('Are you sure you want to end this league? This will mark it as completed and cannot be undone.')) {
        try {
            const response = await fetch(`/api/leagues/${leagueId}/end`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                showSuccess('League ended successfully!');
                loadLeagueDetails(); // Refresh the page data
            } else {
                showError('Failed to end league: ' + result.error);
            }
        } catch (error) {
            console.error('Error ending league:', error);
            showError('Failed to end league');
        }
    }
}

function refreshLeague() {
    loadLeagueDetails();
}

// Utility functions
function getStatusColor(status) {
    const colors = {
        'setup': 'secondary',
        'open': 'success',
        'drafting': 'warning',
        'active': 'primary',
        'completed': 'dark'
    };
    return colors[status] || 'secondary';
}

function getStatusText(status) {
    const texts = {
        'setup': 'Setup',
        'open': 'Open',
        'drafting': 'Drafting',
        'active': 'Active',
        'completed': 'Completed'
    };
    return texts[status] || status;
}

function calculateAverageScore(academicHistory) {
    if (!academicHistory || academicHistory.length === 0) return 0;
    const sum = academicHistory.reduce((total, entry) => total + (entry.grade_percent || 0), 0);
    return sum / academicHistory.length;
}

function calculateTotalEffort(weeklyContributions) {
    if (!weeklyContributions || weeklyContributions.length === 0) return 0;
    return weeklyContributions.reduce((total, entry) => total + (entry.hours || 0), 0);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    alert(message); // Could be enhanced with toast notifications
}

function showSuccess(message) {
    alert(message); // Could be enhanced with toast notifications
}
