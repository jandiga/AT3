// Draft functionality JavaScript

let draftData = null;
let selectedPlayerId = null;
let turnTimer = null;
let timeRemaining = 0;
let isDrafting = false; // Flag to prevent duplicate draft requests
let statusPollingInterval = null; // Store the polling interval ID

// Initialize draft page
document.addEventListener('DOMContentLoaded', function() {
    if (!leagueId) {
        showError('League ID not found');
        return;
    }
    
    loadDraftStatus();
    
    // Set up event listeners
    document.getElementById('playerSearch')?.addEventListener('input', filterPlayers);
    document.getElementById('sortPlayers')?.addEventListener('change', sortPlayers);
    document.getElementById('autoPickBtn')?.addEventListener('click', makeAutoPick);
    document.getElementById('draftPlayerBtn')?.addEventListener('click', draftSelectedPlayer);
    
    // Refresh draft status every 5 seconds
    statusPollingInterval = setInterval(loadDraftStatus, 5000);
});

// Load current draft status
async function loadDraftStatus() {
    try {
        const response = await fetch(`/api/draft/${leagueId}/status`);
        const data = await response.json();

        if (data.success) {
            draftData = data;
            updateDraftDisplay();

            // Stop polling if draft is complete
            if (draftData.draftState.isDraftComplete) {
                console.log('Draft is complete, stopping status polling');
                if (statusPollingInterval) {
                    clearInterval(statusPollingInterval);
                    statusPollingInterval = null;
                }
            }
        } else {
            console.error('Draft status error:', data.error);
            showError('Failed to load draft status: ' + data.error);
        }
    } catch (error) {
        console.error('Error loading draft status:', error);
        showError('Failed to load draft status');
    }
}

// Update all draft display elements
function updateDraftDisplay() {
    updateDraftStatus();
    updateDraftOrder();
    updateCurrentPickInfo();
    updateAvailablePlayers();
    updateTeamsRosters();
    updateRecentPicks();
    updateTimer();
}

// Update draft status panel
function updateDraftStatus() {
    const statusDiv = document.getElementById('draftStatus');

    // Check if draft is complete first
    if (draftData.draftState.isDraftComplete) {
        statusDiv.innerHTML = `
            <div class="alert alert-success">
                <i class="bi bi-check-circle"></i> Draft Complete!
            </div>
        `;
        showDraftCompleteModal();
        return;
    }

    if (!draftData.draftState.isActive) {
        statusDiv.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-clock"></i> Draft has not started yet
            </div>
        `;
        return;
    }
    
    statusDiv.innerHTML = `
        <div class="mb-2">
            <strong>Round:</strong> ${draftData.draftState.currentRound}
        </div>
        <div class="mb-2">
            <strong>Pick:</strong> ${draftData.draftState.currentPick}
        </div>
        <div class="mb-2">
            <strong>Current Turn:</strong><br>
            <span class="text-primary">${draftData.draftState.currentTurnUser?.name || 'Unknown'}</span>
        </div>
        ${draftData.isUserTurn ? '<div class="alert alert-info p-2"><small><i class="bi bi-arrow-right"></i> Your turn!</small></div>' : ''}
    `;
}

// Update draft order display
function updateDraftOrder() {
    const orderDiv = document.getElementById('draftOrder');
    
    if (!draftData.draftState.draftOrder || draftData.draftState.draftOrder.length === 0) {
        orderDiv.innerHTML = '<small class="text-muted">Draft order not set</small>';
        return;
    }
    
    const orderHtml = draftData.draftState.draftOrder.map((user, index) => {
        const isCurrentTurn = draftData.draftState.currentTurnUser && 
            user._id === draftData.draftState.currentTurnUser._id;
        const isCurrentUser = user._id === currentUserId;
        
        let classes = 'p-2 border-bottom';
        if (isCurrentTurn) classes += ' current-turn';
        if (isCurrentUser) classes += ' my-turn';
        
        return `
            <div class="${classes}">
                <small>
                    ${index + 1}. ${escapeHtml(user.name)}
                    ${isCurrentUser ? ' (You)' : ''}
                    ${isCurrentTurn ? ' <i class="bi bi-arrow-right"></i>' : ''}
                </small>
            </div>
        `;
    }).join('');
    
    orderDiv.innerHTML = orderHtml;
}

// Update current pick information
function updateCurrentPickInfo() {
    const infoDiv = document.getElementById('currentPickInfo');

    // Check if draft is complete first
    if (draftData.draftState.isDraftComplete) {
        infoDiv.innerHTML = `
            <div class="text-center">
                <h5 class="text-success">Draft Complete!</h5>
                <p class="text-muted">All teams have been filled.</p>
            </div>
        `;
        return;
    }

    if (!draftData.draftState.isActive) {
        infoDiv.innerHTML = `
            <div class="text-center">
                <h5>Waiting for draft to start...</h5>
                <p class="text-muted">The draft has not begun yet.</p>
            </div>
        `;
        return;
    }
    
    const currentUser = draftData.draftState.currentTurnUser;
    const isUserTurn = draftData.isUserTurn;
    
    infoDiv.innerHTML = `
        <div class="text-center">
            <h5>Round ${draftData.draftState.currentRound}, Pick ${draftData.draftState.currentPick}</h5>
            <p class="mb-2">
                ${isUserTurn ? 
                    '<span class="text-primary"><strong>Your turn to pick!</strong></span>' : 
                    `Waiting for <strong>${escapeHtml(currentUser?.name || 'Unknown')}</strong> to pick`
                }
            </p>
            ${isUserTurn ? 
                '<p class="text-muted">Select a player from the available list below</p>' : 
                ''
            }
        </div>
    `;
}

// Update available players list
function updateAvailablePlayers() {
    const playersDiv = document.getElementById('availablePlayers');
    
    if (!draftData.availablePlayers || draftData.availablePlayers.length === 0) {
        playersDiv.innerHTML = `
            <div class="text-center p-4">
                <p class="text-muted">No players available</p>
            </div>
        `;
        return;
    }
    
    const playersHtml = draftData.availablePlayers.map(player => {
        const academicScore = calculateAverageScore(player.academicHistory);
        const effortScore = calculateTotalEffort(player.weeklyStudyContributions);
        
        return `
            <div class="player-card p-3 border-bottom ${draftData.isUserTurn ? 'draftable' : ''}" 
                 onclick="selectPlayer('${player._id}')" 
                 data-player-id="${player._id}"
                 data-player-name="${escapeHtml(player.name)}"
                 data-academic-score="${academicScore}"
                 data-effort-score="${effortScore}">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${escapeHtml(player.name)}</h6>
                        <small class="text-muted">
                            Academic: ${academicScore.toFixed(1)} | 
                            Effort: ${effortScore.toFixed(1)}
                        </small>
                    </div>
                    <div>
                        ${draftData.isUserTurn ? 
                            '<button class="btn btn-sm btn-outline-primary">Select</button>' : 
                            '<button class="btn btn-sm btn-outline-secondary" disabled>View</button>'
                        }
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    playersDiv.innerHTML = playersHtml;
}

// Update teams and rosters
function updateTeamsRosters() {
    const rostersDiv = document.getElementById('teamsRosters');
    
    if (!draftData.participants || draftData.participants.length === 0) {
        rostersDiv.innerHTML = `
            <div class="text-center p-4">
                <p class="text-muted">No teams found</p>
            </div>
        `;
        return;
    }
    
    const rostersHtml = draftData.participants.map(participant => {
        const team = participant.teamID;
        const isMyTeam = participant.userID._id === currentUserId;
        
        const rosterHtml = team?.roster?.filter(r => r.isActive).map(rosterEntry => `
            <div class="p-2 border-bottom">
                <small>
                    <strong>${escapeHtml(rosterEntry.playerID?.name || 'Unknown Player')}</strong><br>
                    <span class="text-muted">R${rosterEntry.draftRound} P${rosterEntry.draftPick}</span>
                </small>
            </div>
        `).join('') || '<div class="p-2 text-muted"><small>No players drafted</small></div>';
        
        return `
            <div class="team-roster ${isMyTeam ? 'my-team' : ''} mb-3">
                <div class="p-2 bg-light border-bottom">
                    <strong>${escapeHtml(team?.teamName || 'Unknown Team')}</strong>
                    ${isMyTeam ? ' <span class="badge bg-primary">Your Team</span>' : ''}
                    <br>
                    <small class="text-muted">${escapeHtml(participant.userID.name)}</small>
                </div>
                ${rosterHtml}
            </div>
        `;
    }).join('');
    
    rostersDiv.innerHTML = rostersHtml;
}

// Update recent picks
function updateRecentPicks() {
    const picksDiv = document.getElementById('recentPicks');
    
    if (!draftData.draftState.pickHistory || draftData.draftState.pickHistory.length === 0) {
        picksDiv.innerHTML = '<div class="text-center"><small class="text-muted">No picks yet</small></div>';
        return;
    }
    
    const recentPicks = draftData.draftState.pickHistory.slice(-10).reverse();
    
    const picksHtml = recentPicks.map(pick => `
        <span class="badge bg-secondary me-2 mb-2">
            R${pick.round}P${pick.pick}: ${escapeHtml(pick.playerID?.name || 'Unknown')} 
            → ${escapeHtml(pick.userID?.name || 'Unknown')}
        </span>
    `).join('');
    
    picksDiv.innerHTML = picksHtml;
}

// Update timer
function updateTimer() {
    const timerCard = document.getElementById('timerCard');
    const timerDiv = document.getElementById('turnTimer');
    const autoPickBtn = document.getElementById('autoPickBtn');
    
    if (!draftData.draftState.isActive || draftData.draftState.isDraftComplete) {
        timerCard.style.display = 'none';
        if (turnTimer) {
            clearInterval(turnTimer);
            turnTimer = null;
        }
        return;
    }
    
    if (draftData.isUserTurn) {
        timerCard.style.display = 'block';
        autoPickBtn.style.display = 'block';

        // Clear any existing timer and start fresh
        if (turnTimer) {
            clearInterval(turnTimer);
            turnTimer = null;
        }

        // Reset timer display styling
        timerDiv.classList.remove('timer-warning');

        // Start new timer
        timeRemaining = draftData.draftSettings.timeLimitPerPick;
        turnTimer = setInterval(() => {
            timeRemaining--;

            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            timerDiv.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            if (timeRemaining <= 10) {
                timerDiv.classList.add('timer-warning');
            }

            if (timeRemaining <= 0) {
                clearInterval(turnTimer);
                turnTimer = null;
                makeAutoPick();
            }
        }, 1000);
    } else {
        timerCard.style.display = 'none';
        autoPickBtn.style.display = 'none';
        if (turnTimer) {
            clearInterval(turnTimer);
            turnTimer = null;
        }
    }
}

// Select a player
function selectPlayer(playerId) {
    if (!draftData.isUserTurn) {
        showPlayerDetails(playerId);
        return;
    }
    
    selectedPlayerId = playerId;
    showPlayerDetails(playerId);
}

// Show player details modal
function showPlayerDetails(playerId) {
    const player = draftData.availablePlayers.find(p => p._id === playerId);
    if (!player) return;
    
    const academicScore = calculateAverageScore(player.academicHistory);
    const effortScore = calculateTotalEffort(player.weeklyStudyContributions);
    
    const modalContent = document.getElementById('playerDetailsContent');
    modalContent.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h5>${escapeHtml(player.name)}</h5>
                <p><strong>Academic Average:</strong> ${academicScore.toFixed(1)}%</p>
                <p><strong>Total Effort Hours:</strong> ${effortScore.toFixed(1)}</p>
            </div>
            <div class="col-md-6">
                <h6>Recent Academic Scores</h6>
                ${player.academicHistory?.slice(-5).map(entry => 
                    `<div>${entry.grade_percent}% - ${new Date(entry.date).toLocaleDateString()}</div>`
                ).join('') || '<div class="text-muted">No data</div>'}
            </div>
        </div>
    `;
    
    const draftBtn = document.getElementById('draftPlayerBtn');
    if (draftData.isUserTurn) {
        draftBtn.style.display = 'block';
        // Don't set onclick here - use the selectedPlayerId instead
        selectedPlayerId = playerId;
    } else {
        draftBtn.style.display = 'none';
    }
    
    const modal = new bootstrap.Modal(document.getElementById('playerDetailsModal'));
    modal.show();
}

// Draft a player
async function draftPlayer(playerId) {
    // Prevent duplicate draft requests
    if (isDrafting) {
        console.log('Draft already in progress, ignoring duplicate request');
        return;
    }

    isDrafting = true;

    try {
        console.log(`Drafting player: ${playerId}`);

        const response = await fetch(`/api/draft/${leagueId}/pick`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ playerId })
        });

        const result = await response.json();

        if (result.success) {
            showSuccess(`Successfully drafted ${result.pick.player.name}!`);
            bootstrap.Modal.getInstance(document.getElementById('playerDetailsModal'))?.hide();

            // Clear timer
            if (turnTimer) {
                clearInterval(turnTimer);
                turnTimer = null;
            }

            // Reload draft status
            setTimeout(loadDraftStatus, 1000);
        } else {
            showError('Failed to draft player: ' + result.error);
        }
    } catch (error) {
        console.error('Error drafting player:', error);
        showError('Failed to draft player');
    } finally {
        // Always reset the drafting flag
        isDrafting = false;
    }
}

// Draft selected player
function draftSelectedPlayer() {
    if (selectedPlayerId) {
        draftPlayer(selectedPlayerId);
    }
}

// Make auto pick
async function makeAutoPick() {
    // Prevent duplicate auto-pick requests
    if (isDrafting) {
        console.log('Draft already in progress, ignoring auto-pick request');
        return;
    }

    isDrafting = true;

    try {
        console.log('Making auto-pick');

        const response = await fetch(`/api/draft/${leagueId}/auto-pick`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showSuccess(`Auto-picked ${result.pick.player.name}!`);

            // Clear timer
            if (turnTimer) {
                clearInterval(turnTimer);
                turnTimer = null;
            }

            // Reload draft status
            setTimeout(loadDraftStatus, 1000);
        } else {
            showError('Failed to auto-pick: ' + result.error);
        }
    } catch (error) {
        console.error('Error with auto-pick:', error);
        showError('Failed to auto-pick');
    } finally {
        // Always reset the drafting flag
        isDrafting = false;
    }
}

// Filter players
function filterPlayers() {
    const searchTerm = document.getElementById('playerSearch').value.toLowerCase();
    const playerCards = document.querySelectorAll('.player-card');
    
    playerCards.forEach(card => {
        const playerName = card.dataset.playerName.toLowerCase();
        if (playerName.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Sort players
function sortPlayers() {
    const sortBy = document.getElementById('sortPlayers').value;
    const playersContainer = document.getElementById('availablePlayers');
    const playerCards = Array.from(playersContainer.querySelectorAll('.player-card'));
    
    playerCards.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.dataset.playerName.localeCompare(b.dataset.playerName);
            case 'academic':
                return parseFloat(b.dataset.academicScore) - parseFloat(a.dataset.academicScore);
            case 'effort':
                return parseFloat(b.dataset.effortScore) - parseFloat(a.dataset.effortScore);
            default:
                return 0;
        }
    });
    
    // Re-append sorted cards
    playerCards.forEach(card => playersContainer.appendChild(card));
}

// Show draft complete modal
function showDraftCompleteModal() {
    const modal = new bootstrap.Modal(document.getElementById('draftCompleteModal'));
    modal.show();
}

// Utility functions
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
