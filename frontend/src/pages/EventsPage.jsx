import React, { useState, useEffect } from 'react';
import { Search, Calendar, MapPin, Clock, Ticket, CheckCircle2, AlertCircle, X } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEvents = (query = '') => {
    setLoading(true);
    axiosClient.get(`/api/events${query ? `?search=${encodeURIComponent(query)}` : ''}`)
      .then((res) => setEvents(res.data.events || []))
      .catch((err) => {
        console.warn('Backend unavailable, showing mock events catalog:', err);
        setEvents([
          {
            id: 1,
            title: 'Cloud Architecture & DevOps Workshop 2026',
            description: 'Learn to build resilient cloud-native infrastructures using VPC, EC2, and automated CI/CD.',
            date: '2026-11-20',
            time: '14:00 PM',
            location: 'Engineering Hall B, Lab 4',
            available_tickets: 32,
            ticket_price: '0.00',
            flyer_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800'
          },
          {
            id: 2,
            title: 'University Annual Robotics Exposition',
            description: 'Showcasing autonomous drones, robotic arms, and IoT cloud telemetry dashboards.',
            date: '2026-11-28',
            time: '10:00 AM',
            location: 'Student Innovation Center',
            available_tickets: 85,
            ticket_price: '5.00',
            flyer_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800'
          },
          {
            id: 3,
            title: 'Serverless Application Development with AWS Lambda',
            description: 'Deep dive into event-driven design patterns, SQS buffers, and SNS broadcast fan-outs.',
            date: '2026-12-05',
            time: '16:00 PM',
            location: 'Computing Science Building',
            available_tickets: 40,
            ticket_price: '0.00',
            flyer_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800'
          }
        ]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEvents(search);
  };

  const handleOpenBooking = (event) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in or register before reserving a ticket.');
      window.location.href = '/register';
      return;
    }
    setSelectedEvent(event);
    setQuantity(1);
    setBookingStatus(null);
  };

  const handleConfirmBooking = async () => {
    if (!selectedEvent) return;
    setIsSubmitting(true);
    setBookingStatus(null);

    try {
      const res = await axiosClient.post('/api/tickets/book', {
        event_id: selectedEvent.id,
        quantity: parseInt(quantity, 10)
      });

      setBookingStatus({
        type: 'success',
        message: res.data.message || 'Ticket reserved successfully!',
        ticket: res.data.ticket
      });

      // Refresh events list to reflect decremented seats
      fetchEvents(search);
    } catch (err) {
      setBookingStatus({
        type: 'error',
        message: err.response?.data?.error || 'Failed to complete ticket booking. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        {/* Header & Search */}
        <div style={{ maxWidth: '720px', margin: '0 auto 40px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '12px' }}>Explore Events</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>
            Browse university events, workshops, and competitions. Register to receive instant confirmation via AWS SQS & Lambda.
          </p>

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search events by title, keyword, or venue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '44px' }}
              />
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            Loading available events...
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <h3>No events found</h3>
            <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search query or check back soon!</p>
          </div>
        ) : (
          <div className="grid-cards">
            {events.map((evt) => (
              <div key={evt.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                <img
                  src={evt.flyer_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'}
                  alt={evt.title}
                  style={{ width: '100%', height: '190px', objectFit: 'cover' }}
                />
                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="badge badge-primary">
                      <Calendar size={12} /> {evt.date}
                    </span>
                    <span style={{ fontWeight: '700', color: '#10b981', fontSize: '1.15rem' }}>
                      {parseFloat(evt.ticket_price) > 0 ? `$${evt.ticket_price}` : 'FREE'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', lineHeight: 1.3 }}>{evt.title}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '18px', flex: 1 }}>
                    {evt.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={15} color="var(--primary)" /> {evt.time}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={15} color="var(--primary)" /> {evt.location}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <span style={{ fontSize: '0.85rem', color: evt.available_tickets > 0 ? 'var(--text-muted)' : 'var(--danger)' }}>
                      Seats Left: <strong>{evt.available_tickets}</strong>
                    </span>
                    <button
                      onClick={() => handleOpenBooking(evt)}
                      disabled={evt.available_tickets <= 0}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.88rem' }}
                    >
                      <Ticket size={16} /> Book Ticket
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ticket Booking Modal */}
        {selectedEvent && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}>
            <div className="card" style={{ maxWidth: '480px', width: '100%', position: 'relative' }}>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>

              <h2 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>Reserve Tickets</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                {selectedEvent.title}
              </p>

              {bookingStatus ? (
                <div>
                  {bookingStatus.type === 'success' ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto 12px' }} />
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Reservation Queued!</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                        {bookingStatus.message}
                      </p>
                      {bookingStatus.ticket && (
                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '20px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ticket Reference:</span>
                          <div style={{ fontSize: '1.1rem', fontWeight: '700', letterSpacing: '0.05em', color: '#a5b4fc' }}>
                            {bookingStatus.ticket.ticket_code}
                          </div>
                        </div>
                      )}
                      <button onClick={() => setSelectedEvent(null)} className="btn btn-primary" style={{ width: '100%' }}>
                        Done
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto 12px' }} />
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--danger)' }}>Reservation Failed</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                        {bookingStatus.message}
                      </p>
                      <button onClick={() => setBookingStatus(null)} className="btn btn-secondary" style={{ width: '100%' }}>
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="form-group">
                    <label className="form-label">Number of Seats (Max 5)</label>
                    <input
                      type="number"
                      min="1"
                      max={Math.min(5, selectedEvent.available_tickets)}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Price per ticket:</span>
                      <span>{parseFloat(selectedEvent.ticket_price) > 0 ? `$${selectedEvent.ticket_price}` : 'Free'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: '700', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                      <span>Total Amount:</span>
                      <span style={{ color: '#10b981' }}>
                        ${(parseFloat(selectedEvent.ticket_price || 0) * parseInt(quantity || 1, 10)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmBooking}
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px' }}
                  >
                    {isSubmitting ? 'Submitting to Queue...' : 'Confirm Ticket Reservation'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
