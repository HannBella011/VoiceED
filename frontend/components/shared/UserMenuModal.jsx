// UserMenuModal - VoiceED
// User dropdown menu modal matching base implementation

'use client';

import { useAuthContext } from '@/context/AuthContext';

export function UserMenuModal({ 
  isOpen, 
  onClose, 
  onProfileClick, 
  onLogoutClick,
  username = 'User',
  email = 'user@voiceed.com'
}) {
  const { logout } = useAuthContext();

  const handleLogout = () => {
    logout();
    onLogoutClick();
  };

  if (!isOpen) return null;

  return (
    <div className="modal user-menu-modal" id="userMenuModal" onClick={onClose}>
      <div className="modal-content user-menu-modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="close-button" onClick={onClose}>&times;</span>
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
          <button className="user-menu-button" id="profileBtn" onClick={() => { onProfileClick(); onClose(); }}>
            <i className="fas fa-user"></i>
            <span>View Profile</span>
          </button>
          <button className="user-menu-button" id="logoutBtn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserMenuModal;
