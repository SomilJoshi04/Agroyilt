import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PageTransition - Mounts components immediately with a smooth CSS fade-in.
 * No setTimeout delays to keep page navigation instantaneous (0ms delay).
 */
const PageTransition = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div
      key={location.pathname}
      style={{
        animation: 'vendorPageFadeIn 150ms ease-out forwards',
        willChange: 'opacity',
      }}
    >
      <style>{`
        @keyframes vendorPageFadeIn {
          from { opacity: 0.85; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {children}
    </div>
  );
};

export default PageTransition;
