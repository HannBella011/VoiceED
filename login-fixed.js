// Login page JavaScript - Fixed version
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
    const loginModal = document.getElementById('loginModal');
    const loginBtn = document.getElementById('loginBtn');
    const closeBtn = document.querySelector('.close-button');
    const loginForm = document.getElementById('loginForm');

    // Login button functionality is now handled by user-menu.js

    // Close login modal
    closeBtn.addEventListener('click', function() {
        loginModal.classList.remove('show');
        document.body.style.overflow = 'auto'; // Restore background scroll
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === loginModal) {
            loginModal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    });

    // Handle login form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Validate inputs
        if (!username || !password) {
            NotificationManager.show('Please enter both username and password', 'error');
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
        
        // Check password (in production, this should be properly hashed)
        if (user.password !== password) {
            NotificationManager.show('Incorrect password. Please try again.', 'error');
            return;
        }
        
        // Login successful!
        NotificationManager.show(`Welcome to VoiceED, ${user.username}!`, 'success');
        
        // Store current user session - FIXED KEY
        const currentUser = {
            id: user.id,
            username: user.username,
            gender: user.gender,
            birthday: user.birthday,
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('shielded_current_user', JSON.stringify(currentUser));
        
        // Update login statistics
        let loginStats = JSON.parse(localStorage.getItem('shielded_login_stats') || '{}');
        loginStats[username] = (loginStats[username] || 0) + 1;
        loginStats.lastLogin = new Date().toISOString();
        localStorage.setItem('shielded_login_stats', JSON.stringify(loginStats));
        
        // Update UI if logged in
        updateLoginUI(currentUser);
        
        // Close modal and reset form
        setTimeout(() => {
            loginModal.classList.remove('show');
            document.body.style.overflow = 'auto';
            loginForm.reset();
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        },2000);
    });
    
    // Function to update login UI
    function updateLoginUI(user) {
        if (loginBtn) {
            loginBtn.textContent = user.username;
            loginBtn.classList.add('logged-in');
            loginBtn.onclick = function(e) {
                e.preventDefault();
                // Show user menu or logout
                showUserMenu();
            };
        }
    }
    
    // Function to show user menu
    function showUserMenu() {
        const currentUser = JSON.parse(localStorage.getItem('shielded_current_user'));
        if (currentUser) {
            // Check if user menu modal exists
            const userMenuModal = document.getElementById('userMenuModal');
            if (userMenuModal) {
                // Update user info in modal
                const menuUsername = document.getElementById('menuUsername');
                const menuEmail = document.getElementById('menuEmail');
                
                if (menuUsername) menuUsername.textContent = currentUser.username;
                if (menuEmail) menuEmail.textContent = `${currentUser.username}@voiceed.com`;
                
                // Show modal
                userMenuModal.classList.add('show');
                document.body.style.overflow = 'hidden';
                
                // Setup close functionality
                const closeBtn = userMenuModal.querySelector('.close-button');
                const logoutBtn = document.getElementById('logoutBtn');
                
                // Close modal
                const closeModal = () => {
                    userMenuModal.classList.remove('show');
                    document.body.style.overflow = 'auto';
                };
                
                if (closeBtn) {
                    closeBtn.onclick = closeModal;
                }
                
                // Click outside to close
                window.addEventListener('click', function outsideClick(e) {
                    if (e.target === userMenuModal) {
                        closeModal();
                        window.removeEventListener('click', outsideClick);
                    }
                });
                
                                
                // Profile button functionality
                const profileBtn = document.getElementById('profileBtn');
                if (profileBtn) {
                    profileBtn.onclick = () => {
                        closeModal();
                        window.location.href = 'dashboard.html';
                    };
                }

                                
                // Escape key to close
                document.addEventListener('keydown', function escapeKey(e) {
                    if (e.key === 'Escape') {
                        closeModal();
                        document.removeEventListener('keydown', escapeKey);
                    }
                });
            } else {
                // Fallback to confirm dialog if modal doesn't exist
                const logout = confirm(`Logged in as ${currentUser.username}\n\nDo you want to logout?`);
                if (logout) {
                    // Get username before clearing localStorage
                    const username = currentUser ? currentUser.username : 'User';
                    
                    localStorage.removeItem('shielded_current_user');
                    
                    if (loginBtn) {
                        loginBtn.innerHTML = '<i class="fas fa-user"></i>';
                        loginBtn.classList.remove('logged-in');
                        loginBtn.onclick = null;
                        
                        // Login button functionality is now handled by user-menu.js
                    }
                    
                    NotificationManager.show(`Goodbye ${username}!`, 'success');
                }
            }
        }
    }
    
    // Check if user is already logged in on page load
    const currentUser = JSON.parse(localStorage.getItem('shielded_current_user'));
    if (currentUser) {
        updateLoginUI(currentUser);
        if (window.location.pathname.includes('index.html')) {
            updateDashboard(currentUser);
        }
    }
    
    // Check if login modal should be shown automatically
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showLogin') === 'true') {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            // Remove the parameter from URL to prevent showing again on refresh
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }
    
    // Function to update dashboard
    function updateDashboard(user) {
        // Update profile username
        const profileUsername = document.getElementById('profileUsername');
        if (profileUsername) {
            profileUsername.textContent = user.username;
        }
        
        // Update profile email (remove or update as needed)
        const profileEmail = document.getElementById('profileEmail');
        if (profileEmail) {
            profileEmail.textContent = `${user.username}@voiceed.com`;
        }
        
        // Update login count
        const loginStats = JSON.parse(localStorage.getItem('shielded_login_stats') || '{}');
        const loginCount = document.getElementById('loginCount');
        if (loginCount) {
            loginCount.textContent = loginStats[user.username] || 1;
        }
        
        // Update last login
        const lastLogin = document.getElementById('lastLogin');
        if (lastLogin) {
            lastLogin.textContent = 'Today';
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
    }
});

// Settings functionality for all pages
function initializeSettings() {
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

    // Load saved settings on page load
    const savedColor = localStorage.getItem('shielded_theme_color');
    console.log('Loading theme on page load:', savedColor);
    
    if (savedColor) {
        const colorRadio = document.querySelector(`input[name="color"][value="${savedColor}"]`);
        if (colorRadio) {
            colorRadio.checked = true;
        }
        
        // Apply saved theme class to body
        document.body.className = '';
        if (savedColor !== 'blue') {
            document.body.classList.add(`${savedColor}-theme`);
        }
        
        // Update logo based on saved color
        updateLogo(savedColor);
        console.log('Applied theme on page load:', savedColor);
    } else {
        console.log('No saved theme found, using default blue');
        updateLogo('blue');
    }
    
    // Settings button functionality
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsBtn2 = document.getElementById('settingsBtn2');
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) {
                settingsModal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        });
    }
    
    if (settingsBtn2) {
        settingsBtn2.addEventListener('click', function() {
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) {
                settingsModal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        });
    }
    
    // Close settings modal
    const settingsCloseBtn = document.querySelector('#settingsModal .close');
    if (settingsCloseBtn) {
        settingsCloseBtn.addEventListener('click', function() {
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) {
                settingsModal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        });
    }
    
    // Close settings modal when clicking outside
    window.addEventListener('click', function(event) {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal && event.target === settingsModal) {
            settingsModal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    });
    
    // Save settings functionality
    const saveSettingsBtn = document.querySelector('.save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function() {
            const selectedColor = document.querySelector('input[name="color"]:checked');
            if (selectedColor) {
                localStorage.setItem('shielded_theme_color', selectedColor.value);
                console.log('Saved theme:', selectedColor.value);
                
                // Apply theme class to body
                document.body.className = '';
                if (selectedColor.value !== 'blue') {
                    document.body.classList.add(`${selectedColor.value}-theme`);
                }
                
                // Update logo based on selected color
                updateLogo(selectedColor.value);
                
                // Close settings modal
                const settingsModal = document.getElementById('settingsModal');
                if (settingsModal) {
                    setTimeout(() => {
                        settingsModal.classList.remove('show');
                        document.body.style.overflow = 'auto';
                    }, 1000);
                }
            }
        });
    }
    
    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal && settingsModal.classList.contains('show')) {
                settingsModal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        }
    });
}

// Initialize settings when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSettings);
} else {
    initializeSettings();
}
