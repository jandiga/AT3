document.addEventListener('DOMContentLoaded', function() {
    const playerForm = document.getElementById('playerForm');
    const alertMessage = document.getElementById('alertMessage');

    playerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(playerForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/players/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                showAlert('Player created successfully!', 'success');
                playerForm.reset();
            } else {
                showAlert(result.error || 'Failed to create player', 'danger');
            }
        } catch (error) {
            showAlert('An error occurred while creating the player', 'danger');
        }
    });

    function showAlert(message, type) {
        alertMessage.textContent = message;
        alertMessage.className = `alert alert-${type} mt-3`;
        alertMessage.style.display = 'block';

        setTimeout(() => {
            alertMessage.style.display = 'none';
        }, 5000);
    }
});