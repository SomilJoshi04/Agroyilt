import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { LanguageProvider } from './context/LanguageContext'
import './index.css'
import App from './App.jsx'

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// ─── GSAP GLOBAL SAFETY CONFIG ───────────────────────────────────────────────
// Must be set BEFORE any component renders to prevent the 100vh measurement div
// from being injected into the DOM during React's commit phase, which causes:
// "NotFoundError: Failed to execute 'removeChild' on 'Node'"
if (typeof window !== 'undefined') {
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
