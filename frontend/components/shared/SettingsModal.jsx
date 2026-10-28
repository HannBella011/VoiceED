'use client';

import { useEffect } from 'react';

export function SettingsModal({ isOpen, onClose }) {
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
    <div id="settingsModal" className={`modal ${isOpen ? 'show' : ''}`}>
      <div className="modal-content">
        <span className="close" onClick={onClose}>×</span>
        <h2>Settings</h2>
        <div className="settings-content">
          <div className="setting-group">
            <h3>Select Color</h3>
            <div className="color-options">
              <label>
                <input type="radio" name="color" value="blue" defaultChecked />
                <span
                  className="color-preview"
                  style={{
                    background: 'linear-gradient(135deg, #0a0a0a, #1a1a2e)',
                    border: '2px solid #00d4ff',
                  }}
                ></span>
                <span>Blue</span>
              </label>
              <label>
                <input type="radio" name="color" value="purple" />
                <span
                  className="color-preview"
                  style={{
                    background: 'linear-gradient(135deg, #1a0033, #330066)',
                    border: '2px solid #9933ff',
                  }}
                ></span>
                <span>Purple</span>
              </label>
              <label>
                <input type="radio" name="color" value="red" />
                <span
                  className="color-preview"
                  style={{
                    background: 'linear-gradient(135deg, #330000, #660000)',
                    border: '2px solid #ff3333',
                  }}
                ></span>
                <span>Red</span>
              </label>
              <label>
                <input type="radio" name="color" value="green" />
                <span
                  className="color-preview"
                  style={{
                    background: 'linear-gradient(135deg, #003300, #006600)',
                    border: '2px solid #33ff33',
                  }}
                ></span>
                <span>Green</span>
              </label>
              <label>
                <input type="radio" name="color" value="orange" />
                <span
                  className="color-preview"
                  style={{
                    background: 'linear-gradient(135deg, #332200, #664400)',
                    border: '2px solid #ff9933',
                  }}
                ></span>
                <span>Orange</span>
              </label>
              <label>
                <input type="radio" name="color" value="pink" />
                <span
                  className="color-preview"
                  style={{
                    background: 'linear-gradient(135deg, #330033, #660066)',
                    border: '2px solid #ff66cc',
                  }}
                ></span>
                <span>Pink</span>
              </label>
            </div>
          </div>
          <button className="save-settings-btn" onClick={onClose}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;