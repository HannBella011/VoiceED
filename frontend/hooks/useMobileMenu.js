// useMobileMenu - VoiceED
// Mobile menu toggle functionality matching base implementation

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export function useMobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const modalWrapperRef = useRef(null);
  const originalNavbarParentRef = useRef(null);

  const checkMobile = useCallback(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);

  useEffect(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [checkMobile]);

  // Initialize modal wrapper for mobile menu (matching base implementation)
  useEffect(() => {
    if (!modalWrapperRef.current) {
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
      modalWrapperRef.current = modalWrapper;
    }

    const navbar = document.getElementById('navbar');
    if (navbar) {
      originalNavbarParentRef.current = navbar.parentElement;
    }

    return () => {
      // Cleanup: restore navbar to original position
      if (modalWrapperRef.current && modalWrapperRef.current.parentNode) {
        modalWrapperRef.current.parentNode.removeChild(modalWrapperRef.current);
      }
    };
  }, []);

  const toggleMenu = useCallback(() => {
    const navbar = document.getElementById('navbar');
    const modalWrapper = modalWrapperRef.current;
    
    if (!navbar || !modalWrapper) return;

    const isMobileView = window.innerWidth <= 768;
    
    if (isMobileView) {
      // Move navbar inside modal wrapper for mobile
      if (navbar.parentElement !== modalWrapper) {
        modalWrapper.appendChild(navbar);
      }
      
      if (modalWrapper.style.display === 'none') {
        modalWrapper.style.display = 'block';
        navbar.classList.add('active');
      } else {
        modalWrapper.style.display = 'none';
        navbar.classList.remove('active');
      }
    } else {
      // Desktop: just toggle active class
      navbar.classList.toggle('active');
    }
  }, []);

  const closeMenu = useCallback(() => {
    const navbar = document.getElementById('navbar');
    const modalWrapper = modalWrapperRef.current;
    
    if (modalWrapper) {
      modalWrapper.style.display = 'none';
    }
    if (navbar) {
      navbar.classList.remove('active');
    }
  }, []);

  // Close menu when clicking backdrop
  useEffect(() => {
    const modalWrapper = modalWrapperRef.current;
    if (!modalWrapper) return;
    
    const handleClick = (event) => {
      if (event.target === modalWrapper) {
        modalWrapper.style.display = 'none';
        const navbar = document.getElementById('navbar');
        if (navbar) {
          navbar.classList.remove('active');
        }
      }
    };
    
    modalWrapper.addEventListener('click', handleClick);
    return () => modalWrapper.removeEventListener('click', handleClick);
  }, []);

  // Close menu when clicking on a nav link
  useEffect(() => {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    
    const handleLinkClick = () => {
      const modalWrapper = modalWrapperRef.current;
      if (modalWrapper) {
        modalWrapper.style.display = 'none';
      }
      navbar.classList.remove('active');
    };
    
    const navLinks = navbar.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
      link.addEventListener('click', handleLinkClick);
    });
    
    return () => {
      navLinks.forEach(link => {
        link.removeEventListener('click', handleLinkClick);
      });
    };
  }, []);

  // Handle window resize - restore navbar to original position on desktop
  useEffect(() => {
    const handleResize = () => {
      const navbar = document.getElementById('navbar');
      const modalWrapper = modalWrapperRef.current;
      
      if (window.innerWidth > 768 && navbar && modalWrapper && navbar.parentElement === modalWrapper) {
        if (originalNavbarParentRef.current) {
          originalNavbarParentRef.current.appendChild(navbar);
        }
        modalWrapper.style.display = 'none';
        navbar.classList.remove('active');
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isOpen, isMobile, toggleMenu, closeMenu };
}

export default useMobileMenu;
