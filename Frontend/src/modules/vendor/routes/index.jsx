import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PageTransition from '../components/common/PageTransition';
import BottomNav from '../components/layout/BottomNav';
import ErrorBoundary from '../components/common/ErrorBoundary';
import ProtectedRoute from '../../../components/auth/ProtectedRoute';
import PublicRoute from '../../../components/auth/PublicRoute';
import CashLimitModal from '../components/common/CashLimitModal'; // Import
// import useAppNotifications from '../../../hooks/useAppNotifications.jsx'; // Handled globally
import { VendorDashboardProvider } from '../../../context/VendorDashboardContext';

// Lazy load wrapper with error handling
// NOTE: Do NOT use infinite Promise here — it freezes iOS Safari Suspense forever.
const lazyLoad = (importFunc) => {
  return lazy(() => {
    return Promise.resolve(importFunc()).catch((error) => {
      console.error('Failed to load vendor page chunk:', error);

      // On first failure: schedule a reload and immediately return error UI
      // Do NOT use `return new Promise(() => {})` — that hangs Suspense on iOS forever
      const hasReloaded = sessionStorage.getItem('chunk_error_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_error_reload', 'true');
        // Reload after a short delay (UI will show briefly, then page reloads)
        setTimeout(() => window.location.reload(), 300);
      }

      // Always return a resolved module with a fallback UI
      return Promise.resolve({
        default: () => (
          <div className="flex items-center justify-center min-h-screen bg-white">
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📡</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Connection Issues</h2>
              <p className="text-gray-600 mb-6">We couldn't load this part of the app. This often happens on slow networks or after an update.</p>
              <button
                onClick={() => {
                  sessionStorage.removeItem('chunk_error_reload');
                  window.location.reload();
                }}
                className="w-full py-4 rounded-2xl text-white font-bold transition-all active:scale-95"
                style={{ backgroundColor: '#347989', boxShadow: '0 8px 16px rgba(52, 121, 137, 0.2)' }}
              >
                Retry Loading
              </button>
            </div>
          </div>
        ),
      });
    });
  });
};

// Lazy load vendor pages for code splitting
const Login = lazyLoad(() => import('../pages/login'));
const Signup = lazyLoad(() => import('../pages/signup'));
const Dashboard = lazyLoad(() => import('../pages/Dashboard'));
const BookingAlert = lazyLoad(() => import('../pages/BookingAlert'));
const BookingAlerts = lazyLoad(() => import('../pages/BookingAlerts'));
const BookingDetails = lazyLoad(() => import('../pages/BookingDetails'));
const BookingTimeline = lazyLoad(() => import('../pages/BookingTimeline'));
const ActiveJobs = lazyLoad(() => import('../pages/ActiveJobs'));
const WorkersList = lazyLoad(() => import('../pages/WorkersList'));
const AddEditWorker = lazyLoad(() => import('../pages/AddEditWorker'));
const AssignWorker = lazyLoad(() => import('../pages/AssignWorker'));
const Earnings = lazyLoad(() => import('../pages/Earnings'));
const Wallet = lazyLoad(() => import('../pages/Wallet'));
const WithdrawalRequest = lazyLoad(() => import('../pages/WithdrawalRequest'));
const Profile = lazyLoad(() => import('../pages/Profile'));
const ProfileDetails = lazyLoad(() => import('../pages/Profile/ProfileDetails'));
const EditProfile = lazyLoad(() => import('../pages/Profile/EditProfile'));
const BookingMap = lazyLoad(() => import('../pages/BookingMap'));
const Settings = lazyLoad(() => import('../pages/Settings'));
const AddressManagement = lazyLoad(() => import('../pages/AddressManagement'));
const Notifications = lazyLoad(() => import('../pages/Notifications'));
const SettlementRequest = lazyLoad(() => import('../pages/Wallet/SettlementRequest'));
const SettlementHistory = lazyLoad(() => import('../pages/Wallet/SettlementHistory'));
const MyRatings = lazyLoad(() => import('../pages/MyRatings'));
const AboutGroo = lazyLoad(() => import('../pages/AboutHomster'));
const BillingPage = lazyLoad(() => import('../pages/BillingPage'));
const Maintenance = lazyLoad(() => import('../pages/Maintenance'));
const Compliance = lazyLoad(() => import('../pages/Compliance'));
const Analytics = lazyLoad(() => import('../pages/Analytics'));
const MyStore = lazyLoad(() => import('../pages/MyStore'));
const StoreRegistration = lazyLoad(() => import('../pages/MyStore/StoreRegistration'));
const StoreOrders = lazyLoad(() => import('../pages/MyStore/Orders'));
const SoilTesting = lazyLoad(() => import('../pages/SoilTesting'));
const BusinessDetails = lazyLoad(() => import('../pages/BusinessDetails'));
const EquipmentInventory = lazyLoad(() => import('../pages/Equipment/EquipmentInventory'));
const AddEquipment = lazyLoad(() => import('../pages/Equipment/AddEquipment'));

// Lightweight loading fallback - no logo to avoid iOS rejection
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const VendorRoutes = () => {
  const location = useLocation();

  // PROACTIVE CLEANUP: Kill all orphaned ScrollTriggers from other modules
  // This prevents background animations (from Landing/User home) from crashing 
  // the Vendor panel when body styles or viewport sizes change.
  useEffect(() => {
    import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
      // Configure safely before killing
      ScrollTrigger.config({
        ignoreMobileResize: true,
        autoRefreshEvents: "visibilitychange,DOMContentLoaded,load"
      });
      // Kill all existing triggers to prevent background crashes
      ScrollTrigger.getAll().forEach(t => t.kill());
    }).catch(() => {});
  }, []);

  // Check if current route should hide bottom nav (auth routes or map)
  // Check if current route should hide bottom nav (auth routes or map or booking alert)
  const shouldHideBottomNav = location.pathname === '/vendor/login' ||
    location.pathname === '/vendor/signup' ||
    location.pathname.endsWith('/map') ||
    location.pathname.includes('/booking-alert/');

  const shouldShowBottomNav = !shouldHideBottomNav;

  return (
    <ErrorBoundary>
      <VendorDashboardProvider>
        {/* Main content area - leaves space for bottom nav when needed */}
        <div className={shouldShowBottomNav ? "pb-24" : ""}>
          <Suspense fallback={<LoadingFallback />}>
            <PageTransition>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<PublicRoute userType="vendor"><Login /></PublicRoute>} />
                <Route path="/signup" element={<PublicRoute userType="vendor"><Signup /></PublicRoute>} />

                {/* Protected routes (auth required) */}
                <Route path="/" element={<ProtectedRoute userType="vendor"><Navigate to="dashboard" replace /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute userType="vendor"><Dashboard /></ProtectedRoute>} />
                <Route path="/booking-alerts" element={<ProtectedRoute userType="vendor"><BookingAlerts /></ProtectedRoute>} />
                <Route path="/booking-alert/:id" element={<ProtectedRoute userType="vendor"><BookingAlert /></ProtectedRoute>} />
                <Route path="/booking/:id" element={<ProtectedRoute userType="vendor"><BookingDetails /></ProtectedRoute>} />
                <Route path="/booking/:id/map" element={<ProtectedRoute userType="vendor"><BookingMap /></ProtectedRoute>} />
                <Route path="/booking/:id/billing" element={<ProtectedRoute userType="vendor"><BillingPage /></ProtectedRoute>} />
                <Route path="/booking/:id/timeline" element={<ProtectedRoute userType="vendor"><BookingTimeline /></ProtectedRoute>} />
                <Route path="/jobs" element={<ProtectedRoute userType="vendor"><ActiveJobs /></ProtectedRoute>} />
                <Route path="/workers" element={<ProtectedRoute userType="vendor"><WorkersList /></ProtectedRoute>} />
                <Route path="/workers/add" element={<ProtectedRoute userType="vendor"><AddEditWorker /></ProtectedRoute>} />
                <Route path="/workers/:id/edit" element={<ProtectedRoute userType="vendor"><AddEditWorker /></ProtectedRoute>} />
                <Route path="/booking/:id/assign-worker" element={<ProtectedRoute userType="vendor"><AssignWorker /></ProtectedRoute>} />
                <Route path="/earnings" element={<ProtectedRoute userType="vendor"><Earnings /></ProtectedRoute>} />
                <Route path="/wallet" element={<ProtectedRoute userType="vendor"><Wallet /></ProtectedRoute>} />
                <Route path="/wallet/withdraw" element={<ProtectedRoute userType="vendor"><WithdrawalRequest /></ProtectedRoute>} />
                <Route path="/wallet/settle" element={<ProtectedRoute userType="vendor"><SettlementRequest /></ProtectedRoute>} />
                <Route path="/wallet/settlements" element={<ProtectedRoute userType="vendor"><SettlementHistory /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute userType="vendor"><Profile /></ProtectedRoute>} />
                <Route path="/profile/details" element={<ProtectedRoute userType="vendor"><ProfileDetails /></ProtectedRoute>} />
                <Route path="/profile/edit" element={<ProtectedRoute userType="vendor"><EditProfile /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute userType="vendor"><Settings /></ProtectedRoute>} />
                <Route path="/address-management" element={<ProtectedRoute userType="vendor"><AddressManagement /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute userType="vendor"><Notifications /></ProtectedRoute>} />
                <Route path="/my-ratings" element={<ProtectedRoute userType="vendor"><MyRatings /></ProtectedRoute>} />
                <Route path="/about-groo" element={<ProtectedRoute userType="vendor"><AboutGroo /></ProtectedRoute>} />
                <Route path="/maintenance" element={<ProtectedRoute userType="vendor"><Maintenance /></ProtectedRoute>} />
                <Route path="/compliance" element={<ProtectedRoute userType="vendor"><Compliance /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute userType="vendor"><Analytics /></ProtectedRoute>} />
                <Route path="/store" element={<ProtectedRoute userType="vendor"><MyStore /></ProtectedRoute>} />
                <Route path="/store/registration" element={<ProtectedRoute userType="vendor"><StoreRegistration /></ProtectedRoute>} />
                <Route path="/store/orders" element={<ProtectedRoute userType="vendor"><StoreOrders /></ProtectedRoute>} />
                <Route path="/soil-tests" element={<ProtectedRoute userType="vendor"><SoilTesting /></ProtectedRoute>} />
                <Route path="/business-details" element={<ProtectedRoute userType="vendor"><BusinessDetails /></ProtectedRoute>} />
                <Route path="/equipment" element={<ProtectedRoute userType="vendor"><EquipmentInventory /></ProtectedRoute>} />
                <Route path="/equipment/add" element={<ProtectedRoute userType="vendor"><AddEquipment /></ProtectedRoute>} />
                <Route path="/equipment/edit/:id" element={<ProtectedRoute userType="vendor"><AddEquipment /></ProtectedRoute>} />
              </Routes>
            </PageTransition>
          </Suspense>
        </div>

        {/* BottomNav is OUTSIDE Suspense so it persists during page loads */}
        {shouldShowBottomNav && <BottomNav />}

        {/* Global Alert for Cash Limit */}
        {!shouldHideBottomNav && <CashLimitModal />}
      </VendorDashboardProvider>
    </ErrorBoundary>
  );
};

export default VendorRoutes;
