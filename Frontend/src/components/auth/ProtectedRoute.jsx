import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toastManager } from '../../utils/toastManager';

/**
 * Protected Route Component
 * Checks if user is authenticated before allowing access
 */
const ProtectedRoute = ({ children, userType = 'user', redirectTo = null }) => {
  const location = useLocation();

  const checkAuthSync = () => {
    let tokenKey = 'accessToken';
    let refreshTokenKey = 'refreshToken';
    let dataKey = 'userData';

    // Determine keys based on userType
    switch (userType) {
      case 'vendor':
        tokenKey = 'vendorAccessToken';
        refreshTokenKey = 'vendorRefreshToken';
        dataKey = 'vendorData';
        break;
      case 'worker':
        tokenKey = 'workerAccessToken';
        refreshTokenKey = 'workerRefreshToken';
        dataKey = 'workerData';
        break;
      case 'admin':
        tokenKey = 'adminAccessToken';
        refreshTokenKey = 'adminRefreshToken';
        dataKey = 'adminData';
        break;
      case 'user':
      default:
        tokenKey = 'accessToken';
        refreshTokenKey = 'refreshToken';
        dataKey = 'userData';
        break;
    }

    const token = sessionStorage.getItem(tokenKey) || localStorage.getItem(tokenKey);
    const userData = sessionStorage.getItem(dataKey) || localStorage.getItem(dataKey);

    // If token exists, verify it's not expired (basic check)
    if (token && userData) {
      try {
        // Decode JWT token to check expiry (basic check without verification)
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const currentTime = Date.now() / 1000;

          if (payload.exp && payload.exp > currentTime) {
            return true;
          } else {
            // Token expired
            console.log('Token expired, clearing auth data for:', userType);
            localStorage.removeItem(tokenKey);
            localStorage.removeItem(refreshTokenKey);
            localStorage.removeItem(dataKey);
            sessionStorage.removeItem(tokenKey);
            sessionStorage.removeItem(refreshTokenKey);
            sessionStorage.removeItem(dataKey);
            return false;
          }
        }
      } catch (error) {
        console.error('Token validation error:', error);
      }
    }
    return false;
  };

  // Synchronously initialize state so we don't flash a loading screen
  const [isAuthenticated, setIsAuthenticated] = useState(checkAuthSync);

  // Still verify on route change to catch session expiry dynamically
  useEffect(() => {
    const isAuthNow = checkAuthSync();
    if (isAuthenticated !== isAuthNow) {
      setIsAuthenticated(isAuthNow);
      if (!isAuthNow) {
        toastManager.error('Session expired. Please login again.');
      }
    }
  }, [location.pathname, userType]);

  if (isAuthenticated === false) {
    // Determine redirect path
    const defaultRedirects = {
      user: '/user/login',
      vendor: '/vendor/login',
      worker: '/worker/login',
      admin: '/admin/login'
    };

    const redirectPath = redirectTo || defaultRedirects[userType] || '/user/login';

    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;

