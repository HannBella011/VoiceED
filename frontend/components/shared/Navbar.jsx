'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback, useRef } from 'react';
import { useMobileMenu } from '@/hooks/useMobileMenu';
import { useNavbarScroll } from '@/hooks/useNavbarScroll';

export function Navbar({ currentPage = '', variant = 'public', onUserMenuClick, onSettingsClick, onLoginClick }) {
  const router = useRouter();
  
  // Scroll detection for two-state navbar - threshold 50px
  const isScrolled = useNavbarScroll(50);
  const { isOpen, isMobile, toggleMenu, closeMenu } = useMobileMenu();

  // Add/remove body class for padding compensation when navbar is fixed
  useEffect(() => {
    if (isScrolled) {
      document.body.classList.add('navbar-scrolled');
    } else {
      document.body.classList.remove('navbar-scrolled');
    }
    
    return () => {
      document.body.classList.remove('navbar-scrolled');
    };
  }, [isScrolled]);

  // Stable handler refs to avoid stale closures
  const onSettingsClickRef = useRef(onSettingsClick);
  const onLoginClickRef = useRef(onLoginClick);
  const onUserMenuClickRef = useRef(onUserMenuClick);
  
  useEffect(() => {
    onSettingsClickRef.current = onSettingsClick;
  }, [onSettingsClick]);
  
  useEffect(() => {
    onLoginClickRef.current = onLoginClick;
  }, [onLoginClick]);
  
  useEffect(() => {
    onUserMenuClickRef.current = onUserMenuClick;
  }, [onUserMenuClick]);

  // Navigation links based on variant
  const navLinks = variant === 'dashboard' ? [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/report-ed', label: 'ReportED' },
    { href: '/wellness-ed', label: 'WellnessED' },
    { href: '/inspire-ed', label: 'InspireED' },
    { href: '/share-ed', label: 'ShareED' },
  ] : variant === 'wellness' ? [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/report-ed', label: 'ReportED' },
    { href: '/wellness-ed', label: 'WellnessED' },
    { href: '/inspire-ed', label: 'InspireED' },
    { href: '/share-ed', label: 'ShareED' },
  ] : [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/services', label: 'Services' },
    { href: '/contacts', label: 'Contact' },
  ];

  // Determine active link
  const isActive = (href) => {
    if (currentPage && currentPage !== '/') {
      return href === currentPage;
    }
    if (currentPage === '/' || currentPage === '') {
      return href === '/';
    }
    return false;
  };

  const handleNavClick = (e, href) => {
    if (href.startsWith('/') && !href.startsWith('http')) {
      e.preventDefault();
      router.push(href);
      closeMenu();
    }
  };

  const handleSettingsClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSettingsClickRef.current?.();
  };

  const handleLoginClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onLoginClickRef.current?.();
  };

  const handleUserMenuClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onUserMenuClickRef.current?.();
  };

  // Dynamic header class based on scroll state
  const headerClass = `header ${isScrolled ? 'header--scrolled' : ''}`;

  return (
    <header className={headerClass}>
      <div className="container">
        <div className="header-content">
          <div className="logo-section">
            <Link href="/" className="logo-link" aria-label="VoiceED Home">
              <div className="logo">
                <img src="/logo for blue.png" alt="VoiceED Logo" width="90" height="90" />
              </div>
              <div className="brand-text">
                <h1>VoiceED</h1>
                <p className="tagline">Where Every Student's Voice Matters</p>
              </div>
            </Link>
          </div>
          
          {isMobile && (
            <button
              className="mobile-menu-btn"
              id="mobileMenuBtn"
              onClick={toggleMenu}
              aria-expanded={isOpen}
              aria-controls="navbar"
              aria-label="Toggle navigation menu"
            >
              <i className={isOpen ? "fas fa-times" : "fas fa-bars"}></i>
            </button>
          )}
          
          <nav className="navbar" id="navbar" aria-label="Main navigation">
            <ul className={`nav-links ${isOpen ? 'show' : ''}`}>
              {navLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className={`${isActive(link.href) ? 'active' : ''}`}
                    onClick={(e) => handleNavClick(e, link.href)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {variant === 'public' && (
                <>
                  <li>
                    <button
                      id="settingsBtn"
                      className="settings-nav-btn"
                      type="button"
                      onClick={handleSettingsClick}
                    >
                      Settings
                    </button>
                  </li>
                  <li>
                    <button
                      id="loginBtn"
                      className="login-nav-btn"
                      type="button"
                      onClick={handleLoginClick}
                    >
                      Login
                    </button>
                  </li>
                </>
              )}
              {(variant === 'dashboard' || variant === 'wellness') && (
                <>
                  <li>
                    <button
                      id="settingsBtn"
                      className="settings-nav-btn"
                      type="button"
                      onClick={handleSettingsClick}
                    >
                      Settings
                    </button>
                  </li>
                  <li>
                    <button
                      id="userMenuBtn"
                      className="login-nav-btn"
                      type="button"
                      onClick={handleUserMenuClick}
                    >
                      <i className="fas fa-user"></i>
                    </button>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Navbar;