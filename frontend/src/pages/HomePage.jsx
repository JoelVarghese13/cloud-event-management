import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, ArrowRight, Activity, Calendar, MapPin, Server, Database, Zap, Cloud } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const HomePage = ({ onOpenCloudStatus }) => {
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get('/api/events')
      .then((res) => {
        setFeaturedEvents((res.data.events || []).slice(0, 3));
      })
      .catch((err) => {
        console.warn('Could not load live events:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* Apple Editorial Hero Section */}
      <section style={{
        padding: '90px 0 60px',
        textAlign: 'center',
        background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 113, 227, 0.15), transparent 70%)'
      }}>
        <div className="container" style={{ maxWidth: '820px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#70b4ff',
            background: 'var(--apple-blue-tint)',
            border: '1px solid rgba(0, 113, 227, 0.3)',
            padding: '4px 14px',
            borderRadius: 'var(--radius-pill)',
            marginBottom: '20px'
          }}>
            <span className="apple-dot-green"></span>
            <span>AWS Multi-Tier Architecture • ap-south-1</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 5.5vw, 56px)',
            fontWeight: 700,
            lineHeight: 1.08,
            marginBottom: '18px',
            color: '#f5f5f7',
            letterSpacing: '-0.035em'
          }}>
            EventSphere.
            <br />
            <span style={{ color: 'var(--apple-text-secondary)', fontWeight: 600 }}>
              Campus ticketing, refined.
            </span>
          </h1>

          <p style={{
            fontSize: '17px',
            color: 'var(--apple-text-secondary)',
            lineHeight: 1.5,
            marginBottom: '32px',
            maxWidth: '620px',
            margin: '0 auto 32px'
          }}>
            Reserve exact auditorium seats with zero collisions. Built on Amazon RDS MySQL, decoupled through Amazon SQS, and processed asynchronously via AWS Lambda.
          </p>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/events" className="btn-apple btn-apple-primary" style={{ padding: '11px 26px', fontSize: '14px' }}>
              <Ticket size={16} /> Browse Events & Seats
            </Link>
            <button onClick={onOpenCloudStatus} className="btn-apple btn-apple-secondary" style={{ padding: '11px 22px', fontSize: '14px' }}>
              <Activity size={15} /> Cloud Telemetry
            </button>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section style={{ padding: '40px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#0071e3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Featured
              </span>
              <h2 style={{ fontSize: '28px', marginTop: '2px' }}>Upcoming Schedule</h2>
            </div>
            <Link to="/events" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0071e3', fontSize: '14px', fontWeight: 500 }}>
              See all <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--apple-text-secondary)' }}>
              Loading schedule...
            </div>
          ) : (
            <div className="apple-event-grid">
              {featuredEvents.map((evt) => (
                <div key={evt.id} className="apple-event-card">
                  <div className="apple-event-banner">
                    <img
                      src={evt.flyer_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'}
                      alt={evt.title}
                      className="apple-event-img"
                    />
                    <div className="apple-category-pill">
                      {evt.category || 'Tech & Cloud'}
                    </div>
                    <div className={`apple-price-tag ${parseFloat(evt.ticket_price) === 0 ? 'free' : ''}`}>
                      {parseFloat(evt.ticket_price) > 0 ? `$${evt.ticket_price}` : 'Free'}
                    </div>
                  </div>

                  <div className="apple-event-body">
                    <h3 style={{ fontSize: '18px', marginBottom: '8px', lineHeight: 1.25 }}>
                      {evt.title}
                    </h3>
                    <p style={{
                      color: 'var(--apple-text-secondary)',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      marginBottom: '16px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {evt.description}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} color="var(--apple-text-tertiary)" />
                        <span>{new Date(evt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {evt.time}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} color="var(--apple-text-tertiary)" />
                        <span>{evt.location}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--apple-glass-border-subtle)', paddingTop: '14px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--apple-text-secondary)' }}>
                        Available: <strong style={{ color: evt.available_tickets > 0 ? '#30d158' : '#ff453a' }}>{evt.available_tickets} seats</strong>
                      </span>
                      <Link
                        to="/events"
                        className="btn-apple btn-apple-primary"
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                      >
                        Select Seats
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Apple Architecture Cards */}
      <section style={{ padding: '20px 0' }}>
        <div className="container">
          <div className="apple-glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Engineered on AWS Cloud</h3>
                <p style={{ color: 'var(--apple-text-secondary)', fontSize: '13px' }}>
                  Decoupled serverless queue orchestration with sub-10ms database latency.
                </p>
              </div>
              <button onClick={onOpenCloudStatus} className="btn-apple btn-apple-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                Open Telemetry
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', fontSize: '12px' }}>
              <div style={{ background: 'var(--apple-surface)', border: '1px solid var(--apple-glass-border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <strong style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}><Server size={14} color="#0071e3" /> Amazon EC2</strong>
                <div style={{ color: 'var(--apple-text-secondary)', marginTop: '4px' }}>Node.js REST API on port 3000 via PM2</div>
              </div>
              <div style={{ background: 'var(--apple-surface)', border: '1px solid var(--apple-glass-border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <strong style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}><Database size={14} color="#70b4ff" /> Amazon RDS</strong>
                <div style={{ color: 'var(--apple-text-secondary)', marginTop: '4px' }}>MySQL 8.0 in isolated private subnet</div>
              </div>
              <div style={{ background: 'var(--apple-surface)', border: '1px solid var(--apple-glass-border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <strong style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={14} color="#ff9f0a" /> SQS + Lambda</strong>
                <div style={{ color: 'var(--apple-text-secondary)', marginTop: '4px' }}>Asynchronous ticket buffering queue</div>
              </div>
              <div style={{ background: 'var(--apple-surface)', border: '1px solid var(--apple-glass-border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                <strong style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}><Cloud size={14} color="#30d158" /> Amazon S3</strong>
                <div style={{ color: 'var(--apple-text-secondary)', marginTop: '4px' }}>Static website & flyer media storage</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
