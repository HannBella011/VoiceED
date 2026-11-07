'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { useAuthContext } from '@/context/AuthContext';
import { accountRequest } from '@/services/account';
import { ProtectedRoute } from '@/lib/routeProtection';
import styles from './canonical.module.css';

function ProfileContent() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { currentUser: user, logout, updateProfile } = useAuthContext();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    accountRequest('/auth/me').then(profile => { if (active) updateProfile(profile); }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [user?.id]);
  const edit = () => { setDraft({ full_name: user.full_name || '', username: user.username || '', birthday: user.birthday?.slice(0,10) || '', school_id: user.school_id || '', gender: user.gender || '' }); setError(''); setEditing(true); };
  const save = async event => {
    event.preventDefault(); if (saving) return; setSaving(true); setError('');
    try { const profile = await accountRequest('/auth/me', 'PATCH', { ...draft, gender: draft.gender || null }); updateProfile(profile); setEditing(false); }
    catch(err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const [headerHeight, setHeaderHeight] = useState(128);
  useEffect(() => {
    const header = document.querySelector('.header');
    if (!header) return;
    const measure = () => setHeaderHeight(header.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  if (!user) {
    return (
      <>
        <Navbar
          currentPage={pathname}
          variant="dashboard"
          onUserMenuClick={handleUserMenuClick}
          onSettingsClick={handleSettingsClick}
        />
        <div className={styles.canonical} style={{ '--profile-header-height': `${headerHeight}px` }}><main className="profile-main">
          <div className="container">
            <div className="profile-loading">
              <div className="spinner"></div>
              <p>Loading profile...</p>
            </div>
          </div>
        </main></div>
        <Footer />
        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <UserMenuModal
          isOpen={userMenuOpen}
          onClose={() => setUserMenuOpen(false)}
          onProfileClick={() => window.location.href = '/profile'}
          onLogoutClick={() => {
            logout();
          }}
        />
      </>
    );
  }

  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Today';
  const birthday = user.birthday ? new Date(user.birthday).toLocaleDateString() : '-';
  const gender = user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '-';

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="dashboard"
        onUserMenuClick={handleUserMenuClick}
        onSettingsClick={handleSettingsClick}
      />

      <div className={styles.canonical} style={{ '--profile-header-height': `${headerHeight}px` }}><main className="profile-main">
        <div className="container">
          <div className="profile-container">
            {/* Profile Card */}
            <div className="profile-card">
              <div className="profile-avatar-section">
                <div className="profile-avatar">
                  <img src={user.avatar_url || "/pfp.jpg"} alt="User Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                </div>
                <div className="profile-info">
                  <h3 id="profileUsername">{user.username}{user.is_verified && <span aria-label="Verified student" title="Verified student"> ✓</span>}</h3>
                  <p id="profileEmail">{user.email}</p>
                  <p id="profileMember">Member since <span id="memberSince">{memberSince}</span></p>
                  <button className={styles.editButton} onClick={edit}><i className="fas fa-edit" /> Edit Profile</button>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="info-section">
              <h3>Personal Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Username</label>
                  <p id="infoUsername">{user.username}</p>
                </div>
                <div className="info-item">
                  <label>Email</label>
                  <p id="infoEmail">{user.email}</p>
                </div>
                <div className="info-item">
                  <label>Birthday</label>
                  <p id="infoBirthday">{birthday}</p>
                </div>
                <div className="info-item">
                  <label>Gender</label>
                  <p id="infoGender">{gender}</p>
                </div>
                <div className="info-item">
                  <label>Account Status</label>
                  <p className="status-active">{user.is_active ? 'Active' : 'Inactive'}</p>
                </div>
                <div className="info-item">
                  <label>Member Since</label>
                  <p id="infoMemberSince">{memberSince}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main></div>

      {editing && (
        <div className={`modal show ${styles.editOverlay}`} onClick={() => { if (!saving) setEditing(false); }}>
          <div className={`modal-content ${styles.editDialog}`} role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" onClick={event => event.stopPropagation()}>
            <h2 id="edit-profile-title">Edit Profile</h2>
            <form className={styles.editForm} onSubmit={save}>
              {error && <p role="alert">{error}</p>}
              {[['full_name','Full Name'],['username','Display Name'],['birthday','Birthday'],['school_id','School ID']].map(([field,label]) => (
                <div className={styles.editField} key={field}>
                  <label htmlFor={`edit-${field}`}>{label}</label>
                  <input id={`edit-${field}`} type={field === 'birthday' ? 'date' : 'text'} required maxLength={['school_id','username'].includes(field) ? 50 : 255} value={draft[field]} onChange={event => setDraft({...draft,[field]:event.target.value})} />
                </div>
              ))}
              <div className={styles.editField}>
                <label htmlFor="edit-gender">Gender (optional)</label>
                <select id="edit-gender" value={draft.gender} onChange={event => setDraft({...draft, gender:event.target.value})}>
                  <option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="lgbtq+">LGBTQ+</option>
                </select>
              </div>
              <div className={styles.editActions}>
                <button type="button" className={styles.cancelButton} disabled={saving} onClick={() => setEditing(false)}>Cancel</button>
                <button className={styles.editButton} disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Footer />

      {/* Modals */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <UserMenuModal
        isOpen={userMenuOpen}
        onClose={() => setUserMenuOpen(false)}
        onProfileClick={() => window.location.href = '/profile'}
        onLogoutClick={() => {
          logout();
        }}
      />
    </>
  );
}

export default function Profile() {
  return (
    <ProtectedRoute fallback={null}>
      <ProfileContent />
    </ProtectedRoute>
  );
}
