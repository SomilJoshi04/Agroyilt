import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authStorage, { normalizeRole } from '../../utils/authStorage';

/**
 * Public Route Component
 * Redirects to dashboard only if user has a valid tab-isolated session for userType
 */
const PublicRoute = ({ children, userType = 'user', redirectTo = null }) => {
  const location = useLocation();
  const canonicalRole = normalizeRole(userType);

  const checkAuthSync = () => {
    return authStorage.isAuthenticated(canonicalRole);
  };

  const [isAuth, setIsAuth] = useState(checkAuthSync);

  useEffect(() => {
    const isAuthNow = checkAuthSync();
    if (isAuth !== isAuthNow) {
      setIsAuth(isAuthNow);
    }
  }, [location.pathname, userType]);

  if (isAuth) {
    // Determine redirect path
    const defaultRedirects = {
      user: '/user',
      vendor: '/vendor/dashboard',
      worker: '/worker/dashboard',
      admin: '/admin/dashboard'
    };

    const redirectPath = redirectTo || defaultRedirects[canonicalRole] || '/user';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default PublicRoute;
