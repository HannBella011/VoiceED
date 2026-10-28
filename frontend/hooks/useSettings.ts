'use client';

import { useEffect, useCallback } from 'react';

interface Settings {
  color: string;
}

export function useSettings() {
  const applySettings = useCallback((settings: Settings) => {
    // Remove all existing color themes
    document.body.classList.remove(
      'blue-theme', 'purple-theme', 'red-theme', 
      'green-theme', 'orange-theme', 'pink-theme'
    );
    
    // Apply selected color theme
    if (settings.color) {
      document.body.classList.add(`${settings.color}-theme`);
    } else {
      document.body.classList.add('blue-theme');
    }
  }, []);

  const loadSettings = useCallback(() => {
    const savedSettings = localStorage.getItem('shielded_settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      
      // Apply saved settings to form
      const colorRadio = document.querySelector(
        `input[name="color"][value="${settings.color}"]`
      ) as HTMLInputElement;
      if (colorRadio) {
        colorRadio.checked = true;
      }
      
      applySettings(settings);
    } else {
      applySettings({ color: 'blue' });
    }
  }, [applySettings]);

  const saveSettings = useCallback((color: string) => {
    const settings: Settings = { color };
    localStorage.setItem('shielded_settings', JSON.stringify(settings));
    applySettings(settings);
    // Notification would be shown by the component
  }, [applySettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return { applySettings, loadSettings, saveSettings };
}

export default useSettings;