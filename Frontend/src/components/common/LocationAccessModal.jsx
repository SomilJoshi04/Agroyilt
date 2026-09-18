import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMapPin, FiNavigation, FiX, FiCheckCircle, FiShield } from 'react-icons/fi';
import { themeColors } from '../../theme';
import { toastManager } from '../../utils/toastManager';
import flutterBridge from '../../utils/flutterBridge';

const LocationAccessModal = ({
  isOpen,
  onClose,
  onSuccess,
  onManualSearch,
  userType = 'user' // 'user' | 'vendor' | 'worker'
}) => {
  const [isManual, setIsManual] = useState(false);
  const [address, setAddress] = useState('');
  const [requesting, setRequesting] = useState(false);

  const getTheme = () => {
    switch (userType) {
      case 'vendor': return themeColors.vendor || themeColors;
      case 'worker': return themeColors.worker || themeColors;
      default: return themeColors.user || themeColors;
    }
  };

  const currentTheme = getTheme();
  const themeColor = currentTheme.button || '#00A6A6';

  const getContent = () => {
    if (userType === 'vendor' || userType === 'worker') {
      return {
        title: "Work Location Verification",
        description: "We need your location to confirm you have arrived at the site to start the requested service. This is required to continue."
      };
    }
    return {
      title: "Location Access Required",
      description: "We need your location to show you equipment and services available near you. Location access is required to continue."
    };
  };

  const content = getContent();

  const handleRequestLocation = async () => {
    setRequesting(true);
    try {
      const location = await flutterBridge.getCurrentLocation();
      setRequesting(false);
      toastManager.success("Location access granted!");
      if (onSuccess) onSuccess(location);
      if (onClose) onClose();
    } catch (error) {
      setRequesting(false);
      let errorMsg = "Failed to get location";
      if (error.code === 1) {
        errorMsg = "Location permission denied. Please enable it in browser/app settings.";
      } else if (error.code === 2) {
        errorMsg = "Location information is unavailable. Check GPS.";
      } else if (error.code === 3) {
        errorMsg = "Request timed out. Please try again.";
      }
      toastManager.error(errorMsg);
    }
  };

  const isIOSOrSafari = () => {
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    return isIOS || isSafari;
  };

  if (!isOpen || isIOSOrSafari()) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-white w-full max-w-[320px] rounded-[1.5rem] overflow-hidden shadow-2xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button at top right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            {/* Icon Container */}
            <div className="w-16 h-16 bg-[#FCEEEF] rounded-full flex items-center justify-center mb-4">
              <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center">
                <FiMapPin className="w-5 h-5 text-[#9C2235]" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
              {content.title}
            </h3>

            <p className="text-xs text-gray-500 leading-relaxed mb-6 px-1">
              {content.description}
            </p>

            {!isManual ? (
              /* Permission View */
              <div className="w-full space-y-2">
                <button
                  onClick={handleRequestLocation}
                  disabled={requesting}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#9C2235' }}
                >
                  {requesting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Allow Location Access"
                  )}
                </button>

                <button
                  onClick={() => setIsManual(true)}
                  className="w-full py-3 rounded-xl bg-[#F3F4F6] text-gray-800 font-bold text-sm hover:bg-gray-200 active:scale-[0.98] transition-all"
                >
                  Enter Location Manually
                </button>

                <button
                  onClick={onClose}
                  className="w-full pt-1 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            ) : (
              /* Manual Entry View */
              <div className="w-full space-y-4">
                <div className="text-left">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block ml-1">
                    Search and select your location
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Type your address or location..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#9C2235] transition-colors"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-[1px] flex-1 bg-gray-100" />
                  <span className="text-[10px] font-bold text-gray-300">OR</span>
                  <div className="h-[1px] flex-1 bg-gray-100" />
                </div>

                <button
                  onClick={handleRequestLocation}
                  disabled={requesting}
                  className="w-full py-3 rounded-xl bg-[#E8F5E9] text-[#2E7D32] font-bold text-xs flex items-center justify-center gap-2 border border-[#C8E6C9] active:scale-[0.98] transition-all"
                >
                  <FiMapPin className="w-3.5 h-3.5" />
                  {requesting ? "Detecting..." : "Detect My Location"}
                </button>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setIsManual(false)}
                    className="flex-1 py-3 rounded-xl bg-[#F3F4F6] text-gray-600 font-bold text-sm active:scale-[0.98] transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (address) {
                        toastManager.success("Location saved!");
                        if (onSuccess) onSuccess({ address });
                        onClose();
                      } else {
                        toastManager.error("Please enter an address");
                      }
                    }}
                    className="flex-[1.5] py-3 rounded-xl text-white font-bold text-sm active:scale-[0.98] transition-all"
                    style={{ backgroundColor: '#9C2235' }}
                  >
                    Save Location
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LocationAccessModal;
