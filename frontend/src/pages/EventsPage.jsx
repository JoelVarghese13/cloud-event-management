import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, CheckCircle2, AlertCircle, X, Armchair, Plus, Users, Trash2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import SeatPicker from '../components/SeatPicker';

const CATEGORIES = ['All', 'Tech & Cloud', 'Music & Concerts', 'Gaming', 'Robotics & AI', 'Cultural'];

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin Quick Attendee View State
  const [attendeeModalEvent, setAttendeeModalEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user && (user.role === 'admin' || user.role === 'organizer');

  const fetchEvents = (category = selectedCategory, searchQuery = search) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (searchQuery) params.append('search', searchQuery);

    axiosClient.get(`/api/events?${params.toString()}`)
      .then((res) => setEvents(res.data.events || []))
      .catch((err) => {
        console.warn('Could not fetch events from API:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents(selectedCategory, search);
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEvents(selectedCategory, search);
  };

  const handleOpenBooking = async (evt) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/register');
      return;
    }

    setSelectedEvent(evt);
    setSelectedSeats([]);
    setBookingStatus(null);
    setLoadingSeats(true);

    try {
      const res = await axiosClient.get(`/api/events/${evt.id}/booked-seats`);
      setBookedSeats(res.data.bookedSeats || []);
    } catch (err) {
      console.warn('Could not fetch booked seats:', err);
      setBookedSeats([]);
    } finally {
      setLoadingSeats(false);
    }
  };

  const handleToggleSeat = (seatId) => {
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatId));
    } else {
      if (selectedSeats.length >= 5) {
        alert('You can select a maximum of 5 seats per reservation.');
        return;
      }
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const handleConfirmBooking = async () => {
    if (selectedSeats.length === 0) {
      alert('Please select at least 1 seat on the auditorium map to proceed.');
      return;
    }

    setIsSubmitting(true);
    setBookingStatus(null);

    try {
      const res = await axiosClient.post('/api/tickets/book', {
        event_id: selectedEvent.id,
        quantity: selectedSeats.length,
        seats: selectedSeats
      });

      setBookingStatus({
        type: 'success',
        message: res.data.message || 'Seats confirmed and buffered via SQS queue!',
        ticket: res.data.ticket
      });

      fetchEvents(selectedCategory, search);
    } catch (err) {
      setBookingStatus({
        type: 'error',
        message: err.response?.data?.error || 'Failed to complete seat reservation.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin Actions
  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Delete this event from Amazon RDS?')) return;
    try {
      await axiosClient.delete(`/api/events/${id}`);
      fetchEvents(selectedCategory, search);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete event.');
    }
  };

  const handleViewAttendees = async (evt) => {
    setAttendeeModalEvent(evt);
    setLoadingAttendees(true);
    setAttendees([]);

    try {
      const res = await axiosClient.get(`/api/tickets/event/${evt.id}`);
      setAttendees(res.data.tickets || []);
    } catch (err) {
      console.warn('Could not fetch attendees:', err);
    } finally {
      setLoadingAttendees(false);
    }
  };

  const totalPrice = selectedEvent
    ? (parseFloat(selectedEvent.ticket_price || 0) * (selectedSeats.length || 1)).toFixed(2)
    : '0.00';

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#0071e3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Schedule
            </span>
            <h1 style={{ fontSize: '32px', marginTop: '2px', letterSpacing: '-0.025em' }}>
              Campus Events
            </h1>
            <p style={{ color: 'var(--apple-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              Select auditorium seats with live collision prevention. Passes dispatched instantly.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Admin Quick Publish Action */}
            {isAdmin && (
              <Link to="/dashboard" className="btn-apple btn-apple-primary" style={{ padding: '7px 16px', fontSize: '13px' }}>
                <Plus size={14} /> Publish Event
              </Link>
            )}

            {/* Apple Minimalist Search Input */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="Search events, venues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="apple-input"
                style={{ width: '220px', padding: '7px 14px', fontSize: '13px', borderRadius: 'var(--radius-pill)' }}
              />
              <button type="submit" className="btn-apple btn-apple-secondary" style={{ padding: '7px 14px', fontSize: '13px' }}>
                Search
              </button>
            </form>
          </div>
        </div>

        {/* Apple Category Filter Bar */}
        <div className="apple-filter-bar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`apple-filter-pill ${selectedCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--apple-text-secondary)' }}>
            Retrieving events from Amazon RDS...
          </div>
        ) : events.length === 0 ? (
          <div className="apple-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>No events found</h3>
            <p style={{ color: 'var(--apple-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
              There are currently no events matching your filter.
            </p>
            <button onClick={() => { setSelectedCategory('All'); setSearch(''); }} className="btn-apple btn-apple-primary">
              View All Events
            </button>
          </div>
        ) : (
          <div className="apple-event-grid">
            {events.map((evt) => (
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--apple-text-secondary)', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} color="var(--apple-text-tertiary)" />
                      <span>{new Date(evt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {evt.time}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={13} color="var(--apple-text-tertiary)" />
                      <span>{evt.location}</span>
                    </div>
                  </div>

                  {/* Admin Controls */}
                  {isAdmin && (
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--apple-glass-border-subtle)',
                      padding: '7px 12px',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '14px',
                      fontSize: '12px'
                    }}>
                      <button
                        onClick={() => handleViewAttendees(evt)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#70b4ff', cursor: 'pointer' }}
                      >
                        <Users size={12} /> Roster
                      </button>
                      <span style={{ color: 'var(--apple-glass-border)' }}>|</span>
                      <button
                        onClick={() => handleDeleteEvent(evt.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ff6961', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}

                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--apple-glass-border-subtle)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--apple-text-secondary)' }}>
                      Available: <strong style={{ color: evt.available_tickets > 0 ? '#30d158' : '#ff453a' }}>{evt.available_tickets} seats</strong>
                    </span>
                    <button
                      onClick={() => handleOpenBooking(evt)}
                      disabled={evt.available_tickets <= 0}
                      className="btn-apple btn-apple-primary"
                      style={{ padding: '6px 14px', fontSize: '12px' }}
                    >
                      <Armchair size={13} /> Select Seats
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Apple-styled BookMyShow Interactive Seat Selection Modal */}
        {selectedEvent && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}>
            <div className="apple-card" style={{ maxWidth: '600px', width: '100%', maxHeight: '92vh', overflowY: 'auto', position: 'relative' }}>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{ position: 'absolute', top: '20px', right: '20px', color: 'var(--apple-text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>

              <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Select Seats</h2>
              <p style={{ color: 'var(--apple-text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                {selectedEvent.title} • {selectedEvent.location}
              </p>

              {bookingStatus ? (
                <div>
                  {bookingStatus.type === 'success' ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <CheckCircle2 size={44} color="#30d158" style={{ margin: '0 auto 12px' }} />
                      <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Seats Confirmed!</h3>
                      <p style={{ color: 'var(--apple-text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
                        {bookingStatus.message}
                      </p>
                      <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--apple-glass-border)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '20px', textAlign: 'left', fontSize: '13px' }}>
                        <div><strong>Ticket Code:</strong> <code style={{ color: '#70b4ff' }}>{bookingStatus.ticket?.ticket_code}</code></div>
                        <div style={{ marginTop: '4px' }}><strong>Reserved Seats:</strong> <code style={{ color: '#30d158' }}>{bookingStatus.ticket?.seats}</code></div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <Link to="/my-tickets" className="btn-apple btn-apple-primary" style={{ flex: 1, padding: '10px' }}>
                          View in My Passes
                        </Link>
                        <button onClick={() => setSelectedEvent(null)} className="btn-apple btn-apple-secondary" style={{ flex: 1, padding: '10px' }}>
                          Close
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <AlertCircle size={44} color="#ff453a" style={{ margin: '0 auto 12px' }} />
                      <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Reservation Notice</h3>
                      <p style={{ color: 'var(--apple-text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                        {bookingStatus.message}
                      </p>
                      <button onClick={() => setBookingStatus(null)} className="btn-apple btn-apple-primary">
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {loadingSeats ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--apple-text-secondary)' }}>
                      Connecting to Amazon RDS MySQL...
                    </div>
                  ) : (
                    <>
                      <SeatPicker
                        bookedSeats={bookedSeats}
                        selectedSeats={selectedSeats}
                        onToggleSeat={handleToggleSeat}
                        maxSeats={5}
                      />

                      {/* Selected Seats Summary */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--apple-glass-border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        marginBottom: '20px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', fontWeight: 500 }}>
                            Selected Seats ({selectedSeats.length}/5):
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--apple-text)' }}>
                            Total: ${totalPrice}
                          </span>
                        </div>

                        {selectedSeats.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {selectedSeats.map((s) => (
                              <span key={s} className="apple-seat-chip">
                                <span>{s}</span>
                                <button type="button" onClick={() => handleToggleSeat(s)} className="apple-seat-delete">
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--apple-text-tertiary)' }}>
                            Click available seats on the map above to select your positions.
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleConfirmBooking}
                        disabled={selectedSeats.length === 0 || isSubmitting}
                        className="btn-apple btn-apple-primary"
                        style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                      >
                        {isSubmitting
                          ? 'Dispatching to SQS Queue...'
                          : `Confirm ${selectedSeats.length} Seat${selectedSeats.length > 1 ? 's' : ''} — $${totalPrice}`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attendee Roster Modal */}
        {attendeeModalEvent && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}>
            <div className="apple-card" style={{ maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
              <button
                onClick={() => setAttendeeModalEvent(null)}
                style={{ position: 'absolute', top: '20px', right: '20px', color: 'var(--apple-text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>

              <h2 style={{ fontSize: '20px', marginBottom: '2px' }}>Attendee Roster</h2>
              <p style={{ color: 'var(--apple-text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                {attendeeModalEvent.title}
              </p>

              {loadingAttendees ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--apple-text-secondary)' }}>
                  Loading attendees from RDS...
                </div>
              ) : attendees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--apple-text-secondary)' }}>
                  No attendees have reserved seats for this event yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {attendees.map((att) => (
                    <div key={att.id} style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--apple-glass-border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#f5f5f7', fontSize: '13px' }}>{att.attendee_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)' }}>{att.attendee_email}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)',
                          background: att.status === 'CONFIRMED' ? 'var(--apple-green-tint)' : 'var(--apple-orange-tint)',
                          color: att.status === 'CONFIRMED' ? '#30d158' : '#ff9f0a'
                        }}>
                          {att.status}
                        </span>
                        <div style={{ fontSize: '11px', color: '#70b4ff', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                          {att.ticket_code}
                        </div>
                      </div>
                    </div>
                  ))}
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
