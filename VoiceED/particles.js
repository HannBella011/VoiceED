// Digital particle effects for VoiceED theme
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.pointerEvents = 'none';
        this.container.style.zIndex = '1';
        this.container.style.overflow = 'hidden';
        document.body.appendChild(this.container);
        
        this.init();
    }
    
    init() {
        // Create floating particles
        for (let i = 0; i < 30; i++) {
            this.createParticle();
        }
        
        // Animate particles
        this.animate();
    }
    
    createParticle() {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = Math.random() * 3 + 'px';
        particle.style.height = particle.style.width;
        particle.style.background = `rgba(0, 212, 255, ${Math.random() * 0.8 + 0.2})`;
        particle.style.borderRadius = '50%';
        particle.style.boxShadow = `0 0 ${Math.random() * 10 + 5}px rgba(0, 212, 255, ${Math.random() * 0.5})`;
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        
        this.container.appendChild(particle);
        
        this.particles.push({
            element: particle,
            x: parseFloat(particle.style.left),
            y: parseFloat(particle.style.top),
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: parseFloat(particle.style.width)
        });
    }
    
    animate() {
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Wrap around edges
            if (particle.x < 0) particle.x = 100;
            if (particle.x > 100) particle.x = 0;
            if (particle.y < 0) particle.y = 100;
            if (particle.y > 100) particle.y = 0;
            
            particle.element.style.left = particle.x + '%';
            particle.element.style.top = particle.y + '%';
            
            // Pulsing effect
            const scale = 1 + Math.sin(Date.now() * 0.001 + particle.x) * 0.2;
            particle.element.style.transform = `scale(${scale})`;
        });
        
        requestAnimationFrame(() => this.animate());
    }
}

// Modal functionality
const modal = document.getElementById('loginModal');
const loginBtn = document.getElementById('loginBtn');
const closeBtn = document.querySelector('.close-button');

// Login button functionality is now handled by user-menu.js

// Close modal functionality
const closeButtons = document.querySelectorAll('.close, .close-button');
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        modal.style.display = 'none';
        settingsModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });
});

// Close modal when clicking outside of it
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

// Settings functionality
const saveSettingsBtn = document.querySelector('.save-settings-btn');
if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
        // Get color selection
        const selectedColor = document.querySelector('input[name="color"]:checked').value;
        
        // Save settings to localStorage
        const settings = {
            color: selectedColor
        };
        
        localStorage.setItem('shielded_settings', JSON.stringify(settings));
        
        // Apply settings
        applySettings(settings);
        
        // Show success notification
        showNotification('Color theme saved successfully!', 'success');
        
        // Close modal
        settingsModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });
}

// Apply settings function
function applySettings(settings) {
    // Remove all existing color themes
    document.body.classList.remove('blue-theme', 'purple-theme', 'red-theme', 'green-theme', 'orange-theme', 'pink-theme');
    
    // Apply selected color theme
    if (settings.color) {
        document.body.classList.add(`${settings.color}-theme`);
    } else {
        // Default to blue theme if no color is selected
        document.body.classList.add('blue-theme');
    }
}

// Load settings on page load
function loadSettings() {
    const savedSettings = localStorage.getItem('shielded_settings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // Apply saved settings to form
        const colorRadio = document.querySelector(`input[name="color"][value="${settings.color}"]`);
        if (colorRadio) {
            colorRadio.checked = true;
        }
        
        // Apply settings
        applySettings(settings);
    } else {
        // Apply default blue theme
        applySettings({ color: 'blue' });
    }
}

// Simple notification function
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? 'var(--accent-cyan)' : '#ff4444'};
        color: var(--background-dark);
        border-radius: 8px;
        font-weight: 600;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Load settings when page loads
document.addEventListener('DOMContentLoaded', loadSettings);

// Handle login form submission
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form values
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Get registered users
        const users = JSON.parse(localStorage.getItem('shielded_users') || '[]');
        
        // Find user by email
        const user = users.find(u => u.email === email);
        
        if (!user) {
            showNotification('No account found with this email. Please register first.', 'error');
            return;
        }
        
        if (user.password !== password) {
            showNotification('Incorrect password. Please try again.', 'error');
            return;
        }
        
        // Store login state (in real app, use secure session/cookie)
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userEmail', email);
        sessionStorage.setItem('username', user.username);
        
        // Update UI to show logged in state
        updateLoginState();
        
        // Close modal
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Show success notification
        showNotification(`Login successful! Welcome back, ${user.username}!`, 'success');
        
        // Clear form
        loginForm.reset();
    });
}

// Handle registration form submission
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form values
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const termsAccepted = document.getElementById('terms').checked;
        
        // Validation
        if (!username || !email || !password || !confirmPassword) {
            showNotification('Please fill in all fields', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            showNotification('Password must be at least 6 characters long', 'error');
            return;
        }
        
        if (!termsAccepted) {
            showNotification('Please accept the Terms of Service and Privacy Policy', 'error');
            return;
        }
        
        // Store user data (in real app, this would be server-side)
        const users = JSON.parse(localStorage.getItem('shielded_users') || '[]');
        
        // Check if email already exists
        if (users.find(user => user.email === email)) {
            showNotification('An account with this email already exists', 'error');
            return;
        }
        
        // Create new user
        const newUser = {
            username: username,
            email: email,
            password: password, // In real app, this would be hashed
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem('shielded_users', JSON.stringify(users));
        
        // Auto-login after registration
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userEmail', email);
        sessionStorage.setItem('username', username);
        
        // Show success notification with username
        showNotification(`Successful! You have created a new account. Welcome to ShieldED ${username}!`, 'success');
        
        // Clear form
        registerForm.reset();
        
        // Redirect to index.html after a short delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    });
}

// Update UI based on login state
function updateLoginState() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const loginBtn = document.getElementById('loginBtn');
    const welcomeText = document.querySelector('.dashboard-welcome h2');
    const profileSection = document.getElementById('userProfileSection');
    
    if (isLoggedIn === 'true') {
        const userEmail = sessionStorage.getItem('userEmail');
        const username = sessionStorage.getItem('username') || (userEmail ? userEmail.split('@')[0] : 'Student');
        
        // Change login button to logout button
        if (loginBtn) {
            loginBtn.textContent = 'Logout';
            loginBtn.classList.remove('login-nav-btn');
            loginBtn.classList.add('logout-btn');
            loginBtn.removeEventListener('click', openLoginModal);
            loginBtn.addEventListener('click', handleLogout);
        }
        
        // Update welcome message
        if (welcomeText) {
            welcomeText.textContent = `Welcome back, ${username}!`;
        }
        
        // Show and populate profile section
        if (profileSection) {
            profileSection.style.display = 'block';
            updateProfileData(userEmail, username);
        }
    } else {
        // Reset to login button
        if (loginBtn) {
            loginBtn.textContent = 'Login';
            loginBtn.classList.remove('logout-btn');
            loginBtn.classList.add('login-nav-btn');
            loginBtn.removeEventListener('click', handleLogout);
            loginBtn.addEventListener('click', openLoginModal);
        }
        
        // Reset welcome message
        if (welcomeText) {
            welcomeText.textContent = 'Welcome back, Student!';
        }
        
        // Hide profile section
        if (profileSection) {
            profileSection.style.display = 'none';
        }
    }
}

// Update profile data
function updateProfileData(userEmail, username) {
    const profileUsername = document.getElementById('profileUsername');
    const profileEmail = document.getElementById('profileEmail');
    const loginCount = document.getElementById('loginCount');
    const lastLogin = document.getElementById('lastLogin');
    const accountAge = document.getElementById('accountAge');
    
    if (profileUsername && username) {
        profileUsername.textContent = username;
    }
    
    if (profileEmail && userEmail) {
        profileEmail.textContent = userEmail;
    }
    
    // Update login count
    if (loginCount) {
        const currentCount = parseInt(localStorage.getItem('loginCount') || '0');
        const newCount = currentCount + 1;
        localStorage.setItem('loginCount', newCount.toString());
        loginCount.textContent = newCount;
    }
    
    // Update last login
    if (lastLogin) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        lastLogin.textContent = timeString;
    }
    
    // Update account age
    if (accountAge) {
        const firstLogin = localStorage.getItem('firstLogin');
        if (!firstLogin) {
            localStorage.setItem('firstLogin', new Date().toISOString());
            accountAge.textContent = 'New';
        } else {
            const firstDate = new Date(firstLogin);
            const now = new Date();
            const daysDiff = Math.floor((now - firstDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === 0) {
                accountAge.textContent = 'Today';
            } else if (daysDiff === 1) {
                accountAge.textContent = '1 day';
            } else {
                accountAge.textContent = `${daysDiff} days`;
            }
        }
    }
}

// Handle logout
function handleLogout(e) {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        // Clear login state
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userEmail');
        
        // Update UI
        updateLoginState();
        
        // Show notification
        showNotification('You have been logged out successfully', 'success');
    }
}

// Open login modal
function openLoginModal(e) {
    e.preventDefault();
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Check if user is logged in and update UI accordingly
function checkLoginStatus() {
    updateLoginState();
}

// Initialize particle system immediately
new ParticleSystem();

// Initialize particle system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check login status
    checkLoginStatus();
    
    // Show login modal immediately on index.html load
    if (modal && window.location.pathname.includes('index.html')) {
        modal.style.display = 'none'; // Hide modal initially
        document.body.style.overflow = 'auto';
    }
    
    // Add hover effect to interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .dashboard-card, .activity-item');
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.style.transition = 'all 0.3s ease';
        });
    });
    
    // Add digital glitch effect to title on hover
    const brandTitle = document.querySelector('.brand-text h1');
    if (brandTitle) {
        brandTitle.addEventListener('mouseenter', function() {
            this.style.animation = 'glitch 0.3s ease-in-out';
            setTimeout(() => {
                this.style.animation = '';
            }, 300);
        });
    }
    
    // Get Started button functionality
    const getStartedBtn = document.getElementById('getStartedBtn');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        });
    }
    
    // Header settings button functionality
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            settingsModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        });
    }

    // Header login button functionality is now handled by user-menu.js
    
    // Navigation links functionality - let header links work naturally
    // No need to interfere with header navigation since they use direct file links
    
    // Profile section functionality
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showNotification('Edit profile feature coming soon!', 'success');
        });
    }
    
    const settingsBtn2 = document.getElementById('settingsBtn2');
    if (settingsBtn2) {
        settingsBtn2.addEventListener('click', (e) => {
            e.preventDefault();
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) {
                settingsModal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        });
    }
    
});

// Add glitch animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes glitch {
        0%, 100% { 
            text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
            transform: translateX(0);
        }
        25% { 
            text-shadow: -2px 0 #ff00ff, 2px 0 #00ffff;
            transform: translateX(-1px);
        }
        50% { 
            text-shadow: 2px 0 #ff00ff, -2px 0 #00ffff;
            transform: translateX(1px);
        }
        75% { 
            text-shadow: 0 0 20px rgba(0, 212, 255, 0.8);
            transform: translateX(-0.5px);
        }
    }
`;
document.head.appendChild(style);
