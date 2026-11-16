'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer } from '@/components/shared';
import { useAuth } from '@/hooks';
import { useModals } from '@/components/shared/GlobalModals';

function WellnessEDContent() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const {
    settingsOpen,
    setSettingsOpen,
    userMenuOpen,
    setUserMenuOpen,
    loginRequiredOpen,
    setLoginRequiredOpen,
  } = useModals();

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const activities = [
    {
      icon: 'fas fa-wind',
      title: 'Breathing Exercise',
      description:
        'Practice guided breathing exercises to reduce stress and improve focus.',
      href: '/breathing',
      btnText: 'Start Exercise',
    },
    {
      icon: 'fas fa-heart',
      title: 'Mood Tracker',
      description:
        'Track your daily mood and emotional patterns for better self-awareness.',
      href: '/mood-tracker',
      btnText: 'Track Mood',
    },
    {
      icon: 'fas fa-bullseye',
      title: 'Daily Goals',
      description: 'Set and track daily wellness goals to build healthy habits.',
      href: '/daily-goals',
      btnText: 'Set Goals',
    },
    {
      icon: 'fas fa-hourglass-half',
      title: 'Focus Timer',
      description:
        'Use the Pomodoro technique to boost productivity and manage study time.',
      href: '/focus-timer',
      btnText: 'Start Timer',
    },
    {
      icon: 'fas fa-spa',
      title: 'Meditation',
      description: 'Guided meditation sessions for relaxation and mental clarity.',
      href: '/meditation',
      btnText: 'Start Meditation',
    },
    {
      icon: 'fas fa-book-open',
      title: 'Wellness Journal',
      description:
        'Write and reflect on your thoughts, feelings, and daily experiences.',
      href: '/wellness-journal',
      btnText: 'Write Journal',
    },
  ];

  const handleNavigation = (href) => {
    if (isLoggedIn) {
      window.location.href = href;
    } else {
      sessionStorage.setItem('shielded_return_url', href);
      setLoginRequiredOpen(true);
    }
  };

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
              <a
                key={activity.href}
                href={activity.href}
                className="wellness-card activity-card"
                onClick={(event) => {
                  event.preventDefault();
                  handleNavigation(activity.href);
                }}
              >
                <div className="card-header">
                  <div className="card-icon">
                    <i className={activity.icon}></i>
                  </div>
                  <h3>{activity.title}</h3>
                </div>
                <div className="card-body">
                  <p className="card-description">{activity.description}</p>
                  <span className="card-btn">
                    {activity.btnText} <i className="fas fa-arrow-right"></i>
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default function WellnessED() {
  return <WellnessEDContent />;
}
