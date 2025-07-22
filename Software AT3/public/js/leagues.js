/**
 * League Management JavaScript
 * Handles league browsing, creation, joining, and management functionality
 */

// Global state variables for league management
let allAvailableLeagues = [];           // Stores all leagues fetched from API
let currentlySelectedLeagueId = null;   // ID of league selected for joining

/**
 * Initialize league management page when DOM is loaded
 * Sets up event listeners and loads initial data
 */
document.addEventListener('DOMContentLoaded', function() {
    // Load initial league data
    loadAllAvailableLeagues();

    // Set up filter and navigation event listeners
    const statusFilterSelect = document.getElementById('statusFilter');
    const myLeaguesTab = document.getElementById('my-leagues-tab');
    const manageLeaguesTab = document.getElementById('manage-tab');
    const createLeagueForm = document.getElementById('createLeagueForm');
    const joinLeagueForm = document.getElementById('joinLeagueForm');

    // Add event listeners with null checks for safety
    statusFilterSelect?.addEventListener('change', loadAllAvailableLeagues);
    myLeaguesTab?.addEventListener('shown.bs.tab', loadUserParticipatingLeagues);
    manageLeaguesTab?.addEventListener('shown.bs.tab', loadUserManagedLeagues);
    createLeagueForm?.addEventListener('submit', handleCreateLeague);
    joinLeagueForm?.addEventListener('submit', handleJoinLeague);

    // Set up real-time league name validation
    setupLeagueNameValidation();
});

/**
 * Loads all available leagues with optional status filtering
 * Fetches leagues from API and displays them in the browse tab
 */
async function loadAllAvailableLeagues() {
    try {
        // Get current status filter value
        const statusFilterValue = document.getElementById('statusFilter')?.value || '';
        const apiEndpointUrl = `/api/leagues${statusFilterValue ? `?status=${statusFilterValue}` : ''}`;

        // Fetch leagues from API
        const leaguesResponse = await fetch(apiEndpointUrl);
        const leaguesData = await leaguesResponse.json();

        if (leaguesData.success) {
            allAvailableLeagues = leaguesData.leagues;
            displayLeagues(leaguesData.leagues, 'leaguesList');
        } else {
            showErrorMessage('Failed to load leagues: ' + leaguesData.error);
        }
    } catch (networkError) {
        console.error('Error loading leagues:', networkError);
        showErrorMessage('Failed to load leagues');
    }
}

/**
 * Loads leagues where the current user is a participant
 * Filters and displays only leagues the user has joined
 */
async function loadUserParticipatingLeagues() {
    try {
        // Fetch all leagues to filter for user participation
        const allLeaguesResponse = await fetch('/api/leagues');
        const allLeaguesData = await allLeaguesResponse.json();

        if (allLeaguesData.success) {
            // Filter leagues where current user is a participant
            const currentUserId = getCurrentUserId();
            const userParticipatingLeagues = currentUserId ? allLeaguesData.leagues.filter(league =>
                league.participants.some(participant =>
                    participant.userID._id === currentUserId
                )
            ) : [];
            displayMyLeagues(userParticipatingLeagues, 'myLeaguesList');
        } else {
            showErrorMessage('Failed to load your leagues: ' + allLeaguesData.error);
        }
    } catch (networkError) {
        console.error('Error loading user participating leagues:', networkError);
        showErrorMessage('Failed to load your leagues');
    }
}

/**
 * Loads leagues that the current user manages (teachers only)
 * Fetches leagues created by the current user for management
 */
async function loadUserManagedLeagues() {
    try {
        // Fetch leagues managed by current user
        const managedLeaguesResponse = await fetch('/api/leagues/my-leagues');
        const managedLeaguesData = await managedLeaguesResponse.json();

        if (managedLeaguesData.success) {
            displayManageLeagues(managedLeaguesData.leagues, 'manageLeaguesList');
        } else {
            showErrorMessage('Failed to load leagues for management: ' + managedLeaguesData.error);
        }
    } catch (networkError) {
        console.error('Error loading user managed leagues:', networkError);
        showErrorMessage('Failed to load leagues for management');
    }
}

// Display leagues in browse tab
function displayLeagues(leagues, containerId) {
    const container = document.getElementById(containerId);
    
    if (leagues.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> No leagues found.
            </div>
        `;
        return;
    }
    
    const leaguesHtml = leagues.map(league => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h5 class="card-title">${escapeHtml(league.leagueName)}</h5>
                        <p class="card-text">${escapeHtml(league.description || 'No description')}</p>
                        <div class="row">
                            <div class="col-sm-6">
                                <small class="text-muted">
                                    <i class="bi bi-person"></i> ${league.participantCount || 0}/${league.maxParticipants} participants
                                </small>
                            </div>
                            <div class="col-sm-6">
                                <small class="text-muted">
                                    <i class="bi bi-people"></i> ${league.maxPlayersPerTeam} players per team
                                </small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="mb-2">
                            <span class="badge bg-${getStatusColor(league.status)}">${getStatusText(league.status)}</span>
                        </div>
                        <div class="mb-2">
                            <small class="text-muted">Created by ${escapeHtml(league.createdByTeacherID.name)}</small>
                        </div>
                        ${getLeagueActions(league)}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = leaguesHtml;
}

// Display user's leagues
function displayMyLeagues(leagues, containerId) {
    const container = document.getElementById(containerId);
    
    if (leagues.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> You haven't joined any leagues yet.
            </div>
        `;
        return;
    }
    
    const leaguesHtml = leagues.map(league => {
        const userParticipant = league.participants.find(p => p.userID._id === getCurrentUserId());
        const team = userParticipant?.teamID;
        
        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h5 class="card-title">${escapeHtml(league.leagueName)}</h5>
                            ${team ? `<p class="text-primary"><i class="bi bi-shield"></i> Team: ${escapeHtml(team.teamName)}</p>` : ''}
                            <div class="row">
                                <div class="col-sm-6">
                                    <small class="text-muted">
                                        <i class="bi bi-person"></i> ${league.participantCount || 0}/${league.maxParticipants} participants
                                    </small>
                                </div>
                                <div class="col-sm-6">
                                    <small class="text-muted">
                                        <i class="bi bi-calendar"></i> Joined ${new Date(userParticipant.joinedAt).toLocaleDateString()}
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="mb-2">
                                <span class="badge bg-${getStatusColor(league.status)}">${getStatusText(league.status)}</span>
                            </div>
                            ${getMyLeagueActions(league)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = leaguesHtml;
}

// Display leagues for management
function displayManageLeagues(leagues, containerId) {
    const container = document.getElementById(containerId);
    
    if (leagues.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> You haven't created any leagues yet.
                <a href="#" data-bs-toggle="modal" data-bs-target="#createLeagueModal" class="alert-link">Create your first league</a>
            </div>
        `;
        return;
    }
    
    const leaguesHtml = leagues.map(league => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h5 class="card-title">${escapeHtml(league.leagueName)}</h5>
                        <p class="card-text">${escapeHtml(league.description || 'No description')}</p>
                        <div class="row">
                            <div class="col-sm-4">
                                <small class="text-muted">
                                    <i class="bi bi-person"></i> ${league.participants.length}/${league.maxParticipants} participants
                                </small>
                            </div>
                            <div class="col-sm-4">
                                <small class="text-muted">
                                    <i class="bi bi-calendar"></i> Created ${new Date(league.dateCreated).toLocaleDateString()}
                                </small>
                            </div>
                            <div class="col-sm-4">
                                <small class="text-muted">
                                    <i class="bi bi-code"></i> ${league.classCode}
                                </small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="mb-2">
                            <span class="badge bg-${getStatusColor(league.status)}">${getStatusText(league.status)}</span>
                        </div>
                        ${getManageLeagueActions(league)}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = leaguesHtml;
}

// Get status color for badges
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

// Get status text
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

// Get action buttons for browse leagues
function getLeagueActions(league) {
    const currentUserId = getCurrentUserId();
    const isParticipant = league.participants && league.participants.some(p =>
        p.userID._id === currentUserId && p.isActive
    );

    if (league.status === 'open' && !isParticipant) {
        return `
            <button class="btn btn-primary btn-sm" onclick="showJoinLeagueModal('${league._id}')">
                <i class="bi bi-plus-circle"></i> Join League
            </button>
        `;
    } else if (league.status === 'open' && isParticipant) {
        return `
            <button class="btn btn-outline-success btn-sm" disabled>
                <i class="bi bi-check-circle"></i> Already Joined
            </button>
        `;
    } else if (league.status === 'drafting') {
        return `
            <button class="btn btn-warning btn-sm" onclick="viewDraft('${league._id}')">
                <i class="bi bi-eye"></i> View Draft
            </button>
        `;
    } else {
        return `
            <button class="btn btn-outline-secondary btn-sm" onclick="viewLeague('${league._id}')">
                <i class="bi bi-eye"></i> View
            </button>
        `;
    }
}

// Get action buttons for user's leagues
function getMyLeagueActions(league) {
    let actions = `
        <button class="btn btn-outline-primary btn-sm me-2" onclick="viewLeague('${league._id}')">
            <i class="bi bi-eye"></i> View
        </button>
    `;
    
    if (league.status === 'drafting') {
        actions += `
            <button class="btn btn-warning btn-sm" onclick="joinDraft('${league._id}')">
                <i class="bi bi-play-circle"></i> Join Draft
            </button>
        `;
    } else if (league.status === 'open') {
        actions += `
            <button class="btn btn-outline-danger btn-sm" onclick="leaveLeague('${league._id}')">
                <i class="bi bi-box-arrow-right"></i> Leave
            </button>
        `;
    }
    
    return actions;
}

// Get action buttons for manage leagues
function getManageLeagueActions(league) {
    let actions = '';
    
    if (league.status === 'setup') {
        actions += `
            <button class="btn btn-success btn-sm me-2" onclick="openLeague('${league._id}')">
                <i class="bi bi-unlock"></i> Open League
            </button>
        `;
    }
    
    if (league.status === 'open' && league.participants.length >= 2) {
        actions += `
            <button class="btn btn-warning btn-sm me-2" onclick="startDraft('${league._id}')">
                <i class="bi bi-play-circle"></i> Start Draft
            </button>
        `;
    }

    if (league.status === 'active') {
        actions += `
            <button class="btn btn-danger btn-sm me-2" onclick="endLeague('${league._id}')">
                <i class="bi bi-stop-circle"></i> End League
            </button>
        `;
    }

    actions += `
        <button class="btn btn-outline-primary btn-sm" onclick="manageLeague('${league._id}')">
            <i class="bi bi-gear"></i> Manage
        </button>
    `;
    
    return actions;
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Gets the current user's ID from the global window object
 * This should be set by the server-side template
 * @returns {string|null} Current user ID or null if not set
 */
function getCurrentUserId() {
    // Access currentUserId from window object (set by server-side template)
    // Handle case where user is not logged in
    return window['currentUserId'] || null;
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

// Placeholder functions for actions (to be implemented)
function showJoinLeagueModal(leagueId) {
    selectedLeagueId = leagueId;
    const modal = new bootstrap.Modal(document.getElementById('joinLeagueModal'));
    modal.show();
}

function viewLeague(leagueId) {
    window.location.href = `/leagues/${leagueId}`;
}

function viewDraft(leagueId) {
    window.location.href = `/draft/${leagueId}`;
}

function joinDraft(leagueId) {
    window.location.href = `/draft/${leagueId}`;
}

async function leaveLeague(leagueId) {
    if (confirm('Are you sure you want to leave this league?')) {
        try {
            const response = await fetch(`/api/leagues/${leagueId}/leave`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                showSuccessMessage('Successfully left league!');
                loadAllAvailableLeagues();
                loadUserParticipatingLeagues();
            } else {
                showErrorMessage('Failed to leave league: ' + result.error);
            }
        } catch (error) {
            console.error('Error leaving league:', error);
            showErrorMessage('Failed to leave league');
        }
    }
}

async function openLeague(leagueId) {
    if (confirm('Are you sure you want to open this league for participants?')) {
        try {
            const response = await fetch(`/api/leagues/${leagueId}/open`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                showSuccessMessage('League opened successfully!');
                loadUserManagedLeagues();
            } else {
                showErrorMessage('Failed to open league: ' + result.error);
            }
        } catch (error) {
            console.error('Error opening league:', error);
            showErrorMessage('Failed to open league');
        }
    }
}

async function endLeague(leagueId) {
    if (confirm('Are you sure you want to end this league? This will mark it as completed and cannot be undone.')) {
        try {
            const response = await fetch(`/api/leagues/${leagueId}/end`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                showSuccessMessage('League ended successfully!');
                loadUserManagedLeagues();
            } else {
                showErrorMessage('Failed to end league: ' + result.error);
            }
        } catch (error) {
            console.error('Error ending league:', error);
            showErrorMessage('Failed to end league');
        }
    }
}

async function startDraft(leagueId) {
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

function manageLeague(leagueId) {
    window.location.href = `/leagues/${leagueId}/manage`;
}

/**
 * Sets up real-time validation for league name input
 */
function setupLeagueNameValidation() {
    const leagueNameInput = document.getElementById('leagueName');
    const classCodeInput = document.getElementById('classCode');
    const feedbackDiv = document.getElementById('leagueNameFeedback');

    if (!leagueNameInput || !classCodeInput || !feedbackDiv) return;

    let validationTimeout;

    // Debounced validation function
    const validateLeagueName = async () => {
        const leagueName = leagueNameInput.value.trim();
        const classCode = classCodeInput.value.trim();

        if (!leagueName || !classCode) {
            leagueNameInput.classList.remove('is-invalid', 'is-valid');
            feedbackDiv.textContent = '';
            return;
        }

        try {
            const nameExists = await checkLeagueNameExists(leagueName, classCode);

            if (nameExists) {
                leagueNameInput.classList.add('is-invalid');
                leagueNameInput.classList.remove('is-valid');
                feedbackDiv.textContent = `A league named "${leagueName}" already exists in class ${classCode}.`;
            } else {
                leagueNameInput.classList.add('is-valid');
                leagueNameInput.classList.remove('is-invalid');
                feedbackDiv.textContent = '';
            }
        } catch (error) {
            console.error('Error validating league name:', error);
        }
    };

    // Add event listeners with debouncing
    const handleInput = () => {
        clearTimeout(validationTimeout);
        validationTimeout = setTimeout(validateLeagueName, 500); // 500ms delay
    };

    leagueNameInput.addEventListener('input', handleInput);
    classCodeInput.addEventListener('input', handleInput);
}

/**
 * Checks if a league name already exists for the current user and class code
 * @param {string} leagueName - Name to check
 * @param {string} classCode - Class code to check within
 * @returns {boolean} True if name exists, false otherwise
 */
async function checkLeagueNameExists(leagueName, classCode) {
    try {
        // Get all leagues for the current user
        const response = await fetch('/api/leagues/my-leagues');
        const data = await response.json();

        if (data.success) {
            // Check if any league has the same name (case-insensitive) and class code
            return data.leagues.some(league =>
                league.leagueName.toLowerCase() === leagueName.toLowerCase() &&
                league.classCode === classCode
            );
        }
        return false;
    } catch (error) {
        console.error('Error checking league name:', error);
        return false;
    }
}

// Handle create league form submission
async function handleCreateLeague(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    // Check if form has validation errors
    const leagueNameInput = document.getElementById('leagueName');
    if (leagueNameInput && leagueNameInput.classList.contains('is-invalid')) {
        showErrorMessage('Please fix the validation errors before submitting.');
        return;
    }

    // Client-side validation for duplicate league names
    if (data.leagueName && data.classCode) {
        const nameExists = await checkLeagueNameExists(data.leagueName, data.classCode);
        if (nameExists) {
            showErrorMessage(`A league named "${data.leagueName}" already exists in class ${data.classCode}. Please choose a different name.`);
            return;
        }
    }

    try {
        const response = await fetch('/api/leagues/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        if (result.success) {
            showSuccessMessage('League created successfully!');
            bootstrap.Modal.getInstance(document.getElementById('createLeagueModal')).hide();
            event.target.reset();
            loadAllAvailableLeagues();
            loadUserManagedLeagues();
        } else {
            showErrorMessage('Failed to create league: ' + result.error);
        }
    } catch (error) {
        console.error('Error creating league:', error);
        showErrorMessage('Failed to create league');
    }
}

// Handle join league form submission
async function handleJoinLeague(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const teamName = formData.get('teamName');
    
    try {
        const response = await fetch(`/api/leagues/${selectedLeagueId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ teamName })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessMessage('Successfully joined league!');
            bootstrap.Modal.getInstance(document.getElementById('joinLeagueModal')).hide();
            event.target.reset();
            loadAllAvailableLeagues();
            loadUserParticipatingLeagues();
        } else {
            showErrorMessage('Failed to join league: ' + result.error);
        }
    } catch (error) {
        console.error('Error joining league:', error);
        showErrorMessage('Failed to join league');
    }
}
