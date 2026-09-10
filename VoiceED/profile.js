// Profile page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Notification System
    class NotificationManager {
        static show(message, type = 'success', useMessageAsTitle = false) {
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
                    <div class="toast-title">${useMessageAsTitle ? message : (type === 'success' ? 'Success!' : 'Information')}</div>
                    <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
                    <div class="toast-message">${useMessageAsTitle ? 'Logged out successfully' : message}</div>
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

    // Check if user is logged in
    const currentUser = JSON.parse(localStorage.getItem('shielded_current_user'));
    
    if (!currentUser) {
        // Redirect to login if not logged in
        NotificationManager.show('Please login to view your profile', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    // Update profile data
    updateProfileData(currentUser);

    // Get DOM elements
    const userMenuModal = document.getElementById('userMenuModal');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const closeBtn = document.querySelector('.close-button');
    const settingsModal = document.getElementById('settingsModal');
    const settingsBtn = document.getElementById('settingsBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // User menu functionality - check login state first
    userMenuBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Check if user is logged in
        const currentUser = JSON.parse(localStorage.getItem('shielded_current_user'));
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        
        if (currentUser && isLoggedIn) {
            // User is logged in - show user menu
            userMenuModal.classList.add('show');
            document.body.style.overflow = 'hidden';
        } else {
            // User is not logged in - show login modal
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                loginModal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        }
    });

    // Close user menu
    closeBtn.addEventListener('click', function() {
        userMenuModal.classList.remove('show');
        document.body.style.overflow = 'auto';
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === userMenuModal) {
            userMenuModal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
        if (event.target === settingsModal) {
            settingsModal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    });

    // Settings modal functionality
    settingsBtn.addEventListener('click', function() {
        settingsModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    });

    // Close settings modal
    const settingsCloseBtn = settingsModal.querySelector('.close-button');
    settingsCloseBtn.addEventListener('click', function() {
        settingsModal.classList.remove('show');
        document.body.style.overflow = 'auto';
    });

    // Logout functionality
    logoutBtn.addEventListener('click', function() {
        const currentUser = JSON.parse(localStorage.getItem('shielded_current_user'));
        const username = currentUser ? currentUser.username : 'User';
        
        // Show notification before clearing localStorage
        NotificationManager.show(`Goodbye ${username}!`, 'success', true);
        
        localStorage.removeItem('shielded_current_user');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    });

    // Action buttons functionality
    document.getElementById('editProfileBtn').addEventListener('click', function() {
        NotificationManager.show('Edit profile feature coming soon!', 'success');
    });

    document.getElementById('securityBtn').addEventListener('click', function() {
        NotificationManager.show('Security settings coming soon!', 'success');
    });

    document.getElementById('privacyBtn').addEventListener('click', function() {
        NotificationManager.show('Privacy settings coming soon!', 'success');
    });

    // Update profile data function
    function updateProfileData(user) {
        // Update username displays
        const usernameElements = document.querySelectorAll('#profileUsername, #infoUsername, #menuUsername');
        usernameElements.forEach(element => {
            if (element) element.textContent = user.username;
        });

        // Update email displays
        const emailElements = document.querySelectorAll('#profileEmail, #infoEmail, #menuEmail');
        emailElements.forEach(element => {
            if (element) element.textContent = `${user.username}@voiceed.com`;
        });

        // Update birthday
        const birthdayElements = document.querySelectorAll('#infoBirthday');
        birthdayElements.forEach(element => {
            if (element && user.birthday) {
                element.textContent = user.birthday;
            }
        });

        // Update gender
        const genderElements = document.querySelectorAll('#infoGender');
        genderElements.forEach(element => {
            if (element && user.gender) {
                element.textContent = user.gender.charAt(0).toUpperCase() + user.gender.slice(1);
            }
        });

        // Update login statistics
        const loginStats = JSON.parse(localStorage.getItem('shielded_login_stats') || '{}');
        const loginCountElements = document.querySelectorAll('#statLoginCount');
        loginCountElements.forEach(element => {
            if (element) element.textContent = loginStats[user.username] || 1;
        });

        // Update last login
        const lastLoginElements = document.querySelectorAll('#statLastLogin');
        lastLoginElements.forEach(element => {
            if (element) {
                const lastLoginTime = loginStats.lastLogin;
                if (lastLoginTime) {
                    const loginDate = new Date(lastLoginTime);
                    const today = new Date();
                    const diffTime = Math.abs(today - loginDate);
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays === 0) {
                        element.textContent = 'Today';
                    } else if (diffDays === 1) {
                        element.textContent = 'Yesterday';
                    } else if (diffDays < 7) {
                        element.textContent = `${diffDays} days ago`;
                    } else {
                        element.textContent = loginDate.toLocaleDateString();
                    }
                } else {
                    element.textContent = 'Today';
                }
            }
        });

        // Update account age
        const accountAgeElements = document.querySelectorAll('#statAccountAge');
        const memberSinceElements = document.querySelectorAll('#memberSince, #infoMemberSince');
        
        if (accountAgeElements.length > 0 && memberSinceElements.length > 0) {
            const createdDate = new Date(user.createdAt || Date.now());
            const today = new Date();
            const daysSinceCreation = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
            
            let ageText = 'New';
            let sinceText = 'Today';
            
            if (daysSinceCreation === 0) {
                ageText = 'New';
                sinceText = 'Today';
            } else if (daysSinceCreation === 1) {
                ageText = '1 day';
                sinceText = 'Yesterday';
            } else if (daysSinceCreation < 30) {
                ageText = `${daysSinceCreation} days`;
                sinceText = `${daysSinceCreation} days ago`;
            } else if (daysSinceCreation < 365) {
                const months = Math.floor(daysSinceCreation / 30);
                ageText = `${months} month${months > 1 ? 's' : ''}`;
                sinceText = `${months} month${months > 1 ? 's' : ''} ago`;
            } else {
                const years = Math.floor(daysSinceCreation / 365);
                ageText = `${years} year${years > 1 ? 's' : ''}`;
                sinceText = `${years} year${years > 1 ? 's' : ''} ago`;
            }
            
            accountAgeElements.forEach(element => {
                if (element) element.textContent = ageText;
            });
            
            memberSinceElements.forEach(element => {
                if (element) element.textContent = sinceText;
            });
        }
    }

    // Settings functionality
    const saveSettingsBtn = document.querySelector('.save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function() {
            // Get selected color
            const selectedColor = document.querySelector('input[name="color"]:checked');
            if (selectedColor) {
                localStorage.setItem('shielded_theme_color', selectedColor.value);
                NotificationManager.show('Settings saved successfully!', 'success');
            }
        });
    }

    // Load saved settings
    const savedColor = localStorage.getItem('shielded_theme_color');
    if (savedColor) {
        const colorRadio = document.querySelector(`input[name="color"][value="${savedColor}"]`);
        if (colorRadio) {
            colorRadio.checked = true;
        }
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Escape to close modals
        if (e.key === 'Escape') {
            if (userMenuModal.classList.contains('show')) {
                userMenuModal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
            if (settingsModal.classList.contains('show')) {
                settingsModal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        }
    });
});
