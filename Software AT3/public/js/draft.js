/**
 * Draft functionality JavaScript
 * Handles real-time draft interface, player selection, timer management, and status updates
 */

// Global state variables for draft management
let currentDraftData = null;                    // Stores complete draft state and available players
let currentlySelectedPlayerId = null;           // ID of player currently selected for drafting
let turnTimer = null;                           // Timer interval for current turn countdown
let timeRemaining = 0;                          // Seconds remaining in current turn
let isDraftRequestInProgress = false;           // Prevents duplicate draft API calls
let draftStatusPollingInterval = null;          // Interval ID for periodic status updates

/**
 * Initialize draft page functionality when DOM is loaded
 * Sets up event listeners and starts status polling
 */
document.addEventListener('DOMContentLoaded', function() {
    // Validate that league ID is available (should be set by server-side template)
    if (!leagueId) {
        showError('League ID not found');
        return;
    }

    if (!currentUserId) {
        showError('User not authenticated');
        return;
    }

    // Load initial draft status and data
    loadDraftStatus();

    // Set up user interaction event listeners
    const playerSearchInput = document.getElementById('playerSearch');
    const playerSortSelect = document.getElementById('sortPlayers');
    const autoPickButton = document.getElementById('autoPickBtn');
    const draftPlayerButton = document.getElementById('draftPlayerBtn');

    // Add event listeners with null checks for safety
    playerSearchInput?.addEventListener('input', filterAvailablePlayers);
    playerSortSelect?.addEventListener('change', sortAvailablePlayers);
    autoPickButton?.addEventListener('click', executeAutoPick);
    draftPlayerButton?.addEventListener('click', draftCurrentlySelectedPlayer);

    // Start periodic status polling (every 5 seconds)
    const statusPollingIntervalMs = 5000;
    draftStatusPollingInterval = setInterval(loadDraftStatus, statusPollingIntervalMs);
});

/**
 * Fetches current draft status from the API and updates the interface
 * Handles draft completion detection and stops polling when appropriate
 */
async function loadDraftStatus() {
    try {
        // Request current draft status from the API
        const draftStatusResponse = await fetch(`/api/draft/${leagueId}/status`);

        if (!draftStatusResponse.ok) {
            throw new Error(`HTTP ${draftStatusResponse.status}: ${draftStatusResponse.statusText}`);
        }

        const draftStatusData = await draftStatusResponse.json();
        console.log('Draft status data:', draftStatusData);

        // Process successful API response
        if (draftStatusData.success) {
            currentDraftData = draftStatusData;
            updateAllDraftDisplayElements();

            // Stop status polling if draft has completed
            if (currentDraftData.draftState.isDraftComplete) {
                console.log('Draft is complete, stopping status polling');
                if (draftStatusPollingInterval) {
                    clearInterval(draftStatusPollingInterval);
                    draftStatusPollingInterval = null;
                }
            }
        } else {
            console.error('Draft status error:', draftStatusData.error);
            showError('Failed to load draft status: ' + draftStatusData.error);

            // Show specific guidance based on error type
            if (draftStatusData.error.includes('not a participant')) {
                showError('You are not a participant in this league. Please join the league first.');
            } else if (draftStatusData.error.includes('not in drafting mode')) {
                showError('This league is not currently in draft mode. The draft may not have started yet or may have already completed.');
            }
        }
    } catch (errorObject) {
        console.error('Error loading draft status:', errorObject);

        if (errorObject.message.includes('HTTP 403')) {
            showError('Access denied: You may not be a participant in this league.');
        } else if (errorObject.message.includes('HTTP 404')) {
            showError('League not found. Please check the league ID.');
        } else if (errorObject.message.includes('HTTP 400')) {
            showError('League is not in draft mode. The draft may not have started yet.');
        } else {
            showError('Failed to load draft status: ' + errorObject.message);
        }
    }
}

/**
 * Orchestrates updates to all draft interface elements
 * Called after receiving new draft status data from the API
 */
function updateAllDraftDisplayElements() {
    // Safety check to ensure we have draft data
    if (!currentDraftData) {
        console.error('Cannot update draft display: currentDraftData is null');
        return;
    }

    updateDraftStatusPanel();
    updateDraftOrderDisplay();
    updateCurrentPickInfo();
    updateAvailablePlayers();
    updateTeamsRosters();
    updateRecentPicks();
    updateTimer();
}

/**
 * Updates the draft status panel with current round, pick, and turn information
 * Handles different draft states: complete, inactive, and active
 */
function updateDraftStatusPanel() {
    const draftStatusContainer = document.getElementById('draftStatus');

    if (!draftStatusContainer || !currentDraftData?.draftState) {
        return;
    }

    // Handle completed draft state
    if (currentDraftData.draftState.isDraftComplete) {
        draftStatusContainer.innerHTML = `
            <div class="alert alert-success">
                <i class="bi bi-check-circle"></i> Draft Complete!
            </div>
        `;
        showSuccess('Draft completed! All teams have been filled.');
        return;
    }

    // Handle inactive draft state (not yet started)
    if (!currentDraftData.draftState.isActive) {
        draftStatusContainer.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-clock"></i> Draft has not started yet
            </div>
        `;
        return;
    }

    // Display active draft information
    const currentRoundNumber = currentDraftData.draftState.currentRound;
    const currentPickNumber = currentDraftData.draftState.currentPick;
    const currentTurnUserName = currentDraftData.draftState.currentTurnUser?.name || 'Unknown';
    const isCurrentUserTurn = currentDraftData.isUserTurn;

    draftStatusContainer.innerHTML = `
        <div class="mb-2">
            <strong>Round:</strong> ${currentRoundNumber}
        </div>
        <div class="mb-2">
            <strong>Pick:</strong> ${currentPickNumber}
        </div>
        <div class="mb-2">
            <strong>Current Turn:</strong><br>
            <span class="text-primary">${currentTurnUserName}</span>
        </div>
        ${isCurrentUserTurn ? '<div class="alert alert-info p-2"><small><i class="bi bi-arrow-right"></i> Your turn!</small></div>' : ''}
    `;
}

/**
 * Updates the draft order display showing participant sequence and current turn
 * Highlights the current user and the user whose turn it is
 */
function updateDraftOrderDisplay() {
    const draftOrderContainer = document.getElementById('draftOrder');

    // Handle case where draft order is not yet established
    if (!currentDraftData.draftState.draftOrder || currentDraftData.draftState.draftOrder.length === 0) {
        draftOrderContainer.innerHTML = '<small class="text-muted">Draft order not set</small>';
        return;
    }

    // Generate HTML for each participant in draft order
    const draftOrderHtml = currentDraftData.draftState.draftOrder.map((participantUser, orderIndex) => {
        // Determine if this user is currently picking
        const isUserCurrentlyPicking = currentDraftData.draftState.currentTurnUser &&
            participantUser._id === currentDraftData.draftState.currentTurnUser._id;

        // Determine if this is the logged-in user
        const isLoggedInUser = participantUser._id === currentUserId;

        // Build CSS classes for styling
        let cssClasses = 'p-2 border-bottom';
        if (isUserCurrentlyPicking) cssClasses += ' current-turn';
        if (isLoggedInUser) cssClasses += ' my-turn';

        // Create HTML for this draft order entry
        return `
            <div class="${cssClasses}">
                <small>
                    ${orderIndex + 1}. ${escapeHtml(participantUser.name)}
                    ${isLoggedInUser ? ' (You)' : ''}
                    ${isUserCurrentlyPicking ? ' <i class="bi bi-arrow-right"></i>' : ''}
                </small>
            </div>
        `;
    }).join('');

    draftOrderContainer.innerHTML = draftOrderHtml;
}

// Update current pick information
function updateCurrentPickInfo() {
    const infoDiv = document.getElementById('currentPickInfo');

    // Check if draft is complete first
    if (currentDraftData.draftState.isDraftComplete) {
        infoDiv.innerHTML = `
            <div class="text-center">
                <h5 class="text-success">Draft Complete!</h5>
                <p class="text-muted">All teams have been filled.</p>
            </div>
        `;
        return;
    }

    if (!currentDraftData.draftState.isActive) {
        infoDiv.innerHTML = `
            <div class="text-center">
                <h5>Waiting for draft to start...</h5>
                <p class="text-muted">The draft has not begun yet.</p>
            </div>
        `;
        return;
    }

    const currentUser = currentDraftData.draftState.currentTurnUser;
    const isUserTurn = currentDraftData.isUserTurn;

    infoDiv.innerHTML = `
        <div class="text-center">
            <h5>Round ${currentDraftData.draftState.currentRound}, Pick ${currentDraftData.draftState.currentPick}</h5>
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

    if (!currentDraftData.availablePlayers || currentDraftData.availablePlayers.length === 0) {
        playersDiv.innerHTML = `
            <div class="text-center p-4">
                <p class="text-muted">No players available</p>
            </div>
        `;
        return;
    }
    
    const playersHtml = currentDraftData.availablePlayers.map(player => {
        const academicScore = calculateAverageScore(player.academicHistory);
        const effortScore = calculateTotalEffort(player.weeklyStudyContributions);
        
        return `
            <div class="player-card p-3 border-bottom ${currentDraftData.isUserTurn ? 'draftable' : ''}"
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
                        ${currentDraftData.isUserTurn ?
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

    if (!currentDraftData.participants || currentDraftData.participants.length === 0) {
        rostersDiv.innerHTML = `
            <div class="text-center p-4">
                <p class="text-muted">No teams found</p>
            </div>
        `;
        return;
    }
    
    const rostersHtml = currentDraftData.participants.map(participant => {
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

    if (!currentDraftData.draftState.pickHistory || currentDraftData.draftState.pickHistory.length === 0) {
        picksDiv.innerHTML = '<div class="text-center"><small class="text-muted">No picks yet</small></div>';
        return;
    }
    
    const recentPicks = currentDraftData.draftState.pickHistory.slice(-10).reverse();
    
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

    if (!timerCard || !timerDiv || !autoPickBtn || !currentDraftData?.draftState) {
        return;
    }

    if (!currentDraftData.draftState.isActive || currentDraftData.draftState.isDraftComplete) {
        timerCard.style.display = 'none';
        if (turnTimer) {
            clearInterval(turnTimer);
            turnTimer = null;
        }
        return;
    }
    
    if (currentDraftData.isUserTurn) {
        timerCard.style.display = 'block';
        autoPickBtn.style.display = 'block';

        // Calculate actual time remaining based on turn start time
        const now = new Date();
        const turnStartTime = currentDraftData.draftState.currentTurnStartTime ?
            new Date(currentDraftData.draftState.currentTurnStartTime) : now;
        const timeLimitPerPick = currentDraftData.draftSettings?.timeLimitPerPick || 60; // Default 60 seconds
        const elapsedSeconds = Math.floor((now.getTime() - turnStartTime.getTime()) / 1000);
        const actualTimeRemaining = Math.max(0, timeLimitPerPick - elapsedSeconds);

        // Only restart timer if we don't have one running or if the calculated time is significantly different
        if (!turnTimer || Math.abs((timeRemaining || 0) - actualTimeRemaining) > 2) {
            // Clear any existing timer
            if (turnTimer) {
                clearInterval(turnTimer);
                turnTimer = null;
            }

            // Reset timer display styling
            timerDiv.classList.remove('timer-warning');

            // Set the correct time remaining
            timeRemaining = actualTimeRemaining;

            // If time has already expired, auto-pick immediately
            if (timeRemaining <= 0) {
                executeAutoPick();
                return;
            }

            // Start new timer
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
                    executeAutoPick();
                }
            }, 1000);
        }

        // Update display immediately with current time
        const safeTimeRemaining = timeRemaining || 0;
        const minutes = Math.floor(safeTimeRemaining / 60);
        const seconds = safeTimeRemaining % 60;
        timerDiv.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (safeTimeRemaining <= 10) {
            timerDiv.classList.add('timer-warning');
        }
    } else {
        timerCard.style.display = 'none';
        autoPickBtn.style.display = 'none';
        if (turnTimer) {
            clearInterval(turnTimer);
            turnTimer = null;
        }
    }
}

/**
 * Handles player selection from the available players list
 * Shows player details and sets selection for drafting if it's user's turn
 * @param {string} playerId - ID of the player to select
 */
function selectPlayer(playerId) {
    // If it's not the user's turn, just show player details
    if (!currentDraftData.isUserTurn) {
        showPlayerDetails(playerId);
        return;
    }

    // Set the selected player for potential drafting
    currentlySelectedPlayerId = playerId;
    showPlayerDetails(playerId);
}

/**
 * Displays detailed information about a player in a modal
 * Shows academic scores, effort hours, and recent performance
 * @param {string} playerId - ID of the player to show details for
 */
function showPlayerDetails(playerId) {
    // Find the player in the available players list
    const selectedPlayer = currentDraftData.availablePlayers.find(player => player._id === playerId);
    if (!selectedPlayer) return;

    // Calculate player statistics
    const playerAcademicAverage = calculateAverageScore(selectedPlayer.academicHistory);
    const playerTotalEffortHours = calculateTotalEffort(selectedPlayer.weeklyStudyContributions);

    // Populate modal content with player information
    const playerDetailsContentContainer = document.getElementById('playerDetailsContent');
    playerDetailsContentContainer.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h5>${escapeHtml(selectedPlayer.name)}</h5>
                <p><strong>Academic Average:</strong> ${playerAcademicAverage.toFixed(1)}%</p>
                <p><strong>Total Effort Hours:</strong> ${playerTotalEffortHours.toFixed(1)}</p>
            </div>
            <div class="col-md-6">
                <h6>Recent Academic Scores</h6>
                ${selectedPlayer.academicHistory?.slice(-5).map(academicEntry =>
                    `<div>${academicEntry.grade_percent}% - ${new Date(academicEntry.date).toLocaleDateString()}</div>`
                ).join('') || '<div class="text-muted">No data</div>'}
            </div>
        </div>
    `;

    // Show/hide draft button based on turn status
    const draftPlayerButton = document.getElementById('draftPlayerBtn');
    if (currentDraftData.isUserTurn) {
        draftPlayerButton.style.display = 'block';
        // Update selected player ID for drafting
        currentlySelectedPlayerId = playerId;
    } else {
        draftPlayerButton.style.display = 'none';
    }

    // Display the modal
    const playerDetailsModal = new bootstrap.Modal(document.getElementById('playerDetailsModal'));
    playerDetailsModal.show();
}

/**
 * Drafts a specific player for the current user's team
 * Handles API communication and prevents duplicate requests
 * @param {string} playerId - ID of the player to draft
 */
async function draftPlayer(playerId) {
    // Prevent duplicate draft requests
    if (isDraftRequestInProgress) {
        console.log('Draft already in progress, ignoring duplicate request');
        return;
    }

    isDraftRequestInProgress = true;

    try {
        console.log(`Drafting player: ${playerId}`);

        // Send draft request to API
        const draftResponse = await fetch(`/api/draft/${leagueId}/pick`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ playerId })
        });

        const draftResult = await draftResponse.json();

        if (draftResult.success) {
            showSuccess(`Successfully drafted ${draftResult.pick.player.name}!`);

            // Close player details modal if open
            const playerDetailsModalInstance = bootstrap.Modal.getInstance(document.getElementById('playerDetailsModal'));
            playerDetailsModalInstance?.hide();

            // Clear the turn timer since pick is complete
            if (turnTimer) {
                clearInterval(turnTimer);
                turnTimer = null;
            }

            // Reload draft status after a brief delay
            setTimeout(loadDraftStatus, 1000);
        } else {
            showError('Failed to draft player: ' + draftResult.error);
        }
    } catch (errorObject) {
        console.error('Error drafting player:', errorObject);
        showError('Failed to draft player');
    } finally {
        // Always reset the drafting flag to allow future requests
        isDraftRequestInProgress = false;
    }
}

/**
 * Drafts the currently selected player
 * Wrapper function that calls draftPlayer with the selected player ID
 */
function draftCurrentlySelectedPlayer() {
    if (currentlySelectedPlayerId) {
        draftPlayer(currentlySelectedPlayerId);
    }
}

/**
 * Executes an automatic pick for the current user's turn
 * Prevents duplicate requests and handles API communication
 */
async function executeAutoPick() {
    // Prevent duplicate auto-pick requests
    if (isDraftRequestInProgress) {
        console.log('Draft already in progress, ignoring auto-pick request');
        return;
    }

    isDraftRequestInProgress = true;

    try {
        console.log('Making auto-pick');

        // Send auto-pick request to API
        const autoPickResponse = await fetch(`/api/draft/${leagueId}/auto-pick`, {
            method: 'POST'
        });

        const autoPickResult = await autoPickResponse.json();

        if (autoPickResult.success) {
            showSuccess(`Auto-picked ${autoPickResult.pick.player.name}!`);

            // Clear the turn timer since pick is complete
            if (turnTimer) {
                clearInterval(turnTimer);
                turnTimer = null;
            }

            // Reload draft status after a brief delay
            setTimeout(loadDraftStatus, 1000);
        } else {
            showError('Failed to auto-pick: ' + autoPickResult.error);
        }
    } catch (errorObject) {
        console.error('Error with auto-pick:', errorObject);
        showError('Failed to auto-pick');
    } finally {
        // Always reset the drafting flag to allow future requests
        isDraftRequestInProgress = false;
    }
}

/**
 * Filters available players based on search input
 * Shows/hides player cards that match the search term
 */
function filterAvailablePlayers() {
    const searchInputValue = document.getElementById('playerSearch').value.toLowerCase();
    const allPlayerCards = document.querySelectorAll('.player-card');

    // Show/hide cards based on name match
    allPlayerCards.forEach(playerCard => {
        const playerNameFromCard = playerCard.dataset.playerName.toLowerCase();
        const shouldShowCard = playerNameFromCard.includes(searchInputValue);

        playerCard.style.display = shouldShowCard ? 'block' : 'none';
    });
}

/**
 * Sorts available players by selected criteria (name, academic score, effort score)
 * Reorders the player cards in the DOM based on sort selection
 */
function sortAvailablePlayers() {
    const selectedSortCriteria = document.getElementById('sortPlayers').value;
    const playersDisplayContainer = document.getElementById('availablePlayers');
    const allPlayerCards = Array.from(playersDisplayContainer.querySelectorAll('.player-card'));

    // Sort cards based on selected criteria
    allPlayerCards.sort((firstCard, secondCard) => {
        switch (selectedSortCriteria) {
            case 'name':
                return firstCard.dataset.playerName.localeCompare(secondCard.dataset.playerName);
            case 'academic':
                return parseFloat(secondCard.dataset.academicScore) - parseFloat(firstCard.dataset.academicScore);
            case 'effort':
                return parseFloat(secondCard.dataset.effortScore) - parseFloat(firstCard.dataset.effortScore);
            default:
                return 0;
        }
    });

    // Re-append sorted cards to maintain new order
    allPlayerCards.forEach(playerCard => playersDisplayContainer.appendChild(playerCard));
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


