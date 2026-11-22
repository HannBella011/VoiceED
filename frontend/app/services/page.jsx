'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar, Footer } from '@/components/shared';
import { useProtectedNavigation } from '@/lib/routeProtection';
import { useModals } from '@/components/shared/GlobalModals';

export default function Services() {
  const pathname = usePathname();
  const { navigateToService } = useProtectedNavigation();
  const { settingsOpen, setSettingsOpen, loginRequiredOpen, setLoginRequiredOpen } =
    useModals();

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleNavigation = navigateToService;

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="public"
        onSettingsClick={handleSettingsClick}
      />

      <main className="services-main voiceed-page-background">
        <div className="container">
          <div className="services-welcome">
            <h2>Services</h2>
            <p>
              Delivers integrated safety and educational services, empowering students
              to report, learn, connect, and thrive within supportive communities.
            </p>
          </div>

          <div className="services-container">
            <div className="service-box" onClick={() => handleNavigation('/report')}>
              <div className="service-header">
                <div className="service-icon">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <h3>ReportED - Anonymous Reporting System</h3>
              </div>
              <div className="service-details">
                <p>
                  A secure space where students can submit crime reports or raise safety
                  concerns in their school or community, anonymously or openly.
                </p>
                <div className="service-features">
                  <div className="feature-item">Confidential submission process</div>
                  <div className="feature-item">
                    Option for anonymity or identified reporting
                  </div>
                  <div className="feature-item">Forwarding to proper authorities</div>
                  <div className="feature-item">Track report status securely</div>
                </div>
              </div>
            </div>

            <div
              className="service-box"
              onClick={() => handleNavigation('/wellness-ed')}
            >
              <div className="service-header">
                <div className="service-icon">
                  <i className="fas fa-heart"></i>
                </div>
                <h3>WellnessED - Student Wellness Hub</h3>
              </div>
              <div className="service-details">
                <p>
                  Dedicated to mental health, stress management, and motivation,
                  offering practical tips and resources to balance academics and
                  personal wellbeing.
                </p>
                <div className="service-features">
                  <div className="feature-item">Stress‑relief guides and exercises</div>
                  <div className="feature-item">Motivation and productivity tips</div>
                  <div className="feature-item">Regularly updated wellness content</div>
                  <div className="feature-item">Mobile‑friendly access</div>
                </div>
              </div>
            </div>

            <div
              className="service-box"
              onClick={() => handleNavigation('/inspire-ed')}
            >
              <div className="service-header">
                <div className="service-icon">
                  <i className="fas fa-lightbulb"></i>
                </div>
                <h3>InspireED - Motivation and Achievements</h3>
              </div>
              <div className="service-details">
                <p>
                  A section highlighting motivational stories, student achievements, and
                  encouraging quotes to inspire persistence, hope, and community pride.
                </p>
                <div className="service-features">
                  <div className="feature-item">Student success stories</div>
                  <div className="feature-item">Inspirational quotes and messages</div>
                  <div className="feature-item">Peer encouragement highlights</div>
                  <div className="feature-item">
                    Showcase of academic and personal milestones
                  </div>
                </div>
              </div>
            </div>

            <div className="service-box" onClick={() => handleNavigation('/share-ed')}>
              <div className="service-header">
                <div className="service-icon">
                  <i className="fas fa-share-alt"></i>
                </div>
                <h3>ShareED - Collaborative Learning Space</h3>
              </div>
              <div className="service-details">
                <p>
                  A simple hub where students can upload, download, and share notes,
                  reviewer sheets, and study materials with peers.
                </p>
                <div className="service-features">
                  <div className="feature-item">Easy upload/download system</div>
                  <div className="feature-item">Subject‑organized reviewer sheets</div>
                  <div className="feature-item">Peer‑to‑peer sharing</div>
                  <div className="feature-item">Collaborative learning resources</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
