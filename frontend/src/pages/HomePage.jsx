import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Ticket, ShieldCheck, Zap, Server, Database, Cloud } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const HomePage = () => {
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get('/api/events')
      .then((res) => {
        setFeaturedEvents((res.data.events || []).slice(0, 3));
      })
      .catch((err) => {
        console.warn('Could not load live events, using sample display.', err);
        setFeaturedEvents([
          {
            id: 1,
            title: 'AWS Cloud Computing & Serverless Hackathon 2026',
            description: 'Hands-on architectural competition featuring Lambda, SQS, and RDS orchestration.',
            date: '2026-11-15',
            time: '09:00 AM',
            location: 'Main Auditorium / AWS Lab',
            available_tickets: 45,
            ticket_price: '0.00',
            flyer_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'
          },
          {
            id: 2,
            title: 'Annual TechFest & AI Symposium',
            description: 'Keynotes from cloud engineers and artificial intelligence researchers.',
            date: '2026-12-01',
            time: '10:30 AM',
            location: 'Science & Engineering Complex',
            available_tickets: 120,
            ticket_price: '15.00',
            flyer_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800'
          }
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-pill">
            <Zap size={16} /> AWS Cloud-Native University Project
          </div>
          <h1 className="hero-title">
            Seamless Campus Events <br />
            Powered by Serverless Cloud
          </h1>
          <p className="hero-subtitle">
            A resilient multi-tier system engineered with Amazon EC2, RDS MySQL, S3 storage, 
            SQS message queues, and Lambda event-driven asynchronous confirmation.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link to="/events" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
              <Ticket size={20} /> Browse All Events
            </Link>
            <Link to="/dashboard" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
              Organizer Dashboard
            </Link>
          </div>

          {/* Architecture Service Highlights Ribbon */}
          <div className="cloud-ribbon">
            <div className="cloud-pill">
              <Server size={16} color="#6366f1" />
              <span>EC2</span> Node.js API
            </div>
            <div className="cloud-pill">
              <Database size={16} color="#3b82f6" />
              <span>RDS</span> MySQL VPC
            </div>
            <div className="cloud-pill">
              <Cloud size={16} color="#10b981" />
              <span>S3</span> Flyer Assets
            </div>
            <div className="cloud-pill">
              <Zap size={16} color="#f59e0b" />
              <span>SQS + Lambda</span> Async Workers
            </div>
            <div className="cloud-pill">
              <ShieldCheck size={16} color="#ec4899" />
              <span>SSM + Budgets</span> Least Privilege & Low Cost
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section style={{ padding: '60px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
              <span style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                Upcoming Schedule
              </span>
              <h2 style={{ fontSize: '2rem', marginTop: '4px' }}>Featured Campus Events</h2>
            </div>
            <Link to="/events" className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>
              View All &rarr;
            </Link>
          </div>

          <div className="grid-cards">
            {featuredEvents.map((evt) => (
              <div key={evt.id} className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
                <img
                  src={evt.flyer_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'}
                  alt={evt.title}
                  style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                />
                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="badge badge-primary">
                      <Calendar size={12} /> {evt.date}
                    </span>
                    <span style={{ fontWeight: '700', color: '#10b981', fontSize: '1.1rem' }}>
                      {parseFloat(evt.ticket_price) > 0 ? `$${evt.ticket_price}` : 'Free'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', marginBottom: '10px', lineHeight: 1.3 }}>
                    {evt.title}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '20px', flex: 1 }}>
                    {evt.description.length > 110 ? evt.description.slice(0, 110) + '...' : evt.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                      Available: <strong style={{ color: '#fff' }}>{evt.available_tickets}</strong>
                    </span>
                    <Link to="/events" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
                      Register Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
