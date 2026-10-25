import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Calendar, Ticket, LayoutDashboard, LogIn, LogOut, User, Sparkles } from 'lucide-react';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import RegisterPage from './pages/RegisterPage';
import MyTicketsPage from './pages/MyTicketsPage';
import OrganizerDashboard from './pages/OrganizerDashboard';

const Navigation = () => {
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
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link to="/" className="brand">
          <Sparkles size={22} color="#6366f1" />
          <span>EventSphere</span>
        </Link>

        <div className="nav-links">
          <Link
            to="/events"
            className={`nav-link ${location.pathname === '/events' ? 'active' : ''}`}
          >
            Browse Events
          </Link>
          <Link
            to="/my-tickets"
            className={`nav-link ${location.pathname === '/my-tickets' ? 'active' : ''}`}
          >
            My Tickets
          </Link>
          <Link
            to="/dashboard"
            className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            Organizer Hub
          </Link>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: '12px' }}>
              <span style={{ fontSize: '0.88rem', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} /> {user.name} ({user.role})
              </span>
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                title="Log Out"
              >
                <LogOut size={14} /> Exit
              </button>
            </div>
          ) : (
            <Link to="/register" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
              <LogIn size={15} /> Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navigation />

        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/my-tickets" element={<MyTicketsPage />} />
            <Route path="/dashboard" element={<OrganizerDashboard />} />
          </Routes>
        </main>

        <footer style={{ borderTop: '1px solid var(--border-color)', padding: '32px 0', background: 'rgba(10, 14, 23, 0.95)', marginTop: 'auto' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            <div>
              <strong>Cloud-Based Event Management & Ticketing System</strong>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '2px' }}>
                Architected with AWS EC2 • RDS MySQL • S3 • SQS • Lambda • SNS • CloudWatch • Free-Tier Optimized
              </div>
            </div>
            <div>University Cloud Computing Lab Project</div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
