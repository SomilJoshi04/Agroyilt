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

// Static imports for instant page loading (0ms delay)
import Login from '../pages/login';
import Signup from '../pages/signup';
import Dashboard from '../pages/Dashboard';
import BookingAlert from '../pages/BookingAlert';
import BookingAlerts from '../pages/BookingAlerts';
import BookingDetails from '../pages/BookingDetails';
import BookingTimeline from '../pages/BookingTimeline';
import ActiveJobs from '../pages/ActiveJobs';
import WorkersList from '../pages/WorkersList';
import AddEditWorker from '../pages/AddEditWorker';
import AssignWorker from '../pages/AssignWorker';
import Earnings from '../pages/Earnings';
import Wallet from '../pages/Wallet';
import WithdrawalRequest from '../pages/WithdrawalRequest';
import Profile from '../pages/Profile';
import ProfileDetails from '../pages/Profile/ProfileDetails';
import EditProfile from '../pages/Profile/EditProfile';
import BookingMap from '../pages/BookingMap';
import Settings from '../pages/Settings';
import AddressManagement from '../pages/AddressManagement';
import Notifications from '../pages/Notifications';
import SettlementRequest from '../pages/Wallet/SettlementRequest';
import SettlementHistory from '../pages/Wallet/SettlementHistory';
import MyRatings from '../pages/MyRatings';
import AboutGroo from '../pages/AboutHomster';
import BillingPage from '../pages/BillingPage';
import Maintenance from '../pages/Maintenance';
import Compliance from '../pages/Compliance';
import Analytics from '../pages/Analytics';
import MyStore from '../pages/MyStore';
import StoreRegistration from '../pages/MyStore/StoreRegistration';
import StoreOrders from '../pages/MyStore/Orders';
import SoilTesting from '../pages/SoilTesting';
import BusinessDetails from '../pages/BusinessDetails';
import EquipmentInventory from '../pages/Equipment/EquipmentInventory';
import AddEquipment from '../pages/Equipment/AddEquipment';

// Lightweight loading fallback
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
        {shouldShowBottomNav && <BottomNav isGlobal={true} />}

        {/* Global Alert for Cash Limit */}
        {!shouldHideBottomNav && <CashLimitModal />}
      </VendorDashboardProvider>
    </ErrorBoundary>
  );
};

export default VendorRoutes;
