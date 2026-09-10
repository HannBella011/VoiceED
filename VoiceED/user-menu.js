// User Menu Functionality for all pages
document.addEventListener('DOMContentLoaded', function() {
    // Notification System (simplified version for user-menu.js)
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
            
            // Determine title and message based on useMessageAsTitle parameter
            const title = useMessageAsTitle ? message : (type === 'success' ? 'Success!' : 'Information');
            const bodyMessage = useMessageAsTitle ? 'Logged out successfully' : message;
            
            notification.innerHTML = `
                <div class="notification-toast">
                    <div class="notification-header">
                        <div class="notification-icon-wrapper">
                            <div class="toast-icon">
                                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
                            </div>
                        </div>
                        <div class="notification-title-section">
                            <div class="toast-title">${title}</div>
                        </div>
                        <div class="toast-close" onclick="this.closest('.notification').remove()">
                            <i class="fas fa-times"></i>
                        </div>
                    </div>
                    <div class="notification-body">
                        <div class="toast-message">${bodyMessage}</div>
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
    const userMenuModal = document.getElementById('userMenuModal');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const loginBtn = document.getElementById('loginBtn');
    const closeBtn = document.querySelector('#userMenuModal .close-button');
    const logoutBtn = document.getElementById('logoutBtn');

    // Check if user is logged in using both sessionStorage and localStorage
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const currentUser = JSON.parse(localStorage.getItem('shielded_current_user'));
    
    if (currentUser) {
        // Update user info in modal
        updateUserInfo(currentUser);
    }

    // Update user info function
    function updateUserInfo(user) {
        const menuUsername = document.getElementById('menuUsername');
        const menuEmail = document.getElementById('menuEmail');
        
        if (menuUsername) menuUsername.textContent = user.username;
        if (menuEmail) menuEmail.textContent = `${user.username}@voiceed.com`;
    }

    // User menu functionality - check login state first
    // Handle both userMenuBtn and loginBtn for different pages
    const userMenuBtnUpdated = document.getElementById('userMenuBtn');
    const loginBtnUpdated = document.getElementById('loginBtn');
    
    function handleUserButtonClick(e) {
        e.preventDefault();
        console.log('User button clicked - checking login state...');
        
        // Check if user is logged in
        const currentUser = JSON.parse(localStorage.getItem('shielded_current_user'));
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        
        console.log('Current user:', currentUser);
        console.log('Is logged in:', isLoggedIn);
        
        if (currentUser && isLoggedIn) {
            // User is logged in - show user menu
            console.log('User is logged in - showing user menu');
            if (userMenuModal) {
                userMenuModal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        } else {
            // User is not logged in - show login modal
            console.log('User is not logged in - showing login modal');
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                loginModal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        }
    }
    
    // Add event listener to userMenuBtn if it exists
    if (userMenuBtnUpdated) {
        userMenuBtnUpdated.addEventListener('click', handleUserButtonClick);
    }
    
    // Add event listener to loginBtn if it exists (for pages like index.html)
    if (loginBtnUpdated) {
        loginBtnUpdated.addEventListener('click', handleUserButtonClick);
    }

    // Close user menu
    if (closeBtn && userMenuModal) {
        closeBtn.addEventListener('click', function() {
            userMenuModal.classList.remove('show');
            document.body.style.overflow = 'auto';
        });
    }

    // Close modal when clicking outside
    if (userMenuModal) {
        window.addEventListener('click', function(event) {
            if (event.target === userMenuModal) {
                userMenuModal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        });
    }

    // Logout functionality with notification
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            const currentUser = JSON.parse(localStorage.getItem('shielded_current_user'));
            const username = currentUser ? currentUser.username : 'User';
            
            // Show notification before clearing storage
            NotificationManager.show(`Goodbye ${username}!`, 'success', true);
            
            // Clear both localStorage and sessionStorage
            localStorage.removeItem('shielded_current_user');
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('userEmail');
            sessionStorage.removeItem('username');
            
            // Reset login button state
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.textContent = 'Login';
                loginBtn.classList.remove('logged-in');
                loginBtn.onclick = null;
            }
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        });
    }

    // Profile button functionality
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', function() {
            window.location.href = 'profile.html';
        });
    }

    // Settings button functionality
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) {
                settingsModal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        });
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Escape to close modal
        if (e.key === 'Escape' && userMenuModal) {
            if (userMenuModal.classList.contains('show')) {
                userMenuModal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        }
    });
});
