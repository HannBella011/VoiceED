// Navbar - VoiceED
// Responsive navigation component matching base implementation exactly

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback, useRef, useState } from 'react';
import { useMobileMenu } from '@/hooks/useMobileMenu';

export function Navbar({ 
  currentPage = '', 
  variant = 'public', 
  onUserMenuClick, 
  onSettingsClick, 
  onLoginClick 
}) {
  const router = useRouter();
  
  const { isOpen, toggleMenu, closeMenu } = useMobileMenu();
  // Track client-side mount for proper hydration
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Navigation links based on variant - matching base implementation
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
    if (onUserMenuClickRef.current) onUserMenuClickRef.current();
    else router.push('/profile');
  };

  const menuIconClass = isOpen ? 'fas fa-times' : 'fas fa-bars';
  const navLinksClass = 'nav-links ' + (isOpen ? 'show' : '');
  // Always render the mobile button - CSS media queries control visibility
  const mobileBtnClass = 'mobile-menu-btn';

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo-section">
            {/* Match base: logo and brand-text are direct children of logo-section (flex container) */}
            <Link href="/" className="logo-link" aria-label="VoiceED Home">
              <div className="logo">
                <img src="/logo for blue.png" alt="VoiceED Logo" width="90" height="90" />
              </div>
            </Link>
            <div className="brand-text">
              <h1>VoiceED</h1>
              <p className="tagline">Where Every Student's Voice Matters</p>
            </div>
          </div>
          
          {/* Mobile menu button - always rendered, CSS media queries control visibility */}
          <button
            className={mobileBtnClass}
            id="mobileMenuBtn"
            onClick={toggleMenu}
            aria-expanded={isOpen}
            aria-controls="navbar"
            aria-label="Toggle navigation menu"
          >
            <i className={menuIconClass} />
          </button>
          
          <nav className="navbar" id="navbar" aria-label="Main navigation">
            <ul className={navLinksClass}>
              {navLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className={isActive(link.href) ? 'active' : ''}
                    onClick={(e) => handleNavClick(e, link.href)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {variant === 'public' && (
                <>
                  <li>
                    <a
                      id="settingsBtn"
                      className="settings-nav-btn"
                      href="#"
                      onClick={handleSettingsClick}
                    >
                      Settings
                    </a>
                  </li>
                  <li>
                    <a
                      id="loginBtn"
                      className="login-nav-btn"
                      href="#"
                      onClick={handleLoginClick}
                    >
                      Login
                    </a>
                  </li>
                </>
              )}
              {(variant === 'dashboard' || variant === 'wellness') && (
                <>
                  <li>
                    <a
                      id="settingsBtn"
                      className="settings-nav-btn"
                      href="#"
                      onClick={handleSettingsClick}
                    >
                      Settings
                    </a>
                  </li>
                  <li>
                    <a
                      id="userMenuBtn"
                      className="login-nav-btn"
                      href="#"
                      onClick={handleUserMenuClick}
                    >
                      <i className="fas fa-user" />
                    </a>
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