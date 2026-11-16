'use client';

import { usePathname } from 'next/navigation';
import { Navbar, Footer } from '@/components/shared';
import { useModals } from '@/components/shared/GlobalModals';
import { useProtectedNavigation } from '@/lib/routeProtection';

export default function HomePage() {
  const pathname = usePathname();
  const { setSettingsOpen } = useModals();
  const { navigateToService } = useProtectedNavigation();
  const handleSettingsClick = () => setSettingsOpen(true);
  const handleGetStarted = () => navigateToService('/dashboard');

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="public"
        onSettingsClick={handleSettingsClick}
      />

      <main className="dashboard-main">
        <div className="container">
          {/* Hero Section - match base HTML: NO card wrapper, just dashboard-welcome */}
          <div className="dashboard-welcome">
            <h2>Welcome back, Student!</h2>
            <p>
              Your safety hub for voices, wellness, and collaboration—built for schools,
              open to all!
            </p>
            <button
              className="cta-button"
              id="getStartedBtn"
              onClick={handleGetStarted}
            >
              Get Started
            </button>
          </div>

          {/* Service Cards Grid - match base HTML: dashboard-grid with dashboard-card (semi-transparent) */}
          <div className="dashboard-grid">
            <div
              className="dashboard-card"
              onClick={() => navigateToService('/report')}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3>ReportED</h3>
              <p className="stat-label">
                A safe, anonymous space where students submit crime reports, raise
                safety concerns, and ensure their voices are heard.
              </p>
            </div>

            <div
              className="dashboard-card"
              onClick={() => navigateToService('/wellness-ed')}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-icon">
                <i className="fas fa-heart"></i>
              </div>
              <h3>WellnessED</h3>
              <p className="stat-label">
                Practical tips on mental health, stress management, and motivation to
                help students balance academics and personal wellbeing.
              </p>
            </div>

            <div
              className="dashboard-card"
              onClick={() => navigateToService('/inspire-ed')}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-icon">
                <i className="fas fa-lightbulb"></i>
              </div>
              <h3>InspireED</h3>
              <p className="stat-label">
                Motivational stories, student achievements, and encouraging quotes
                designed to inspire persistence and hope among learners.
              </p>
            </div>

            <div
              className="dashboard-card"
              onClick={() => navigateToService('/share-ed')}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-icon">
                <i className="fas fa-share-alt"></i>
              </div>
              <h3>ShareED</h3>
              <p className="stat-label">
                A simple hub where students can upload, download, and share notes,
                reviewer sheets, and study materials with peers.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
