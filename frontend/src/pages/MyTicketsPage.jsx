import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Calendar, MapPin, QrCode, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const MyTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    axiosClient.get('/api/tickets/my-tickets')
      .then((res) => {
        setTickets(res.data.tickets || []);
      })
      .catch((err) => {
        console.warn('Could not fetch remote tickets:', err);
        setTickets([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const token = localStorage.getItem('token');

  if (!token) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <Ticket size={48} color="var(--primary)" style={{ marginBottom: '16px' }} />
        <h2>Sign In to View Your Tickets</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Please authenticate to see your registered events and access passes.
        </p>
        <Link to="/register" className="btn btn-primary">
          Log In or Register
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '2.2rem' }}>My Tickets & Passes</h1>
              <p style={{ color: 'var(--text-muted)' }}>
                Your confirmed and queued event reservations.
              </p>
            </div>
            <Link to="/events" className="btn btn-secondary">
              Browse More Events
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Loading your tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <Ticket size={48} color="var(--text-dim)" style={{ margin: '0 auto 16px' }} />
              <h3>No tickets reserved yet</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                You haven't registered for any events yet. Check out the campus event schedule!
              </p>
              <Link to="/events" className="btn btn-primary">
                Explore Events
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    padding: 0,
                    overflow: 'hidden',
                    borderLeft: '4px solid var(--primary)'
                  }}
                >
                  {/* Left / Info Section */}
                  <div style={{ flex: '1 1 340px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span className={t.status === 'CONFIRMED' ? 'badge badge-success' : 'badge badge-warning'}>
                        {t.status === 'CONFIRMED' ? (
                          <><CheckCircle2 size={12} /> Confirmed</>
                        ) : (
                          <><Clock size={12} /> SQS Queue Processing</>
                        )}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                        Quantity: <strong style={{ color: '#fff' }}>{t.quantity} seat(s)</strong>
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.35rem', marginBottom: '12px' }}>{t.event_title}</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={15} color="var(--primary)" /> {t.event_date} {t.event_time && `at ${t.event_time}`}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={15} color="var(--primary)" /> {t.event_location}
                      </div>
                    </div>
                  </div>

                  {/* Right / Ticket Code Stub */}
                  <div
                    style={{
                      flex: '0 0 220px',
                      background: 'rgba(0, 0, 0, 0.35)',
                      borderLeft: '1px dashed var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '24px',
                      textAlign: 'center'
                    }}
                  >
                    <QrCode size={64} color="var(--primary)" style={{ marginBottom: '12px' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      Pass Code
                    </span>
                    <strong style={{ fontSize: '0.95rem', letterSpacing: '0.05em', color: '#fff' }}>
                      {t.ticket_code}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyTicketsPage;
