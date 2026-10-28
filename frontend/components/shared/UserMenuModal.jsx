'use client';

import { useEffect } from 'react';

export function UserMenuModal({ isOpen, onClose, onProfileClick, onLogoutClick, username = 'Admin', email = 'Admin@voiceed.com' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`modal user-menu-modal ${isOpen ? 'show' : ''}`} id="userMenuModal">
      <div className="modal-content user-menu-modal-content">
        <span className="close-button" onClick={onClose}>×</span>
        <h2>User Menu</h2>
        <div className="user-info">
          <div className="user-avatar">
            <i className="fas fa-user"></i>
          </div>
          <div className="user-details">
            <h3 id="menuUsername">{username}</h3>
            <p id="menuEmail">{email}</p>
          </div>
        </div>
        <div className="menu-actions">
          <button className="user-menu-button" id="profileBtn" onClick={() => { onProfileClick?.(); onClose(); }}>
            <i className="fas fa-user"></i>
            <span>View Profile</span>
          </button>
          <button className="user-menu-button" id="logoutBtn" onClick={() => { onLogoutClick?.(); onClose(); }}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserMenuModal;