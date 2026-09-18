import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { useBrand } from '../../../context/BrandContext';

const AppEntry = () => {
  const navigate = useNavigate();
  const { appLogo, appName } = useBrand();

  // If already logged in as any role, redirect to their dashboard
  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      navigate('/user', { replace: true });
    } else if (localStorage.getItem('vendorAccessToken')) {
      navigate('/vendor', { replace: true });
    } else if (localStorage.getItem('workerAccessToken')) {
      navigate('/worker', { replace: true });
    }
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(160deg, #1B5E20 0%, #2E7D32 35%, #388E3C 65%, #43A047 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decorative circles */}
      <div style={{
        position: 'absolute', top: '-80px', right: '-80px',
        width: '260px', height: '260px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '60px', right: '-40px',
        width: '160px', height: '160px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-60px', left: '-60px',
        width: '200px', height: '200px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
      }} />

      {/* Hero / Branding Section */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 32px 24px',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{
          width: '96px', height: '96px', borderRadius: '28px',
          overflow: 'hidden', marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img
            src={appLogo || '/AgroyiltLogo.png'}
            alt={appName || 'AgroYilt'}
            style={{ width: '115%', height: '115%', objectFit: 'cover' }}
            onError={(e) => { e.target.src = '/AgroyiltLogo.png'; }}
          />
        </div>

        {/* App Name */}
        <h1 style={{
          color: '#fff',
          fontSize: '2.2rem',
          fontWeight: 800,
          letterSpacing: '-0.5px',
          marginBottom: '12px',
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}>
          {appName || 'AgroYilt'}
        </h1>

        {/* Tagline */}
        <p style={{
          color: 'rgba(255,255,255,0.82)',
          fontSize: '1rem',
          fontWeight: 400,
          lineHeight: 1.6,
          maxWidth: '280px',
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}>
          Smart farming services — book equipment, grow your business, find work near you.
        </p>

        {/* Decorative leaf-like dots */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '32px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: i === 1 ? '24px' : '8px', height: '8px',
              borderRadius: '999px',
              background: i === 1 ? '#A5D6A7' : 'rgba(255,255,255,0.35)',
              transition: 'width 0.3s',
            }} />
          ))}
        </div>
      </div>

      {/* CTA Buttons Section */}
      <div style={{
        padding: '24px 28px 48px',
        display: 'flex', flexDirection: 'column', gap: '14px',
      }}>
        {/* Register Button */}
        <button
          id="app-entry-register-btn"
          onClick={() => navigate('/app/register')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            background: '#fff',
            color: '#2E7D32',
            border: 'none',
            borderRadius: '16px',
            padding: '18px 24px',
            fontSize: '1.05rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            transition: 'transform 0.15s, box-shadow 0.15s',
            width: '100%',
          }}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <span>Create Account</span>
          <FiArrowRight size={20} />
        </button>

        {/* Login Button */}
        <button
          id="app-entry-login-btn"
          onClick={() => navigate('/app/login')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            border: '1.5px solid rgba(255,255,255,0.4)',
            borderRadius: '16px',
            padding: '18px 24px',
            fontSize: '1.05rem',
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            transition: 'transform 0.15s',
            width: '100%',
          }}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <span>Login to my account</span>
        </button>

        {/* Footer note */}
        <p style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.75rem',
          marginTop: '8px',
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}>
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default AppEntry;
