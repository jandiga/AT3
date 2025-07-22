/**
 * League Detail Page JavaScript
 * Handles detailed league view, team management, player statistics, and league administration
 */

// Global state variables for league detail management
let currentLeagueData = null;           // Stores complete league information
let currentlySelectedPlayerId = null;   // ID of player selected for updates
let leagueCountdownTimer = null;        // Timer interval for league countdown

/**
 * Initialize league detail page when DOM is loaded
 * Sets up event listeners and loads initial league data
 */
document.addEventListener('DOMContentLoaded', function() {
    // Validate that league ID is available (should be set by server-side template)
    if (!leagueId) {
        showErrorMessage('League ID not found');
        return;
    }

    // Load initial league data
    loadCompleteLeagueDetails();

    // Set up form event listeners
    const playerUpdateForm = document.getElementById('updatePlayerForm');
    playerUpdateForm?.addEventListener('submit', handleUpdatePlayer);

    // Set up tab navigation event listeners
    const playersTab = document.getElementById('players-tab');
    const standingsTab = document.getElementById('standings-tab');
    const managementTab = document.getElementById('manage-tab');

    playersTab?.addEventListener('shown.bs.tab', loadPlayersTab);
    standingsTab?.addEventListener('shown.bs.tab', loadStandingsTab);
    managementTab?.addEventListener('shown.bs.tab', loadManageTab);
});

/**
 * Loads complete league details from the API
 * Fetches league information, participants, and settings
 */
async function loadCompleteLeagueDetails() {
    try {
        // Request league details from API
        const leagueDetailsResponse = await fetch(`/api/leagues/${leagueId}`);
        const leagueDetailsData = await leagueDetailsResponse.json();

        if (leagueDetailsData.success) {
            currentLeagueData = leagueDetailsData.league;
            updateLeagueDisplay();
            loadTeamsTab(); // Load teams tab by default
        } else {
            showErrorMessage('Failed to load league details: ' + leagueDetailsData.error);
        }
    } catch (networkError) {
        console.error('Error loading league details:', networkError);
        showErrorMessage('Failed to load league details: ' + networkError.message);
    }
}

/**
 * Updates all league display elements with current league data
 * Refreshes basic info, status, statistics, and action buttons
 */
function updateLeagueDisplay() {
    // Update basic league information
    document.getElementById('leagueName').textContent = currentLeagueData.leagueName;
    document.getElementById('leagueDescription').textContent =
        currentLeagueData.description || 'No description provided';

    // Update league status badge
    const leagueStatusBadge = document.getElementById('leagueStatus');
    leagueStatusBadge.textContent = getStatusText(currentLeagueData.status);
    leagueStatusBadge.className = `badge bg-${getStatusColor(currentLeagueData.status)}`;

    // Update league statistics
    const participantCountElement = document.getElementById('participantCount');
    participantCountElement.textContent =
        `${currentLeagueData.participants.length}/${currentLeagueData.maxParticipants}`;

    const playersPerTeamElement = document.getElementById('playersPerTeam');
    playersPerTeamElement.textContent = currentLeagueData.maxPlayersPerTeam;

    const draftTypeElement = document.getElementById('draftType');
    draftTypeElement.textContent =
        currentLeagueData.draftSettings.draftType === 'snake' ? 'Snake Draft' : 'Linear Draft';

    // Update available actions based on user permissions
    updateLeagueActions();

    // Update status message
    updateStatusMessage();

    // Show management tab if current user is the league creator
    if (currentUser && currentLeagueData.createdByTeacherID._id === currentUser.id) {
        const manageTabElement = document.getElementById('manage-tab-li');
        if (manageTabElement) {
            manageTabElement.style.display = 'block';
        }
    }

    // Initialize league countdown timer
    startLeagueCountdown();
}

/**
 * Updates the league action buttons based on user permissions and league status
 * Shows appropriate actions like join, start draft, end league, etc.
 */
function updateLeagueActions() {
    const leagueActionsContainer = document.getElementById('leagueActions');
    let actionButtonsHtml = '';

    // If user is not authenticated, don't show any action buttons
    if (!currentUser) {
        leagueActionsContainer.innerHTML = '';
        return;
    }

    // Determine user's relationship to the league
    const isLeagueCreator = currentLeagueData.createdByTeacherID._id === currentUser.id;
    const isActiveParticipant = currentLeagueData.participants.some(participant =>
        participant.userID._id === currentUser.id && participant.isActive
    );

    // Show join button for students who haven't joined an open league
    if (currentLeagueData.status === 'open' && !isActiveParticipant && currentUser.role === 'Student') {
        actionButtonsHtml += `
            <button class="btn btn-success" onclick="joinLeague()">
                <i class="bi bi-plus-circle"></i> Join League
            </button>
        `;
    }

    // Show draft button for leagues currently in drafting phase
    if (currentLeagueData.status === 'drafting') {
        actionButtonsHtml += `
            <button class="btn btn-warning" onclick="goToDraft()">
                <i class="bi bi-play-circle"></i> Join Draft
            </button>
        `;
    }

    // Show open league button for creators of leagues in setup phase
    if (isLeagueCreator && currentLeagueData.status === 'setup') {
        actionButtonsHtml += `
            <button class="btn btn-success" onclick="openLeague()">
                <i class="bi bi-unlock"></i> Open League
            </button>
        `;
    }

    // Show start draft button for creators of open leagues with enough participants
    if (isLeagueCreator && currentLeagueData.status === 'open' &&
        currentLeagueData.participants.length >= 2) {
        actionButtonsHtml += `
            <button class="btn btn-warning" onclick="startDraft()">
                <i class="bi bi-play-circle"></i> Start Draft
            </button>
        `;
    }

    // Show end league button for creators of active leagues
    if (isLeagueCreator && currentLeagueData.status === 'active') {
        actionButtonsHtml += `
            <button class="btn btn-danger" onclick="endLeague()">
                <i class="bi bi-stop-circle"></i> End League
            </button>
        `;
    }



    // Update the actions container with generated buttons
    leagueActionsContainer.innerHTML = actionButtonsHtml;
}

/**
 * Updates the status message to provide helpful information about next steps
 */
function updateStatusMessage() {
    const statusMessageDiv = document.getElementById('leagueStatusMessage');
    const statusMessageText = document.getElementById('statusMessageText');

    if (!statusMessageDiv || !statusMessageText || !currentLeagueData) {
        return;
    }

    let message = '';
    let alertClass = 'alert-info';
    let showMessage = false;

    const isLeagueCreator = currentUser && currentLeagueData.createdByTeacherID._id === currentUser.id;
    const participantCount = currentLeagueData.participants.length;
    const maxParticipants = currentLeagueData.maxParticipants;

    switch (currentLeagueData.status) {
        case 'setup':
            if (isLeagueCreator) {
                message = `League is in setup mode. Click "Open League" to allow students to join. (${participantCount}/${maxParticipants} participants)`;
                alertClass = 'alert-warning';
                showMessage = true;
            }
            break;

        case 'open':
            if (isLeagueCreator) {
                if (participantCount < 2) {
                    message = `League is open for participants. Need at least 2 participants to start draft. Currently: ${participantCount}/${maxParticipants}`;
                    alertClass = 'alert-info';
                    showMessage = true;
                } else {
                    message = `League is ready! ${participantCount} participants joined. You can now start the draft.`;
                    alertClass = 'alert-success';
                    showMessage = true;
                }
            } else if (currentUser && currentUser.role === 'Student') {
                const isParticipant = currentLeagueData.participants.some(p =>
                    p.userID._id === currentUser.id && p.isActive
                );
                if (!isParticipant) {
                    message = `League is open for joining! ${participantCount}/${maxParticipants} spots filled.`;
                    alertClass = 'alert-success';
                    showMessage = true;
                }
            }
            break;

        case 'drafting':
            message = 'Draft is in progress. Click "Join Draft" to participate.';
            alertClass = 'alert-primary';
            showMessage = true;
            break;

        case 'active':
            message = 'League is active and running!';
            alertClass = 'alert-success';
            showMessage = true;
            break;

        case 'completed':
            message = 'League has ended.';
            alertClass = 'alert-secondary';
            showMessage = true;
            break;
    }

    if (showMessage) {
        statusMessageText.textContent = message;
        statusMessageDiv.className = `alert ${alertClass}`;
        statusMessageDiv.style.display = 'block';
    } else {
        statusMessageDiv.style.display = 'none';
    }
}

// Load teams tab
function loadTeamsTab() {
    const teamsDiv = document.getElementById('teamsContent');

    if (!currentLeagueData.participants || currentLeagueData.participants.length === 0) {
        teamsDiv.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> No teams have joined this league yet.
            </div>
        `;
        return;
    }

    // Sort teams by total score (descending)
    const sortedTeams = [...currentLeagueData.participants].sort((a, b) => {
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
                        const isMyTeam = currentUser && participant.userID._id === currentUser.id;
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
                                        ${playerCount}/${currentLeagueData.maxPlayersPerTeam}
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
        showErrorMessage('Team details not available');
    }
}

// Load players tab
function loadPlayersTab() {
    const playersDiv = document.getElementById('playersContent');

    if (!currentLeagueData.draftPool || currentLeagueData.draftPool.length === 0) {
        playersDiv.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> No players available in this league.
            </div>
        `;
        return;
    }

    const playersHtml = currentLeagueData.draftPool.map(player => {
        // Use the same scoring logic as the dashboard (virtual properties)
        const totalScore = player.totalScore || 0;
        const academicScore = player.academicScore || 0;
        const effortScore = player.effortScore || 0;

        return `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <h6 class="mb-1">${escapeHtml(player.name)}</h6>
                        </div>
                        <div class="col-md-3">
                            <small class="text-muted">Total Score: <strong>${totalScore}</strong></small>
                        </div>
                        <div class="col-md-3">
                            <small class="text-muted">Academic Score: <strong>${academicScore}</strong></small>
                        </div>
                        <div class="col-md-3">
                            <small class="text-muted">Effort Score: <strong>${effortScore}</strong></small>
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

    if (!currentLeagueData.participants || currentLeagueData.participants.length === 0) {
        standingsDiv.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> No standings available yet.
            </div>
        `;
        return;
    }

    // Sort teams by total score (if available)
    const sortedTeams = [...currentLeagueData.participants].sort((a, b) => {
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
                        <p><strong>Status:</strong> ${getStatusText(currentLeagueData.status)}</p>
                        <p><strong>Participants:</strong> ${currentLeagueData.participants.length}/${currentLeagueData.maxParticipants}</p>
                        <p><strong>Draft Type:</strong> ${currentLeagueData.draftSettings.draftType}</p>
                        <p><strong>Time per Pick:</strong> ${currentLeagueData.draftSettings.timeLimitPerPick}s</p>
                        <p><strong>Created:</strong> ${new Date(currentLeagueData.dateCreated).toLocaleDateString()}</p>
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
                            ${currentLeagueData.status === 'setup' ? `
                                <button class="btn btn-success" onclick="openLeague()">
                                    <i class="bi bi-unlock"></i> Open League for Participants
                                </button>
                            ` : ''}
                            ${currentLeagueData.status === 'open' && currentLeagueData.participants.length >= 2 ? `
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
        showErrorMessage('Please enter at least one value to update');
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
            showSuccessMessage('Player updated successfully!');
            bootstrap.Modal.getInstance(document.getElementById('updatePlayerModal')).hide();
            loadCompleteLeagueDetails(); // Refresh data
        } else {
            showErrorMessage('Failed to update player: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating player:', error);
        showErrorMessage('Failed to update player');
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
                showSuccessMessage('Successfully joined league!');
                loadCompleteLeagueDetails(); // Refresh the page data
            } else {
                showErrorMessage('Failed to join league: ' + result.error);
            }
        } catch (error) {
            console.error('Error joining league:', error);
            showErrorMessage('Failed to join league');
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
                showSuccessMessage('League opened successfully!');
                loadCompleteLeagueDetails();
            } else {
                showErrorMessage('Failed to open league: ' + result.error);
            }
        } catch (error) {
            console.error('Error opening league:', error);
            showErrorMessage('Failed to open league');
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
                showSuccessMessage('Draft started successfully!');
                window.location.href = `/draft/${leagueId}`;
            } else {
                showErrorMessage('Failed to start draft: ' + result.error);
            }
        } catch (error) {
            console.error('Error starting draft:', error);
            showErrorMessage('Failed to start draft');
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
                showSuccessMessage('League ended successfully!');
                loadCompleteLeagueDetails(); // Refresh the page data
            } else {
                showErrorMessage('Failed to end league: ' + result.error);
            }
        } catch (error) {
            console.error('Error ending league:', error);
            showErrorMessage('Failed to end league');
        }
    }
}

function refreshLeague() {
    loadCompleteLeagueDetails();
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

// League countdown functionality
function startLeagueCountdown() {
    // Clear existing interval
    if (leagueCountdownTimer) {
        clearInterval(leagueCountdownTimer);
    }

    // Only show countdown for active leagues
    if (!currentLeagueData.endDate || currentLeagueData.status !== 'active') {
        document.getElementById('leagueCountdown').innerHTML =
            '<div class="text-muted">League not active</div>';
        return;
    }

    function updateCountdown() {
        const now = new Date().getTime();
        const endTime = new Date(currentLeagueData.endDate).getTime();
        const timeLeft = endTime - now;

        if (timeLeft <= 0) {
            // League has ended
            document.getElementById('leagueCountdown').innerHTML =
                '<div class="text-danger"><strong>League Ended</strong></div>';
            clearInterval(leagueCountdownTimer);
            return;
        }

        // Calculate time units
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

        // Update display
        document.getElementById('daysLeft').textContent = days;
        document.getElementById('hoursLeft').textContent = hours;
        document.getElementById('minutesLeft').textContent = minutes;

        // Change color based on time remaining
        const countdownDiv = document.getElementById('leagueCountdown');
        if (days <= 1) {
            countdownDiv.className = 'text-danger';
        } else if (days <= 3) {
            countdownDiv.className = 'text-warning';
        } else {
            countdownDiv.className = 'text-primary';
        }
    }

    // Update immediately and then every minute
    updateCountdown();
    leagueCountdownTimer = setInterval(updateCountdown, 60000); // Update every minute
}

/**
 * Displays an error message to the user
 * @param {string} errorMessage - Error message to display
 */
function showErrorMessage(errorMessage) {
    // Create error alert element
    const errorAlert = document.createElement('div');
    errorAlert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    errorAlert.style.top = '20px';
    errorAlert.style.right = '20px';
    errorAlert.style.zIndex = '9999';
    errorAlert.innerHTML = `
        <i class="bi bi-exclamation-triangle"></i> ${errorMessage}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(errorAlert);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorAlert.parentNode) {
            errorAlert.remove();
        }
    }, 5000);
}

/**
 * Displays a success message to the user
 * @param {string} successMessage - Success message to display
 */
function showSuccessMessage(successMessage) {
    // Create success alert element
    const successAlert = document.createElement('div');
    successAlert.className = 'alert alert-success alert-dismissible fade show position-fixed';
    successAlert.style.top = '20px';
    successAlert.style.right = '20px';
    successAlert.style.zIndex = '9999';
    successAlert.innerHTML = `
        <i class="bi bi-check-circle"></i> ${successMessage}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(successAlert);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (successAlert.parentNode) {
            successAlert.remove();
        }
    }, 5000);
}

/**
 * Displays a success message to the user
 * @param {string} successMessage - Success message to display
 */
function showSuccessMessage(successMessage) {
    // Create success alert element
    const successAlert = document.createElement('div');
    successAlert.className = 'alert alert-success alert-dismissible fade show position-fixed';
    successAlert.style.top = '20px';
    successAlert.style.right = '20px';
    successAlert.style.zIndex = '9999';
    successAlert.innerHTML = `
        <i class="bi bi-check-circle"></i> ${successMessage}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(successAlert);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (successAlert.parentNode) {
            successAlert.remove();
        }
    }, 5000);
}
