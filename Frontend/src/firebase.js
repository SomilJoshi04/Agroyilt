/**
 * Firebase Configuration
 * Initialize Firebase for push notifications
 * 
 * NOTE: Firebase Cloud Messaging (FCM) is NOT supported on iOS Safari
 * unless the app is installed as a PWA on the Home Screen (iOS 16.4+).
 * We must guard against this to prevent the app from hanging on iOS.
 */

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: "AIzaSyAEy1vl4BORXfxz0Wl42A5njPAS-yh5UZw",
  authDomain: "agroyilt-d44da.firebaseapp.com",
  projectId: "agroyilt-d44da",
  storageBucket: "agroyilt-d44da.firebasestorage.app",
  messagingSenderId: "730249243780",
  appId: "1:730249243780:web:4e949df44f95c745c726d1",
  measurementId: "G-BRNBN7DK0V"
};

/**
 * Detect iOS Safari (FCM is unsupported / causes hangs)
 * Returns true for all iOS devices (iPhone, iPad, iPod)
 */
function isIOSSafari() {
  const ua = navigator.userAgent;
  return /iP(hone|od|ad)/i.test(ua);
}

// Initialize Firebase
let app;
let messaging = null; // null by default — safe fallback

try {
  app = initializeApp(firebaseConfig);

  // Only initialize Messaging on non-iOS platforms
  // iOS Safari does not support FCM service workers properly
  if (!isIOSSafari()) {
    messaging = getMessaging(app);
    // console.log('✅ Firebase Messaging initialized');
  } else {
    // console.log('ℹ️ iOS device detected — Firebase Messaging skipped (not supported)');
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  messaging = null; // Ensure messaging is null on failure
}

export { app, messaging, getToken, onMessage };
