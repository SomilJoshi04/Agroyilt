import React, { forwardRef } from 'react';
import { useBrand } from '../../context/BrandContext';

/**
 * Centralized Logo Component
 * Dynamic App Logo & Name from BrandContext
 * Usage: <Logo className="h-8 w-auto" />
 */
const Logo = forwardRef(({ className = "h-8 w-auto", imgClassName = "", ...props }, ref) => {
  const { appLogo, appName } = useBrand();
  const fallback = "/AgroyiltLogo.png";
  const logoSrc = appLogo || fallback;
  const isDefaultBadge = !appLogo || appLogo === fallback;

  return (
    <div
      ref={ref}
      className={`${className} aspect-square rounded-full overflow-hidden flex items-center justify-center bg-transparent shrink-0`}
      {...props}
    >
      <img
        src={logoSrc}
        alt={appName || "AgroYilt"}
        className={
          imgClassName ||
          (isDefaultBadge
            ? "w-[115%] h-[115%] max-w-none object-cover"
            : "w-full h-full object-contain p-0.5")
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
