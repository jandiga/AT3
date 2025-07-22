/**
 * Dashboard JavaScript functionality for player management
 * Handles player profile updates, academic history management, and modal interactions
 */

// Global counter for tracking dynamic academic entry forms
let academicEntryCounter = 0;

/**
 * Displays the update player modal with pre-populated player data
 * @param {string} playerId - Unique identifier for the player
 * @param {string} playerName - Display name of the player
 */
async function showUpdatePlayerModal(playerId, playerName) {
    try {
        // Fetch comprehensive player details from the API
        const playerDataResponse = await fetch(`/api/players/${playerId}`);
        const playerApiData = await playerDataResponse.json();

        // Validate API response before proceeding
        if (!playerApiData.success) {
            showError('Failed to load player details: ' + playerApiData.error);
            return;
        }

        const playerInformation = playerApiData.player;

        // Populate modal form fields with player data
        document.getElementById('updatePlayerId').value = playerId;
        document.getElementById('updatePlayerName').value = playerInformation.name;

        // Reset and populate academic history section
        const academicHistoryContainer = document.getElementById('updateAcademicHistory');
        academicHistoryContainer.innerHTML = '';
        academicEntryCounter = 0;

        // Add existing academic entries to the form
        if (playerInformation.academicHistory && playerInformation.academicHistory.length > 0) {
            playerInformation.academicHistory.forEach(academicEntry => {
                // Only add entries with valid score data
                if (academicEntry.score !== null && academicEntry.score !== undefined) {
                    addUpdateAcademicEntry(academicEntry.subject, academicEntry.score, academicEntry.date);
                }
            });
        }

        // Display the modal to the user
        const updatePlayerModal = new bootstrap.Modal(document.getElementById('updatePlayerModal'));
        updatePlayerModal.show();

    } catch (errorObject) {
        console.error('Error loading player details:', errorObject);
        showError('Failed to load player details');
    }
}

/**
 * Creates and adds a new academic entry form row to the update modal
 * @param {string} subject - Academic subject name (default: empty)
 * @param {string} score - Academic score value (default: empty)
 * @param {string} date - Date of the academic entry (default: empty)
 */
function addUpdateAcademicEntry(subject = '', score = '', date = '') {
    // Increment counter for unique element identification
    academicEntryCounter++;
    const academicHistoryContainer = document.getElementById('updateAcademicHistory');

    // Create new form row element
    const academicEntryRow = document.createElement('div');
    academicEntryRow.className = 'row mb-2';
    academicEntryRow.id = `updateAcademicEntry${academicEntryCounter}`;

    // Format date for HTML date input (YYYY-MM-DD format)
    const formattedDate = date ? new Date(date).toISOString().split('T')[0] : '';

    // Build form row HTML with input fields and remove button
    academicEntryRow.innerHTML = `
        <div class="col-md-4">
            <input type="text" class="form-control" name="academicSubject[]"
                   placeholder="Subject" value="${subject}" required>
        </div>
        <div class="col-md-3">
            <input type="number" class="form-control" name="academicScore[]"
                   placeholder="Score" min="0" max="100" value="${score}" required>
        </div>
        <div class="col-md-3">
            <input type="date" class="form-control" name="academicDate[]"
                   value="${formattedDate}" required>
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-sm btn-outline-danger"
                    onclick="removeUpdateAcademicEntry(${academicEntryCounter})">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;

    // Add the new row to the container
    academicHistoryContainer.appendChild(academicEntryRow);
}

/**
 * Removes a specific academic entry form row from the update modal
 * @param {number} entryId - Unique identifier of the entry to remove
 */
function removeUpdateAcademicEntry(entryId) {
    const academicEntryElement = document.getElementById(`updateAcademicEntry${entryId}`);
    if (academicEntryElement) {
        academicEntryElement.remove();
    }
}



/**
 * Initialize dashboard functionality when DOM is fully loaded
 * Sets up event listeners for form submissions and user interactions
 */
document.addEventListener('DOMContentLoaded', function() {
    const playerUpdateForm = document.getElementById('updatePlayerForm');

    // Set up player update form submission handler
    if (playerUpdateForm) {
        playerUpdateForm.addEventListener('submit', async function(submitEvent) {
            // Prevent default form submission behavior
            submitEvent.preventDefault();

            try {
                // Extract form data for processing
                const formDataObject = new FormData(playerUpdateForm);
                const targetPlayerId = formDataObject.get('playerId');

                // Construct update payload with player information
                const playerUpdatePayload = {
                    name: formDataObject.get('name'),
                    academicHistory: []
                };

                // Extract and process academic history arrays
                const academicSubjects = formDataObject.getAll('academicSubject[]');
                const academicScores = formDataObject.getAll('academicScore[]');
                const academicDates = formDataObject.getAll('academicDate[]');

                // Process each academic entry and validate data
                for (let entryIndex = 0; entryIndex < academicSubjects.length; entryIndex++) {
                    const currentSubject = academicSubjects[entryIndex];
                    const currentScore = academicScores[entryIndex];
                    const currentDate = academicDates[entryIndex];

                    // Validate that all fields are present
                    if (currentSubject && currentScore && currentDate) {
                        const numericScore = parseFloat(currentScore);

                        // Validate score is within acceptable range (0-100)
                        if (!isNaN(numericScore) && numericScore >= 0 && numericScore <= 100) {
                            playerUpdatePayload.academicHistory.push({
                                subject: currentSubject,
                                score: numericScore,
                                date: new Date(currentDate)
                            });
                        }
                    }
                }

                // Send update request to the API
                const updateResponse = await fetch(`/api/players/${targetPlayerId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(playerUpdatePayload)
                });

                const updateResult = await updateResponse.json();

                // Handle API response
                if (updateResult.success) {
                    showSuccess('Player updated successfully!');

                    // Close the modal and refresh page data
                    const updateModalInstance = bootstrap.Modal.getInstance(document.getElementById('updatePlayerModal'));
                    updateModalInstance.hide();
                    window.location.reload();
                } else {
                    showError('Failed to update player: ' + updateResult.error);
                }

            } catch (errorObject) {
                console.error('Error updating player:', errorObject);
                showError('Failed to update player');
            }
        });
    }
});

/**
 * Utility functions for user notification display
 * Creates temporary alert messages for success and error states
 */

/**
 * Displays a success notification to the user
 * @param {string} message - Success message to display
 */
function showSuccess(message) {
    // Create success alert element with Bootstrap styling
    const successAlertElement = document.createElement('div');
    successAlertElement.className = 'alert alert-success alert-dismissible fade show position-fixed';

    // Position alert in top-right corner with high z-index
    successAlertElement.style.top = '20px';
    successAlertElement.style.right = '20px';
    successAlertElement.style.zIndex = '9999';

    // Set alert content with message and close button
    successAlertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    // Add alert to page
    document.body.appendChild(successAlertElement);

    // Auto-remove alert after 5 seconds for better UX
    const alertRemovalTimeout = 5000;
    setTimeout(() => {
        if (successAlertElement.parentNode) {
            successAlertElement.remove();
        }
    }, alertRemovalTimeout);
}

/**
 * Displays an error notification to the user
 * @param {string} message - Error message to display
 */
function showError(message) {
    // Create error alert element with Bootstrap styling
    const errorAlertElement = document.createElement('div');
    errorAlertElement.className = 'alert alert-danger alert-dismissible fade show position-fixed';

    // Position alert in top-right corner with high z-index
    errorAlertElement.style.top = '20px';
    errorAlertElement.style.right = '20px';
    errorAlertElement.style.zIndex = '9999';

    // Set alert content with message and close button
    errorAlertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    // Add alert to page
    document.body.appendChild(errorAlertElement);

    // Auto-remove alert after 5 seconds for better UX
    const alertRemovalTimeout = 5000;
    setTimeout(() => {
        if (errorAlertElement.parentNode) {
            errorAlertElement.remove();
        }
    }, alertRemovalTimeout);
}
