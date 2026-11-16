'use client';

import { usePathname } from 'next/navigation';
import { Navbar, Footer } from '@/components/shared';
import { useModals } from '@/components/shared/GlobalModals';

export default function AboutPage() {
  const pathname = usePathname();
  const { setSettingsOpen } = useModals();

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="public"
        onSettingsClick={handleSettingsClick}
      />

      <main className="services-main">
        <div className="container">
          <div className="services-welcome">
            <h2>About</h2>
            <p>
              Dedicated to empower students by blending safety, learning, and community
              into one supportive platform.
            </p>
          </div>

          <div className="about-content-grid">
            {/* Mission Section */}
            <div className="about-section">
              <div className="about-section-header">
                <div className="about-header-content">
                  <div className="about-header-icon">
                    <i className="fas fa-bullseye"></i>
                  </div>
                  <h3 className="about-header-title">Mission</h3>
                </div>
              </div>
              <div className="about-section-content">
                <p>
                  VoiceED creates a safe and supportive educational environment through
                  four core services: ReportED for safety concerns, WellnessED for
                  mental health and motivation, InspireED for encouragement and
                  achievements, and ShareED for collaborative learning. We believe in
                  blending technology with compassion to empower every student's voice
                  and build communities where learning becomes a shared journey of
                  growth.
                </p>
                <div className="about-key-points">
                  <div className="about-key-point">
                    ReportED - Safe Reporting System
                  </div>
                  <div className="about-key-point">
                    WellnessED - Mental Health & Motivation
                  </div>
                  <div className="about-key-point">
                    InspireED - Encouragement & Achievement
                  </div>
                  <div className="about-key-point">
                    ShareED - Collaborative Learning
                  </div>
                </div>
              </div>
            </div>

            {/* Vision Section */}
            <div className="about-section">
              <div className="about-section-header">
                <div className="about-header-content">
                  <div className="about-header-icon">
                    <i className="fas fa-eye"></i>
                  </div>
                  <h3 className="about-header-title">Vision</h3>
                </div>
              </div>
              <div className="about-section-content">
                <p>
                  A world where every student has access to safe learning environments,
                  quality educational resources, and supportive communities. We envision
                  schools and universities as hubs of innovation, safety, and academic
                  excellence.
                </p>
                <div className="about-key-points">
                  <div className="about-key-point">Safe Learning Environments</div>
                  <div className="about-key-point">Quality Educational Resources</div>
                  <div className="about-key-point">Supportive Communities</div>
                  <div className="about-key-point">Innovation Hubs</div>
                </div>
              </div>
            </div>

            {/* Values Section */}
            <div className="about-section">
              <div className="about-section-header">
                <div className="about-header-content">
                  <div className="about-header-icon">
                    <i className="fas fa-heart"></i>
                  </div>
                  <h3 className="about-header-title">Values</h3>
                </div>
              </div>
              <div className="about-section-content">
                <p>
                  Safety, empathy, innovation, and community-driven solutions. We
                  prioritize student voices, practical implementation, and measurable
                  impact over futuristic concepts that can't be realistically deployed.
                </p>
                <div className="about-key-points">
                  <div className="about-key-point">Safety First</div>
                  <div className="about-key-point">Empathy-Driven</div>
                  <div className="about-key-point">Innovation Focus</div>
                  <div className="about-key-point">Community-Driven</div>
                  <div className="about-key-point">Accessibility for All</div>
                  <div className="about-key-point">Integrity in Action</div>
                </div>
              </div>
            </div>

            {/* Purpose Section */}
            <div className="about-section">
              <div className="about-section-header">
                <div className="about-header-content">
                  <div className="about-header-icon">
                    <i className="fas fa-cogs"></i>
                  </div>
                  <h3 className="about-header-title">Purpose</h3>
                </div>
              </div>
              <div className="about-section-content">
                <p>
                  To unite safety and education in one platform, offering practical,
                  student‑centered solutions that can be implemented immediately while
                  building sustainable systems for the future. We exist to empower
                  learners, protect communities, and ensure that education is accessible
                  and secure for all.
                </p>
                <div className="about-key-points">
                  <div className="about-key-point">Student-Centered Design</div>
                  <div className="about-key-point">Practical Implementation</div>
                  <div className="about-key-point">Actionable Solutions</div>
                  <div className="about-key-point">Sustainable Growth</div>
                </div>
              </div>
            </div>

            {/* SDG Connection Section */}
            <div className="about-section">
              <div className="about-section-header">
                <div className="about-header-content">
                  <div className="about-header-icon">
                    <i className="fas fa-globe"></i>
                  </div>
                  <h3 className="about-header-title">SDG Connection</h3>
                </div>
              </div>
              <div className="about-section-content">
                <p>
                  Aligns its mission and initiatives with the United Nations Sustainable
                  Development Goals (SDGs), ensuring that our work contributes to global
                  progress while addressing local student needs. By focusing on safety,
                  education, and community empowerment, we connect our platform to goals
                  that matter most for learners and their communities.
                </p>
                <p>Six SDG Connections:</p>
                <div className="about-key-points">
                  <div className="about-key-point">SDG 4: Quality Education</div>
                  <div className="about-key-point">
                    SDG 3: Good Health and Well-Being
                  </div>
                  <div className="about-key-point">
                    SDG 16: Peace, Justice, and Strong Institutions
                  </div>
                  <div className="about-key-point">
                    SDG 17: Partnerships for the Goals
                  </div>
                  <div className="about-key-point">SDG 10: Reduced Inequalities</div>
                  <div className="about-key-point">
                    SDG 9: Industry, Innovation, and Infrastructure
                  </div>
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
