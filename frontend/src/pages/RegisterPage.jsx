import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, LogIn, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const RegisterPage = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    admin_passcode: ''
  });
  const [showAdminPasscode, setShowAdminPasscode] = useState(false);
  const [error, setError] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const passwordInputRef = useRef(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin
      ? { 
          email: formData.email, 
          password: formData.password, 
          organizer_passcode: formData.admin_passcode 
        }
      : {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.admin_passcode === 'CAMPUS2026' ? 'admin' : 'attendee',
          organizer_passcode: formData.admin_passcode
        };

    try {
      const res = await axiosClient.post(endpoint, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      if (res.data.user.role === 'admin' || res.data.user.role === 'organizer') {
        navigate('/dashboard');
      } else {
        navigate('/events');
      }
    } catch (err) {
      const data = err.response?.data;

      // Handle duplicate email registration
      if (!isLogin && (err.response?.status === 409 || data?.code === 'EMAIL_EXISTS')) {
        setSuccessNotice('Account already exists with this email. Redirecting you to Sign In...');
        setError(null);
        setTimeout(() => {
          setIsLogin(true);
          setSuccessNotice(null);
          if (passwordInputRef.current) {
            passwordInputRef.current.focus();
          }
        }, 1600);
      } else {
        setError(data?.error || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="apple-card" style={{ maxWidth: '420px', width: '100%', position: 'relative' }}>
        {/* Apple Segmented Toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '3px',
          borderRadius: 'var(--radius-pill)',
          marginBottom: '26px'
        }}>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(null); setSuccessNotice(null); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 'var(--radius-pill)',
              background: !isLogin ? '#ffffff' : 'transparent',
              color: !isLogin ? '#000000' : 'var(--apple-text-secondary)',
              fontWeight: 500,
              fontSize: '13px',
              transition: 'var(--apple-transition)'
            }}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(null); setSuccessNotice(null); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 'var(--radius-pill)',
              background: isLogin ? '#ffffff' : 'transparent',
              color: isLogin ? '#000000' : 'var(--apple-text-secondary)',
              fontWeight: 500,
              fontSize: '13px',
              transition: 'var(--apple-transition)'
            }}
          >
            Sign In
          </button>
        </div>

        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '6px', letterSpacing: '-0.025em' }}>
            {isLogin ? 'Sign In to EventSphere' : 'Create Your Pass'}
          </h2>
          <p style={{ color: 'var(--apple-text-secondary)', fontSize: '13px' }}>
            {isLogin
              ? 'Access your booked auditorium seats or enter the admin console.'
              : 'Sign up to reserve auditorium seats and receive instant SNS passes.'}
          </p>
        </div>

        {/* Existing Email Redirect Notification */}
        {successNotice && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--apple-green-tint)',
            border: '1px solid rgba(48, 209, 88, 0.3)',
            color: '#30d158',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            marginBottom: '18px'
          }}>
            <CheckCircle2 size={16} />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--apple-red-tint)',
            border: '1px solid rgba(255, 69, 58, 0.3)',
            color: '#ff6961',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            marginBottom: '18px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="apple-form-group">
              <label className="apple-label">Full Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Joel Varghese"
                className="apple-input"
              />
            </div>
          )}

          <div className="apple-form-group">
            <label className="apple-label">Email Address</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="name@university.edu"
              className="apple-input"
            />
          </div>

          <div className="apple-form-group">
            <label className="apple-label">Password</label>
            <input
              ref={passwordInputRef}
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="apple-input"
            />
          </div>

          {/* Optional Admin Passcode Section */}
          <div style={{ marginBottom: '20px' }}>
            {!showAdminPasscode ? (
              <button
                type="button"
                onClick={() => setShowAdminPasscode(true)}
                style={{ fontSize: '12px', color: '#0071e3', background: 'transparent', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Lock size={12} /> Administrator passcode? Click here
              </button>
            ) : (
              <div style={{
                background: 'rgba(0, 113, 227, 0.08)',
                border: '1px solid rgba(0, 113, 227, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px'
              }}>
                <label className="apple-label" style={{ color: '#70b4ff', fontSize: '11px' }}>
                  Admin Passcode (unlocks event management & gate tools)
                </label>
                <input
                  type="password"
                  name="admin_passcode"
                  value={formData.admin_passcode}
                  onChange={handleChange}
                  placeholder="Enter passcode (e.g. CAMPUS2026)"
                  className="apple-input"
                  style={{ fontSize: '13px', padding: '8px 12px' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)', marginTop: '4px', display: 'block' }}>
                  Demo passcode: <strong>CAMPUS2026</strong>
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-apple btn-apple-primary"
            style={{ width: '100%', padding: '12px', fontSize: '14px' }}
          >
            {loading ? 'Processing...' : (
              isLogin ? (
                <><LogIn size={15} /> Sign In</>
              ) : (
                <><UserCheck size={15} /> Create Account</>
              )
            )}
          </button>
        </form>

        {/* Demo Accounts Bar */}
        <div style={{
          marginTop: '24px',
          paddingTop: '18px',
          borderTop: '1px solid var(--apple-glass-border-subtle)',
          fontSize: '12px',
          color: 'var(--apple-text-tertiary)',
          textAlign: 'center'
        }}>
          <div>Quick Demo Testing Accounts (Password: <code>admin</code>)</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setFormData({ ...formData, email: 'admin@university.edu', password: 'admin' });
              }}
              style={{ background: 'var(--apple-glass)', border: '1px solid var(--apple-glass-border)', color: '#70b4ff', padding: '5px 12px', borderRadius: 'var(--radius-pill)', fontSize: '12px' }}
            >
              Admin Demo
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setFormData({ ...formData, email: 'joelvarghese013@gmail.com', name: 'Joel Varghese', password: 'admin' });
              }}
              style={{ background: 'var(--apple-glass)', border: '1px solid var(--apple-glass-border)', color: '#f5f5f7', padding: '5px 12px', borderRadius: 'var(--radius-pill)', fontSize: '12px' }}
            >
              Attendee (Joel)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
