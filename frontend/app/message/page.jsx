'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar, Footer, SettingsModal } from '@/components/shared';
import { accountRequest } from '@/services/account';
import { useAuthContext } from '@/context/AuthContext';
import { ProtectedRoute } from '@/lib/routeProtection';

function MessageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useAuthContext();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState([]);

  const handleLoginClick = () => {
    if (currentUser) {
      window.location.href = '/profile';
    } else {
      router.push('/login');
    }
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const loadMessages = async () => {
    setLoading(true);
    setError('');
    try {
      const rows = [];
      for (let page = 1; ; page++) {
        const batch = await accountRequest(`/messages?limit=100&page=${page}`);
        rows.push(...batch);
        if (batch.length < 100) break;
      }
      setMessages(rows);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today, ' + date.toLocaleTimeString();
    } else if (diffDays === 1) {
      return 'Yesterday, ' + date.toLocaleTimeString();
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const deleteMessage = async (id) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await accountRequest(`/messages/${id}`, 'DELETE');
        await loadMessages();
      } catch (err) {
        setError(err.message);
      }
    }
  };
  const clearAll = async () => {
    if (window.confirm('Are you sure you want to delete all received messages?')) {
      try {
        await accountRequest('/messages', 'DELETE');
        await loadMessages();
      } catch (err) {
        setError(err.message);
      }
    }
  };
  const refreshMessages = () => loadMessages();

  const totalMessages = messages.length;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentMessages = messages.filter(
    (msg) => new Date(msg.timestamp) > weekAgo
  ).length;

  useEffect(() => {
    loadMessages();
  }, [currentUser?.id]);

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="dashboard"
        onUserMenuClick={handleLoginClick}
        onSettingsClick={handleSettingsClick}
      />

      <main className="services-main">
        <div className="container">
          <div className="services-welcome">
            <h2>User Messages</h2>
            <p>View your contact messages and platform notifications.</p>
          </div>

          <div className="services-container">
            <div className="service-box">
              <div className="service-header">
                <div className="service-icon">
                  <i className="fas fa-inbox"></i>
                </div>
                <h3>All Messages</h3>
              </div>
              <div className="service-details">
                <div className="message-controls">
                  <div className="message-stats">
                    <span className="stat-item">
                      <i className="fas fa-envelope"></i>
                      <span id="totalMessages">{totalMessages}</span> Total Messages
                    </span>
                    <span className="stat-item">
                      <i className="fas fa-clock"></i>
                      <span id="recentMessages">{recentMessages}</span> Recent (Last 7
                      Days)
                    </span>
                  </div>
                  <div className="message-actions">
                    <button className="cta-button" onClick={refreshMessages}>
                      <i className="fas fa-sync"></i> Refresh
                    </button>
                    <button className="cta-button" onClick={clearAll}>
                      <i className="fas fa-trash"></i> Clear All
                    </button>
                  </div>
                </div>

                {error && <p role="alert">{error}</p>}
                {loading && <p role="status">Loading messages...</p>}
                <div id="messagesList" className="messages-list">
                  {messages.length === 0 ? (
                    <div className="no-messages">
                      <i className="fas fa-inbox"></i>
                      <h3>No Messages Yet</h3>
                      <p>
                        Your contact messages and platform notifications will appear
                        here.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className="message-item">
                        <div className="message-header">
                          <div className="message-info">
                            <h4>{msg.name}</h4>
                            <span className="message-email">{msg.email}</span>
                          </div>
                          <div className="message-meta">
                            <span className="message-date">
                              {formatDate(msg.timestamp)}
                            </span>
                            <button
                              className="delete-btn"
                              disabled={!msg.can_delete}
                              onClick={() => deleteMessage(msg.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                        <div className="message-subject">
                          <strong>Subject:</strong> {msg.subject}
                        </div>
                        <div className="message-content">
                          <p>{msg.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

export default function Message() {
  return (
    <ProtectedRoute fallback={null}>
      <MessageContent />
    </ProtectedRoute>
  );
}
