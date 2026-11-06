'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { accountRequest } from '@/services/account';
import { Navbar, Footer } from '@/components/shared';
import { useAuth } from '@/hooks';
import { useModals } from '@/components/shared/GlobalModals';

function InspireEDContent() {
  const pathname = usePathname();
  const { isLoggedIn, currentUser } = useAuth();
  const { settingsOpen, setSettingsOpen, userMenuOpen, setUserMenuOpen, loginRequiredOpen, setLoginRequiredOpen } = useModals();
  
  const owner = useRef(currentUser?.id);
  owner.current = currentUser?.id;
  const [activeTab, setActiveTab] = useState('home');
  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [quotes, setQuotes] = useState([]);
  const [error, setError] = useState('');
  const [composer, setComposer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ text: '', title: '', author: '', recipient: '', anonymous: false });
  const [commentTarget, setCommentTarget] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const load = async () => {
    const identity = currentUser?.id;
    const rows = [];
    for (let page = 1; ; page++) {
      const batch = await accountRequest(`/inspire/feed?limit=100&page=${page}`);
      rows.push(...batch); if (batch.length < 100) break;
    }
    if (owner.current !== identity) return;
    setPosts(rows);
    setQuotes(rows.filter(row => row.type === 'quote').map(row => ({ ...row, text: row.content.text, quoteAuthor: row.content.author, isUserAdded: row.isUserCreated })));
  };
  useEffect(() => { setPosts([]); setQuotes([]); if (isLoggedIn) load().catch(err => setError(err.message)); }, [currentUser?.id, isLoggedIn]);
  const act = async callback => { if (busy) return; setBusy(true); setError(''); try { await callback(); await load(); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  const filteredPosts = posts.filter(post => JSON.stringify(post.content).toLowerCase().includes(searchTerm.toLowerCase()) || post.author.toLowerCase().includes(searchTerm.toLowerCase()));
  const path = post => `/inspire/${post.kind}/${post.record_id}`;
  const handleLike = id => { const post = posts.find(row => row.id === id); if (post) act(() => accountRequest(`${path(post)}/reaction`, post.userLiked ? 'DELETE' : 'PUT')); };
  const openComposer = type => { if (!isLoggedIn) { setLoginRequiredOpen(true); return; } setDraft({ text: '', title: '', author: '', recipient: '', anonymous: false }); setComposer(type); };
  const submit = () => act(async () => {
    await accountRequest(`/inspire/${composer === 'quote' ? 'quotes' : 'stories'}`, 'POST', composer === 'quote' ? { quote: draft.text, author: draft.author || null } : { title: draft.title || (composer === 'story' ? 'Story' : composer === 'kudos' ? 'Kudos' : 'Post'), content: draft.text, post_type: composer, is_anonymous: draft.anonymous, recipient_label: composer === 'kudos' ? draft.recipient : null });
    setComposer(null);
  });
  const openComments = async post => {
    if (!post) return;
    try {
      setError(''); const rows = [];
      for (let page = 1; ; page++) { const batch = await accountRequest(`${path(post)}/comments?limit=100&page=${page}`); rows.push(...batch); if (batch.length < 100) break; }
      setComments(rows); setCommentTarget(post); setCommentText('');
    } catch (err) { setError(err.message); }
  };
  const addComment = () => act(async () => { await accountRequest(`${path(commentTarget)}/comments`, 'POST', { content: commentText }); await openComments(commentTarget); });
  const sharePost = post => act(async () => {
    if (!post) return;
    const text = `${post.content.text}${post.type === 'quote' ? ` ? ${post.content.author}` : ''}`;
    if (navigator.share) await navigator.share({ title: 'InspireED', text }); else await navigator.clipboard.writeText(text);
    await accountRequest(`${path(post)}/shares`, 'POST');
  });
  const selectedQuote = quotes[currentQuoteIndex] || quotes[0];
  const handleQuoteHeart = () => selectedQuote && handleLike(selectedQuote.id);
  const handleQuoteNext = () => setCurrentQuoteIndex(prev => quotes.length ? (prev + 1) % quotes.length : 0);
  const handleQuotePrev = () => setCurrentQuoteIndex(prev => quotes.length ? (prev - 1 + quotes.length) % quotes.length : 0);
  const handleQuoteDelete = () => selectedQuote && window.confirm('Delete this quote?') && act(() => accountRequest(path(selectedQuote), 'DELETE'));
  const handleQuoteCopy = () => selectedQuote && navigator.clipboard.writeText(`${selectedQuote.text} ? ${selectedQuote.quoteAuthor}`).catch(err => setError(err.message));
  const handleQuoteShare = () => selectedQuote && sharePost(selectedQuote);

  const tabs = [
    { id: 'home', icon: 'fas fa-home', label: 'Home' },
    { id: 'quotes', icon: 'fas fa-lightbulb', label: 'Quotes' },
    { id: 'stories', icon: 'fas fa-graduation-cap', label: 'Stories' },
    { id: 'kudos', icon: 'fas fa-heart', label: 'Kudos' },
    { id: 'milestones', icon: 'fas fa-trophy', label: 'Milestones' },
    { id: 'activity', icon: 'fas fa-chart-line', label: 'My Activity' }
  ];

  const stories = posts.filter(row => row.type === 'story').map(row => ({ id: row.id, title: row.content.title, author: row.author, narrative: row.content.text, year: new Date(row.created_at).getFullYear(), keyTakeaways: '' }));
  const kudos = posts.filter(row => row.type === 'kudos').map(row => ({ recipient: row.content.recipient, message: row.content.text, sender: row.author, time: new Date(row.created_at).toLocaleString() }));
  const milestones = posts.filter(row => row.type === 'milestone').map(row => ({ ...row, title: row.content.title, description: row.content.text, cheers: row.likes }));

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
              {error && <p role="alert">{error}</p>}
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
                      <button className="create-post-btn" onClick={() => openComposer('post')}>
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
                            <button className="post-interaction-btn" onClick={() => openComments(post)}>
                              <i className="fas fa-comment"></i> <span>{post.comments}</span>
                            </button>
                            <button className="post-interaction-btn" onClick={() => sharePost(post)}>
                              <i className="fas fa-share"></i> <span>{post.shares}</span>
                            </button>
                            {post.isUserCreated && (
                              <button className="post-interaction-btn delete-btn" disabled={busy} onClick={() => { if (window.confirm('Delete this post?')) act(() => accountRequest(path(post), 'DELETE')); }}>
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
                    <button className="create-post-btn" onClick={() => openComposer('quote')}>
                      <i className="fas fa-plus"></i> Add Quote
                    </button>
                  </div>
                  <div className="daily-quote-card">
                    <div className="quote-content">
                      <i className="fas fa-quote-left quote-icon"></i>
                      <p className="quote-text" id="dailyQuote">"{selectedQuote?.text || 'No quotes yet'}"</p>
                      <p className="quote-author" id="quoteAuthor">- {selectedQuote?.quoteAuthor || ''}</p>
                    </div>
                    <div className="quote-actions">
                      <button className="quote-btn" onClick={handleQuotePrev}>
                        <i className="fas fa-chevron-left"></i> Previous
                      </button>
                      <button className="quote-btn" onClick={handleQuoteCopy}>
                        <i className="fas fa-copy"></i> Copy Quote
                      </button>
                      {selectedQuote?.isUserAdded && (
                        <button className="quote-btn" onClick={handleQuoteDelete}>
                          <i className="fas fa-trash"></i> Delete Quote
                        </button>
                      )}
                      <button className="quote-btn" onClick={handleQuoteNext}>
                        Next <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                    <div className="quote-interactions">
                      <button className={`interaction-btn heart-btn ${selectedQuote?.userLiked ? 'active' : ''}`} onClick={handleQuoteHeart}>
                        <i className="fas fa-heart"></i> <span id="heartCount">{selectedQuote?.likes || 0}</span>
                      </button>
                      <button className="interaction-btn comment-btn" onClick={() => openComments(selectedQuote)}>
                        <i className="fas fa-comment"></i> <span id="commentCount">{selectedQuote?.comments || 0}</span>
                      </button>
                      <button className="interaction-btn share-btn" onClick={handleQuoteShare}>
                        <i className="fas fa-share"></i> <span id="shareCount">{selectedQuote?.shares || 0}</span>
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
                    <button className="create-post-btn" onClick={() => openComposer('story')}>
                      <i className="fas fa-pen"></i> Share Your Story
                    </button>
                  </div>
                  <div className="stories-grid" id="storiesGrid">
                    {stories.map(story => (
                      <div key={story.id} className="story-card">
                        <div className="story-header">
                          <div className="story-avatar"><i className="fas fa-user"></i></div>
                          <div className="story-info">
                            <h4>{story.title}</h4>
                            <p className="story-author">{story.author} • {story.year}</p>
                          </div>
                        </div>
                        <p className="story-narrative">{story.narrative}</p>
                        <p className="story-takeaways">{story.keyTakeaways}</p>
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
                      <button className="create-post-btn" onClick={() => openComposer('kudos')}>
                        <i className="fas fa-heart"></i> Send Kudos
                      </button>
                    </div>
                  </div>
                  <div className="kudos-grid" id="kudosGrid">
                    {kudos.map((kudo, index) => (
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
                    <button className="create-post-btn" onClick={() => openComposer('milestone')}>
                      <i className="fas fa-trophy"></i> Add Milestone
                    </button>
                  </div>
                  <div className="milestones-grid" id="milestonesGrid">
                    {milestones.map((milestone, index) => (
                      <div key={index} className="milestone-card">
                        <div className="milestone-icon"><i className="fas fa-trophy"></i></div>
                        <h4>{milestone.title}</h4>
                        <p className="milestone-description">{milestone.description}</p>
                        <div className="cheer-system">
                          <button className="cheer-btn" disabled={busy} onClick={() => handleLike(milestone.id)} data-id={milestone.title}>
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
                    {posts.filter(post => post.isUserCreated || post.userLiked).length === 0 ? <p>No activity yet.</p> : posts.filter(post => post.isUserCreated || post.userLiked).map(post => <div className="post-card" key={post.id}><p>{post.isUserCreated ? 'Created' : 'Liked'} {post.type}: {post.content.text}</p><time>{new Date(post.created_at).toLocaleString()}</time></div>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {composer && <div className="modal show" style={{ display: 'block' }} onClick={() => !busy && setComposer(null)}><div className="modal-content" onClick={event => event.stopPropagation()}>
        <h2>{({post:'Create Post',quote:'Add Your Quote',story:'Share Your Story',kudos:'Send Kudos',milestone:'Add Milestone'})[composer]}</h2>
        <form className="add-comment-form" onSubmit={event => { event.preventDefault(); submit(); }}>
          {error && <p role="alert">{error}</p>}
          {composer === 'milestone' && <input required maxLength={200} placeholder="Milestone title" value={draft.title} onChange={event => setDraft({...draft,title:event.target.value})} />}
          {composer === 'kudos' && <input required maxLength={255} placeholder="Who do you want to recognize?" value={draft.recipient} onChange={event => setDraft({...draft,recipient:event.target.value})} />}
          <textarea required maxLength={composer === 'quote' ? 10000 : 50000} rows="4" placeholder={composer === 'quote' ? 'Enter your quote' : "Share your thoughts..."} value={draft.text} onChange={event => setDraft({...draft,text:event.target.value})} />
          {composer === 'quote' && <input maxLength={255} placeholder="Author" value={draft.author} onChange={event => setDraft({...draft,author:event.target.value})} />}
          {composer === 'kudos' && <label><input type="checkbox" checked={draft.anonymous} onChange={event => setDraft({...draft,anonymous:event.target.checked})} /> Send anonymously</label>}
          <div className="form-submit"><button type="button" className="cancel-btn" disabled={busy} onClick={() => setComposer(null)}>Cancel</button><button className="submit-btn" disabled={busy || !draft.text.trim()}>Submit</button></div>
        </form>
      </div></div>}
      {commentTarget && <div className="modal show" style={{ display: 'block' }}><div className="modal-content"><h2>Comments</h2><button className="close" onClick={() => setCommentTarget(null)}>&times;</button>
        {error && <p role="alert">{error}</p>}
        <div className="comments-list">{comments.length === 0 ? <p>No comments yet.</p> : comments.map(comment => <div className="comment" key={comment.id}><strong>{comment.author}</strong><p>{comment.content}</p><time>{new Date(comment.created_at).toLocaleString()}</time></div>)}</div>
        <form className="add-comment-form" onSubmit={event => { event.preventDefault(); addComment(); }}><textarea required maxLength={5000} value={commentText} onChange={event => setCommentText(event.target.value)} /><button className="submit-btn" disabled={busy || !commentText.trim()}>Post Comment</button></form>
      </div></div>}
      <Footer />
    </>
  );
}

export default function InspireED() {
  return <InspireEDContent />;
}