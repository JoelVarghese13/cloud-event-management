import React, { useState, useEffect } from 'react';
import { Plus, Users, Calendar, Trash2, Upload, AlertCircle, CheckCircle2, X } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const OrganizerDashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    capacity: 50,
    ticket_price: '0.00'
  });
  const [flyerFile, setFlyerFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchOrganizerEvents = () => {
    setLoading(true);
    axiosClient.get('/api/events')
      .then((res) => {
        // In local or demo environment, filter by user or show all
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const all = res.data.events || [];
        const mine = user.id ? all.filter((e) => e.organizer_id === user.id || user.role === 'admin') : all;
        setEvents(mine.length ? mine : all);
      })
      .catch((err) => {
        console.warn('Could not load organizer events:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrganizerEvents();
  }, []);

  const handleInputChange = (e) => {
    setNewEvent({ ...newEvent, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFlyerFile(e.target.files[0]);
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
    if (flyerFile) {
      formData.append('flyer', flyerFile);
    }

    try {
      await axiosClient.post('/api/events', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setActionMessage({ type: 'success', text: 'Event created and flyer staged for S3 upload!' });
      setShowCreateModal(false);
      setNewEvent({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        capacity: 50,
        ticket_price: '0.00'
      });
      setFlyerFile(null);
      fetchOrganizerEvents();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to create event. Please ensure you are logged in as an Organizer.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await axiosClient.delete(`/api/events/${id}`);
      setEvents(events.filter((e) => e.id !== id));
      setActionMessage({ type: 'success', text: 'Event removed.' });
    } catch (err) {
      setActionMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete event.' });
    }
  };

  const totalCapacity = events.reduce((sum, e) => sum + (parseInt(e.capacity, 10) || 0), 0);
  const totalRemaining = events.reduce((sum, e) => sum + (parseInt(e.available_tickets, 10) || 0), 0);

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem' }}>Organizer Dashboard</h1>
            <p style={{ color: 'var(--text-muted)' }}>
              Manage events, monitor ticket capacity, and upload event flyers directly to AWS S3.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ padding: '12px 20px' }}
          >
            <Plus size={18} /> Create New Event
          </button>
        </div>

        {actionMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '28px',
            background: actionMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: actionMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'
          }}>
            {actionMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '36px' }}>
          <div className="card">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Active Events</span>
            <div style={{ fontSize: '2.2rem', fontWeight: '800', marginTop: '6px' }}>{events.length}</div>
          </div>
          <div className="card">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Seats Provisioned</span>
            <div style={{ fontSize: '2.2rem', fontWeight: '800', marginTop: '6px', color: '#6366f1' }}>{totalCapacity}</div>
          </div>
          <div className="card">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tickets Reserved</span>
            <div style={{ fontSize: '2.2rem', fontWeight: '800', marginTop: '6px', color: '#10b981' }}>{totalCapacity - totalRemaining}</div>
          </div>
          <div className="card">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>AWS Cost Optimization</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '700', marginTop: '10px', color: '#10b981' }}>Free Tier Compliant</div>
          </div>
        </div>

        {/* Events Table / Cards */}
        <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Your Managed Events</h2>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading events...</div>
        ) : events.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
            <Calendar size={48} color="var(--text-dim)" style={{ margin: '0 auto 16px' }} />
            <h3>No events published yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
              Click "Create New Event" above to publish your first campus event.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {events.map((evt) => (
              <div key={evt.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: '1 1 300px' }}>
                  <img
                    src={evt.flyer_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'}
                    alt={evt.title}
                    style={{ width: '70px', height: '70px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                  />
                  <div>
                    <h3 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>{evt.title}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {evt.date} • {evt.location}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{evt.available_tickets} / {evt.capacity}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Seats Left</span>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#10b981' }}>
                      {parseFloat(evt.ticket_price) > 0 ? `$${evt.ticket_price}` : 'Free'}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Price</span>
                  </div>

                  <button
                    onClick={() => handleDeleteEvent(evt.id)}
                    className="btn btn-danger"
                    style={{ padding: '8px 12px' }}
                    title="Delete Event"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Event Modal */}
        {showCreateModal && (
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
            <div className="card" style={{ maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>

              <h2 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>Create New Event</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
                Fill in the details. The flyer will be uploaded to AWS S3.
              </p>

              <form onSubmit={handleCreateSubmit}>
                <div className="form-group">
                  <label className="form-label">Event Title</label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={newEvent.title}
                    onChange={handleInputChange}
                    placeholder="e.g. AWS Cloud Security Summit"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    rows="3"
                    required
                    value={newEvent.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of the event agenda..."
                    className="form-textarea"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      name="date"
                      required
                      value={newEvent.date}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time</label>
                    <input
                      type="text"
                      name="time"
                      placeholder="e.g. 10:00 AM"
                      required
                      value={newEvent.time}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Location / Venue</label>
                  <input
                    type="text"
                    name="location"
                    required
                    value={newEvent.location}
                    onChange={handleInputChange}
                    placeholder="e.g. Science Auditorium, Hall 101"
                    className="form-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Total Capacity</label>
                    <input
                      type="number"
                      name="capacity"
                      min="1"
                      required
                      value={newEvent.capacity}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ticket Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="ticket_price"
                      value={newEvent.ticket_price}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Flyer Image (Amazon S3)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="form-input"
                    style={{ padding: '8px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {isSubmitting ? 'Uploading & Creating...' : 'Publish Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerDashboard;
