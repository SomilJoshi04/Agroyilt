import React, { forwardRef } from 'react';
import { useBrand } from '../../context/BrandContext';

/**
 * Centralized Logo Component
 * Dynamic App Logo & Name from BrandContext
 * Usage: <Logo className="h-8 w-auto" />
 */
const Logo = forwardRef(({ className = "h-8 w-auto", ...props }, ref) => {
  const { appLogo, appName } = useBrand();

  return (
    <div
      ref={ref}
      className={`${className} aspect-square rounded-full overflow-hidden flex items-center justify-center`}
      {...props}
    >
      <img
        src={appLogo || "/AgroyiltLogo.png"}
        alt={appName || "AgroYilt"}
        className="w-[115%] h-[115%] max-w-none object-cover"
        onError={(e) => {
          e.target.src = "/AgroyiltLogo.png";
        }}
      />
    </div>
  );
});

Logo.displayName = 'Logo';

export default Logo;
