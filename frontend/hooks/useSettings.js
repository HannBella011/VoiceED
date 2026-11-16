// useSettings - VoiceED
// Hook for managing user settings (theme, notifications, etc.)

'use client';

import { useState, useEffect, useCallback } from 'react';

export function useSettings() {
  const [settings, setSettings] = useState({
    color: 'blue',
    notifications: true,
    theme: 'blue',
  });

  // Apply settings to document body - use functional update to avoid dependency on settings
  const applySettings = useCallback((newSettings) => {
    setSettings((prevSettings) => {
      const updatedSettings = { ...prevSettings, ...newSettings };

      // Remove all existing color themes
      document.body.classList.remove(
        'blue-theme',
        'purple-theme',
        'red-theme',
        'green-theme',
        'orange-theme',
        'pink-theme'
      );

      // Apply selected color theme
      if (updatedSettings.color) {
        document.body.classList.add(`${updatedSettings.color}-theme`);
      } else {
        document.body.classList.add('blue-theme');
      }

      return updatedSettings;
    });
  }, []);

  const loadSettings = useCallback(() => {
    const savedSettings = localStorage.getItem('shielded_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({
          color: parsed.color || 'blue',
          notifications: parsed.notifications ?? true,
          theme: parsed.color || 'blue',
        });
        applySettings(parsed);
      } catch (e) {
        applySettings({ color: 'blue', notifications: true });
      }
    } else {
      applySettings({ color: 'blue', notifications: true });
    }
  }, [applySettings]);

  const saveSettings = useCallback((newSettings) => {
    setSettings((prevSettings) => {
      const updated = { ...prevSettings, ...newSettings };
      localStorage.setItem('shielded_settings', JSON.stringify(updated));
      // Apply settings directly without calling applySettings to avoid circular dependency
      document.body.classList.remove(
        'blue-theme',
        'purple-theme',
        'red-theme',
        'green-theme',
        'orange-theme',
        'pink-theme'
      );
      if (updated.color) {
        document.body.classList.add(`${updated.color}-theme`);
      } else {
        document.body.classList.add('blue-theme');
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return { settings, applySettings, loadSettings, saveSettings };
}

export default useSettings;
