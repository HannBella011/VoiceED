// Mobile Menu Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navbar = document.getElementById('navbar');
    
    // Create modal wrapper (like login modal) - only for mobile
    const modalWrapper = document.createElement('div');
    modalWrapper.className = 'mobile-menu-modal';
    modalWrapper.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 2000;
        backdrop-filter: blur(5px);
    `;
    document.body.appendChild(modalWrapper);
    
    // Store original navbar parent for desktop restoration
    const originalNavbarParent = navbar ? navbar.parentElement : null;
    
    if (mobileMenuBtn && navbar) {
        mobileMenuBtn.addEventListener('click', function() {
            // Check if mobile view
            const isMobile = window.innerWidth <= 768;
            
            if (isMobile) {
                // Move navbar inside modal wrapper for mobile
                if (navbar.parentElement !== modalWrapper) {
                    modalWrapper.appendChild(navbar);
                }
                
                if (modalWrapper.style.display === 'none') {
                    modalWrapper.style.display = 'block';
                    navbar.classList.add('active');
                    mobileMenuBtn.classList.add('active');
                } else {
                    modalWrapper.style.display = 'none';
                    navbar.classList.remove('active');
                    mobileMenuBtn.classList.remove('active');
                }
            } else {
                // Desktop: just toggle active class for any desktop-specific behavior
                navbar.classList.toggle('active');
                mobileMenuBtn.classList.toggle('active');
            }
        });
        
        // Close menu when clicking backdrop
        modalWrapper.addEventListener('click', function(event) {
            if (event.target === modalWrapper) {
                modalWrapper.style.display = 'none';
                navbar.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            }
        });
        
        // Close menu when clicking on a nav link
        const navLinks = navbar.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                modalWrapper.style.display = 'none';
                navbar.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            });
        });
        
        // Handle window resize - restore navbar to original position on desktop
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768 && navbar.parentElement === modalWrapper) {
                if (originalNavbarParent) {
                    originalNavbarParent.appendChild(navbar);
                }
                modalWrapper.style.display = 'none';
                navbar.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            }
        });
    }
});
