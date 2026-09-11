// Mobile Menu Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navbar = document.getElementById('navbar');
    
    // Create backdrop element
    const backdrop = document.createElement('div');
    backdrop.className = 'mobile-menu-backdrop';
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 998;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
    `;
    document.body.appendChild(backdrop);
    
    if (mobileMenuBtn && navbar) {
        mobileMenuBtn.addEventListener('click', function() {
            navbar.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
            
            if (navbar.classList.contains('active')) {
                backdrop.style.opacity = '1';
                backdrop.style.visibility = 'visible';
            } else {
                backdrop.style.opacity = '0';
                backdrop.style.visibility = 'hidden';
            }
        });
        
        // Close menu when clicking backdrop
        backdrop.addEventListener('click', function() {
            navbar.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
            backdrop.style.opacity = '0';
            backdrop.style.visibility = 'hidden';
        });
        
        // Close menu when clicking on a nav link
        const navLinks = navbar.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navbar.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
                backdrop.style.opacity = '0';
                backdrop.style.visibility = 'hidden';
            });
        });
    }
});
