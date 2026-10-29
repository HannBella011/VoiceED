'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';

function InspireEdContent() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
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
          {/* Hero Section */}
          <div className="wellness-hero">
            <h2>InspireED</h2>
            <p className="hero-subtitle">A dedicated platform highlighting motivational stories, student achievements, and encouraging quotes.</p>
          </div>

          {/* InspireED Layout with Sidebar */}
          <div className="inspireED-layout">
            {/* Left Sidebar Navigation */}
            <aside className="inspireED-sidebar">
              <nav className="sidebar-nav">
                <button className="sidebar-tab active" data-tab="home">
                  <i className="fas fa-home"></i>
                  <span>Home</span>
                </button>
                <button className="sidebar-tab" data-tab="quotes">
                  <i className="fas fa-lightbulb"></i>
                  <span>Quotes</span>
                </button>
                <button className="sidebar-tab" data-tab="stories">
                  <i className="fas fa-graduation-cap"></i>
                  <span>Stories</span>
                </button>
                <button className="sidebar-tab" data-tab="kudos">
                  <i className="fas fa-heart"></i>
                  <span>Kudos</span>
                </button>
                <button className="sidebar-tab" data-tab="milestones">
                  <i className="fas fa-trophy"></i>
                  <span>Milestones</span>
                </button>
                <button className="sidebar-tab" data-tab="activity">
                  <i className="fas fa-chart-line"></i>
                  <span>My Activity</span>
                </button>
              </nav>
            </aside>

            {/* Main Content Area */}
            <div className="inspireED-content">
              {/* Home Tab - Feed of All Posts */}
              <div className="tab-content active" id="home-tab">
                <div className="content-container">
                  <div className="feed-header">
                    <h3>Latest Posts</h3>
                    <div className="header-actions">
                      <div className="search-bar">
                        <input type="text" className="search-input" id="searchPosts" placeholder="Search posts..." />
                        <i className="fas fa-search search-icon"></i>
                      </div>
                      <button className="create-post-btn" id="createPostBtn">
                        <i className="fas fa-plus"></i>
                        Create Post
                      </button>
                    </div>
                  </div>
                  <div className="posts-feed" id="postsFeed">
                    {/* Posts will be dynamically added */}
                  </div>
                </div>
              </div>

              {/* Quotes Tab */}
              <div className="tab-content" id="quotes-tab">
                <div className="content-container">
                  <div className="feed-header">
                    <h3>Quotes</h3>
                    <button className="create-post-btn" id="addQuoteBtn">
                      <i className="fas fa-plus"></i>
                      Add Quote
                    </button>
                  </div>
                  <div className="daily-quote-card">
                    <div className="quote-content">
                      <i className="fas fa-quote-left quote-icon"></i>
                      <p className="quote-text" id="dailyQuote">"The only way to do great work is to love what you do."</p>
                      <p className="quote-author" id="quoteAuthor">- Steve Jobs</p>
                    </div>
                    <div className="quote-actions">
                      <button className="quote-btn" id="prevQuoteBtn">
                        <i className="fas fa-chevron-left"></i>
                        Previous
                      </button>
                      <button className="quote-btn" id="copyQuoteBtn">
                        <i className="fas fa-copy"></i>
                        Copy Quote
                      </button>
                      <button className="quote-btn" id="deleteQuoteBtn">
                        <i className="fas fa-trash"></i>
                        Delete Quote
                      </button>
                      <button className="quote-btn" id="nextQuoteBtn">
                        Next
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                    <div className="quote-interactions">
                      <button className="interaction-btn heart-btn" id="heartQuoteBtn">
                        <i className="fas fa-heart"></i>
                        <span id="heartCount">0</span>
                      </button>
                      <button className="interaction-btn comment-btn" id="commentQuoteBtn">
                        <i className="fas fa-comment"></i>
                        <span id="commentCount">0</span>
                      </button>
                      <button className="interaction-btn share-btn" id="shareQuoteBtn">
                        <i className="fas fa-share"></i>
                        <span id="shareCount">0</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stories Tab */}
              <div className="tab-content" id="stories-tab">
                <div className="content-container">
                  <div className="feed-header">
                    <h3>Stories</h3>
                    <button className="create-post-btn" id="shareStoryBtn">
                      <i className="fas fa-pen"></i>
                      Share Your Story
                    </button>
                  </div>
                  <div className="stories-grid" id="storiesGrid">
                    {/* Story cards will be dynamically added */}
                  </div>
                </div>
              </div>

              {/* Kudos Tab */}
              <div className="tab-content" id="kudos-tab">
                <div className="content-container">
                  <div className="feed-header">
                    <h3>Kudos</h3>
                    <div className="header-actions">
                      <div className="search-bar">
                        <input type="text" className="search-input" id="searchKudos" placeholder="Search name..." />
                        <i className="fas fa-search search-icon"></i>
                      </div>
                      <button className="create-post-btn" id="sendKudosBtn">
                        <i className="fas fa-heart"></i>
                        Send Kudos
                      </button>
                    </div>
                  </div>
                  <div className="kudos-grid" id="kudosGrid">
                    {/* Kudos cards will be dynamically added */}
                  </div>
                </div>
              </div>

              {/* Milestones Tab */}
              <div className="tab-content" id="milestones-tab">
                <div className="content-container">
                  <div className="feed-header">
                    <h3>Milestones</h3>
                    <button className="create-post-btn" id="addMilestoneBtn">
                      <i className="fas fa-trophy"></i>
                      Add Milestone
                    </button>
                  </div>
                  <div className="milestones-grid" id="milestonesGrid">
                    {/* Milestone cards will be dynamically added */}
                  </div>
                </div>
              </div>

              {/* My Activity Tab */}
              <div className="tab-content" id="activity-tab">
                <div className="content-container">
                  <div className="feed-header">
                    <h3>My Activity</h3>
                  </div>
                  <div className="activity-feed" id="activityFeed">
                    {/* Activity items will be dynamically added */}
                  </div>
                </div>
              </div>
            </div>
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

export default function InspireEd() {
  return (
    <ProtectedRoute fallback={null}>
      <InspireEdContent />
    </ProtectedRoute>
  );
}