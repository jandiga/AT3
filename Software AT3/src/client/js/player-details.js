/**
 * Player Details Form Handler
 * Manages player creation form submission and user feedback
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get references to form elements
    const playerCreationForm = document.getElementById('playerForm');
    const alertMessageContainer = document.getElementById('alertMessage');

    // Validate that required elements exist
    if (!playerCreationForm) {
        console.error('Player form not found on page');
        return;
    }

    /**
     * Handles player creation form submission
     * Prevents default form submission and sends data via API
     */
    playerCreationForm.addEventListener('submit', async function(formSubmissionEvent) {
        // Prevent default form submission behavior
        formSubmissionEvent.preventDefault();

        // Extract form data and convert to object
        const playerFormData = new FormData(playerCreationForm);
        const playerDataObject = Object.fromEntries(playerFormData.entries());

        try {
            // Send player creation request to API
            const playerCreationResponse = await fetch('/api/players/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(playerDataObject)
            });

            const creationResult = await playerCreationResponse.json();

            // Handle API response
            if (creationResult.success) {
                displayUserAlert('Player created successfully!', 'success');
                playerCreationForm.reset(); // Clear form after successful creation
            } else {
                const errorMessage = creationResult.error || 'Failed to create player';
                displayUserAlert(errorMessage, 'danger');
            }
        } catch (networkError) {
            console.error('Network error during player creation:', networkError);
            displayUserAlert('An error occurred while creating the player', 'danger');
        }
    });

    /**
     * Displays an alert message to the user
     * @param {string} alertMessage - Message to display
     * @param {string} alertType - Bootstrap alert type (success, danger, warning, info)
     */
    function displayUserAlert(alertMessage, alertType) {
        // Validate alert container exists
        if (!alertMessageContainer) {
            console.error('Alert message container not found');
            return;
        }

        // Set alert content and styling
        alertMessageContainer.textContent = alertMessage;
        alertMessageContainer.className = `alert alert-${alertType} mt-3`;
        alertMessageContainer.style.display = 'block';

        // Auto-hide alert after 5 seconds for better UX
        const alertDisplayDuration = 5000;
        setTimeout(() => {
            alertMessageContainer.style.display = 'none';
        }, alertDisplayDuration);
    }
});