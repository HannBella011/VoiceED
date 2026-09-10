// Registration page JavaScript
document.addEventListener('DOMContentLoaded', function() {
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
                <div class="notification-header">
                    <span class="notification-title">${type === 'success' ? 'Success!' : 'Information'}</span>
                    <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
                </div>
                <div class="notification-body">${message}</div>
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
    
    // Update days based on month and year selection
    function updateDays() {
        const month = parseInt(document.getElementById('birthMonth').value);
        const year = parseInt(document.getElementById('birthYear').value);
        const currentDay = parseInt(daySelect.value);
        
        let daysInMonth = 31;
        
        if (month && year) {
            // Calculate days in month
            switch (month) {
                case 4: case 6: case 9: case 11:
                    daysInMonth = 30;
                    break;
                case 2:
                    // Check for leap year
                    daysInMonth = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0) ? 29 : 28;
                    break;
            }
        } else if (month) {
            // If only month is selected
            switch (month) {
                case 4: case 6: case 9: case 11:
                    daysInMonth = 30;
                    break;
                case 2:
                    daysInMonth = 28; // Default to 28, will be updated when year is selected
                    break;
            }
        }
        
        // Clear existing options
        daySelect.innerHTML = '<option value="">Day</option>';
        
        // Add new options
        for (let day = 1; day <= daysInMonth; day++) {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = day;
            daySelect.appendChild(option);
        }
        
        // Restore previous selection if it's still valid
        if (currentDay && currentDay <= daysInMonth) {
            daySelect.value = currentDay;
        }
    }
    
    // Add event listeners
    document.getElementById('birthMonth').addEventListener('change', updateDays);
    document.getElementById('birthYear').addEventListener('change', updateDays);
    
    // Form validation
    const registerForm = document.getElementById('registerForm');
    
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const month = document.getElementById('birthMonth').value;
        const day = document.getElementById('birthDay').value;
        const year = document.getElementById('birthYear').value;
        const gender = document.querySelector('input[name="gender"]:checked');
        
        // Validate username
        if (username.length < 3) {
            NotificationManager.show('Username must be at least 3 characters long', 'error');
            return;
        }
        
        if (username.length > 20) {
            NotificationManager.show('Username must be no more than 20 characters long', 'error');
            return;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            NotificationManager.show('Username can only contain letters, numbers, and underscores', 'error');
            return;
        }
        
        if (/^[0-9]/.test(username)) {
            NotificationManager.show('Username cannot start with a number', 'error');
            return;
        }
        
        // Validate password
        if (password.length < 8) {
            NotificationManager.show('Password must be at least 8 characters long', 'error');
            return;
        }
        
        // Validate birthday
        if (!month || !day || !year) {
            NotificationManager.show('Please select your complete birthday', 'error');
            return;
        }
        
        // Validate age (must be at least 13 years old)
        const birthDate = new Date(year, month - 1, day);
        const today = new Date();
        const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        
        if (age < 13) {
            NotificationManager.show('You must be at least 13 years old to register', 'error');
            return;
        }
        
        // Validate gender
        if (!gender) {
            NotificationManager.show('Please select your gender', 'error');
            return;
        }
        
        // Store registration data in localStorage
        let users = JSON.parse(localStorage.getItem('shielded_users') || '[]');
        
        // Check if username already exists
        if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
            NotificationManager.show('Username already exists. Please choose a different one.', 'error');
            return;
        }
        
        // Add new user
        const newUser = {
            id: Date.now(),
            username: username,
            password: password, // In production, this should be hashed
            birthday: `${month}/${day}/${year}`,
            gender: gender.value,
            createdAt: new Date().toISOString()
        };
        
        users.unshift(newUser);
        localStorage.setItem('shielded_users', JSON.stringify(users));
        
        // Show success notification with welcome message
        NotificationManager.show(`Registration successful! Welcome ${username}! Please login to continue.`, 'success');
        
        // Clear form
        registerForm.reset();
        
        // Redirect to login page after 3 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    });
    
    // Password strength indicator
    const passwordInput = document.getElementById('password');
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        
        // You can add a visual strength indicator here if needed
    });
    
    // Helper functions
    function showError(message) {
        // Remove any existing error messages
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            background: rgba(255, 68, 68, 0.1);
            border: 1px solid rgba(255, 68, 68, 0.3);
            color: #ff4444;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 1rem;
            text-align: center;
            font-size: 0.9rem;
        `;
        
        // Insert before the form
        registerForm.parentNode.insertBefore(errorDiv, registerForm);
        
        // Remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    function showSuccess(message) {
        // Remove any existing messages
        const existingMessages = document.querySelectorAll('.error-message, .success-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            background: rgba(0, 255, 68, 0.1);
            border: 1px solid rgba(0, 255, 68, 0.3);
            color: #00ff44;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 1rem;
            text-align: center;
            font-size: 0.9rem;
        `;
        
        // Insert before the form
        registerForm.parentNode.insertBefore(successDiv, registerForm);
    }
});
