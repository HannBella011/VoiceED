// Forgot Password JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Logo mapping for color themes
    const logoMap = {
        'blue': 'logo for blue.png',
        'purple': 'logo for violet.png',
        'red': 'logo for red.png',
        'green': 'logo for green.png',
        'orange': 'logo for orange.png',
        'pink': 'logo for pink.png'
    };

    // Function to update logo based on color
    function updateLogo(color) {
        const logoImages = document.querySelectorAll('.logo img');
        const logoFile = logoMap[color] || 'logo for blue.png';
        logoImages.forEach(img => {
            img.src = logoFile;
        });
    }

    // Load saved settings
    const savedColor = localStorage.getItem('shielded_theme_color');
    if (savedColor) {
        updateLogo(savedColor);
    } else {
        updateLogo('blue');
    }

    // Notification System
    class NotificationManager {
        static show(message, type = 'success') {
            // Remove existing notifications
            const existing = document.querySelector('.notification');
            if (existing) {
                existing.remove();
            }

            // Create notification element
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <div class="notification-toast">
                    <div class="notification-header">
                        <div class="notification-icon-wrapper">
                            <div class="toast-icon">
                                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
                            </div>
                        </div>
                        <div class="notification-title-section">
                            <div class="toast-title">${type === 'success' ? 'Success!' : 'Information'}</div>
                        </div>
                        <div class="toast-close" onclick="this.closest('.notification').remove()">
                            <i class="fas fa-times"></i>
                        </div>
                    </div>
                    <div class="notification-body">
                        <div class="toast-message">${message}</div>
                    </div>
                    <div class="notification-progress"></div>
                </div>
            `;

            document.body.appendChild(notification);

            // Show notification with animation
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);

            // Auto-hide after 5 seconds
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 5000);
        }
    }

    // Get DOM elements
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const usernameInput = document.getElementById('username');
    const birthMonthInput = document.getElementById('birthMonth');
    const birthDayInput = document.getElementById('birthDay');
    const birthYearInput = document.getElementById('birthYear');
    const passwordModal = document.getElementById('passwordModal');
    const displayPassword = document.getElementById('displayPassword');
    const passwordModalClose = passwordModal.querySelector('.close-button');

    // Handle forgot password form submission
    forgotPasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const birthMonth = birthMonthInput.value;
        const birthDay = birthDayInput.value;
        const birthYear = birthYearInput.value;
        
        // Validate inputs
        if (!username) {
            NotificationManager.show('Please enter your username', 'error');
            return;
        }
        
        if (!birthMonth || !birthDay || !birthYear) {
            NotificationManager.show('Please select your complete birthday', 'error');
            return;
        }
        
        // Get users from localStorage
        const users = JSON.parse(localStorage.getItem('shielded_users') || '[]');
        
        // Find user by username
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        
        if (!user) {
            NotificationManager.show('Username not found. Please check your username or register for an account.', 'error');
            return;
        }
        
        // Verify birthday
        const userBirthday = user.birthday; // Format: "month/day/year"
        const enteredBirthday = `${birthMonth}/${birthDay}/${birthYear}`;
        
        if (userBirthday !== enteredBirthday) {
            NotificationManager.show('Birthday does not match our records. Please try again.', 'error');
            return;
        }
        
        // Birthday matches - show password in modal
        displayPassword.textContent = user.password;
        passwordModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    });

    // Close password modal
    passwordModalClose.addEventListener('click', function() {
        passwordModal.classList.remove('show');
        document.body.style.overflow = 'auto';
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === passwordModal) {
            passwordModal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    });
});
