import React, { forwardRef } from 'react';
import { useBrand } from '../../context/BrandContext';

/**
 * Centralized Logo Component
 * Dynamic App Logo & Name from BrandContext
 * Usage: <Logo className="h-14 w-14" />
 */
const Logo = forwardRef(({ className = "h-14 w-14", imgClassName = "", ...props }, ref) => {
  const { appLogo, appName } = useBrand();
  const fallback = "/AgroyiltLogo.png";
  const logoSrc = appLogo || fallback;

  return (
    <div
      ref={ref}
      className={`${className} aspect-square rounded-full overflow-hidden flex items-center justify-center bg-white shadow-sm border border-gray-100/80 shrink-0 relative`}
      {...props}
    >
      <img
        src={logoSrc}
        alt={appName || "AgroYilt"}
        className={
          imgClassName ||
          "w-[125%] h-[125%] max-w-none object-cover object-center select-none"
        }
        onError={(e) => {
          if (e.target.src !== fallback) {
            e.target.src = fallback;
          }
        }}
      />
    </div>
  );
});

Logo.displayName = 'Logo';

export default Logo;

