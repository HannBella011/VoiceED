// Shared session-aware navigation with the same options on every page.
'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useModals } from './GlobalModals';
import { useMobileMenu } from '@/hooks/useMobileMenu';
import { useProtectedNavigation } from '@/lib/routeProtection';
import styles from './Navbar.module.css';

const services = [
  { href: '/services', label: 'Services' },
  { href: '/report', label: 'ReportED' },
  { href: '/wellness-ed', label: 'WellnessED' },
  { href: '/inspire-ed', label: 'InspireED' },
  { href: '/share-ed', label: 'ShareED' },
];
export function Navbar({ currentPage = '', onSettingsClick }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, isLoggedIn, isLoading, logout } = useAuthContext();
  const authenticated = !isLoading && isLoggedIn && Boolean(currentUser);
  const administrative =
    authenticated && ['admin', 'super_admin'].includes(currentUser?.role);
  const dashboards = [
    { href: '/dashboard', label: 'User Dashboard' },
    { href: '/admin', label: 'Content Dashboard' },
    { href: '/admin/reports', label: 'Reports Dashboard' },
    ...(currentUser?.role === 'super_admin'
      ? [{ href: '/super-admin', label: 'User Management' }]
      : []),
  ];
  const { setSettingsOpen } = useModals();
  const { navigateToService } = useProtectedNavigation();
  const { isOpen, isMobile, toggleMenu, closeMenu } = useMobileMenu();
  const [menu, setMenu] = useState(null);
  const list = useRef(null);
  const servicesButton = useRef(null);
  const profileButton = useRef(null);
  const servicesMenu = useRef(null);
  const profileMenu = useRef(null);
  const dashboardButton = useRef(null);
  const dashboardMenu = useRef(null);
  const headerRef = useRef(null);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const measure = () =>
      document.documentElement.style.setProperty(
        '--voiceed-navbar-height',
        `${header.getBoundingClientRect().height}px`
      );
    measure();
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(header);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  useEffect(() => {
    setMenu(null);
    closeMenu();
  }, [pathname, authenticated, currentUser?.role, closeMenu]);
  useEffect(() => {
    if (!menu) return;
    const outside = (event) => {
      if (!list.current?.contains(event.target)) setMenu(null);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [menu]);
  const close = () => {
    setMenu(null);
    closeMenu();
  };
  const navigate = (event, href) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    close();
    navigateToService(href);
  };
  const settings = () => {
    close();
    if (onSettingsClick) onSettingsClick();
    else setSettingsOpen(true);
  };
  const toggle = (name) => setMenu((previous) => (previous === name ? null : name));
  const menuRef = (name) =>
    name === 'services'
      ? servicesMenu
      : name === 'dashboard'
        ? dashboardMenu
        : profileMenu;
  const triggerRef = (name) =>
    name === 'services'
      ? servicesButton
      : name === 'dashboard'
        ? dashboardButton
        : profileButton;
  const activeDashboard = (href) =>
    href === '/admin'
      ? pathname === '/admin' ||
        pathname?.startsWith('/admin/content/') ||
        pathname === '/admin/history'
      : href === '/super-admin'
        ? pathname === href || pathname?.startsWith('/profile/')
        : pathname === href || pathname?.startsWith(`${href}/`);
  const focusMenu = (name, last = false) => {
    setMenu(name);
    requestAnimationFrame(() => {
      const items = menuRef(name).current?.querySelectorAll('[role="menuitem"]');
      if (items?.length) items[last ? items.length - 1 : 0].focus();
    });
  };
  const triggerKey = (event, name) => {
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      focusMenu(name, event.key === 'ArrowUp');
    }
  };
  const menuKey = (event, name) => {
    const items = Array.from(event.currentTarget.querySelectorAll('[role="menuitem"]'));
    const index = items.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setMenu(null);
      triggerRef(name).current?.focus();
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) %
              items.length;
      items[next]?.focus();
    }
  };
  const nav = (
    <nav
      className={`navbar${isOpen ? ' active' : ''}`}
      id="navbar"
      aria-label="Main navigation"
    >
      <ul className={`nav-links ${styles.links}${isOpen ? ' show' : ''}`} ref={list}>
        <li>
          <Link
            href="/"
            className={currentPage === '/' ? 'active' : ''}
            onClick={close}
          >
            Home
          </Link>
        </li>
        {administrative ? (
          <li
            className={styles.dropdown}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setMenu((previous) => (previous === 'dashboard' ? null : previous));
            }}
          >
            <button
              type="button"
              className={`${styles.trigger} ${dashboards.some((item) => activeDashboard(item.href)) ? styles.current : ''}`}
              ref={dashboardButton}
              aria-haspopup="menu"
              aria-expanded={menu === 'dashboard'}
              aria-controls="dashboard-navigation"
              onClick={() => toggle('dashboard')}
              onKeyDown={(event) => triggerKey(event, 'dashboard')}
            >
              Dashboard <i className="fas fa-chevron-down" aria-hidden="true" />
            </button>
            {menu === 'dashboard' && (
              <ul
                className={styles.menu}
                id="dashboard-navigation"
                role="menu"
                aria-label="Dashboard"
                ref={dashboardMenu}
                onKeyDown={(event) => menuKey(event, 'dashboard')}
              >
                {dashboards.map((item) => (
                  <li role="none" key={item.href}>
                    <Link
                      role="menuitem"
                      href={item.href}
                      aria-current={activeDashboard(item.href) ? 'page' : undefined}
                      onClick={(event) => navigate(event, item.href)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ) : (
          authenticated && (
            <li>
              <Link
                href="/dashboard"
                className={currentPage === '/dashboard' ? 'active' : ''}
                onClick={(event) => navigate(event, '/dashboard')}
              >
                Dashboard
              </Link>
            </li>
          )
        )}
        <li>
          <Link href="/about" onClick={close}>
            About
          </Link>
        </li>
        <li
          className={styles.dropdown}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setMenu((previous) => (previous === 'services' ? null : previous));
          }}
        >
          <button
            type="button"
            className={styles.trigger}
            ref={servicesButton}
            aria-haspopup="menu"
            aria-expanded={menu === 'services'}
            aria-controls="services-navigation"
            onClick={() => toggle('services')}
            onKeyDown={(event) => triggerKey(event, 'services')}
          >
            Services <i className="fas fa-chevron-down" aria-hidden="true" />
          </button>
          {menu === 'services' && (
            <ul
              className={styles.menu}
              id="services-navigation"
              role="menu"
              aria-label="Services"
              ref={servicesMenu}
              onKeyDown={(event) => menuKey(event, 'services')}
            >
              {services.map((item) => (
                <li role="none" key={item.href}>
                  <Link
                    role="menuitem"
                    href={item.href}
                    onClick={(event) => navigate(event, item.href)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>
        <li>
          <Link href="/contacts" onClick={close}>
            Contact
          </Link>
        </li>
        <li>
          <button
            type="button"
            id="settingsBtn"
            className={`settings-nav-btn ${styles.pill}`}
            onClick={settings}
          >
            Settings
          </button>
        </li>
        {authenticated ? (
          <li
            className={styles.dropdown}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setMenu((previous) => (previous === 'profile' ? null : previous));
            }}
          >
            <button
              type="button"
              id="userMenuBtn"
              className={`login-nav-btn ${styles.pill}`}
              ref={profileButton}
              aria-label="Profile"
              aria-haspopup="menu"
              aria-expanded={menu === 'profile'}
              aria-controls="profile-navigation"
              onClick={() => toggle('profile')}
              onKeyDown={(event) => triggerKey(event, 'profile')}
            >
              <i className="fas fa-user" aria-hidden="true" />
            </button>
            {menu === 'profile' && (
              <ul
                className={styles.menu}
                id="profile-navigation"
                role="menu"
                aria-label="Profile"
                ref={profileMenu}
                onKeyDown={(event) => menuKey(event, 'profile')}
              >
                <li role="none">
                  <Link
                    role="menuitem"
                    href="/profile"
                    onClick={(event) => navigate(event, '/profile')}
                  >
                    My Profile
                  </Link>
                </li>
                {!administrative && (
                  <li role="none">
                    <Link
                      role="menuitem"
                      href="/dashboard"
                      onClick={(event) => navigate(event, '/dashboard')}
                    >
                      Dashboard
                    </Link>
                  </li>
                )}
                <li role="none">
                  <button type="button" role="menuitem" onClick={settings}>
                    Settings
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      close();
                      logout();
                    }}
                  >
                    Logout
                  </button>
                </li>
              </ul>
            )}
          </li>
        ) : (
          <li>
            <Link
              id="loginBtn"
              className={`login-nav-btn ${styles.pill}`}
              href="/login"
              onClick={close}
            >
              Login
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
  return (
    <header ref={headerRef} className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo-section">
            <Link
              href="/"
              className="logo-link"
              aria-label="VoiceED Home"
              onClick={close}
            >
              <div className="logo">
                <img
                  src="/logo for blue.png"
                  alt="VoiceED Logo"
                  width="90"
                  height="90"
                />
              </div>
            </Link>
            <div className="brand-text">
              <h1>VoiceED</h1>
              <p className="tagline">Where Every Student's Voice Matters</p>
            </div>
          </div>
          <button
            type="button"
            className="mobile-menu-btn"
            id="mobileMenuBtn"
            onClick={() => {
              setMenu(null);
              toggleMenu();
            }}
            aria-expanded={isOpen}
            aria-controls="navbar"
            aria-label="Toggle navigation menu"
          >
            <i className={isOpen ? 'fas fa-times' : 'fas fa-bars'} />
          </button>
          {isMobile
            ? createPortal(
                <div
                  className={styles.mobileOverlay}
                  style={{ display: isOpen ? 'block' : 'none' }}
                  onClick={(event) => {
                    if (event.target === event.currentTarget) close();
                  }}
                >
                  {nav}
                </div>,
                document.body
              )
            : nav}
        </div>
      </div>
    </header>
  );
}
export default Navbar;
