import api from './api';
import { registerFCMToken, removeFCMToken } from './pushNotificationService';

/**
 * Notify Flutter WebView about successful login
 * This directly calls Flutter's captureLoginResponse handler
 * @param {object} responseData - The login response data containing accessToken and user/vendor/worker info
 */
function notifyFlutterLogin(responseData) {
  try {
    if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
      window.flutter_inappwebview.callHandler('captureLoginResponse', JSON.stringify({
        url: '/auth/login',
        body: responseData
      }));
    }
  } catch (e) {
    console.error('[AUTH] Error notifying Flutter:', e);
  }
}

/**
 * Get the current platform type (web or mobile)
 * @returns {'web' | 'mobile'}
 */
function getPlatformType() {
  return (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) ? 'mobile' : 'web';
}

/**
 * User Authentication Service
 */
export const userAuthService = {
  // Send OTP
  sendOTP: async (phone, email = null, isLogin = false, purpose = 'register') => {
    const response = await api.post('/users/auth/send-otp', { phone, email, isLogin, purpose });
    return response.data;
  },

  // Verify Login (Unified Flow)
  verifyLogin: async (data) => {
    const response = await api.post('/users/auth/verify-login', data);
    return response.data;
  },

  // Register
  register: async (data) => {
    const response = await api.post('/users/auth/register', data);
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('userData', JSON.stringify(response.data.user));
      notifyFlutterLogin(response.data);
      registerFCMToken('user', true).catch(console.error);
    }
    return response.data;
  },

  // Login
  login: async (data) => {
    const response = await api.post('/users/auth/login', data);
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('userData', JSON.stringify(response.data.user));
      notifyFlutterLogin(response.data);
      registerFCMToken('user', true).catch(console.error);
    }
    return response.data;
  },

  // Logout
  logout: async () => {
    // Remove FCM token before logout
    await removeFCMToken('user');
    try {
      await api.post('/users/auth/logout', { platform: getPlatformType() });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
  },

  // Get profile
  getProfile: async () => {
    const response = await api.get('/users/profile');
    if (response.data.user) {
      localStorage.setItem('userData', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Update profile
  updateProfile: async (data) => {
    const response = await api.put('/users/profile', data);
    if (response.data.user) {
      localStorage.setItem('userData', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // --- MPIN Methods ---
  loginWithMpin: async (data) => {
    const response = await api.post('/users/auth/login-mpin', data);
    if (response.data.success && response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('userData', JSON.stringify(response.data.user));
      notifyFlutterLogin(response.data);
      registerFCMToken('user', true).catch(console.error);
    }
    return response.data;
  },

  setMpin: async (data) => {
    const response = await api.post('/users/auth/set-mpin', data);
    return response.data;
  },

  resetMpin: async (data) => {
    const response = await api.post('/users/auth/reset-mpin', data);
    return response.data;
  },

  getMpinStatus: async () => {
    const response = await api.get('/users/auth/mpin-status');
    return response.data;
  },

  // Delete account permanently
  deleteAccount: async () => {
    await removeFCMToken('user').catch(() => {}); // Silent fail
    const response = await api.delete('/users/auth/delete-account');
    if (response.data.success) {
      // Only clear localStorage AFTER backend confirms deletion
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('currentAddress');
      localStorage.removeItem('currentCity');
    }
    return response.data;
  }
};

/**
 * Vendor Authentication Service
 */
export const vendorAuthService = {
  // Send OTP
  sendOTP: async (phone, email = null, purpose = 'register') => {
    const response = await api.post('/vendors/auth/send-otp', { phone, email, purpose });
    return response.data;
  },

  // Verify Login (Unified Flow)
  verifyLogin: async (data) => {
    const response = await api.post('/vendors/auth/verify-login', data);
    return response.data;
  },

  // Register
  register: async (data) => {
    const response = await api.post('/vendors/auth/register', data);
    return response.data;
  },

  // Login
  login: async (data) => {
    // Remove email from login payload if present
    const { email, ...loginData } = data;
    const response = await api.post('/vendors/auth/login', loginData);
    if (response.data.accessToken) {
      localStorage.setItem('vendorAccessToken', response.data.accessToken);
      localStorage.setItem('vendorRefreshToken', response.data.refreshToken);
      localStorage.setItem('vendorData', JSON.stringify(response.data.vendor));
      notifyFlutterLogin(response.data);
      // Register FCM token after successful login
      console.log('[AUTH] Vendor login successful, registering FCM token...');
      try {
        const fcmToken = await registerFCMToken('vendor', true);
        if (fcmToken) {
          console.log('[AUTH] ✅ Vendor FCM token registered successfully');
        } else {
          console.log('[AUTH] ⚠️ Vendor FCM token registration returned null');
        }
      } catch (err) {
        console.error('[AUTH] ❌ Vendor FCM token registration failed:', err);
      }
    }
    return response.data;
  },

  // Logout
  logout: async () => {
    // Remove FCM token before logout
    await removeFCMToken('vendor');
    try {
      await api.post('/vendors/auth/logout', { platform: getPlatformType() });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('vendorAccessToken');
    localStorage.removeItem('vendorRefreshToken');
    localStorage.removeItem('vendorData');
  },

  // Get profile
  getProfile: async () => {
    const response = await api.get('/vendors/profile');
    if (response.data.vendor) {
      localStorage.setItem('vendorData', JSON.stringify(response.data.vendor));
    }
    return response.data;
  },

  // Update profile
  updateProfile: async (data) => {
    const response = await api.put('/vendors/profile', data);
    if (response.data.vendor) {
      localStorage.setItem('vendorData', JSON.stringify(response.data.vendor));
    }
    return response.data;
  },

  // Update business profile
  updateBusinessProfile: async (data) => {
    const response = await api.put('/vendors/profile/business', data);
    // Update local storage with new services and labDetails
    if (response.data.success) {
      const currentData = JSON.parse(localStorage.getItem('vendorData') || '{}');
      const updatedData = { 
        ...currentData, 
        service: response.data.service,
        labDetails: response.data.labDetails 
      };
      localStorage.setItem('vendorData', JSON.stringify(updatedData));
      
      // Dispatch event to update profile UI
      window.dispatchEvent(new Event('vendorProfileUpdated'));
    }
    return response.data;
  },

  // --- MPIN Methods ---
  loginWithMpin: async (data) => {
    const response = await api.post('/vendors/auth/login-mpin', data);
    if (response.data.success && response.data.accessToken) {
      localStorage.setItem('vendorAccessToken', response.data.accessToken);
      localStorage.setItem('vendorRefreshToken', response.data.refreshToken);
      localStorage.setItem('vendorData', JSON.stringify(response.data.vendor));
      notifyFlutterLogin(response.data);
      registerFCMToken('vendor', true).catch(console.error);
    }
    return response.data;
  },

  setMpin: async (data) => {
    const response = await api.post('/vendors/auth/set-mpin', data);
    return response.data;
  },

  resetMpin: async (data) => {
    const response = await api.post('/vendors/auth/reset-mpin', data);
    return response.data;
  },

  getMpinStatus: async () => {
    const response = await api.get('/vendors/auth/mpin-status');
    return response.data;
  },

  // Delete account permanently
  deleteAccount: async () => {
    await removeFCMToken('vendor').catch(() => {}); // Silent fail
    const response = await api.delete('/vendors/auth/delete-account');
    if (response.data.success) {
      // Only clear localStorage AFTER backend confirms deletion
      localStorage.removeItem('vendorAccessToken');
      localStorage.removeItem('vendorRefreshToken');
      localStorage.removeItem('vendorData');
      localStorage.removeItem('vendorSettings');
      localStorage.removeItem('vendorProfile');
    }
    return response.data;
  }
};

/**
 * Worker Authentication Service
 */
export const workerAuthService = {
  // Send OTP
  sendOTP: async (phone, email = null, isLogin = false, purpose = 'register') => {
    const response = await api.post('/workers/auth/send-otp', { phone, email, isLogin, purpose });
    return response.data;
  },

  // Verify Login (Unified Flow)
  verifyLogin: async (data) => {
    const response = await api.post('/workers/auth/verify-login', data);
    return response.data;
  },

  // Register
  register: async (data) => {
    const response = await api.post('/workers/auth/register', data);
    if (response.data.accessToken) {
      localStorage.setItem('workerAccessToken', response.data.accessToken);
      localStorage.setItem('workerRefreshToken', response.data.refreshToken);
      localStorage.setItem('workerData', JSON.stringify(response.data.worker));
      notifyFlutterLogin(response.data);
    }
    return response.data;
  },

  // Login
  login: async (data) => {
    // Remove email from login payload if present
    const { email, ...loginData } = data;
    const response = await api.post('/workers/auth/login', loginData);
    if (response.data.accessToken) {
      localStorage.setItem('workerAccessToken', response.data.accessToken);
      localStorage.setItem('workerRefreshToken', response.data.refreshToken);
      localStorage.setItem('workerData', JSON.stringify(response.data.worker));
      notifyFlutterLogin(response.data);
      registerFCMToken('worker', true).catch(console.error);
    }
    return response.data;
  },

  // Logout
  logout: async () => {
    // Remove FCM token before logout
    await removeFCMToken('worker');
    try {
      await api.post('/workers/auth/logout', { platform: getPlatformType() });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('workerAccessToken');
    localStorage.removeItem('workerRefreshToken');
    localStorage.removeItem('workerData');
  },

  // Get profile
  getProfile: async () => {
    const response = await api.get('/workers/profile');
    if (response.data.worker) {
      localStorage.setItem('workerData', JSON.stringify(response.data.worker));
    }
    return response.data;
  },

  // Update profile
  updateProfile: async (data) => {
    const response = await api.put('/workers/profile', data);
    if (response.data.worker) {
      localStorage.setItem('workerData', JSON.stringify(response.data.worker));
    }
    return response.data;
  },

  // --- MPIN Methods ---
  loginWithMpin: async (data) => {
    const response = await api.post('/workers/auth/login-mpin', data);
    if (response.data.success && response.data.accessToken) {
      localStorage.setItem('workerAccessToken', response.data.accessToken);
      localStorage.setItem('workerRefreshToken', response.data.refreshToken);
      localStorage.setItem('workerData', JSON.stringify(response.data.worker));
      notifyFlutterLogin(response.data);
      registerFCMToken('worker', true).catch(console.error);
    }
    return response.data;
  },

  setMpin: async (data) => {
    const response = await api.post('/workers/auth/set-mpin', data);
    return response.data;
  },

  resetMpin: async (data) => {
    const response = await api.post('/workers/auth/reset-mpin', data);
    return response.data;
  },

  getMpinStatus: async () => {
    const response = await api.get('/workers/auth/mpin-status');
    return response.data;
  }
};

/**
 * Admin Authentication Service
 */
export const adminAuthService = {
  // Login
  login: async (email, password, rememberMe = false) => {
    const response = await api.post('/admin/auth/login', { email, password });
    if (response.data.accessToken) {
      // Clear any session storage to prevent conflicts
      sessionStorage.removeItem('adminAccessToken');
      sessionStorage.removeItem('adminRefreshToken');
      sessionStorage.removeItem('adminData');

      // Always use localStorage for consistency
      localStorage.setItem('adminAccessToken', response.data.accessToken);
      localStorage.setItem('adminRefreshToken', response.data.refreshToken);
      localStorage.setItem('adminData', JSON.stringify(response.data.admin));
    }
    return response.data;
  },

  // Logout
  logout: async () => {
    try {
      await api.post('/admin/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminData');
  }
};


