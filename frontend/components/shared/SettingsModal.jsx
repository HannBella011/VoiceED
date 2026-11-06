// SettingsModal - VoiceED
// Theme/settings modal component matching base implementation

'use client';

import { authFetch } from '@/lib/authFetch';
import { useState, useEffect } from 'react';
import { useAuthContext } from '@/context/AuthContext';

const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'lgbtq+', label: 'LGBTQ+' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

export function SettingsModal({ isOpen, onClose }) {
  const { currentUser, updateProfile } = useAuthContext();
  const [settings, setSettings] = useState({
    color: 'blue',
    gender: currentUser?.gender || '',
  });

  const applySettings = (newSettings) => {
    // Remove all existing color themes
    document.body.classList.remove(
      'blue-theme', 'purple-theme', 'red-theme',
      'green-theme', 'orange-theme', 'pink-theme'
    );
    if (newSettings.color) {
      document.body.classList.add(`${newSettings.color}-theme`);
    } else {
      document.body.classList.add('blue-theme');
    }
  };

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const saveSettings = async (changes) => {
    if (saving) return;
    const updated = { ...settings, ...changes };
    setError('');
    setSaving(true);
    try {
      if (currentUser) {
        const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/me`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
          body: JSON.stringify({ theme: updated.color, gender: ['female', 'male', 'lgbtq+'].includes(updated.gender) ? updated.gender : null }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(typeof body.detail === 'string' ? body.detail : 'Unable to save settings');
        }
        const profile = await response.json();
        updateProfile(profile);
        updated.color = profile.theme;
        updated.gender = profile.gender || '';
      }
      setSettings(updated);
      applySettings(updated);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    const loaded = { color: currentUser?.theme || 'blue', gender: currentUser?.gender || '' };
    setSettings(loaded);
    applySettings(loaded);
  }, [currentUser?.id, currentUser?.theme, currentUser?.gender]);

  if (!isOpen) return null;

  return (
    <div id="settingsModal" className={'modal ' + (isOpen ? 'show' : '')} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="close" onClick={onClose}>&times;</span>
        <h2>Settings</h2>
        <div className="settings-content">
          {error && <p role="alert">{error}</p>}
          <div className="setting-group">
            <h3>Select Color</h3>
            <div className="color-options">
              <label>
                <input
                  type="radio"
                  name="color"
                  value="blue"
                  checked={settings.color === 'blue'}
                  onChange={() => saveSettings({ color: 'blue' })}
                />
                <span 
                  className="color-preview" 
                  style={{ background: 'linear-gradient(135deg, #0a0a0a, #1a1a2e); border: 2px solid #00d4ff' }}
                ></span>
                <span>Blue</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="color"
                  value="purple"
                  checked={settings.color === 'purple'}
                  onChange={() => saveSettings({ color: 'purple' })}
                />
                <span 
                  className="color-preview" 
                  style={{ background: 'linear-gradient(135deg, #1a0033, #330066); border: 2px solid #9933ff' }}
                ></span>
                <span>Purple</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="color"
                  value="red"
                  checked={settings.color === 'red'}
                  onChange={() => saveSettings({ color: 'red' })}
                />
                <span 
                  className="color-preview" 
                  style={{ background: 'linear-gradient(135deg, #330000, #660000); border: 2px solid #ff3333' }}
                ></span>
                <span>Red</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="color"
                  value="green"
                  checked={settings.color === 'green'}
                  onChange={() => saveSettings({ color: 'green' })}
                />
                <span 
                  className="color-preview" 
                  style={{ background: 'linear-gradient(135deg, #003300, #006600); border: 2px solid #33ff33' }}
                ></span>
                <span>Green</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="color"
                  value="orange"
                  checked={settings.color === 'orange'}
                  onChange={() => saveSettings({ color: 'orange' })}
                />
                <span 
                  className="color-preview" 
                  style={{ background: 'linear-gradient(135deg, #332200, #664400); border: 2px solid #ff9933' }}
                ></span>
                <span>Orange</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="color"
                  value="pink"
                  checked={settings.color === 'pink'}
                  onChange={() => saveSettings({ color: 'pink' })}
                />
                <span 
                  className="color-preview" 
                  style={{ background: 'linear-gradient(135deg, #330033, #660066); border: 2px solid #ff66cc' }}
                ></span>
                <span>Pink</span>
              </label>
            </div>
          </div>

          <div className="setting-group">
            <h3>Gender</h3>
            <div className="setting-option">
              <label className="select-wrapper">
                <select
                  value={settings.gender}
                  onChange={(e) => saveSettings({ gender: e.target.value })}
                  disabled={!currentUser || saving}
                >
                  <option value="">Select gender (optional)</option>
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <i className="fas fa-chevron-down" aria-hidden="true"></i>
              </label>
              {!currentUser && <small className="input-hint">Log in to update gender</small>}
            </div>
          </div>

          <button disabled={saving} className="save-settings-btn" onClick={() => { onClose(); }}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;