'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, LoginModal, UserMenuModal, ServiceCard } from '@/components/shared';

export default function Services() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLoginClick = () => {
    const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('shielded_current_user') || 'null') : null;
    if (currentUser) {
      setUserMenuOpen(true);
    } else {
      setLoginOpen(true);
    }
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const services = [
    {
      icon: <i className="fas fa-shield-alt"></i>,
      title: 'ReportED - Anonymous Reporting System',
      description: 'A secure space where students can submit crime reports or raise safety concerns in their school or community, anonymously or openly.',
      features: [
        'Confidential submission process',
        'Option for anonymity or identified reporting',
        'Forwarding to proper authorities',
        'Track report status securely',
      ],
      href: '/report-ed',
    },
    {
      icon: <i className="fas fa-heart"></i>,
      title: 'WellnessED - Student Wellness Hub',
      description: 'Dedicated to mental health, stress management, and motivation, offering practical tips and resources to balance academics and personal wellbeing.',
      features: [
        'Stress‑relief guides and exercises',
        'Motivation and productivity tips',
        'Regularly updated wellness content',
        'Mobile‑friendly access',
      ],
      href: '/wellness-ed',
    },
    {
      icon: <i className="fas fa-lightbulb"></i>,
      title: 'InspireED - Motivation and Achievements',
      description: 'A section highlighting motivational stories, student achievements, and encouraging quotes to inspire persistence, hope, and community pride.',
      features: [
        'Student success stories',
        'Inspirational quotes and messages',
        'Peer encouragement highlights',
        'Showcase of academic and personal milestones',
      ],
      href: '/inspire-ed',
    },
    {
      icon: <i className="fas fa-share-alt"></i>,
      title: 'ShareED - Collaborative Learning Space',
      description: 'A simple hub where students can upload, download, and share notes, reviewer sheets, and study materials with peers.',
      features: [
        'Easy upload/download system',
        'Subject‑organized reviewer sheets',
        'Peer‑to‑peer sharing',
        'Collaborative learning resources',
      ],
      href: '/share-ed',
    },
  ];

  return (
    <>
      <Navbar currentPage={pathname} variant="public" />
      
      <main className="services-main">
        <div className="container">
          <div className="services-welcome">
            <h2>Services</h2>
            <p>Delivers integrated safety and educational services, empowering students to report, learn, connect, and thrive within supportive communities.</p>
          </div>

          <div className="services-container">
            {services.map((service, index) => (
              <ServiceCard
                key={index}
                icon={service.icon}
                title={service.title}
                description={service.description}
                features={service.features}
                href={service.href}
              />
            ))}
          </div>
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToRegister={() => window.location.href = '/register'}
        onSwitchToForgotPassword={() => window.location.href = '/forgot-password'}
      />
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