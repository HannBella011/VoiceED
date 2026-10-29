'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal, WellnessActivityCard } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';

function WellnessEdContent() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const activities = [
    {
      icon: <i className="fas fa-wind"></i>,
      title: 'Breathing Exercise',
      description: 'Practice guided breathing exercises to reduce stress and improve focus.',
      buttonText: 'Start Exercise',
      href: '/breathing',
    },
    {
      icon: <i className="fas fa-heart"></i>,
      title: 'Mood Tracker',
      description: 'Track your daily mood and emotional patterns for better self-awareness.',
      buttonText: 'Track Mood',
      href: '/mood-tracker',
    },
    {
      icon: <i className="fas fa-bullseye"></i>,
      title: 'Daily Goals',
      description: 'Set and track daily wellness goals to build healthy habits.',
      buttonText: 'Set Goals',
      href: '/daily-goals',
    },
    {
      icon: <i className="fas fa-hourglass-half"></i>,
      title: 'Focus Timer',
      description: 'Use the Pomodoro technique to boost productivity and manage study time.',
      buttonText: 'Start Timer',
      href: '/focus-timer',
    },
    {
      icon: <i className="fas fa-spa"></i>,
      title: 'Meditation',
      description: 'Guided meditation sessions for relaxation and mental clarity.',
      buttonText: 'Start Meditation',
      href: '/meditation',
    },
    {
      icon: <i className="fas fa-book-open"></i>,
      title: 'Wellness Journal',
      description: 'Write and reflect on your thoughts, feelings, and daily experiences.',
      buttonText: 'Write Journal',
      href: '/wellness-journal',
    },
  ];

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="wellness"
        onUserMenuClick={handleUserMenuClick}
        onSettingsClick={handleSettingsClick}
      />

      <main className="wellness-main">
        <div className="container">
          <div className="wellness-hero">
            <h2>WellnessED</h2>
            <p>Your personal wellness companion for balanced student life</p>
          </div>

          <div className="wellness-grid">
            {activities.map((activity, index) => (
              <WellnessActivityCard
                key={index}
                icon={activity.icon}
                title={activity.title}
                description={activity.description}
                buttonText={activity.buttonText}
                href={activity.href}
              />
            ))}
          </div>
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <UserMenuModal
        isOpen={userMenuOpen}
        onClose={() => setUserMenuOpen(false)}
        onProfileClick={() => window.location.href = '/profile'}
        onLogoutClick={() => {
          localStorage.removeItem('shielded_current_user');
        }}
      />
    </>
  );
}

export default function WellnessEd() {
  return (
    <ProtectedRoute fallback={null}>
      <WellnessEdContent />
    </ProtectedRoute>
  );
}