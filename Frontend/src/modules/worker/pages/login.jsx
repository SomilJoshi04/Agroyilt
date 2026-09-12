import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginRedirect = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/app/login', { replace: true });
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F8FAF8' }}>
      <p style={{ color: '#2E7D32', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>Redirecting to secure login...</p>
    </div>
  );
};

export default LoginRedirect;
