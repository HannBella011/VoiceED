export default function WellnessJournal() {
  return (
    <>
    {/* Header */}
        <header className="header">
            <div className="container">
                <div className="header-content">
                    <div className="logo-section">
                        <div className="logo">
                            <img src="/logo for blue.png" alt="VoiceED Logo" width="90" height="90" />
                        </div>
                        <div className="brand-text">
                            <h1>VoiceED</h1>
                            <p className="tagline">Where Every Student's Voice Matters</p>
                        </div>
                    </div>
                    <button className="mobile-menu-btn" id="mobileMenuBtn">
                        <i className="fas fa-bars"></i>
                    </button>
                    <nav className="navbar" id="navbar">
                        <ul className="nav-links">
                            <li><a href="/dashboard" className="dashboard-nav-link">Dashboard</a></li>
                            <li><a href="#" id="reportedBtn">ReportED</a></li>
                            <li><a href="/wellness-ed" className="nav-active">WellnessED</a></li>
                            <li><a href="#" id="inspireBtn">InspireED</a></li>
                            <li><a href="#" id="shareBtn">ShareED</a></li>
                            <li><a href="#" id="settingsBtn" className="settings-nav-btn">Settings</a></li>
                            <li><a href="#" id="userMenuBtn" className="login-nav-btn"><i className="fas fa-user"></i></a></li>
                        </ul>
                    </nav>
                </div>
            </div>
        </header>

        {/* Wellness Journal Main Content */}
        <main className="wellness-main">
            <div className="container">
                <div className="wellness-hero">
                    <h2>Wellness Journal</h2>
                    <p>Write and reflect on your thoughts, feelings, and daily experiences</p>
                </div>

                <div className="wellness-grid">
                    <div className="wellness-card">
                        <div className="card-header">
                            <div className="card-icon">
                                <i className="fas fa-pen"></i>
                            </div>
                            <h3>New Entry</h3>
                        </div>
                        <div className="card-body">
                            <div className="journal-form">
                                <div className="form-group">
                                    <label htmlFor="journalDate">Date</label>
                                    <input type="date" id="journalDate" className="journal-input" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="journalMood">How are you feeling?</label>
                                    <select id="journalMood" className="journal-input journal-mood-select">
                                        <option value="">Select your mood...</option>
                                        <option value="excited">🤩 Excited</option>
                                        <option value="happy">😊 Happy</option>
                                        <option value="good">🙂 Good</option>
                                        <option value="calm">😌 Calm</option>
                                        <option value="okay">😐 Okay</option>
                                        <option value="tired">😴 Tired</option>
                                        <option value="worried">😟 Worried</option>
                                        <option value="sad">😔 Sad</option>
                                        <option value="angry">😠 Angry</option>
                                        <option value="terrible">😢 Terrible</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="journalContent">Your thoughts...</label>
                                    <textarea id="journalContent" className="journal-input journal-textarea" rows="6" placeholder="Write about your day, your feelings, or anything on your mind..."></textarea>
                                </div>
                                <button className="wellness-btn primary-btn" id="saveJournal">Save Entry</button>
                            </div>
                        </div>
                    </div>

                    <div className="wellness-card">
                        <div className="card-header">
                            <div className="card-icon">
                                <i className="fas fa-book"></i>
                            </div>
                            <h3>Recent Entries</h3>
                        </div>
                        <div className="card-body">
                            <div className="journal-entries" id="journalEntries">
                                <p className="log-empty">No journal entries yet. Start writing!</p>
                            </div>
                            <button className="wellness-btn outline-btn" id="clearJournal" style={{ marginTop: "1rem" }}>Clear All Entries</button>
                        </div>
                    </div>
                </div>

                <div className="back-button-container">
                    <a href="/wellness-ed" className="back-btn"><i className="fas fa-arrow-left"></i> Back to WellnessED</a>
                </div>
            </div>
        </main>

        {/* Footer */}
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-top-row">
                        <div className="footer-section">
                            <h3>VoiceED Description</h3>
                            <p>VoiceED is a student‑driven platform that empowers learners to be heard, supported, and inspired. It promotes safety, wellness, and collaboration in schools and communities through features that let students report concerns, access mental health and motivation resources, share study materials, and find inspiration from peers. Its goal is simple: to make education inclusive and supportive by combining technology with compassion—creating a space where every voice matters and learning becomes a shared journey of growth.</p>
                        </div>
                        <div className="footer-section">
                            <h4>Quick Links</h4>
                            <ul>
                                <li><a href="/">Home</a></li>
                                <li><a href="/about">About</a></li>
                                <li><a href="/services">Services</a></li>
                                <li><a href="/contacts">Contact</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="footer-section credentials-section">
                        <h4>Founders & Campus Directors</h4>
                        <div className="founders-grid">
                            <div className="founder-card">
                                <img src="/jez.jpg" alt="Junie Jebreel M. Botawan II" className="founder-image" />
                                <p className="founder-name">Junie Jebreel M. Botawan II</p>
                                <p className="founder-title">Software QA and Campus Director of Mindanao State University - Iligan Institute of Technology Cohort</p>
                            </div>
                            <div className="founder-card">
                                <img src="/hann.jpg.jpg" alt="Hannah Bella C. Atay" className="founder-image" />
                                <p className="founder-name">Hannah Bella C. Atay</p>
                                <p className="founder-title">Founder, Lead Developer and Millennium Fellowship Campus Director of Mindanao State University - Iligan Institute of Technology Cohort</p>
                            </div>
                            <div className="founder-card">
                                <img src="/erwin.jpg" alt="John Erwin F. Cadiz" className="founder-image" />
                                <p className="founder-name">John Erwin F. Cadiz</p>
                                <p className="founder-title">Co-Founder and Millennium Fellow</p>
                            </div>
                        </div>
                    </div>
                    <div className="footer-section credentials-section">
                        <h4>Millennium Fellows</h4>
                        <div className="fellows-grid">
                            <div className="fellow-card">
                                <img src="/hontiveros.png" alt="Hannah A. Hontiveros" className="fellow-image" />
                                <p className="fellow-name">Hannah A. Hontiveros</p>
                                <p className="fellow-title">Millennium Fellow</p>
                            </div>
                            <div className="fellow-card">
                                <img src="/jason.png" alt="Jason James E. Azcona" className="fellow-image" />
                                <p className="fellow-name">Jason James E. Azcona</p>
                                <p className="fellow-title">Millennium Fellow</p>
                            </div>
                            <div className="fellow-card">
                                <img src="/jiggen.jpg" alt="Jiggen Kerr T. Aguilar" className="fellow-image" />
                                <p className="fellow-name">Jiggen Kerr T. Aguilar</p>
                                <p className="fellow-title">Millennium Fellow</p>
                            </div>
                            <div className="fellow-card">
                                <img src="/joshua.jpeg" alt="Joshua Louise R. Villanueva" className="fellow-image" />
                                <p className="fellow-name">Joshua Louise R. Villanueva</p>
                                <p className="fellow-title">Millennium Fellow</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© 2026 VoiceED. All rights reserved.</p>
                </div>
            </div>
        </footer>
    </>
  )
}
