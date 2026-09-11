// Mobile Menu Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navbar = document.getElementById('navbar');
    
    if (mobileMenuBtn && navbar) {
        mobileMenuBtn.addEventListener('click', function() {
            navbar.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!navbar.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
                navbar.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            }
        });
        
        // Close menu when clicking on a nav link
        const navLinks = navbar.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navbar.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            });
        });
    }
});
