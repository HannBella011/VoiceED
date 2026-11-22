'use client';

import { useBlockingLoading } from '@/components/shared/GlobalLoading';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { inspireRequest, postPath, shareLink } from '@/services/inspire';
import PostComposer from '@/components/features/inspire/PostComposer';
import RichBody from '@/components/features/inspire/RichBody';
import PostAttachments from '@/components/features/inspire/PostAttachments';
import InspireDialog from '@/components/features/inspire/InspireDialog';
import './inspire.css';
import { Navbar, Footer } from '@/components/shared';
import { useAuth } from '@/hooks';
import { useModals } from '@/components/shared/GlobalModals';

function InspireEDContent() {
  const pathname = usePathname();
  const { isLoggedIn, isLoading: authLoading, currentUser } = useAuth();
  const { setSettingsOpen, setUserMenuOpen, setLoginRequiredOpen } = useModals();
  
  const [activeTab, setActiveTab] = useState('home');
  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [composer, setComposer] = useState(null);
  const [busy, setBusy] = useState(false);
  const mutation = useRef(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const [directId, setDirectId] = useState(null);
  const initialFeedSettled = useRef(false);
  useBlockingLoading(busy || (loading && (!initialFeedSettled.current || Boolean(directId))));
  const [mine, setMine] = useState(false);
  const [commentTarget, setCommentTarget] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentPage, setCommentPage] = useState(1);
  const [commentMore, setCommentMore] = useState(false);
  const [commentTotal, setCommentTotal] = useState(0);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const feedSequence = useRef(0);
  const commentSequence = useRef(0);
  const identity = useRef(currentUser?.id);
  identity.current = currentUser?.id;
  const path = postPath;
  const quotes = posts.filter(row => row.type === 'quote').map(row => ({ ...row, text: row.content.text, quoteAuthor: row.content.author, isUserAdded: row.isUserCreated }));
  const filteredPosts = posts;
  const requireLogin = () => { if (isLoggedIn) return true; setLoginRequiredOpen(true); return false; };
  const handleUserMenuClick = () => setUserMenuOpen(true);
  const handleSettingsClick = () => setSettingsOpen(true);
  const openComposer = type => { if (requireLogin()) setComposer(type); };
  useEffect(() => {
    commentSequence.current++; setCommentTarget(null); setComments([]); setComposer(null);
  }, [currentUser?.id]);
  useEffect(() => {
    const readLocation = () => {
    const query = new URLSearchParams(window.location.search);
    setMine(query.get('mine') === '1');
    const type = { story: 'stories', quote: 'quotes' }[query.get('post_type')];
    const view=query.get('view');
    setActiveTab(['home','quotes','stories','kudos','milestones','activity'].includes(view)?view:(type||'home'));
    const value = query.get('post');
    if (value) {
      if (/^(stories|quotes):[1-9][0-9]*$/.test(value)) setDirectId(value);
      else { setDirectId('invalid'); setError('This post link is invalid.'); }
      setActiveTab('home');
    } else setDirectId(null);
    if (query.get('compose') === '1') {
      if (isLoggedIn) { setComposer('story'); window.history.replaceState({}, '', '/inspire-ed'); }
      else if (!authLoading) setLoginRequiredOpen(true);
    }
    };
    readLocation();
    window.addEventListener('popstate', readLocation);
    return () => window.removeEventListener('popstate', readLocation);
  }, [isLoggedIn, authLoading]);
  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();
    const sequence = ++feedSequence.current;
    setPosts([]); setLoading(true); setError(''); setHasMore(false);
    const timer = setTimeout(async () => {
      try {
        let data;
        if (directId) {
          if (!/^(stories|quotes):[1-9][0-9]*$/.test(directId)) throw new Error('This post link is invalid.');
          const [kind, id] = directId.split(':');
          data = { items: [await inspireRequest(`/${kind}/${id}`, { signal: controller.signal })], total: 1, has_more: false };
        } else {
          const query = new URLSearchParams({ page: String(page), limit: '12', envelope: 'true', search: searchTerm });
          if (mine) {
            if (!isLoggedIn) { setLoginRequiredOpen(true); setTotal(0); return; }
            query.set('mine', 'true');
          }
          if (['quotes','stories','kudos','milestones'].includes(activeTab)) query.set('post_type', { quotes:'quote',stories:'story',kudos:'kudos',milestones:'milestone' }[activeTab]);
          if (activeTab === 'activity') {
            if (!isLoggedIn) { setPosts([]); setTotal(0); return; }
            query.set('activity', 'true');
          }
          data = await inspireRequest(`/feed?${query}`, { signal: controller.signal });
        }
        if (sequence !== feedSequence.current || controller.signal.aborted) return;
        setPosts(data.items); setTotal(data.total); setHasMore(data.has_more); setCurrentQuoteIndex(0);
        if (!directId && page > 1 && !data.items.length) setPage(value => value - 1);
      } catch (error) { if (sequence === feedSequence.current && !controller.signal.aborted) setError(error.message); }
      finally {
        if (sequence === feedSequence.current && !controller.signal.aborted) {
          initialFeedSettled.current = true;
          setLoading(false);
        }
      }
    }, searchTerm ? 300 : 0);
    return () => { controller.abort(); clearTimeout(timer); feedSequence.current++; };
  }, [currentUser?.id, isLoggedIn, authLoading, activeTab, searchTerm, page, directId, revision, mine]);
  const updatePost = updated => setPosts(previous => previous.map(post => post.id === updated.id ? updated : post));
  const act = async callback => {
    if (!requireLogin() || mutation.current) return;
    const owner = currentUser?.id;
    mutation.current = true; setBusy(true); setError('');
    try { await callback(); }
    catch (error) { if (identity.current === owner) setError(error.message); }
    finally { mutation.current = false; setBusy(false); }
  };
  const handleLike = id => {
    const post = posts.find(row => row.id === id);
    if (post) act(async () => { const owner = currentUser?.id; const updated = await inspireRequest(`${path(post)}/reaction`, { method: post.userLiked ? 'DELETE' : 'PUT' }); if (identity.current === owner) updatePost(updated); });
  };
  const openComments = async (post, nextPage = 1) => {
    if (!post) return;
    const sequence = ++commentSequence.current;
    setCommentTarget(post); setCommentPage(nextPage); setCommentLoading(true); setCommentError(''); setComments([]);
    try {
      const data = await inspireRequest(`${path(post)}/comments?envelope=true&limit=10&page=${nextPage}`);
      if (sequence !== commentSequence.current) return;
      setComments(data.items); setCommentPage(data.page); setCommentMore(data.has_more); setCommentTotal(data.total || 0);
    } catch (error) { if (sequence === commentSequence.current) setCommentError(error.message); }
    finally { if (sequence === commentSequence.current) setCommentLoading(false); }
  };
  const addComment = () => act(async () => {
    const owner = currentUser?.id;
    await inspireRequest(`${path(commentTarget)}/comments`, { method: 'POST', data: { content: commentText } });
    if (identity.current !== owner) return;
    setCommentText(''); await openComments(commentTarget, Math.max(1, Math.ceil((commentTotal + 1) / 10))); setRevision(value => value + 1);
  });
  const deleteComment = comment => act(async () => {
    if (!comment.owned) { window.location.href = `/admin?kind=comment&content=${comment.id}`; return; }
    const owner = currentUser?.id;
    await inspireRequest(`/comments/${comment.id}`, { method: 'DELETE' });
    if (identity.current !== owner) return;
    await openComments(commentTarget, comments.length === 1 && commentPage > 1 ? commentPage - 1 : commentPage); setRevision(value => value + 1);
  });
  const sharePost = async (post, copy = false) => {
    if (!post) return;
    setError(''); setNotice('');
    const owner = currentUser?.id;
    try {
      const result = await shareLink(post, { copy, loggedIn: isLoggedIn });
      if (identity.current !== owner) return;
      if (result.cancelled) return;
      if (result.updated) updatePost(result.updated);
      setNotice(result.method === 'copy' ? 'Post link copied.' : 'Post shared.');
    } catch (error) { setError(error.message); }
  };
  const selectedQuote = quotes[currentQuoteIndex] || quotes[0];
  const handleQuoteHeart = () => selectedQuote && handleLike(selectedQuote.id);
  const handleQuoteNext = () => setCurrentQuoteIndex(prev => quotes.length ? (prev + 1) % quotes.length : 0);
  const handleQuotePrev = () => setCurrentQuoteIndex(prev => quotes.length ? (prev - 1 + quotes.length) % quotes.length : 0);
  const removePost = post => act(async () => {
    const owner = currentUser?.id;
    await inspireRequest(path(post), { method: 'DELETE' });
    if (identity.current !== owner) return;
    if (directId === post.id) { setDirectId(null); window.history.replaceState({}, '', '/inspire-ed'); }
    setRevision(value => value + 1);
  });
  const handleQuoteDelete = () => selectedQuote && window.confirm('Delete this quote?') && removePost(selectedQuote);
  const handleQuoteCopy = async () => {
    if (!selectedQuote) return;
    try { await navigator.clipboard.writeText(`${selectedQuote.text} — ${selectedQuote.quoteAuthor}`); setNotice('Quote copied.'); }
    catch (error) { setError(error.message || 'Unable to copy quote.'); }
  };
  const handleQuoteShare = () => selectedQuote && sharePost(selectedQuote);
  const openPost = post => { window.location.href = `/inspire-ed?post=${encodeURIComponent(post.id)}`; };

  const tabs = [
    { id: 'home', icon: 'fas fa-home', label: 'Home' },
    { id: 'quotes', icon: 'fas fa-lightbulb', label: 'Quotes' },
    { id: 'stories', icon: 'fas fa-graduation-cap', label: 'Stories' },
    { id: 'kudos', icon: 'fas fa-heart', label: 'Kudos' },
    { id: 'milestones', icon: 'fas fa-trophy', label: 'Milestones' },
    { id: 'activity', icon: 'fas fa-chart-line', label: 'My Activity' }
  ];

  const stories = posts.filter(row => row.type === 'story').map(row => ({ ...row, id: row.id, title: row.content.title, author: row.author, narrative: row.content.text, year: new Date(row.created_at).getFullYear(), keyTakeaways: '' }));
  const kudos = posts.filter(row => row.type === 'kudos').map(row => ({ ...row, recipient: row.content.recipient, message: row.content.text, sender: row.author, time: new Date(row.created_at).toLocaleString() }));
  const milestones = posts.filter(row => row.type === 'milestone').map(row => ({ ...row, title: row.content.title, description: row.content.text, cheers: row.likes }));

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="dashboard"
        onUserMenuClick={handleUserMenuClick}
        onSettingsClick={handleSettingsClick}
      />

      <main className="wellness-main inspire-page">
        <div className="container">
          <div className="wellness-hero">
            <h2>InspireED</h2>
            <p className="hero-subtitle">A dedicated platform highlighting motivational stories, student achievements, and encouraging quotes.</p>
          </div>

          <div className="inspireED-layout">
            <aside className="inspireED-sidebar">
              <nav className="sidebar-nav">
                {tabs.map(tab => (
                  <a
                    key={tab.id}
                    className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                    href={`/inspire-ed?view=${tab.id}${mine?'&mine=1':''}`}
                    aria-current={activeTab===tab.id?'page':undefined}
                    data-tab={tab.id}
                  >
                    <i className={tab.icon}></i><span>{tab.label}</span>
                  </a>
                ))}
              </nav>
            </aside>

            <div className="inspireED-content">
              {mine && <p>Your published content. <a href="/inspire-ed">Browse all posts</a></p>}
              {error && <p role="alert">{error} <button type="button" onClick={() => setRevision(value => value + 1)}>Retry</button></p>}
              {notice && <p role="status">{notice}</p>}
              {loading && <p role="status">Loading posts…</p>}
              {directId && <a className="quote-btn" href="/inspire-ed">Back to posts</a>}
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
                          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        />
                        <i className="fas fa-search search-icon"></i>
                      </div>
                      <button className="create-post-btn" onClick={() => openComposer('post')}>
                        <i className="fas fa-plus"></i> Create Post
                      </button>
                    </div>
                  </div>
                  <div className="posts-feed" id="postsFeed">
                    {!loading && !error && filteredPosts.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No posts found</p>
                    ) : (
                      filteredPosts.map(post => (
                        <div key={post.id} className="post-card">
                          <div className="post-header">
                            <div className="post-avatar">{post.avatar}</div>
                            <div className="post-author-info">
                              <div className="post-author-name">{post.author}{post.author_verified && <span title="Verified student" aria-label="Verified student"> ✓</span>}</div>
                              <time className="post-time">{new Date(post.created_at).toLocaleString()}</time>
                            </div>
                            <span className="post-type">{post.type.charAt(0).toUpperCase() + post.type.slice(1)}</span>
                          </div>
                          <div className="post-content">
                            {post.content.title && <h4>{post.content.title}</h4>}
                            {post.content.recipient && <strong>To: {post.content.recipient}</strong>}
                            <RichBody body={post.body} fallback={post.content.text} />
                            {post.type === 'quote' && <p>— {post.content.author}</p>}
                            <PostAttachments attachments={post.attachments} />
                          </div>
                          <div className="post-interactions">
                            <button
                              className={`post-interaction-btn ${post.userLiked ? 'liked' : ''}`}
                              disabled={busy} aria-pressed={post.userLiked} aria-label={`Heart post (${post.likes})`} onClick={() => handleLike(post.id)}
                            >
                              <i className="fas fa-heart"></i> Heart <span>{post.likes}</span>
                            </button>
                            <button className="post-interaction-btn" onClick={() => openComments(post)}>
                              <i className="fas fa-comment"></i> Comment <span>{post.comments}</span>
                            </button>
                            <button className="post-interaction-btn" onClick={() => sharePost(post)}>
                              <i className="fas fa-share"></i> Share <span>{post.shares}</span>
                            </button>
                            <button type="button" className="post-interaction-btn" onClick={() => sharePost(post, true)}>Copy link</button>
                            {post.isUserCreated && (
                              <button className="post-interaction-btn delete-btn" disabled={busy} onClick={() => { if (window.confirm('Delete this post?')) removePost(post); }}>
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
                      <div className="quote-text" id="dailyQuote">{selectedQuote ? <><RichBody body={selectedQuote.body} fallback={selectedQuote.text} /><PostAttachments attachments={selectedQuote.attachments} /></> : 'No quotes yet'}</div>
                      <p className="quote-author" id="quoteAuthor">- {selectedQuote?.quoteAuthor || ''}</p>
                      {selectedQuote && <p>Shared by {selectedQuote.author}{selectedQuote.author_verified && <span aria-label="Verified student"> ✓</span>}</p>}
                    </div>
                    <div className="quote-actions">
                      <button className="quote-btn" onClick={handleQuotePrev}>
                        <i className="fas fa-chevron-left"></i> Previous
                      </button>
                      <button className="quote-btn" onClick={handleQuoteCopy}>
                        <i className="fas fa-copy"></i> Copy Quote
                      </button>
                      <button type="button" className="quote-btn" disabled={!selectedQuote} onClick={() => sharePost(selectedQuote, true)}>Copy link</button>
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
                      <button className={`interaction-btn heart-btn ${selectedQuote?.userLiked ? 'active' : ''}`} disabled={busy || !selectedQuote} aria-pressed={Boolean(selectedQuote?.userLiked)} onClick={handleQuoteHeart}>
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
                        <div className="story-narrative"><RichBody body={story.body} fallback={story.narrative} /></div><PostAttachments attachments={story.attachments} /><a className="post-interaction-btn" href={`/inspire-ed?post=${encodeURIComponent(story.id)}`}>View post and comments</a>
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
                        <input type="text" className="search-input" id="searchKudos" placeholder="Search name..." value={searchTerm} onChange={event => { setSearchTerm(event.target.value); setPage(1); }} />
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
                        <div className="kudos-message"><RichBody body={kudo.body} fallback={kudo.message} /></div>
                        <p className="kudos-sender">From: {kudo.sender}</p>
                        <PostAttachments attachments={kudo.attachments} /><a className="post-interaction-btn" href={`/inspire-ed?post=${encodeURIComponent(kudo.id)}`}>View post and comments</a>
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
                        <div className="milestone-description"><RichBody body={milestone.body} fallback={milestone.description} /></div>
                        <PostAttachments attachments={milestone.attachments} /><a className="post-interaction-btn" href={`/inspire-ed?post=${encodeURIComponent(milestone.id)}`}>View post and comments</a>
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
              {!directId && <div className="inspire-pagination" aria-label="Post pages"><button type="button" className="quote-btn" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}>Previous page</button><span>Page {page} · {total} posts</span><button type="button" className="quote-btn" disabled={loading || !hasMore} onClick={() => setPage(value => value + 1)}>Next page</button></div>}
            </div>
          </div>
        </div>
      </main>

      {composer && <PostComposer authorName={currentUser?.full_name || currentUser?.username || "You"} authorVerified={Boolean(currentUser?.is_verified)} initialType={composer} onClose={() => setComposer(null)} onSaved={post => { setComposer(null); setSearchTerm(''); setPage(1); setActiveTab('home'); setNotice('Post published.'); openPost(post); }} />}
      {commentTarget && <InspireDialog title="Comments" busy={busy} onClose={() => { commentSequence.current++; setCommentTarget(null); setCommentText(''); }}>
        {commentError && <p role="alert">{commentError} <button type="button" onClick={() => openComments(commentTarget, commentPage)}>Retry</button></p>}
        {error && <p role="alert">{error}</p>}
        {commentLoading ? <p role="status">Loading comments…</p> : <div className="comments-list">{comments.length === 0 ? <p>No comments yet.</p> : comments.map(comment => <div className="comment" key={comment.id}><strong>{comment.author}{comment.author_verified && <span aria-label="Verified student" title="Verified student"> ✓</span>}</strong><p>{comment.content}</p><time>{new Date(comment.created_at).toLocaleString()}</time>{comment.can_delete && <button type="button" className="post-interaction-btn" disabled={busy} onClick={() => deleteComment(comment)}>Delete comment</button>}</div>)}</div>}
        <div className="inspire-pagination"><button type="button" disabled={commentLoading || busy || commentPage === 1} onClick={() => openComments(commentTarget, commentPage - 1)}>Previous</button><span>Page {commentPage}</span><button type="button" disabled={commentLoading || busy || !commentMore} onClick={() => openComments(commentTarget, commentPage + 1)}>Next</button></div>
        <form className="add-comment-form" onSubmit={event => { event.preventDefault(); addComment(); }}><label htmlFor="comment-text">Your comment</label><textarea id="comment-text" required maxLength={5000} disabled={busy} value={commentText} onChange={event => setCommentText(event.target.value)} /><button className="submit-btn" disabled={busy || commentLoading || !commentText.trim()}>Post Comment</button></form>
        {!isLoggedIn && <p><button type="button" className="post-interaction-btn" onClick={() => setLoginRequiredOpen(true)}>Log in to comment</button></p>}
      </InspireDialog>}
      <Footer />
    </>
  );
}

export default function InspireED() {
  return <InspireEDContent />;
}
