import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Calendar, MapPin, QrCode, CheckCircle2, Clock, XCircle, AlertTriangle, Armchair, Trash2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const MyTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionAlert, setActionAlert] = useState(null);

  // Seat Cancellation Modal State
  const [seatCancelModal, setSeatCancelModal] = useState(null); // { ticket, seat }
  const [isCancellingSeat, setIsCancellingSeat] = useState(false);

  // Full Ticket Cancellation Modal State
  const [fullCancelModal, setFullCancelModal] = useState(null); // ticket
  const [isCancellingFull, setIsCancellingFull] = useState(false);

  const fetchTickets = () => {
    setLoading(true);
    axiosClient.get('/api/tickets/my-tickets')
      .then((res) => {
        setTickets(res.data.tickets || []);
      })
      .catch((err) => {
        console.warn('Could not fetch tickets:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchTickets();
    } else {
      setLoading(false);
    }
  }, []);

  // Handle individual seat cancellation (e.g. A1, B5)
  const handleConfirmCancelSeat = async () => {
    if (!seatCancelModal) return;
    const { ticket, seat } = seatCancelModal;
    setIsCancellingSeat(true);

    try {
      const res = await axiosClient.post(`/api/tickets/${ticket.id}/cancel-seat`, { seat });
      setActionAlert({
        type: 'success',
        message: res.data.message || `Seat ${seat} released. 1 seat restored to event pool.`
      });
      setSeatCancelModal(null);
      fetchTickets();
    } catch (err) {
      setActionAlert({
        type: 'error',
        message: err.response?.data?.error || `Failed to cancel seat ${seat}.`
      });
    } finally {
      setIsCancellingSeat(false);
    }
  };

  // Handle entire pass cancellation
  const handleConfirmCancelFull = async () => {
    if (!fullCancelModal) return;
    setIsCancellingFull(true);

    try {
      const res = await axiosClient.post(`/api/tickets/${fullCancelModal.id}/cancel`);
      setActionAlert({
        type: 'success',
        message: res.data.message || 'Entire pass cancelled and all seats released.'
      });
      setFullCancelModal(null);
      fetchTickets();
    } catch (err) {
      setActionAlert({
        type: 'error',
        message: err.response?.data?.error || 'Failed to cancel ticket.'
      });
    } finally {
      setIsCancellingFull(false);
    }
  };

  const token = localStorage.getItem('token');

  if (!token) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <Ticket size={48} color="#0071e3" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '26px', marginBottom: '8px' }}>Sign in to View Passes</h2>
        <p style={{ color: 'var(--apple-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          Please sign in to view your auditorium seats and Apple Wallet-style passes.
        </p>
        <Link to="/register" className="btn-apple btn-apple-primary" style={{ padding: '10px 24px' }}>
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container" style={{ maxWidth: '840px' }}>
        {/* Apple Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#0071e3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Wallet
            </span>
            <h1 style={{ fontSize: '32px', marginTop: '2px', letterSpacing: '-0.025em' }}>
              My Event Passes
            </h1>
            <p style={{ color: 'var(--apple-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              Manage confirmed auditorium reservations. Tap ✕ on any seat tag to cancel individual seats.
            </p>
          </div>
          <Link to="/events" className="btn-apple btn-apple-secondary">
            Browse Events
          </Link>
        </div>

        {/* Action Alert Banner */}
        {actionAlert && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            background: actionAlert.type === 'success' ? 'var(--apple-green-tint)' : 'var(--apple-red-tint)',
            border: `1px solid ${actionAlert.type === 'success' ? 'rgba(48, 209, 88, 0.3)' : 'rgba(255, 69, 58, 0.3)'}`,
            color: actionAlert.type === 'success' ? '#30d158' : '#ff6961',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            fontSize: '13px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {actionAlert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{actionAlert.message}</span>
            </div>
            <button
              onClick={() => setActionAlert(null)}
              style={{ color: 'inherit', fontSize: '12px', opacity: 0.8 }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Passes List (Apple Wallet Style) */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--apple-text-secondary)' }}>
            Retrieving passes from Amazon RDS...
          </div>
        ) : tickets.length === 0 ? (
          <div className="apple-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <Ticket size={44} color="var(--apple-text-tertiary)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '6px' }}>No passes yet</h3>
            <p style={{ color: 'var(--apple-text-secondary)', fontSize: '14px', marginBottom: '22px' }}>
              Explore the campus schedule and select your auditorium seats.
            </p>
            <Link to="/events" className="btn-apple btn-apple-primary">
              Explore Events
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {tickets.map((t) => {
              const isCancelled = t.status === 'CANCELLED';
              const isConfirmed = t.status === 'CONFIRMED';
              const isCheckedIn = t.status === 'CHECKED_IN';

              const seatList = t.seats
                ? t.seats.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
                : [];

              return (
                <div
                  key={t.id}
                  className="apple-wallet-pass"
                  style={{
                    opacity: isCancelled ? 0.55 : 1,
                    borderLeft: `4px solid ${
                      isCancelled ? '#ff453a' : isCheckedIn ? '#bf5af2' : isConfirmed ? '#30d158' : '#ff9f0a'
                    }`
                  }}
                >
                  {/* Left Pass Details */}
                  <div style={{ flex: '1 1 360px', padding: '22px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: isCancelled
                          ? 'var(--apple-red-tint)'
                          : isCheckedIn
                          ? 'rgba(191, 90, 242, 0.15)'
                          : isConfirmed
                          ? 'var(--apple-green-tint)'
                          : 'var(--apple-orange-tint)',
                        color: isCancelled
                          ? '#ff6961'
                          : isCheckedIn
                          ? '#bf5af2'
                          : isConfirmed
                          ? '#30d158'
                          : '#ff9f0a'
                      }}>
                        {isCancelled ? (
                          <><XCircle size={12} /> Cancelled</>
                        ) : isCheckedIn ? (
                          <><CheckCircle2 size={12} /> Admitted at Gate</>
                        ) : isConfirmed ? (
                          <><CheckCircle2 size={12} /> Confirmed</>
                        ) : (
                          <><Clock size={12} /> SQS Queued</>
                        )}
                      </span>

                      <span style={{ fontSize: '12px', color: 'var(--apple-text-secondary)' }}>
                        Quantity: <strong>{t.quantity} seat{t.quantity > 1 ? 's' : ''}</strong>
                      </span>
                    </div>

                    <h3 style={{ fontSize: '20px', marginBottom: '8px', lineHeight: 1.25 }}>
                      {t.event_title}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', color: 'var(--apple-text-secondary)', fontSize: '13px', marginBottom: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} color="var(--apple-text-tertiary)" />
                        <span>{t.event_date ? new Date(t.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date TBA'} {t.event_time && `at ${t.event_time}`}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} color="var(--apple-text-tertiary)" />
                        <span>{t.event_location || 'Campus Auditorium'}</span>
                      </div>
                    </div>

                    {/* INDIVIDUAL SEATS SECTION (WITH INDIVIDUAL CANCELLATION) */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--apple-glass-border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                          Assigned Seats ({seatList.length}):
                        </span>
                        {!isCancelled && seatList.length > 1 && (
                          <span style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)' }}>
                            Tap ✕ to cancel single seat
                          </span>
                        )}
                      </div>

                      {seatList.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {seatList.map((seat) => (
                            <span key={seat} className="apple-seat-chip">
                              <span>{seat}</span>
                              {!isCancelled && (
                                <button
                                  type="button"
                                  title={`Cancel seat ${seat}`}
                                  onClick={() => setSeatCancelModal({ ticket: t, seat })}
                                  className="apple-seat-delete"
                                >
                                  ✕
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '13px', color: 'var(--apple-text-secondary)' }}>
                          General Admission ({t.quantity} ticket{t.quantity > 1 ? 's' : ''})
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    {!isCancelled && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--apple-glass-border-subtle)', paddingTop: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--apple-text-tertiary)' }}>
                          Attendee: {t.attendee_name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFullCancelModal(t)}
                          style={{
                            color: '#ff6961',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} /> Cancel Pass
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Stub (QR Code & Pass Code) */}
                  <div className="apple-wallet-stub">
                    <QrCode size={64} color="var(--apple-text-secondary)" style={{ marginBottom: '10px' }} />
                    <span style={{ fontSize: '10px', color: 'var(--apple-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Digital Pass
                    </span>
                    <strong style={{ fontSize: '12px', letterSpacing: '0.02em', color: '#f5f5f7', marginTop: '2px', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
                      {t.ticket_code}
                    </strong>
                    <span style={{ fontSize: '11px', color: '#30d158', marginTop: '6px' }}>
                      Verified on RDS
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* INDIVIDUAL SEAT CANCELLATION MODAL */}
      {seatCancelModal && (
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
          <div className="apple-card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--apple-red-tint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Armchair size={22} color="#ff6961" />
            </div>

            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>
              Release Seat {seatCancelModal.seat}?
            </h3>

            <p style={{ color: 'var(--apple-text-secondary)', fontSize: '13px', marginBottom: '22px', lineHeight: 1.5 }}>
              Are you sure you want to release seat <strong>{seatCancelModal.seat}</strong> for <strong>{seatCancelModal.ticket.event_title}</strong>?
              <br />
              <span style={{ display: 'block', marginTop: '6px', color: 'var(--apple-text)' }}>
                Your other seats will remain confirmed. The released seat will be returned immediately to the event pool.
              </span>
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSeatCancelModal(null)}
                className="btn-apple btn-apple-secondary"
                style={{ flex: 1, padding: '10px', fontSize: '13px' }}
              >
                Keep Seat
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelSeat}
                disabled={isCancellingSeat}
                className="btn-apple btn-apple-danger"
                style={{ flex: 1, padding: '10px', fontSize: '13px' }}
              >
                {isCancellingSeat ? 'Releasing...' : `Cancel Seat ${seatCancelModal.seat}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENTIRE PASS CANCELLATION MODAL */}
      {fullCancelModal && (
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
          <div className="apple-card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <AlertTriangle size={44} color="#ff6961" style={{ margin: '0 auto 14px' }} />
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Cancel Pass?</h3>
            <p style={{ color: 'var(--apple-text-secondary)', fontSize: '13px', marginBottom: '22px', lineHeight: 1.5 }}>
              This will cancel all seats (<strong>{fullCancelModal.seats || fullCancelModal.quantity}</strong>) for <strong>{fullCancelModal.event_title}</strong> and mark pass <strong>{fullCancelModal.ticket_code}</strong> as cancelled.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setFullCancelModal(null)}
                className="btn-apple btn-apple-secondary"
                style={{ flex: 1, padding: '10px', fontSize: '13px' }}
              >
                Keep Pass
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelFull}
                disabled={isCancellingFull}
                className="btn-apple btn-apple-danger"
                style={{ flex: 1, padding: '10px', fontSize: '13px' }}
              >
                {isCancellingFull ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTicketsPage;
