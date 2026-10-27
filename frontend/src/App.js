import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LogIn, LogOut, Shield, Sparkles } from 'lucide-react';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import RegisterPage from './pages/RegisterPage';
import MyTicketsPage from './pages/MyTicketsPage';
import OrganizerDashboard from './pages/OrganizerDashboard';
import CloudStatusModal from './components/CloudStatusModal';

const Navigation = ({ onOpenCloudStatus }) => {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  const isAdmin = user && (user.role === 'admin' || user.role === 'organizer');

  return (
    <>
      {/* Apple Admin Mode Top Strip */}
      {isAdmin && (
        <div className="apple-admin-strip">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={13} color="#70b4ff" />
            <span>
              <strong>Administrator Access Active:</strong> Full permissions to publish campus events, upload flyers to S3, and verify tickets at gate.
            </span>
          </div>
          <Link
            to="/dashboard"
            style={{ color: '#fff', background: 'rgba(0, 113, 227, 0.4)', padding: '2px 10px', borderRadius: 'var(--radius-pill)', fontSize: '11px', fontWeight: 500 }}
          >
            Admin Console ➔
          </Link>
        </div>
      )}

      <header className="apple-nav">
        <div className="container apple-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
            <Link to="/" className="apple-brand">
              <Sparkles size={16} color="#0071e3" />
              <span>EventSphere</span>
            </Link>

            {/* Apple Cloud Telemetry Pill */}
            <div
              onClick={onOpenCloudStatus}
              className="apple-pill-badge"
              title="AWS ap-south-1 Cloud Architecture Telemetry"
            >
              <span className="apple-dot-green"></span>
              <span>AWS ap-south-1</span>
            </div>
          </div>

          <nav className="apple-nav-links">
            <Link
              to="/events"
              className={`apple-nav-item ${location.pathname === '/events' ? 'active' : ''}`}
            >
              Events
            </Link>

            <Link
              to="/my-tickets"
              className={`apple-nav-item ${location.pathname === '/my-tickets' ? 'active' : ''}`}
            >
              My Passes
            </Link>

            {/* Admin Console Link (simplified: organizer merged into admin) */}
            {isAdmin && (
              <Link
                to="/dashboard"
                className={`apple-nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
                style={{ color: '#70b4ff', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}
              >
                <Shield size={12} /> Admin
              </Link>
            )}

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--apple-text-secondary)' }}>
                  {user.name} <span style={{ color: isAdmin ? '#70b4ff' : 'var(--apple-text-tertiary)', fontWeight: 500 }}>({isAdmin ? 'admin' : 'student'})</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-apple btn-apple-secondary"
                  style={{ padding: '4px 12px', fontSize: '11px' }}
                  title="Sign Out"
                >
                  <LogOut size={11} /> Exit
                </button>
              </div>
            ) : (
              <Link to="/register" className="btn-apple btn-apple-primary" style={{ padding: '5px 14px', fontSize: '12px' }}>
                <LogIn size={12} /> Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>
    </>
  );
};

function App() {
  const [cloudModalOpen, setCloudModalOpen] = useState(false);

  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--apple-black)' }}>
        <Navigation onOpenCloudStatus={() => setCloudModalOpen(true)} />

        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage onOpenCloudStatus={() => setCloudModalOpen(true)} />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/my-tickets" element={<MyTicketsPage />} />
            <Route path="/dashboard" element={<OrganizerDashboard />} />
          </Routes>
        </main>

        <footer style={{
          borderTop: '1px solid var(--apple-glass-border-subtle)',
          padding: '24px 0',
          background: 'var(--apple-black)',
          fontSize: '12px',
          color: 'var(--apple-text-tertiary)'
        }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <strong style={{ color: 'var(--apple-text-secondary)', fontWeight: 500 }}>EventSphere</strong> — Apple Design Architecture for AWS Cloud Ticketing
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span>AWS EC2 • RDS MySQL • SQS • Lambda • SNS • S3</span>
              <button
                onClick={() => setCloudModalOpen(true)}
                style={{ background: 'transparent', color: '#0071e3', fontSize: '12px', cursor: 'pointer' }}
              >
                Telemetry
              </button>
            </div>
          </div>
        </footer>

        <CloudStatusModal isOpen={cloudModalOpen} onClose={() => setCloudModalOpen(false)} />
      </div>
    </Router>
  );
}

export default App;
