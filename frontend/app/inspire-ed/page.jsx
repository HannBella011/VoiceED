'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';

function InspireEDContent() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [quotes, setQuotes] = useState([
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", isUserAdded: false },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill", isUserAdded: false },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt", isUserAdded: false },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", isUserAdded: false },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", isUserAdded: false }
  ]);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [heartedQuotes, setHeartedQuotes] = useState(new Set());
  const [heartCount, setHeartCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  useEffect(() => {
    const savedPosts = localStorage.getItem('inspireED_posts');
    if (savedPosts) {
      try {
        setPosts(JSON.parse(savedPosts));
      } catch (e) {
        setPosts([]);
      }
    } else {
      // Default posts
      const defaultPosts = [
        {
          id: 1,
          type: 'quote',
          author: 'System',
          avatar: 'S',
          time: '2 hours ago',
          content: { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
          likes: 28, comments: 15, shares: 12, userLiked: false, isUserCreated: false
        },
        {
          id: 2,
          type: 'story',
          author: 'Jane Doe',
          avatar: 'J',
          time: '5 hours ago',
          content: { text: 'I started my freshman year with failing grades. Through dedication and seeking help from professors, I turned my academic journey around. Never be afraid to ask for help!', category: 'Academic Growth' },
          likes: 42, comments: 12, shares: 8, userLiked: false, isUserCreated: false
        },
        {
          id: 3,
          type: 'kudos',
          author: 'John Smith',
          avatar: 'J',
          time: '1 day ago',
          content: { text: 'Big congratulations to the study group for acing the finals! Your hard work and dedication really paid off.', recipient: 'Study Group A' },
          likes: 35, comments: 8, shares: 5, userLiked: false, isUserCreated: false
        }
      ];
      setPosts(defaultPosts);
      localStorage.setItem('inspireED_posts', JSON.stringify(defaultPosts));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('inspireED_posts', JSON.stringify(posts));
  }, [posts]);

  const filteredPosts = posts.filter(post => {
    if (!searchTerm) return true;
    const contentText = JSON.stringify(post.content).toLowerCase();
    const authorName = post.author.toLowerCase();
    return contentText.includes(searchTerm.toLowerCase()) || authorName.includes(searchTerm.toLowerCase());
  });

  const handleLike = (postId) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: post.userLiked ? post.likes - 1 : post.likes + 1,
          userLiked: !post.userLiked
        };
      }
      return post;
    }));
  };

  const handleCreatePost = (content) => {
    const newPost = {
      id: Date.now(),
      type: 'post',
      author: 'You',
      avatar: 'Y',
      time: 'Just now',
      content: { text: content },
      likes: 0, comments: 0, shares: 0, userLiked: false, isUserCreated: true
    };
    setPosts(prev => [newPost, ...prev]);
  };

  const handleAddQuote = (text, author) => {
    const newQuote = { text, author, isUserAdded: true };
    setQuotes(prev => [...prev, newQuote]);
    setCurrentQuoteIndex(prev => prev + 1);
    
    // Also add to posts
    const newPost = {
      id: Date.now(),
      type: 'quote',
      author: 'You',
      avatar: 'Y',
      time: 'Just now',
      content: { text, author },
      likes: 0, comments: 0, shares: 0, userLiked: false, isUserCreated: true
    };
    setPosts(prev => [newPost, ...prev]);
  };

  const handleShareStory = (content) => {
    const newPost = {
      id: Date.now(),
      type: 'story',
      author: 'You',
      avatar: 'Y',
      time: 'Just now',
      content: { text: content },
      likes: 0, comments: 0, shares: 0, userLiked: false, isUserCreated: true
    };
    setPosts(prev => [newPost, ...prev]);
  };

  const handleSendKudos = (recipient, content, anonymous) => {
    const newPost = {
      id: Date.now(),
      type: 'kudos',
      author: anonymous ? 'Anonymous' : 'You',
      avatar: anonymous ? 'A' : 'Y',
      time: 'Just now',
      content: { text: content, recipient },
      likes: 0, comments: 0, shares: 0, userLiked: false, isUserCreated: true
    };
    setPosts(prev => [newPost, ...prev]);
  };

  const handleAddMilestone = (title, description) => {
    const newPost = {
      id: Date.now(),
      type: 'milestone',
      author: 'You',
      avatar: 'Y',
      time: 'Just now',
      content: { title, text: description },
      likes: 0, comments: 0, shares: 0, userLiked: false, isUserCreated: true
    };
    setPosts(prev => [newPost, ...prev]);
  };

  const handleQuoteHeart = () => {
    if (heartedQuotes.has(currentQuoteIndex)) {
      alert('You have already liked this quote!');
      return;
    }
    setHeartedQuotes(prev => new Set([...prev, currentQuoteIndex]));
    setHeartCount(prev => prev + 1);
  };

  const handleQuoteNext = () => {
    setCurrentQuoteIndex(prev => (prev + 1) % quotes.length);
    setHeartCount(0);
    setCommentCount(0);
    setShareCount(0);
  };

  const handleQuotePrev = () => {
    setCurrentQuoteIndex(prev => (prev - 1 + quotes.length) % quotes.length);
    setHeartCount(0);
    setCommentCount(0);
    setShareCount(0);
  };

  const handleQuoteDelete = () => {
    if (quotes[currentQuoteIndex].isUserAdded) {
      if (confirm('Are you sure you want to delete this quote?')) {
        setQuotes(prev => prev.filter((_, i) => i !== currentQuoteIndex));
        setCurrentQuoteIndex(prev => Math.min(prev, quotes.length - 2));
      }
    } else {
      alert('You can only delete quotes you have added!');
    }
  };

  const handleQuoteCopy = () => {
    const fullQuote = `"${quotes[currentQuoteIndex].text}" - ${quotes[currentQuoteIndex].author}`;
    navigator.clipboard.writeText(fullQuote).then(() => {
      alert('Quote copied to clipboard!');
    });
  };

  const handleQuoteShare = () => {
    setShareCount(prev => prev + 1);
    const fullQuote = `"${quotes[currentQuoteIndex].text}" - ${quotes[currentQuoteIndex].author}`;
    if (navigator.share) {
      navigator.share({ title: 'Daily Inspiration', text: fullQuote });
    } else {
      navigator.clipboard.writeText(fullQuote);
      alert('Quote copied to clipboard!');
    }
  };

  const tabs = [
    { id: 'home', icon: 'fas fa-home', label: 'Home' },
    { id: 'quotes', icon: 'fas fa-lightbulb', label: 'Quotes' },
    { id: 'stories', icon: 'fas fa-graduation-cap', label: 'Stories' },
    { id: 'kudos', icon: 'fas fa-heart', label: 'Kudos' },
    { id: 'milestones', icon: 'fas fa-trophy', label: 'Milestones' },
    { id: 'activity', icon: 'fas fa-chart-line', label: 'My Activity' }
  ];

  const sampleStories = [
    { id: 1, category: 'academic', title: 'From Struggling Student to Dean\'s Lister', narrative: 'I started my freshman year with failing grades. Through dedication and seeking help from professors, I turned my academic journey around.', keyTakeaways: 'Never be afraid to ask for help. Consistency beats intensity.', year: '2024', author: 'Anonymous' },
    { id: 2, category: 'challenges', title: 'Overcoming Financial Hurdles', narrative: 'Working part-time while studying full-time was challenging, but it taught me time management and resilience.', keyTakeaways: 'Challenges make us stronger. Balance is key.', year: '2023', author: 'Maria Santos' },
    { id: 3, category: 'leadership', title: 'Leading a Community Project', narrative: 'Organized a literacy program for local children. It was challenging but incredibly rewarding.', keyTakeaways: 'Leadership is about service. Community impact matters.', year: '2024', author: 'Juan Dela Cruz' }
  ];

  const sampleKudos = [
    { recipient: 'Study Group A', message: 'Amazing work on the final project! Team effort at its best.', sender: 'Anonymous', time: '2 hours ago' },
    { recipient: 'Maria', message: 'Thank you for staying up late to help me debug my code!', sender: 'John', time: '5 hours ago' },
    { recipient: 'CS Department', message: 'The faculty has been incredibly supportive this semester.', sender: 'Anonymous', time: '1 day ago' }
  ];

  const sampleMilestones = [
    { title: 'Dean\'s List', description: 'Achieved Dean\'s List for 3 consecutive semesters', category: 'academic', cheers: 124 },
    { title: 'Research Grant', description: 'Received undergraduate research grant', category: 'innovation', cheers: 89 },
    { title: 'Hackathon Winner', description: '1st Place in University Hackathon 2024', category: 'innovation', cheers: 156 },
    { title: 'Community Service Award', description: 'Recognized for 100+ hours of community service', category: 'leadership', cheers: 98 }
  ];

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="dashboard"
        onUserMenuClick={handleUserMenuClick}
        onSettingsClick={handleSettingsClick}
      />

      <main className="wellness-main">
        <div className="container">
          <div className="wellness-hero">
            <h2>InspireED</h2>
            <p className="hero-subtitle">A dedicated platform highlighting motivational stories, student achievements, and encouraging quotes.</p>
          </div>

          <div className="inspireED-layout">
            <aside className="inspireED-sidebar">
              <nav className="sidebar-nav">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                    data-tab={tab.id}
                  >
                    <i className={tab.icon}></i>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </aside>

            <div className="inspireED-content">
              {/* Home Tab */}
              <div className={`tab-content ${activeTab === 'home' ? 'active' : ''}`} id="home-tab">
                <div className="content-container">
                  <div className="feed-header">
                    <h3>Latest Posts</h3>
                    <div className="header-actions">
                      <div className="search-bar">
                        <input
                          type="text"
                          className="search-input"
                          id="searchPosts"
                          placeholder="Search posts..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <i className="fas fa-search search-icon"></i>
                      </div>
                      <button className="create-post-btn" onClick={() => setShowCreatePostModal(true)}>
                        <i className="fas fa-plus"></i> Create Post
                      </button>
                    </div>
                  </div>
                  <div className="posts-feed" id="postsFeed">
                    {filteredPosts.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No posts found</p>
                    ) : (
                      filteredPosts.map(post => (
                        <div key={post.id} className="post-card">
                          <div className="post-header">
                            <div className="post-avatar">{post.avatar}</div>
                            <div className="post-author-info">
                              <div className="post-author-name">{post.author}</div>
                              <div className="post-time">{post.time}</div>
                            </div>
                            <span className="post-type">{post.type.charAt(0).toUpperCase() + post.type.slice(1)}</span>
                          </div>
                          <div className="post-content">
                            {post.type === 'quote' && (
                              <div className="post-quote">"{post.content.text}" - {post.content.author}</div>
                            )}
                            {post.type === 'story' && (
                              <p className="post-text">{post.content.text}</p>
                            )}
                            {post.type === 'kudos' && (
                              <p className="post-text"><strong>To: {post.content.recipient}</strong><br/>{post.content.text}</p>
                            )}
                            {post.type === 'milestone' && (
                              <p className="post-text"><strong>{post.content.title}</strong><br/>{post.content.text}</p>
                            )}
                            {post.type === 'post' && (
                              <p className="post-text">{post.content.text}</p>
                            )}
                          </div>
                          <div className="post-interactions">
                            <button
                              className={`post-interaction-btn ${post.userLiked ? 'liked' : ''}`}
                              onClick={() => handleLike(post.id)}
                            >
                              <i className="fas fa-heart"></i> <span>{post.likes}</span>
                            </button>
                            <button className="post-interaction-btn" onClick={() => alert('Comments opened')}>
                              <i className="fas fa-comment"></i> <span>{post.comments}</span>
                            </button>
                            <button className="post-interaction-btn" onClick={() => alert('Shared!')}>
                              <i className="fas fa-share"></i> <span>{post.shares}</span>
                            </button>
                            {post.isUserCreated && (
                              <button className="post-interaction-btn delete-btn" onClick={() => setPosts(prev => prev.filter(p => p.id !== post.id))}>
                                <i className="fas fa-trash"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Quotes Tab */}
              <div className={`tab-content ${activeTab === 'quotes' ? 'active' : ''}`} id="quotes-tab">
                <div className="content-container">
                  <div className="feed-header">
                    <h3>Quotes</h3>
                    <button className="create-post-btn" onClick={() => setShowAddQuoteModal(true)}>
                      <i className="fas fa-plus"></i> Add Quote
                    </button>
                  </div>
                  <div className="daily-quote-card">
                    <div className="quote-content">
                      <i className="fas fa-quote-left quote-icon"></i>
                      <p className="quote-text" id="dailyQuote">"{quotes[currentQuoteIndex]?.text || ''}"</p>
                      <p className="quote-author" id="quoteAuthor">- {quotes[currentQuoteIndex]?.author || ''}</p>
                    </div>
                    <div className="quote-actions">
                      <button className="quote-btn" onClick={handleQuotePrev}>
                        <i className="fas fa-chevron-left"></i> Previous
                      </button>
                      <button className="quote-btn" onClick={handleQuoteCopy}>
                        <i className="fas fa-copy"></i> Copy Quote
                      </button>
                      {quotes[currentQuoteIndex]?.isUserAdded && (
                        <button className="quote-btn" onClick={handleQuoteDelete}>
                          <i className="fas fa-trash"></i> Delete Quote
                        </button>
                      )}
                      <button className="quote-btn" onClick={handleQuoteNext}>
                        Next <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                    <div className="quote-interactions">
                      <button className={`interaction-btn heart-btn ${heartedQuotes.has(currentQuoteIndex) ? 'active' : ''}`} onClick={handleQuoteHeart}>
                        <i className="fas fa-heart"></i> <span id="heartCount">{heartCount}</span>
                      </button>
                      <button className="interaction-btn comment-btn" onClick={() => alert('Comments opened')}>
                        <i className="fas fa-comment"></i> <span id="commentCount">{commentCount}</span>
                      </button>
                      <button className="interaction-btn share-btn" onClick={handleQuoteShare}>
                        <i className="fas fa-share"></i> <span id="shareCount">{shareCount}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stories Tab */}
              <div className={`tab-content ${activeTab === 'stories' ? 'active' : ''}`} id="stories-tab">
                <div className="content-container">
                  <div className="feed-header">
                    <h3>Stories</h3>
                    <button className="create-post-btn" onClick={() => setShowShareStoryModal(true)}>
                      <i className="fas fa-pen"></i> Share Your Story
                    </button>
                  </div>
                  <div className="stories-grid" id="storiesGrid">
                    {sampleStories.map(story => (
                      <div key={story.id} className="story-card">
                        <div className="story-header">
                          <div className="story-avatar"><i className="fas fa-user"></i></div>
                          <div className="story-info">
                            <h4>{story.title}</h4>
                            <p className="story-author">{story.author} • {story.year}</p>
                          </div>
                        </div>
                        <p className="story-narrative">{story.narrative}</p>
                        <p className="story-takeaways"><strong>Key Takeaways:</strong> {story.keyTakeaways}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Kudos Tab */}
              <div className={`tab-content ${activeTab === 'kudos' ? 'active' : ''}`} id="kudos-tab">
                <div className="content-container">
                  <div className="feed-header">
                    <h3>Kudos</h3>
                    <div className="header-actions">
                      <div className="search-bar">
                        <input type="text" className="search-input" id="searchKudos" placeholder="Search name..." />
                        <i className="fas fa-search search-icon"></i>
                      </div>
                      <button className="create-post-btn" onClick={() => setShowSendKudosModal(true)}>
                        <i className="fas fa-heart"></i> Send Kudos
                      </button>
                    </div>
                  </div>
                  <div className="kudos-grid" id="kudosGrid">
                    {sampleKudos.map((kudo, index) => (
                      <div key={index} className="kudos-card">
                        <div className="kudos-header">
                          <span className="kudos-recipient">To: {kudo.recipient}</span>
                          <span className="kudos-time">{kudo.time}</span>
                        </div>
                        <p className="kudos-message">{kudo.message}</p>
                        <p className="kudos-sender">From: {kudo.sender}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Milestones Tab */}
              <div className={`tab-content ${activeTab === 'milestones' ? 'active' : ''}`} id="milestones-tab">
                <div className="content-container">
                  <div className="feed-header">
                    <h3>Milestones</h3>
                    <button className="create-post-btn" onClick={() => setShowAddMilestoneModal(true)}>
                      <i className="fas fa-trophy"></i> Add Milestone
                    </button>
                  </div>
                  <div className="milestones-grid" id="milestonesGrid">
                    {sampleMilestones.map((milestone, index) => (
                      <div key={index} className="milestone-card">
                        <div className="milestone-icon"><i className="fas fa-trophy"></i></div>
                        <h4>{milestone.title}</h4>
                        <p className="milestone-description">{milestone.description}</p>
                        <div className="cheer-system">
                          <button className="cheer-btn" data-id={milestone.title}>
                            <i className="fas fa-heart"></i> Send Congratulations
                          </button>
                          <span className="cheer-count">{milestone.cheers} cheers</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* My Activity Tab */}
              <div className={`tab-content ${activeTab === 'activity' ? 'active' : ''}`} id="activity-tab">
                <div className="content-container">
                  <div className="feed-header">
                    <h3>My Activity</h3>
                  </div>
                  <div className="activity-feed" id="activityFeed">
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No activity yet.</p>
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
        onLogoutClick={() => { localStorage.removeItem('shielded_current_user'); }}
      />
    </>
  );
}

export default function InspireED() {
  return (
    <ProtectedRoute fallback={null}>
      <InspireEDContent />
    </ProtectedRoute>
  );
}
