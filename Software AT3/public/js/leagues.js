// League management JavaScript

let currentLeagues = [];
let selectedLeagueId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadLeagues();
    
    // Set up event listeners
    document.getElementById('statusFilter')?.addEventListener('change', loadLeagues);
    
    // Tab change listeners
    document.getElementById('my-leagues-tab')?.addEventListener('shown.bs.tab', loadMyLeagues);
    document.getElementById('manage-tab')?.addEventListener('shown.bs.tab', loadManageLeagues);
    
    // Form submissions
    document.getElementById('createLeagueForm')?.addEventListener('submit', handleCreateLeague);
    document.getElementById('joinLeagueForm')?.addEventListener('submit', handleJoinLeague);
});

// Load all available leagues
async function loadLeagues() {
    try {
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const url = `/api/leagues${statusFilter ? `?status=${statusFilter}` : ''}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            currentLeagues = data.leagues;
            displayLeagues(data.leagues, 'leaguesList');
        } else {
            showError('Failed to load leagues: ' + data.error);
        }
    } catch (error) {
        console.error('Error loading leagues:', error);
        showError('Failed to load leagues');
    }
}

// Load user's leagues
async function loadMyLeagues() {
    try {
        const response = await fetch('/api/leagues');
        const data = await response.json();
        
        if (data.success) {
            // Filter leagues where user is a participant
            const myLeagues = data.leagues.filter(league => 
                league.participants.some(p => p.userID._id === getCurrentUserId())
            );
            displayMyLeagues(myLeagues, 'myLeaguesList');
        } else {
            showError('Failed to load your leagues: ' + data.error);
        }
    } catch (error) {
        console.error('Error loading my leagues:', error);
        showError('Failed to load your leagues');
    }
}

// Load leagues for management (teachers only)
async function loadManageLeagues() {
    try {
        const response = await fetch('/api/leagues/my-leagues');
        const data = await response.json();
        
        if (data.success) {
            displayManageLeagues(data.leagues, 'manageLeaguesList');
        } else {
            showError('Failed to load leagues for management: ' + data.error);
        }
    } catch (error) {
        console.error('Error loading manage leagues:', error);
        showError('Failed to load leagues for management');
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
    if (league.status === 'open') {
        return `
            <button class="btn btn-primary btn-sm" onclick="showJoinLeagueModal('${league._id}')">
                <i class="bi bi-plus-circle"></i> Join League
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

function getCurrentUserId() {
    // This would need to be set from the server-side template
    return window.currentUserId || null;
}

function showError(message) {
    // Simple error display - could be enhanced with toast notifications
    alert(message);
}

function showSuccess(message) {
    // Simple success display - could be enhanced with toast notifications
    alert(message);
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
                showSuccess('Successfully left league!');
                loadLeagues();
                loadMyLeagues();
            } else {
                showError('Failed to leave league: ' + result.error);
            }
        } catch (error) {
            console.error('Error leaving league:', error);
            showError('Failed to leave league');
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
                showSuccess('League opened successfully!');
                loadManageLeagues();
            } else {
                showError('Failed to open league: ' + result.error);
            }
        } catch (error) {
            console.error('Error opening league:', error);
            showError('Failed to open league');
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

function manageLeague(leagueId) {
    window.location.href = `/leagues/${leagueId}/manage`;
}

// Handle create league form submission
async function handleCreateLeague(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
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
            showSuccess('League created successfully!');
            bootstrap.Modal.getInstance(document.getElementById('createLeagueModal')).hide();
            event.target.reset();
            loadLeagues();
            loadManageLeagues();
        } else {
            showError('Failed to create league: ' + result.error);
        }
    } catch (error) {
        console.error('Error creating league:', error);
        showError('Failed to create league');
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
            showSuccess('Successfully joined league!');
            bootstrap.Modal.getInstance(document.getElementById('joinLeagueModal')).hide();
            event.target.reset();
            loadLeagues();
            loadMyLeagues();
        } else {
            showError('Failed to join league: ' + result.error);
        }
    } catch (error) {
        console.error('Error joining league:', error);
        showError('Failed to join league');
    }
}
