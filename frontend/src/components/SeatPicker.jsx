import React from 'react';
import { Check } from 'lucide-react';

const SEAT_ROWS = [
  { row: 'A', tier: 'VIP Front Row', count: 8 },
  { row: 'B', tier: 'Executive', count: 8 },
  { row: 'C', tier: 'Premium', count: 8 },
  { row: 'D', tier: 'Standard', count: 8 },
  { row: 'E', tier: 'Balcony', count: 8 }
];

const SeatPicker = ({ bookedSeats = [], selectedSeats = [], onToggleSeat, maxSeats = 5 }) => {
  const bookedSet = new Set(bookedSeats.map((s) => String(s).toUpperCase()));

  return (
    <div className="apple-seat-picker">
      {/* Apple Curved Screen / Stage Indicator */}
      <div className="apple-stage-screen">
        <div className="apple-screen-line"></div>
        <span className="apple-screen-label">STAGE / PROJECTION SCREEN</span>
      </div>

      {/* Auditorium Seat Map */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', alignItems: 'center' }}>
        {SEAT_ROWS.map(({ row, tier, count }) => (
          <div key={row} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--apple-text-tertiary)', width: '16px', textAlign: 'center' }} title={tier}>
              {row}
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {Array.from({ length: count }, (_, i) => {
                const seatId = `${row}${i + 1}`;
                const isBooked = bookedSet.has(seatId);
                const isSelected = selectedSeats.includes(seatId);

                return (
                  <button
                    key={seatId}
                    type="button"
                    disabled={isBooked}
                    onClick={() => onToggleSeat(seatId)}
                    className={`apple-seat-btn ${
                      isBooked
                        ? 'apple-seat-booked'
                        : isSelected
                        ? 'apple-seat-selected'
                        : 'apple-seat-available'
                    }`}
                    title={
                      isBooked
                        ? `Seat ${seatId} - Booked`
                        : isSelected
                        ? `Seat ${seatId} - Selected (Click to remove)`
                        : `Seat ${seatId} - ${tier}`
                    }
                  >
                    {isSelected ? (
                      <Check size={12} strokeWidth={3} />
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Apple Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '22px', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--apple-glass-border-subtle)', fontSize: '11px', color: 'var(--apple-text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)' }}></span>
          <span>Available</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--apple-blue)' }}></span>
          <span>Selected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}></span>
          <span>Occupied</span>
        </div>
      </div>
    </div>
  );
};

export default SeatPicker;
