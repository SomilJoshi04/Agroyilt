import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiClock, FiMapPin, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import Header from '../../components/layout/Header';
import { vendorTheme as themeColors } from '../../../../theme';
import LogoLoader from '../../../../components/common/LogoLoader';
import { vendorDashboardService } from '../../services/dashboardService';
import { acceptBooking, rejectBooking, getBookings } from '../../services/bookingService';
import { useSocket } from '../../../../context/SocketContext';

// Timer Component — calculates remaining time from booking's actual createdAt
const CountdownTimer = ({ totalSeconds = 300, startTime, onExpire }) => {
  // Calculate initial remaining time from actual booking createdAt
  const getInitialTimeLeft = () => {
    if (!startTime) return totalSeconds;
    const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
    return Math.max(0, totalSeconds - elapsed);
  };

  const [timeLeft, setTimeLeft] = useState(getInitialTimeLeft);

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpire && onExpire();
      return;
    }

    const interval = setInterval(() => {
      const remaining = getInitialTimeLeft();
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        onExpire && onExpire();
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, totalSeconds]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Color changes based on urgency
  const getTimerColor = () => {
    if (timeLeft < 30) return '#EF4444'; // Red for < 30s
    if (timeLeft < 60) return '#F59E0B'; // Orange for < 1m
    return '#10B981'; // Green otherwise
  };

  return (
    <div className="flex items-center gap-1 font-mono font-bold text-sm" style={{ color: getTimerColor() }}>
      <FiClock className="w-4 h-4" />
      <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
    </div>
  );
};

const BookingAlerts = () => {
  const navigate = useNavigate();
  const socket = useSocket(); // Use shared socket from SocketContext
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch pending alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const response = await getBookings();

        if (response.success && response.data) {
          let bookings = [];
          const vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
          const currentVendorId = String(vendorData._id || vendorData.id || '');

          bookings = response.data.filter(b => {
            const status = b.status?.toLowerCase();
            const isRelevantStatus = status === 'searching' || status === 'requested';
            const bVendorId = b.vendorId?._id || b.vendorId;
            const isAssignedToMe = !bVendorId || String(bVendorId) === currentVendorId;
            return isRelevantStatus && isAssignedToMe;
          });

          const apiIds = new Set(bookings.map(b => String(b._id || b.id)));

          const localPending = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');

          // Merge logic: Keep if in API OR if added recently (last 2 mins)
          const mergedPending = [...bookings.map(b => ({ ...b, id: b._id || b.id }))];

          localPending.forEach(localB => {
            const id = String(localB.id || localB._id);
            if (!apiIds.has(id)) {
              const createdAt = localB.createdAt ? new Date(localB.createdAt).getTime() : Date.now();
              const age = Date.now() - createdAt;
              if (age < 120000 && (localB.status === 'requested' || localB.status === 'searching')) {
                mergedPending.push(localB);
              }
            }
          });

          localStorage.setItem('vendorPendingJobs', JSON.stringify(mergedPending));

          setAlerts(mergedPending);
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
        toast.error('Failed to load alerts');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    const handleUpdate = () => fetchAlerts();
    window.addEventListener('vendorJobsUpdated', handleUpdate);

    return () => {
      window.removeEventListener('vendorJobsUpdated', handleUpdate);
    };
  }, []);

  // Socket listener for booking_taken (using shared socket from context)
  useEffect(() => {
    if (!socket) {
      console.log('[BookingAlerts] Socket not available yet');
      return;
    }

    console.log('[BookingAlerts] Setting up booking_taken listener on socket:', socket.id);

    const handleBookingTaken = (data) => {
      console.log('[BookingAlerts] booking_taken event received:', data);
      const takenBookingId = String(data.bookingId);

      // Remove from state immediately
      setAlerts(prev => prev.filter(a => {
        const alertId = String(a._id || a.id);
        return alertId !== takenBookingId;
      }));

      // Remove from localStorage
      const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
      const updatedPending = pendingJobs.filter(job => {
        const jobId = String(job.id || job._id);
        return jobId !== takenBookingId;
      });
      localStorage.setItem('vendorPendingJobs', JSON.stringify(updatedPending));

      // Show toast
      toast.error(data.message || 'This job was accepted by another vendor.', { icon: '⚡' });

      // Trigger global update
      window.dispatchEvent(new Event('vendorStatsUpdated'));
      window.dispatchEvent(new Event('vendorJobsUpdated'));
    };

    socket.on('booking_taken', handleBookingTaken);

    return () => {
      socket.off('booking_taken', handleBookingTaken);
    };
  }, [socket]);

  const handleAccept = async (bookingId) => {
    try {
      await acceptBooking(bookingId);
      toast.success('Booking accepted!');
      // Remove from list
      setAlerts(prev => prev.filter(a => a._id !== bookingId));

      // Remove from localStorage
      const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
      const updatedPending = pendingJobs.filter(job => job.id !== bookingId && job._id !== bookingId);
      localStorage.setItem('vendorPendingJobs', JSON.stringify(updatedPending));

      // Trigger global update
      window.dispatchEvent(new Event('vendorStatsUpdated'));
      window.dispatchEvent(new Event('vendorJobsUpdated'));
    } catch (error) {
      console.error('Accept error:', error);
      toast.error('Failed to accept booking');
    }
  };

  const handleReject = async (bookingId) => {
    try {
      await rejectBooking(bookingId);
      toast.success('Booking rejected');
      setAlerts(prev => prev.filter(a => a._id !== bookingId));

      // Remove from localStorage
      const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
      const updatedPending = pendingJobs.filter(job => job.id !== bookingId && job._id !== bookingId);
      localStorage.setItem('vendorPendingJobs', JSON.stringify(updatedPending));

      window.dispatchEvent(new Event('vendorStatsUpdated'));
      window.dispatchEvent(new Event('vendorJobsUpdated'));
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Failed to reject booking');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Pending Alerts" showBack={true} />

      <main className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="py-20 text-center">
            <LogoLoader fullScreen={false} />
            <p className="mt-4 text-gray-500 font-medium">Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center pt-20 px-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheckCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">No Pending Alerts</h3>
            <p className="text-gray-500">You're all caught up! No new booking requests at the moment.</p>
            <button
              onClick={() => navigate('/vendor/dashboard')}
              className="mt-6 text-primary font-semibold hover:underline"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          alerts.map(alert => {
            const bookingId = alert._id || alert.id;
            return (
            <div
              key={bookingId}
              className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 animate-slide-up"
            >
              {/* Header with Timer */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <span className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1 ${alert.bookingType === 'instant' ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                  {alert.bookingType === 'instant' && <span className="text-sm">⚡</span>}
                  {alert.bookingType === 'instant' ? 'INSTANT Request' : 'New Request'}
                </span>
                {/* Timer calculated from actual booking createdAt — survives page refresh */}
                <CountdownTimer
                  totalSeconds={300}
                  startTime={alert.createdAt}
                  onExpire={() => handleReject(bookingId)}
                />
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">
                      {alert.serviceId?.title || alert.serviceName || alert.serviceType || 'Service Request'}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      {alert.userId?.name || alert.customerName || 'Farmer'}
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                      <FiClock /> Scheduled For
                    </div>
                    <p className="text-sm font-semibold text-gray-700">
                      {alert.scheduledDate ? new Date(alert.scheduledDate).toLocaleDateString() : 'Instant/ASAP'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {alert.scheduledTimeSlot || 'ASAP'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                      <FiMapPin /> Location
                    </div>
                    <p className="text-sm font-semibold text-gray-700 line-clamp-2">
                      {alert.address?.addressLine1 || alert.location?.address || 'View Map'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReject(bookingId)}
                    className="flex-1 py-3.5 rounded-xl border border-red-100 text-red-500 font-bold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <FiXCircle /> Decline
                  </button>
                  <button
                    onClick={() => handleAccept(bookingId)}
                    className="flex-1 py-3.5 rounded-xl text-white font-bold text-sm shadow-lg shadow-green-200 hover:shadow-green-300 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    }}
                  >
                    <FiCheckCircle /> Accept Job
                  </button>
                </div>
              </div>
            </div>
          )}
          )
        )}
      </main>
    </div>
  );
};

export default BookingAlerts;
