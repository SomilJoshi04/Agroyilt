import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { LanguageProvider } from './context/LanguageContext'
import './index.css'
import App from './App.jsx'

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// ─── GSAP GLOBAL SAFETY CONFIG ───────────────────────────────────────────────
// Safely patch Node.prototype.removeChild to prevent third-party library crashes
if (typeof window !== 'undefined') {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      // Silently ignore to prevent the app from freezing on NotFoundError
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({
    ignoreMobileResize: true,         // Prevents 100vh div injection on mobile
    autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load', // No resize event
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </HelmetProvider>
  </StrictMode>,
)
