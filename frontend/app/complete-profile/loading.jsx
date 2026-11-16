export default function Loading() {
  return (
    <div
      className="login-page"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      <div className="login-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="login-card-header">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <h2>Loading...</h2>
          <p>Please wait while we load your profile completion page.</p>
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
        </div>
      </div>
    </div>
  );
}
