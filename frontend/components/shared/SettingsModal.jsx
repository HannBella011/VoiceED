// SettingsModal - VoiceED
// Theme/settings modal component matching base implementation

'use client';

import { useState, useEffect } from 'react';

export function SettingsModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState({
    color: 'blue',
  });

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('shielded_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ color: parsed.color || 'blue' });
      } catch (e) {
        setSettings({ color: 'blue' });
      }
    } else {
      setSettings({ color: 'blue' });
    }
  };

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

  const saveSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('shielded_settings', JSON.stringify(updated));
    applySettings(updated);
  };

  // Load settings on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadSettings();
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div id="settingsModal" className={'modal ' + (isOpen ? 'show' : '')} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="close" onClick={onClose}>&times;</span>
        <h2>Settings</h2>
        <div className="settings-content">
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
          <button className="save-settings-btn" onClick={() => { onClose(); }}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
