import React, { useState, useEffect } from 'react';
import { Plus, Users, Calendar, Trash2, AlertCircle, CheckCircle2, X, Lock, Cloud, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

const CATEGORIES = ['Tech & Cloud', 'Music & Concerts', 'Gaming', 'Robotics & AI', 'Cultural'];

const OrganizerDashboard = () => {
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'checkin' | 'assets'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [attendeeModalEvent, setAttendeeModalEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Gate Check-in State
  const [ticketCodeInput, setTicketCodeInput] = useState('');
  const [checkInResult, setCheckInResult] = useState(null);
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Admin Passcode Unlock State (for attendee visiting this page)
  const [adminPasscode, setAdminPasscode] = useState('');
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState(null);

  // Create Event Form State
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    capacity: 50,
    ticket_price: '0.00',
    category: 'Tech & Cloud'
  });
  const [flyerFile, setFlyerFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
      return {};
    }
  });

  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'organizer');

  const fetchEvents = () => {
    setLoading(true);
    axiosClient.get('/api/events')
      .then((res) => {
        setEvents(res.data.events || []);
      })
      .catch((err) => {
        console.warn('Could not load events:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAdmin) {
      fetchEvents();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const handleInputChange = (e) => {
    setNewEvent({ ...newEvent, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFlyerFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionMessage(null);

    const formData = new FormData();
    formData.append('title', newEvent.title);
    formData.append('description', newEvent.description);
    formData.append('date', newEvent.date);
    formData.append('time', newEvent.time);
    formData.append('location', newEvent.location);
    formData.append('capacity', newEvent.capacity);
    formData.append('ticket_price', newEvent.ticket_price);
    formData.append('category', newEvent.category);

    if (flyerFile) {
      formData.append('flyer', flyerFile);
    }

    try {
      await axiosClient.post('/api/events', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setActionMessage({ type: 'success', text: 'New event published and banner uploaded to Amazon S3!' });
      setShowCreateModal(false);
      setNewEvent({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        capacity: 50,
        ticket_price: '0.00',
        category: 'Tech & Cloud'
      });
      setFlyerFile(null);
      setPreviewUrl(null);
      fetchEvents();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.response?.data?.error || 'Failed to publish event.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Delete this event from Amazon RDS?')) return;

    try {
      await axiosClient.delete(`/api/events/${id}`);
      setActionMessage({ type: 'success', text: 'Event deleted successfully.' });
      fetchEvents();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete event.' });
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

  // Gate Check-in
  const handleVerifyTicket = async (admit = false) => {
    if (!ticketCodeInput.trim()) return;
    setCheckInLoading(true);
    setCheckInResult(null);

    try {
      const res = await axiosClient.post('/api/tickets/check-in', {
        ticket_code: ticketCodeInput.trim(),
        admit
      });
      setCheckInResult({
        success: true,
        data: res.data
      });
    } catch (err) {
      setCheckInResult({
        success: false,
        error: err.response?.data?.error || 'Invalid pass code or reservation not found.'
      });
    } finally {
      setCheckInLoading(false);
    }
  };

  // Admin Passcode Unlock
  const handleUnlockAdmin = async (e) => {
    e.preventDefault();
    setUnlockLoading(true);
    setUnlockMessage(null);

    try {
      const res = await axiosClient.post('/api/auth/claim-organizer', {
        organizer_passcode: adminPasscode.trim()
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify({ ...res.data.user, role: 'admin' }));
      setCurrentUser({ ...res.data.user, role: 'admin' });
      setUnlockMessage({ type: 'success', text: 'Admin privileges activated!' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setUnlockMessage({
        type: 'error',
        text: err.response?.data?.error || 'Invalid passcode. Enter CAMPUS2026 to unlock Admin access.'
      });
    } finally {
      setUnlockLoading(false);
    }
  };

  // RESTRICTED VIEW FOR ATTENDEES
  if (!isAdmin) {
    return (
      <div style={{ padding: '60px 20px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="apple-card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '36px 28px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'var(--apple-blue-tint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Lock size={24} color="#0071e3" />
          </div>

          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Administrator Access Required</h2>
          <p style={{ color: 'var(--apple-text-secondary)', fontSize: '13px', marginBottom: '22px', lineHeight: 1.5 }}>
            You are currently signed in as <strong>{currentUser.name || 'Student'}</strong>. 
            To unlock the Admin Console (publish events, upload S3 flyers, view rosters, and verify tickets at the gate), enter the administrator passcode:
          </p>

          <form onSubmit={handleUnlockAdmin} style={{ marginBottom: '20px', textAlign: 'left' }}>
            <div className="apple-form-group">
              <label className="apple-label">Administrator Passcode</label>
              <input
                type="password"
                placeholder="Enter passcode (e.g. CAMPUS2026)"
                value={adminPasscode}
                onChange={(e) => setAdminPasscode(e.target.value)}
                required
                className="apple-input"
              />
              <span style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)', marginTop: '4px', display: 'block' }}>
                Demo passcode: <strong>CAMPUS2026</strong>
              </span>
            </div>

            {unlockMessage && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                marginBottom: '14px',
                background: unlockMessage.type === 'success' ? 'var(--apple-green-tint)' : 'var(--apple-red-tint)',
                color: unlockMessage.type === 'success' ? '#30d158' : '#ff6961'
              }}>
                {unlockMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={unlockLoading}
              className="btn-apple btn-apple-primary"
              style={{ width: '100%', padding: '10px' }}
            >
              {unlockLoading ? 'Validating...' : 'Unlock Admin Console'}
            </button>
          </form>

          <Link to="/events" className="btn-apple btn-apple-secondary" style={{ width: '100%' }}>
            Return to Events
          </Link>
        </div>
      </div>
    );
  }

  // Calculate Metrics
  const totalSeats = events.reduce((acc, e) => acc + (parseInt(e.capacity, 10) || 0), 0);
  const remainingSeats = events.reduce((acc, e) => acc + (parseInt(e.available_tickets, 10) || 0), 0);
  const seatsBooked = totalSeats - remainingSeats;

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        {/* Apple Admin Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#0071e3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Management
            </span>
            <h1 style={{ fontSize: '32px', marginTop: '2px', letterSpacing: '-0.025em' }}>
              Admin Console
            </h1>
            <p style={{ color: 'var(--apple-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              Publish events to Amazon RDS, upload flyers to Amazon S3, track attendee rosters, and check in passes at the gate.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-apple btn-apple-primary"
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              <Plus size={14} /> Publish Event
            </button>
          </div>
        </div>

        {/* Apple Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '28px' }}>
          <div className="apple-card" style={{ padding: '18px 20px' }}>
            <span style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Campus Events
            </span>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#f5f5f7', marginTop: '2px' }}>
              {events.length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>
              Active on Amazon RDS
            </div>
          </div>

          <div className="apple-card" style={{ padding: '18px 20px' }}>
            <span style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Auditorium Seats
            </span>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#0071e3', marginTop: '2px' }}>
              {seatsBooked} <span style={{ fontSize: '15px', color: 'var(--apple-text-tertiary)', fontWeight: 400 }}>/ {totalSeats}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>
              BookMyShow reserved seats
            </div>
          </div>

          <div className="apple-card" style={{ padding: '18px 20px' }}>
            <span style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Amazon S3 Media
            </span>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#30d158', marginTop: '2px' }}>
              {events.filter((e) => e.flyer_url && e.flyer_url.includes('s3')).length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>
              Flyers in S3 bucket
            </div>
          </div>

          <div className="apple-card" style={{ padding: '18px 20px' }}>
            <span style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Gate Verifier
            </span>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#bf5af2', marginTop: '2px' }}>
              Online
            </div>
            <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>
              Ticket admission scanner
            </div>
          </div>
        </div>

        {/* Apple Segmented Bar */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--apple-glass-border-subtle)', paddingBottom: '14px', marginBottom: '28px' }}>
          <button
            onClick={() => setActiveTab('events')}
            className={`apple-filter-pill ${activeTab === 'events' ? 'active' : ''}`}
          >
            <Calendar size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-1px' }} />
            Events & Rosters
          </button>
          <button
            onClick={() => setActiveTab('checkin')}
            className={`apple-filter-pill ${activeTab === 'checkin' ? 'active' : ''}`}
          >
            <CheckSquare size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-1px' }} />
            Gate Ticket Verifier
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`apple-filter-pill ${activeTab === 'assets' ? 'active' : ''}`}
          >
            <Cloud size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-1px' }} />
            Amazon S3 Media
          </button>
        </div>

        {/* Action Alert */}
        {actionMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: actionMessage.type === 'success' ? 'var(--apple-green-tint)' : 'var(--apple-red-tint)',
            border: `1px solid ${actionMessage.type === 'success' ? 'rgba(48, 209, 88, 0.3)' : 'rgba(255, 69, 58, 0.3)'}`,
            color: actionMessage.type === 'success' ? '#30d158' : '#ff6961',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '22px',
            fontSize: '13px'
          }}>
            {actionMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* TAB 1: EVENTS LIST & ROSTERS */}
        {activeTab === 'events' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--apple-text-secondary)' }}>
                Loading events from Amazon RDS...
              </div>
            ) : events.length === 0 ? (
              <div className="apple-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                <h3 style={{ fontSize: '20px', marginBottom: '6px' }}>No events published</h3>
                <p style={{ color: 'var(--apple-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                  Publish your first event with Amazon S3 flyer storage and BookMyShow seat booking.
                </p>
                <button onClick={() => setShowCreateModal(true)} className="btn-apple btn-apple-primary">
                  <Plus size={14} /> Publish Event
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '20px' }}>
                {events.map((evt) => (
                  <div key={evt.id} className="apple-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{
                        background: 'var(--apple-glass)',
                        border: '1px solid var(--apple-glass-border)',
                        color: 'var(--apple-text-secondary)',
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        fontWeight: 500
                      }}>
                        {evt.category || 'Tech & Cloud'}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#30d158' }}>
                        {parseFloat(evt.ticket_price) > 0 ? `$${evt.ticket_price}` : 'Free'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '17px', marginBottom: '6px', lineHeight: 1.25 }}>{evt.title}</h3>
                    <p style={{ color: 'var(--apple-text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {evt.description}
                    </p>

                    <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '18px' }}>
                      <div>📅 {new Date(evt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {evt.time}</div>
                      <div>📍 {evt.location}</div>
                      <div>🎟️ Available: <strong>{evt.available_tickets}</strong> / {evt.capacity} seats</div>
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', borderTop: '1px solid var(--apple-glass-border-subtle)', paddingTop: '14px' }}>
                      <button
                        onClick={() => handleViewAttendees(evt)}
                        className="btn-apple btn-apple-secondary"
                        style={{ flex: 1, padding: '7px 12px', fontSize: '12px' }}
                      >
                        <Users size={13} /> Roster
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="btn-apple btn-apple-danger"
                        style={{ padding: '7px 12px' }}
                        title="Delete Event"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE GATE TICKET VERIFIER */}
        {activeTab === 'checkin' && (
          <div className="apple-card" style={{ maxWidth: '620px', margin: '0 auto', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0071e3', marginBottom: '8px' }}>
              <CheckSquare size={20} />
              <h2 style={{ fontSize: '20px' }}>Gate Check-In & Ticket Verifier</h2>
            </div>
            <p style={{ color: 'var(--apple-text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
              Verify student passes at the entrance. Validates pass authenticity against RDS MySQL, checks seat allocations, and marks tickets as admitted (<code>CHECKED_IN</code>) to prevent duplicate entry.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              <input
                type="text"
                placeholder="Enter Pass Code (e.g. TKT-...)"
                value={ticketCodeInput}
                onChange={(e) => setTicketCodeInput(e.target.value)}
                className="apple-input"
                style={{ flex: 1, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
              />
              <button
                type="button"
                onClick={() => handleVerifyTicket(false)}
                disabled={checkInLoading || !ticketCodeInput.trim()}
                className="btn-apple btn-apple-secondary"
                style={{ fontSize: '13px' }}
              >
                {checkInLoading ? 'Checking...' : 'Verify'}
              </button>
              <button
                type="button"
                onClick={() => handleVerifyTicket(true)}
                disabled={checkInLoading || !ticketCodeInput.trim()}
                className="btn-apple btn-apple-primary"
                style={{ fontSize: '13px' }}
              >
                Admit Student
              </button>
            </div>

            {/* Result Card */}
            {checkInResult && (
              <div style={{
                background: checkInResult.success ? 'var(--apple-green-tint)' : 'var(--apple-red-tint)',
                border: `1px solid ${checkInResult.success ? 'rgba(48, 209, 88, 0.3)' : 'rgba(255, 69, 58, 0.3)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '18px',
                marginTop: '18px'
              }}>
                {checkInResult.success ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#30d158', fontWeight: 600, fontSize: '14px', marginBottom: '12px' }}>
                      <CheckCircle2 size={18} />
                      <span>{checkInResult.data.message}</span>
                    </div>

                    <div style={{ fontSize: '13px', color: '#f5f5f7', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div><strong>Student Name:</strong> {checkInResult.data.ticket.attendee_name}</div>
                      <div><strong>Email:</strong> {checkInResult.data.ticket.attendee_email}</div>
                      <div><strong>Event:</strong> {checkInResult.data.ticket.event_title}</div>
                      <div><strong>Assigned Seats:</strong> <code style={{ color: '#70b4ff', background: 'var(--apple-blue-tint)', padding: '2px 8px', borderRadius: '4px' }}>{checkInResult.data.ticket.seats || 'General Admission'}</code></div>
                      <div><strong>Status:</strong> <span style={{ color: checkInResult.data.ticket.status === 'CHECKED_IN' ? '#bf5af2' : '#30d158', fontWeight: 600 }}>{checkInResult.data.ticket.status}</span></div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff6961', fontSize: '13px' }}>
                    <AlertCircle size={18} />
                    <span>{checkInResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AMAZON S3 MEDIA */}
        {activeTab === 'assets' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div className="apple-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#30d158', marginBottom: '10px' }}>
                <Cloud size={18} />
                <h3 style={{ fontSize: '17px' }}>Amazon S3 Flyer Bucket</h3>
              </div>
              <p style={{ color: 'var(--apple-text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: '12px' }}>
                Bucket: <code>event-mgmt-flyers-838775536247</code>
              </p>
              <p style={{ color: 'var(--apple-text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
                All event flyers uploaded through the Admin Console are stored in S3 and served with public read permissions.
              </p>
            </div>

            <div className="apple-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0071e3', marginBottom: '10px' }}>
                <Calendar size={18} />
                <h3 style={{ fontSize: '17px' }}>Amazon RDS MySQL Database</h3>
              </div>
              <p style={{ color: 'var(--apple-text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: '12px' }}>
                Endpoint: <code>event-mgmt-db.cn0q6aswosq7.ap-south-1.rds.amazonaws.com</code>
              </p>
              <p style={{ color: 'var(--apple-text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
                Stores relational data for events, users, seats, and digital tickets with atomic transactions.
              </p>
            </div>
          </div>
        )}

        {/* Create Event Modal */}
        {showCreateModal && (
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
            <div className="apple-card" style={{ maxWidth: '540px', width: '100%', maxHeight: '92vh', overflowY: 'auto', position: 'relative' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ position: 'absolute', top: '20px', right: '20px', color: 'var(--apple-text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>

              <h2 style={{ fontSize: '22px', marginBottom: '4px' }}>Publish Event</h2>
              <p style={{ color: 'var(--apple-text-secondary)', fontSize: '13px', marginBottom: '22px' }}>
                Event metadata is saved in Amazon RDS MySQL; flyer images upload directly to Amazon S3.
              </p>

              <form onSubmit={handleCreateSubmit}>
                <div className="apple-form-group">
                  <label className="apple-label">Event Title</label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={newEvent.title}
                    onChange={handleInputChange}
                    placeholder="e.g. Apple Swift & Cloud Architecture Keynote"
                    className="apple-input"
                  />
                </div>

                <div className="apple-form-group">
                  <label className="apple-label">Category</label>
                  <select
                    name="category"
                    value={newEvent.category}
                    onChange={handleInputChange}
                    className="apple-select"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="apple-form-group">
                  <label className="apple-label">Description</label>
                  <textarea
                    name="description"
                    rows="3"
                    required
                    value={newEvent.description}
                    onChange={handleInputChange}
                    placeholder="Event overview, agenda, and guest speakers..."
                    className="apple-textarea"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="apple-form-group">
                    <label className="apple-label">Date</label>
                    <input
                      type="date"
                      name="date"
                      required
                      value={newEvent.date}
                      onChange={handleInputChange}
                      className="apple-input"
                    />
                  </div>
                  <div className="apple-form-group">
                    <label className="apple-label">Time</label>
                    <input
                      type="text"
                      name="time"
                      required
                      value={newEvent.time}
                      onChange={handleInputChange}
                      placeholder="e.g. 10:00 AM"
                      className="apple-input"
                    />
                  </div>
                </div>

                <div className="apple-form-group">
                  <label className="apple-label">Auditorium / Venue</label>
                  <input
                    type="text"
                    name="location"
                    required
                    value={newEvent.location}
                    onChange={handleInputChange}
                    placeholder="e.g. Steve Jobs Theater / Main Auditorium"
                    className="apple-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="apple-form-group">
                    <label className="apple-label">Seat Capacity</label>
                    <input
                      type="number"
                      name="capacity"
                      min="10"
                      max="500"
                      required
                      value={newEvent.capacity}
                      onChange={handleInputChange}
                      className="apple-input"
                    />
                  </div>
                  <div className="apple-form-group">
                    <label className="apple-label">Ticket Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="ticket_price"
                      required
                      value={newEvent.ticket_price}
                      onChange={handleInputChange}
                      className="apple-input"
                    />
                  </div>
                </div>

                {/* S3 Flyer Upload */}
                <div className="apple-form-group">
                  <label className="apple-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Cloud size={13} color="#0071e3" /> Event Banner Flyer (Uploads to Amazon S3)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="apple-input"
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                  />
                  {previewUrl && (
                    <div style={{ marginTop: '10px', height: '120px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                      <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-apple btn-apple-primary"
                  style={{ width: '100%', padding: '12px', marginTop: '8px', fontSize: '14px' }}
                >
                  {isSubmitting ? 'Uploading to S3 & Publishing...' : 'Publish Event'}
                </button>
              </form>
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
            <div className="apple-card" style={{ maxWidth: '620px', width: '100%', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
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
                  No attendees have registered for this event yet.
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

export default OrganizerDashboard;
