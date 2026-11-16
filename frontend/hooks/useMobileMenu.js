// React owns the mobile navbar; never reparent its DOM behind the router.
'use client';
import { useEffect, useState, useCallback } from 'react';
export function useMobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const closeMenu = useCallback(() => setIsOpen(false), []);
  const toggleMenu = useCallback(() => setIsOpen((previous) => !previous), []);
  useEffect(() => {
    const resize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setIsOpen(false);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    if (!isOpen || !isMobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) closeMenu();
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', escape);
    };
  }, [isOpen, isMobile, closeMenu]);
  return { isOpen, isMobile, toggleMenu, closeMenu };
}
export default useMobileMenu;
