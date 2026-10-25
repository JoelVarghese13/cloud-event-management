import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, LogIn, AlertCircle } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const RegisterPage = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'attendee'
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin
      ? { email: formData.email, password: formData.password }
      : formData;

    try {
      const res = await axiosClient.post(endpoint, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      if (res.data.user.role === 'organizer') {
        navigate('/dashboard');
      } else {
        navigate('/events');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: 'var(--radius-md)', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(null); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              background: !isLogin ? 'var(--primary)' : 'transparent',
              color: !isLogin ? '#fff' : 'var(--text-muted)',
              fontWeight: '600'
            }}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(null); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              background: isLogin ? 'var(--primary)' : 'transparent',
              color: isLogin ? '#fff' : 'var(--text-muted)',
              fontWeight: '600'
            }}
          >
            Log In
          </button>
        </div>

        <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>
          {isLogin ? 'Welcome Back' : 'Join EventSphere'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
          {isLogin
            ? 'Sign in to view your tickets and booked events.'
            : 'Register to book tickets or manage university events.'}
        </p>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', marginBottom: '20px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Jane Doe"
                className="form-input"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="jane@university.edu"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="form-input"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Account Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="form-select"
              >
                <option value="attendee">Student / Attendee</option>
                <option value="organizer">Event Organizer / Faculty</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '12px' }}
          >
            {loading ? 'Processing...' : (
              isLogin ? (
                <><LogIn size={18} /> Sign In</>
              ) : (
                <><UserCheck size={18} /> Register Account</>
              )
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
