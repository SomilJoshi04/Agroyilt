import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight, FiChevronLeft, FiUser, FiTruck, FiTool } from 'react-icons/fi';
import { useBrand } from '../../../context/BrandContext';

const roles = [
  {
    id: 'farmer',
    label: 'Farmer',
    description: 'Book agricultural equipment & services for your fields',
    icon: FiUser,
    color: '#2E7D32',
    lightBg: '#E8F5E9',
    route: '/user/signup',
  },
  {
    id: 'vendor',
    label: 'Vendor',
    description: 'List your equipment & grow your agri-business',
    icon: FiTruck,
    color: '#1565C0',
    lightBg: '#E3F2FD',
    route: '/vendor/signup',
  },
  {
    id: 'worker',
    label: 'Independent Worker',
    description: 'Find farm jobs near you & earn on your schedule',
    icon: FiTool,
    color: '#E65100',
    lightBg: '#FFF3E0',
    route: '/worker/signup',
  },
];

const AppRegister = () => {
  const navigate = useNavigate();
  const { appLogo, appName } = useBrand();
  const [selected, setSelected] = useState(null);

  const handleProceed = () => {
    if (!selected) return;
    const role = roles.find(r => r.id === selected);
    if (role) navigate(role.route);
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#F8FAF8',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '16px 20px 12px',
        gap: '12px',
        background: '#fff',
        borderBottom: '1px solid #E8F5E9',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          id="app-register-back-btn"
          onClick={() => navigate('/app')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px', borderRadius: '10px',
            color: '#2E7D32', display: 'flex', alignItems: 'center',
          }}
        >
          <FiChevronLeft size={24} />
        </button>

        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          overflow: 'hidden', background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          flexShrink: 0,
        }}>
          <img
            src={appLogo || '/AgroyiltLogo.png'}
            alt={appName || 'AgroYilt'}
            style={{ width: '115%', height: '115%', objectFit: 'cover' }}
            onError={e => { e.target.src = '/AgroyiltLogo.png'; }}
          />
        </div>

        <div>
          <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1B5E20' }}>
            Create Account
          </h1>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#78909C' }}>
            {appName || 'AgroYilt'}
          </p>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '24px 20px 16px', overflowY: 'auto' }}>
        <p style={{
          margin: '0 0 6px', fontSize: '1.3rem', fontWeight: 800, color: '#1B5E20',
        }}>
          Join AgroYilt as...
        </p>
        <p style={{ margin: '0 0 24px', fontSize: '0.85rem', color: '#78909C' }}>
          Select your role to get started
        </p>

        {/* Role Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {roles.map(role => {
            const Icon = role.icon;
            const isSelected = selected === role.id;
            return (
              <button
                key={role.id}
                id={`app-register-role-${role.id}`}
                onClick={() => setSelected(role.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  background: isSelected ? role.lightBg : '#fff',
                  border: isSelected
                    ? `2.5px solid ${role.color}`
                    : '2px solid #ECEFF1',
                  borderRadius: '18px',
                  padding: '18px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected
                    ? `0 4px 20px ${role.color}22`
                    : '0 2px 8px rgba(0,0,0,0.05)',
                  transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                  width: '100%',
                }}
              >
                {/* Icon Circle */}
                <div style={{
                  width: '52px', height: '52px', borderRadius: '15px', flexShrink: 0,
                  background: isSelected ? role.color : role.lightBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                }}>
                  <Icon
                    size={26}
                    color={isSelected ? '#fff' : role.color}
                    style={{ transition: 'color 0.2s' }}
                  />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '1rem', fontWeight: 700,
                    color: isSelected ? role.color : '#263238',
                    marginBottom: '4px',
                  }}>
                    {role.label}
                  </div>
                  <div style={{
                    fontSize: '0.8rem', color: '#78909C',
                    lineHeight: 1.4, whiteSpace: 'normal',
                  }}>
                    {role.description}
                  </div>
                </div>

                {/* Arrow / Checkmark */}
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isSelected ? role.color : '#F5F5F5',
                  transition: 'background 0.2s',
                }}>
                  {isSelected ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <FiChevronRight size={16} color="#B0BEC5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px 40px' }}>
        {/* Proceed Button */}
        <button
          id="app-register-proceed-btn"
          onClick={handleProceed}
          disabled={!selected}
          style={{
            width: '100%', padding: '18px',
            borderRadius: '16px', border: 'none',
            background: selected
              ? 'linear-gradient(135deg, #2E7D32 0%, #43A047 100%)'
              : '#E0E0E0',
            color: selected ? '#fff' : '#9E9E9E',
            fontSize: '1rem', fontWeight: 700,
            cursor: selected ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: selected ? '0 4px 16px rgba(46,125,50,0.35)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <span>Continue as {selected ? roles.find(r => r.id === selected)?.label : '...'}</span>
          {selected && <FiChevronRight size={20} />}
        </button>

        {/* Login link */}
        <p style={{
          textAlign: 'center', marginTop: '20px',
          fontSize: '0.875rem', color: '#78909C',
        }}>
          Already have an account?{' '}
          <button
            id="app-register-login-link"
            onClick={() => navigate('/app/login')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#2E7D32', fontWeight: 700, fontSize: '0.875rem',
              padding: 0,
            }}
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
};

export default AppRegister;
