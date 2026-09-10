// Dashboard JavaScript
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
                <div class="notification-wrapper">
                    <div class="notification-header">
                        <div class="notification-icon">
                            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
                        </div>
                        <div class="notification-title">${type === 'success' ? 'Success!' : 'Information'}</div>
                        <div class="notification-close" onclick="this.parentElement.parentElement.parentElement.remove()">
                            <i class="fas fa-times"></i>
                        </div>
                    </div>
                    <div class="notification-body">
                        <div class="notification-message">${message}</div>
                    </div>
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
    const userMenuModal = document.getElementById('userMenuModal');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const closeBtn = document.querySelector('.close-button');
    const logoutBtn = document.getElementById('logoutBtn');

    // Check if user is logged in
    const currentUser = JSON.parse(localStorage.getItem('shielded_current_user'));
    
    if (!currentUser) {
        // Redirect to login if not logged in
        NotificationManager.show('Please login to access the dashboard', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    // Update dashboard with user data
    updateDashboardData(currentUser);

    // User menu functionality
    userMenuBtn.addEventListener('click', function() {
        userMenuModal.classList.add('show');
        document.body.style.overflow = 'hidden';
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
    });

    // Logout functionality with notification
    logoutBtn.addEventListener('click', function() {
        // Get user data fresh within this scope
        const userStr = localStorage.getItem('shielded_current_user');
        console.log('Raw user data from localStorage:', userStr);
        
        let username = 'User';
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                console.log('Parsed user data:', userData);
                username = userData.username || userData.id || 'User';
                console.log('Extracted username:', username);
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
        
        localStorage.removeItem('shielded_current_user');
        
        // Show logout notification
        const notification = document.createElement('div');
        notification.className = 'notification notification-success';
        notification.innerHTML = `
            <div class="notification-toast">
                <div class="notification-header">
                    <div class="notification-icon-wrapper">
                        <div class="toast-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    </div>
                    <div class="notification-title-section">
                        <div class="toast-title">Goodbye ${username}!</div>
                    </div>
                    <div class="toast-close" onclick="this.closest('.notification').remove()">
                        <i class="fas fa-times"></i>
                    </div>
                </div>
                <div class="notification-body">
                    <div class="toast-message">Logged out successfully</div>
                </div>
                <div class="notification-progress"></div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Show notification with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Redirect after notification shows
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    });

    // Feature navigation buttons
    document.getElementById('reportedBtn').addEventListener('click', function(e) {
        e.preventDefault();
        // Future: window.location.href = 'reported.html';
    });

    document.getElementById('wellnessBtn').addEventListener('click', function(e) {
        e.preventDefault();
        // Future: window.location.href = 'wellnessed.html';
    });

    document.getElementById('inspireBtn').addEventListener('click', function(e) {
        e.preventDefault();
        // Future: window.location.href = 'inspireed.html';
    });

    document.getElementById('shareBtn').addEventListener('click', function(e) {
        e.preventDefault();
        // Future: window.location.href = 'shared.html';
    });

    // Quick action buttons
    document.getElementById('messageBtn').addEventListener('click', function() {
        window.location.href = 'message.html';
    });

    document.getElementById('reportBtn').addEventListener('click', function() {
        window.location.href = 'contacts.html';
    });

    document.getElementById('resourceBtn').addEventListener('click', function() {
        window.location.href = 'services.html';
    });

    document.getElementById('supportBtn').addEventListener('click', function() {
        window.location.href = 'contacts.html';
    });

    // Update dashboard data function
    function updateDashboardData(user) {
        // Update username displays
        const usernameElements = document.querySelectorAll('#dashboardUsername, #profileName, #menuUsername');
        usernameElements.forEach(element => {
            if (element) element.textContent = user.username;
        });

        // Update email displays
        const emailElements = document.querySelectorAll('#profileEmail, #menuEmail');
        emailElements.forEach(element => {
            if (element) element.textContent = `${user.username}@voiceed.com`;
        });

        // Update login statistics
        const loginStats = JSON.parse(localStorage.getItem('shielded_login_stats') || '{}');
        const loginCount = document.getElementById('loginCount');
        if (loginCount) {
            loginCount.textContent = loginStats[user.username] || 1;
        }

        // Update last login
        const lastLogin = document.getElementById('lastLogin');
        if (lastLogin) {
            const lastLoginTime = loginStats.lastLogin;
            if (lastLoginTime) {
                const loginDate = new Date(lastLoginTime);
                const today = new Date();
                const diffTime = Math.abs(today - loginDate);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) {
                    lastLogin.textContent = 'Today';
                } else if (diffDays === 1) {
                    lastLogin.textContent = 'Yesterday';
                } else if (diffDays < 7) {
                    lastLogin.textContent = `${diffDays} days ago`;
                } else {
                    lastLogin.textContent = loginDate.toLocaleDateString();
                }
            } else {
                lastLogin.textContent = 'Today';
            }
        }

        // Update account age
        const accountAge = document.getElementById('accountAge');
        const memberSince = document.getElementById('memberSince');
        if (accountAge && memberSince) {
            const createdDate = new Date(user.createdAt || Date.now());
            const today = new Date();
            const daysSinceCreation = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
            
            if (daysSinceCreation === 0) {
                accountAge.textContent = 'New';
                memberSince.textContent = 'Today';
            } else if (daysSinceCreation === 1) {
                accountAge.textContent = '1 day';
                memberSince.textContent = 'Yesterday';
            } else if (daysSinceCreation < 30) {
                accountAge.textContent = `${daysSinceCreation} days`;
                memberSince.textContent = `${daysSinceCreation} days ago`;
            } else if (daysSinceCreation < 365) {
                const months = Math.floor(daysSinceCreation / 30);
                accountAge.textContent = `${months} month${months > 1 ? 's' : ''}`;
                memberSince.textContent = `${months} month${months > 1 ? 's' : ''} ago`;
            } else {
                const years = Math.floor(daysSinceCreation / 365);
                accountAge.textContent = `${years} year${years > 1 ? 's' : ''}`;
                memberSince.textContent = `${years} year${years > 1 ? 's' : ''} ago`;
            }
        }

        // Add activity log for login
        addActivityLog('Logged in to your account', 'Just now');
    }

    // Add activity log function
    function addActivityLog(activity, time) {
        const activityList = document.querySelector('.activity-list');
        if (activityList) {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="fas fa-sign-in-alt"></i>
                </div>
                <div class="activity-details">
                    <p class="activity-text">${activity}</p>
                    <p class="activity-time">${time}</p>
                </div>
            `;
            
            // Add to the top of the activity list
            activityList.insertBefore(activityItem, activityList.firstChild);
            
            // Remove last item if there are too many
            const items = activityList.querySelectorAll('.activity-item');
            if (items.length > 5) {
                items[items.length - 1].remove();
            }
        }
    }

    // Profile button functionality
    document.getElementById('profileBtn').addEventListener('click', function() {
        window.location.href = 'profile.html';
    });

    // Header settings button functionality
    document.getElementById('settingsBtn').addEventListener('click', function() {
        const settingsModal = document.getElementById('settingsModal');
        settingsModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    });

    // Settings modal close button
    const settingsCloseBtn = document.querySelector('#settingsModal .close');
    settingsCloseBtn.addEventListener('click', function() {
        const settingsModal = document.getElementById('settingsModal');
        settingsModal.classList.remove('show');
        document.body.style.overflow = 'auto';
    });

    // Close settings modal when clicking outside
    window.addEventListener('click', function(event) {
        const settingsModal = document.getElementById('settingsModal');
        if (event.target === settingsModal) {
            settingsModal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    });

    // Save settings functionality
    const saveSettingsBtn = document.querySelector('.save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function() {
            // Get selected color
            const selectedColor = document.querySelector('input[name="color"]:checked');
            if (selectedColor) {
                localStorage.setItem('shielded_theme_color', selectedColor.value);
                
                // Apply theme class to body
                document.body.className = ''; // Remove existing theme classes
                if (selectedColor.value !== 'blue') {
                    document.body.classList.add(`${selectedColor.value}-theme`);
                }
                
                // Update logo based on selected color
                updateLogo(selectedColor.value);
                
                // Close settings modal
                const settingsModal = document.getElementById('settingsModal');
                setTimeout(() => {
                    settingsModal.classList.remove('show');
                    document.body.style.overflow = 'auto';
                }, 1000);
            }
        });
    }

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
        const logoFile = logoMap[color] || 'finall logo.png';
        logoImages.forEach(img => {
            img.src = logoFile;
        });
    }

    // Load saved settings
    const savedColor = localStorage.getItem('shielded_theme_color');
    console.log('Loading theme:', savedColor); // Debug line
    
    if (savedColor) {
        const colorRadio = document.querySelector(`input[name="color"][value="${savedColor}"]`);
        if (colorRadio) {
            colorRadio.checked = true;
        }
        
        // Apply saved theme class to body
        document.body.className = ''; // Remove existing theme classes
        if (savedColor !== 'blue') {
            document.body.classList.add(`${savedColor}-theme`);
        }
        
        // Update logo based on saved color
        updateLogo(savedColor);
        console.log('Applied theme:', savedColor); // Debug line
    } else {
        console.log('No saved theme found, using default blue'); // Debug line
        updateLogo('blue');
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Escape to close modals
        if (e.key === 'Escape') {
            if (userMenuModal.classList.contains('show')) {
                userMenuModal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
            
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal.classList.contains('show')) {
                settingsModal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        }
    });

    // Sidebar Profile Actions
    const editProfileBtn = document.getElementById('editProfileBtn');
    const sidebarSettingsBtn = document.querySelector('.sidebar-widget .profile-actions #settingsBtn');
    
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            window.location.href = 'Profile.html';
        });
    }
    
    if (sidebarSettingsBtn) {
        sidebarSettingsBtn.addEventListener('click', function() {
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) {
                settingsModal.classList.add('show');
                document.body.style.overflow = 'hidden';
            } else {
                // Fallback notification if modal doesn't exist
                const notification = document.createElement('div');
                notification.className = 'notification notification-success';
                notification.innerHTML = `
                    <div class="notification-toast">
                        <div class="notification-header">
                            <div class="notification-icon-wrapper">
                                <div class="toast-icon">
                                    <i class="fas fa-info-circle"></i>
                                </div>
                            </div>
                            <div class="notification-title-section">
                                <div class="toast-title">Settings</div>
                            </div>
                            <div class="toast-close" onclick="this.closest('.notification').remove()">
                                <i class="fas fa-times"></i>
                            </div>
                        </div>
                        <div class="notification-body">
                            <div class="toast-message">Settings feature coming soon!</div>
                        </div>
                        <div class="notification-progress"></div>
                    </div>
                `;
                document.body.appendChild(notification);
                setTimeout(() => notification.classList.add('show'), 100);
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => notification.remove(), 300);
                }, 3000);
            }
        });
    }
});
