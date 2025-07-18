// Dashboard JavaScript functionality

let updateAcademicEntryCount = 0;
let updateWeeklyEntryCount = 0;

// Show update player modal
async function showUpdatePlayerModal(playerId, playerName) {
    try {
        // Fetch player details
        const response = await fetch(`/api/players/${playerId}`);
        const data = await response.json();
        
        if (!data.success) {
            showError('Failed to load player details: ' + data.error);
            return;
        }
        
        const player = data.player;
        
        // Populate modal fields
        document.getElementById('updatePlayerId').value = playerId;
        document.getElementById('updatePlayerName').value = player.name;
        
        // Clear and populate academic history
        const academicContainer = document.getElementById('updateAcademicHistory');
        academicContainer.innerHTML = '';
        updateAcademicEntryCount = 0;
        
        if (player.academicHistory && player.academicHistory.length > 0) {
            player.academicHistory.forEach(entry => {
                if (entry.score !== null && entry.score !== undefined) {
                    addUpdateAcademicEntry(entry.subject, entry.score, entry.date);
                }
            });
        }
        
        // Clear and populate weekly contributions
        const weeklyContainer = document.getElementById('updateWeeklyContributions');
        weeklyContainer.innerHTML = '';
        updateWeeklyEntryCount = 0;
        
        if (player.weeklyStudyContributions && player.weeklyStudyContributions.length > 0) {
            player.weeklyStudyContributions.forEach(entry => {
                if (entry.hoursStudied !== null && entry.hoursStudied !== undefined) {
                    addUpdateWeeklyEntry(entry.week, entry.hoursStudied);
                }
            });
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('updatePlayerModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading player details:', error);
        showError('Failed to load player details');
    }
}

// Add academic entry to update form
function addUpdateAcademicEntry(subject = '', score = '', date = '') {
    updateAcademicEntryCount++;
    const container = document.getElementById('updateAcademicHistory');
    
    const entryDiv = document.createElement('div');
    entryDiv.className = 'row mb-2';
    entryDiv.id = `updateAcademicEntry${updateAcademicEntryCount}`;
    
    entryDiv.innerHTML = `
        <div class="col-md-4">
            <input type="text" class="form-control" name="academicSubject[]" placeholder="Subject" value="${subject}" required>
        </div>
        <div class="col-md-3">
            <input type="number" class="form-control" name="academicScore[]" placeholder="Score" min="0" max="100" value="${score}" required>
        </div>
        <div class="col-md-3">
            <input type="date" class="form-control" name="academicDate[]" value="${date ? new Date(date).toISOString().split('T')[0] : ''}" required>
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeUpdateAcademicEntry(${updateAcademicEntryCount})">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;
    
    container.appendChild(entryDiv);
}

// Add weekly entry to update form
function addUpdateWeeklyEntry(week = '', hours = '') {
    updateWeeklyEntryCount++;
    const container = document.getElementById('updateWeeklyContributions');
    
    const entryDiv = document.createElement('div');
    entryDiv.className = 'row mb-2';
    entryDiv.id = `updateWeeklyEntry${updateWeeklyEntryCount}`;
    
    entryDiv.innerHTML = `
        <div class="col-md-5">
            <input type="text" class="form-control" name="weeklyWeek[]" placeholder="Week (e.g., Week 1)" value="${week}" required>
        </div>
        <div class="col-md-5">
            <input type="number" class="form-control" name="weeklyHours[]" placeholder="Hours studied" min="0" step="0.5" value="${hours}" required>
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeUpdateWeeklyEntry(${updateWeeklyEntryCount})">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;
    
    container.appendChild(entryDiv);
}

// Remove academic entry from update form
function removeUpdateAcademicEntry(entryId) {
    const entry = document.getElementById(`updateAcademicEntry${entryId}`);
    if (entry) {
        entry.remove();
    }
}

// Remove weekly entry from update form
function removeUpdateWeeklyEntry(entryId) {
    const entry = document.getElementById(`updateWeeklyEntry${entryId}`);
    if (entry) {
        entry.remove();
    }
}

// Handle update player form submission
document.addEventListener('DOMContentLoaded', function() {
    const updateForm = document.getElementById('updatePlayerForm');
    if (updateForm) {
        updateForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                const formData = new FormData(updateForm);
                const playerId = formData.get('playerId');
                
                // Build the update data
                const updateData = {
                    name: formData.get('name'),
                    academicHistory: [],
                    weeklyStudyContributions: []
                };
                
                // Process academic history
                const subjects = formData.getAll('academicSubject[]');
                const scores = formData.getAll('academicScore[]');
                const dates = formData.getAll('academicDate[]');
                
                for (let i = 0; i < subjects.length; i++) {
                    if (subjects[i] && scores[i] && dates[i]) {
                        const score = parseFloat(scores[i]);
                        if (!isNaN(score) && score >= 0 && score <= 100) {
                            updateData.academicHistory.push({
                                subject: subjects[i],
                                score: score,
                                date: new Date(dates[i])
                            });
                        }
                    }
                }
                
                // Process weekly contributions
                const weeks = formData.getAll('weeklyWeek[]');
                const hours = formData.getAll('weeklyHours[]');
                
                for (let i = 0; i < weeks.length; i++) {
                    if (weeks[i] && hours[i]) {
                        const hoursStudied = parseFloat(hours[i]);
                        if (!isNaN(hoursStudied) && hoursStudied >= 0) {
                            updateData.weeklyStudyContributions.push({
                                week: weeks[i],
                                hoursStudied: hoursStudied
                            });
                        }
                    }
                }
                
                // Send update request
                const response = await fetch(`/api/players/${playerId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showSuccess('Player updated successfully!');
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('updatePlayerModal'));
                    modal.hide();
                    // Reload page to show updated data
                    window.location.reload();
                } else {
                    showError('Failed to update player: ' + result.error);
                }
                
            } catch (error) {
                console.error('Error updating player:', error);
                showError('Failed to update player');
            }
        });
    }
});

// Utility functions for showing messages
function showSuccess(message) {
    // Create and show success alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function showError(message) {
    // Create and show error alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}
