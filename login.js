// Login page JavaScript
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
                    <div class="toast-icon">
                        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
                    </div>
                    <div class="toast-content">
                        <div class="toast-title">${type === 'success' ? 'Success!' : 'Information'}</div>
                        <div class="toast-message">${message}</div>
                    </div>
                    <div class="toast-close" onclick="this.parentElement.remove()">
                        <i class="fas fa-times"></i>
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
    const loginModal = document.getElementById('loginModal');
    const loginBtn = document.getElementById('loginBtn');
    const closeBtn = document.querySelector('.close-button');
    const loginForm = document.getElementById('loginForm');

    // Open login modal - check login state first
    loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Check if user is already logged in
        const currentUser = JSON.parse(localStorage.getItem('shielded_current_user'));
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        
        if (!currentUser || !isLoggedIn) {
            // User is not logged in - show login modal
            loginModal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevent background scroll
        }
        // If user is logged in, do nothing - user-menu.js will handle the user menu
    });

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
        NotificationManager.show(`Welcome to VoiceED!`, 'success');
        
        // Store current user session
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
        }, 2000);
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
        if (accountAge) {
            const createdDate = new Date(user.createdAt || Date.now());
            const today = new Date();
            const daysSinceCreation = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
            
            if (daysSinceCreation === 0) {
                accountAge.textContent = 'New';
            } else if (daysSinceCreation === 1) {
                accountAge.textContent = '1 day';
            } else if (daysSinceCreation < 30) {
                accountAge.textContent = `${daysSinceCreation} days`;
            } else if (daysSinceCreation < 365) {
                const months = Math.floor(daysSinceCreation / 30);
                accountAge.textContent = `${months} month${months > 1 ? 's' : ''}`;
            } else {
                const years = Math.floor(daysSinceCreation / 365);
                accountAge.textContent = `${years} year${years > 1 ? 's' : ''}`;
            }
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
                
                // Logout functionality
                if (logoutBtn) {
                    logoutBtn.onclick = () => {
                        const currentUser = JSON.parse(localStorage.getItem('shielded_current_user'));
                        const username = currentUser ? currentUser.username : 'User';
                        
                        // Show notification before clearing localStorage
                        NotificationManager.show(`Goodbye ${username}!`, 'success');
                        
                        localStorage.removeItem('shielded_current_user');
                        
                        // Reset UI
                        if (loginBtn) {
                            loginBtn.innerHTML = '<i class="fas fa-user"></i>';
                            loginBtn.classList.remove('logged-in');
                            loginBtn.onclick = null;
                            
                            // Login button functionality is now handled by user-menu.js
                        }
                        closeModal();
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 1000);
                    };
                }
                
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
                    localStorage.removeItem('shielded_current_user');
                    
                    if (loginBtn) {
                        loginBtn.innerHTML = '<i class="fas fa-user"></i>';
                        loginBtn.classList.remove('logged-in');
                        loginBtn.onclick = null;
                        
                        // Login button functionality is now handled by user-menu.js
                    }
                    
                    NotificationManager.show('Logged out successfully', 'success');
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
});

// Settings functionality for all pages
function initializeSettings() {
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
        console.log('Applied theme on page load:', savedColor);
    } else {
        console.log('No saved theme found, using default blue');
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

// Inject toast notification styles immediately
const toastStyles = `
<style>
/* Toast Notification Styles */
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    transform: translateX(400px);
    transition: all 0.3s ease;
    max-width: 380px;
}

.notification.show {
    transform: translateX(0);
}

.notification-toast {
    background: linear-gradient(135deg, #ffffff, #f8f9fa);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border-left: 4px solid #00d4ff;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    position: relative;
    overflow: hidden;
}

.toast-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00d4ff, #0099ff);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 10px rgba(0, 212, 255, 0.3);
}

.toast-icon i {
    color: white;
    font-size: 1rem;
}

.toast-content {
    flex: 1;
    min-width: 0;
}

.toast-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #00d4ff;
    margin: 0 0 0.25rem 0;
}

.toast-message {
    font-size: 0.85rem;
    color: #555;
    line-height: 1.4;
    margin: 0;
}

.toast-close {
    background: none;
    border: none;
    color: #999;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0.3rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
}

.toast-close:hover {
    background: rgba(0, 0, 0, 0.1);
    color: #00d4ff;
    transform: scale(1.1);
}

/* Theme-based toast colors */
body.pink-theme .notification-toast {
    border-left-color: #ff66cc;
}

body.pink-theme .toast-icon {
    background: linear-gradient(135deg, #ff66cc, #ff99ff);
    box-shadow: 0 2px 10px rgba(255, 102, 204, 0.3);
}

body.pink-theme .toast-title {
    color: #ff66cc;
}

body.purple-theme .notification-toast {
    border-left-color: #9933ff;
}

body.purple-theme .toast-icon {
    background: linear-gradient(135deg, #9933ff, #cc66ff);
    box-shadow: 0 2px 10px rgba(153, 51, 255, 0.3);
}

body.purple-theme .toast-title {
    color: #9933ff;
}

body.red-theme .notification-toast {
    border-left-color: #ff3333;
}

body.red-theme .toast-icon {
    background: linear-gradient(135deg, #ff3333, #ff6666);
    box-shadow: 0 2px 10px rgba(255, 51, 51, 0.3);
}

body.red-theme .toast-title {
    color: #ff3333;
}

body.green-theme .notification-toast {
    border-left-color: #33ff33;
}

body.green-theme .toast-icon {
    background: linear-gradient(135deg, #33ff33, #66ff66);
    box-shadow: 0 2px 10px rgba(51, 255, 51, 0.3);
}

body.green-theme .toast-title {
    color: #33ff33;
}

body.orange-theme .notification-toast {
    border-left-color: #ff9933;
}

body.orange-theme .toast-icon {
    background: linear-gradient(135deg, #ff9933, #ffcc66);
    box-shadow: 0 2px 10px rgba(255, 153, 51, 0.3);
}

body.orange-theme .toast-title {
    color: #ff9933;
}
</style>
`;

// Inject styles immediately
const styleElement = document.createElement('style');
styleElement.textContent = toastStyles;
styleElement.id = 'toast-notification-styles';
document.head.appendChild(styleElement);
