import React, { useEffect } from 'react'; // Updated index to .jsx
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import AppRoutes from './routes';
import { SocketProvider } from './context/SocketContext';
import { CartProvider } from './context/CartContext';
import { CityProvider } from './context/CityContext';
import { initializePushNotifications, setupForegroundNotificationHandler } from './services/pushNotificationService';
// Global common imports removed here as they are now handled in AppRoutes.jsx for conditional rendering
// import { LocationPermissionChecker, Chatbot } from './components/common';

function App() {
  // Initialize push notifications on app load
  // NOTE: initializePushNotifications() safely returns early on iOS
  useEffect(() => {
    initializePushNotifications();

    // Only setup foreground handler if messaging is available (not iOS)
    // On iOS, messaging is null because FCM is not supported
    try {
      setupForegroundNotificationHandler((payload) => {
        // Show in-app toast notification
        const title = payload.notification?.title || payload.data?.title || 'New Notification';
        const body = payload.notification?.body || payload.data?.body || '';
        toast((t) => (
          <div className="flex flex-col">
            <span className="font-semibold text-green-600">{title}</span>
            <span className="text-xs text-gray-500 mt-1">{body}</span>
          </div>
        ), {
          icon: '🔔',
          duration: 4000
        });

        // Dispatch update events for listening components to refresh UI
        window.dispatchEvent(new Event('vendorJobsUpdated'));
        window.dispatchEvent(new Event('vendorStatsUpdated'));
        window.dispatchEvent(new Event('workerJobsUpdated'));
        window.dispatchEvent(new Event('userBookingsUpdated'));
        window.dispatchEvent(new Event('appNotificationReceived'));
      });
    } catch (error) {
      // Silently ignore — expected on iOS where messaging is null
    }
  }, []);

  return (
    <BrowserRouter>
      <SocketProvider>
        <CityProvider>
          <CartProvider>
            <div className="App">
              <AppRoutes />
              {/* Global components moved to routes/index.jsx */}
              <Toaster
                position="top-center"
                reverseOrder={false}
                toastOptions={{
                  duration: 2000, // Global default (reduced from 3000)
                  style: {
                    background: '#333',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '12px 20px',
                  },
                  success: {
                    duration: 1000, // 1 second as requested
                    style: {
                      background: '#10B981',
                    },
                  },
                  error: {
                    duration: 2000, // Reduced from 4000
                    style: {
                      background: '#EF4444',
                    },
                  },
                }}
              />
            </div>
          </CartProvider>
        </CityProvider>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;
