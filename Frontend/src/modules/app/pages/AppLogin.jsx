import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiPhone, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import api from '../../../services/api';
import { userAuthService, vendorAuthService, workerAuthService } from '../../../services/authService';
import { useBrand } from '../../../context/BrandContext';

// Phone validation
const phoneSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
});

const AppLogin = () => {
  const navigate = useNavigate();
  const { appLogo, appName } = useBrand();

  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'identifying'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpToken, setOtpToken] = useState('');
  const [detectedRole, setDetectedRole] = useState(null); // 'user' | 'vendor' | 'worker'
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [multipleRoles, setMultipleRoles] = useState([]); // edge case: same phone in multiple roles

  const phoneInputRef = useRef(null);
  const otpInputRefs = useRef([]);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (localStorage.getItem('accessToken')) navigate('/user', { replace: true });
    else if (localStorage.getItem('vendorAccessToken')) navigate('/vendor', { replace: true });
    else if (localStorage.getItem('workerAccessToken')) navigate('/worker', { replace: true });
  }, [navigate]);

  // Auto focus phone input
  useEffect(() => {
    if (step === 'phone' && phoneInputRef.current) {
      setTimeout(() => phoneInputRef.current.focus(), 100);
    }
  }, [step]);

  // Resend timer
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Auto-verify OTP when all 6 digits are entered
  useEffect(() => {
    const otpValue = otp.join('');
    if (otpValue.length === 6 && step === 'otp' && !isLoading && otpToken && detectedRole) {
      handleVerifyOtp();
    }
  }, [otp]);

  // ─── Step 1: Identify role by phone, then send OTP ───────────────────────
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');

    const validation = phoneSchema.safeParse({ phone: cleanPhone });
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    setStep('identifying');

    try {
      // Step 1a: Identify which role this phone belongs to
      const identifyRes = await api.post('/app/identify-role', { phone: cleanPhone });
      const roles = identifyRes.data?.roles || [];

      if (roles.length === 0) {
        toast.error("No account found for this number. Please register first.");
        setStep('phone');
        setIsLoading(false);
        return;
      }

      let roleToUse = roles[0]; // default to first found

      if (roles.length > 1) {
        // Multiple roles — show picker
        setMultipleRoles(roles);
        setIsLoading(false);
        setStep('phone'); // will render role picker in UI
        return;
      }

      // Step 1b: Send OTP using the correct role's API
      await sendOtpForRole(cleanPhone, roleToUse);
    } catch (error) {
      console.error('Identify role error:', error);
      toast.error(error.response?.data?.message || 'Failed to identify account. Try again.');
      setStep('phone');
      setIsLoading(false);
    }
  };

  const sendOtpForRole = async (cleanPhone, role) => {
    try {
      let response;
      if (role === 'user') {
        response = await userAuthService.sendOTP(cleanPhone, null, true);
      } else if (role === 'vendor') {
        response = await api.post('/vendors/auth/send-otp', { phone: cleanPhone });
        response = response.data;
      } else if (role === 'worker') {
        response = await api.post('/workers/auth/send-otp', { phone: cleanPhone });
        response = response.data;
      }

      if (response?.success) {
        setOtpToken(response.token || '');
        setDetectedRole(role);
        setStep('otp');
        setResendTimer(120);
        setIsLoading(false);
        toast.success('OTP sent successfully!');
      } else {
        throw new Error(response?.message || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP. Please try again.');
      setStep('phone');
      setIsLoading(false);
    }
  };

  // ─── Step 2: Verify OTP and login ────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length !== 6) { toast.error('Please enter all 6 digits'); return; }
    if (!otpToken) { toast.error('Please request OTP first'); return; }

    setIsLoading(true);
    const cleanPhone = phone.replace(/\D/g, '');

    try {
      let response;

      if (detectedRole === 'user') {
        response = await userAuthService.verifyLogin({ phone: cleanPhone, otp: otpValue });
        if (response.success) {
          if (response.isNewUser) {
            // Shouldn't happen in login flow, but handle gracefully
            navigate('/user/signup', { state: { phone: cleanPhone, verificationToken: response.verificationToken } });
          } else {
            toast.success('Welcome back! 👋');
            navigate('/user', { replace: true });
          }
          return;
        }
      } else if (detectedRole === 'vendor') {
        const res = await api.post('/vendors/auth/verify-login', { phone: cleanPhone, otp: otpValue });
        response = res.data;
        if (response.success && !response.isNewUser && response.accessToken) {
          localStorage.setItem('vendorAccessToken', response.accessToken);
          localStorage.setItem('vendorRefreshToken', response.refreshToken);
          localStorage.setItem('vendorData', JSON.stringify(response.vendor));
          toast.success('Welcome back! 👋');
          navigate('/vendor', { replace: true });
          return;
        }
      } else if (detectedRole === 'worker') {
        const res = await api.post('/workers/auth/verify-login', { phone: cleanPhone, otp: otpValue });
        response = res.data;
        if (response.success && !response.isNewUser && response.accessToken) {
          localStorage.setItem('workerAccessToken', response.accessToken);
          localStorage.setItem('workerRefreshToken', response.refreshToken);
          localStorage.setItem('workerData', JSON.stringify(response.worker));
          toast.success('Welcome back! 👋');
          navigate('/worker', { replace: true });
          return;
        }
      }

      // If we reach here, something failed
      toast.error(response?.message || 'Verification failed. Please try again.');
      setIsLoading(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value && !/^\d+$/.test(value)) return;
    if (value.length > 1) {
      // Handle paste of full OTP
      if (index === 0 && value.length === 6) {
        setOtp(value.split(''));
        otpInputRefs.current[5]?.focus();
      }
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    setOtp(['', '', '', '', '', '']);
    sendOtpForRole(phone.replace(/\D/g, ''), detectedRole);
  };

  const roleLabel = {
    user: 'Farmer',
    vendor: 'Vendor',
    worker: 'Independent Worker',
  };

  const roleColor = {
    user: '#2E7D32',
    vendor: '#1565C0',
    worker: '#E65100',
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      background: '#F8FAF8', fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px 20px 12px',
        background: '#fff', borderBottom: '1px solid #E8F5E9',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          id="app-login-back-btn"
          onClick={() => step === 'otp' ? (setStep('phone'), setOtp(['','','','','',''])) : navigate('/app')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px', borderRadius: '10px',
            color: '#2E7D32', display: 'flex', alignItems: 'center',
          }}
        >
          <FiChevronLeft size={24} />
        </button>

        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', flexShrink: 0,
        }}>
          <img
            src={appLogo || '/AgroyiltLogo.png'}
            alt={appName || 'AgroYilt'}
            style={{ width: '115%', height: '115%', objectFit: 'cover' }}
            onError={e => { e.target.src = '/AgroyiltLogo.png'; }}
          />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1B5E20' }}>
            {step === 'otp' ? 'Verify OTP' : 'Login'}
          </h1>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#78909C' }}>
            {appName || 'AgroYilt'}
          </p>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '32px 24px 16px' }}>

        {/* Phone Step */}
        {(step === 'phone' || step === 'identifying') && (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800, color: '#1B5E20' }}>
              Welcome back!
            </h2>
            <p style={{ margin: '0 0 32px', fontSize: '0.875rem', color: '#78909C', lineHeight: 1.5 }}>
              Enter your registered mobile number. We'll auto-detect your role and send an OTP.
            </p>

            {/* Multiple Roles Picker (edge case) */}
            {multipleRoles.length > 1 && (
              <div style={{ marginBottom: '24px' }}>
                <p style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 600, color: '#263238' }}>
                  Multiple accounts found. Select how you want to login:
                </p>
                {multipleRoles.map(role => (
                  <button
                    key={role}
                    id={`app-login-role-pick-${role}`}
                    onClick={() => sendOtpForRole(phone.replace(/\D/g, ''), role)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '14px 16px',
                      background: '#fff', border: `2px solid ${roleColor[role]}`,
                      borderRadius: '14px', cursor: 'pointer',
                      marginBottom: '10px', color: roleColor[role],
                      fontSize: '0.95rem', fontWeight: 700,
                    }}
                  >
                    <span>Login as {roleLabel[role]}</span>
                    <FiChevronLeft size={18} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handlePhoneSubmit}>
              <label style={{
                display: 'block', fontSize: '0.82rem', fontWeight: 600,
                color: '#546E7A', marginBottom: '8px',
              }}>
                Mobile Number
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: '#fff', border: '2px solid #E0E0E0',
                borderRadius: '14px', padding: '4px 16px 4px 12px',
                transition: 'border-color 0.2s',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  color: '#2E7D32', flexShrink: 0,
                }}>
                  <FiPhone size={18} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#263238' }}>+91</span>
                </div>
                <div style={{ width: '1px', height: '28px', background: '#E0E0E0' }} />
                <input
                  ref={phoneInputRef}
                  id="app-login-phone-input"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit number"
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    background: 'transparent', fontSize: '1rem', fontWeight: 500,
                    color: '#263238', padding: '14px 0',
                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                  }}
                />
              </div>

              <button
                id="app-login-send-otp-btn"
                type="submit"
                disabled={isLoading || phone.replace(/\D/g, '').length !== 10}
                style={{
                  marginTop: '24px', width: '100%', padding: '18px',
                  borderRadius: '16px', border: 'none',
                  background: phone.replace(/\D/g, '').length === 10 && !isLoading
                    ? 'linear-gradient(135deg, #2E7D32 0%, #43A047 100%)'
                    : '#E0E0E0',
                  color: phone.replace(/\D/g, '').length === 10 && !isLoading ? '#fff' : '#9E9E9E',
                  fontSize: '1rem', fontWeight: 700,
                  cursor: phone.replace(/\D/g, '').length === 10 && !isLoading ? 'pointer' : 'not-allowed',
                  boxShadow: phone.replace(/\D/g, '').length === 10 && !isLoading
                    ? '0 4px 16px rgba(46,125,50,0.35)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {isLoading ? (step === 'identifying' ? 'Finding your account...' : 'Sending OTP...') : 'Send OTP'}
              </button>
            </form>
          </>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: detectedRole ? `${roleColor[detectedRole]}15` : '#E8F5E9',
              border: `1px solid ${detectedRole ? roleColor[detectedRole] : '#A5D6A7'}`,
              borderRadius: '999px', padding: '4px 12px', marginBottom: '20px',
            }}>
              <FiCheckCircle size={14} color={detectedRole ? roleColor[detectedRole] : '#2E7D32'} />
              <span style={{
                fontSize: '0.78rem', fontWeight: 600,
                color: detectedRole ? roleColor[detectedRole] : '#2E7D32',
              }}>
                {detectedRole ? roleLabel[detectedRole] : 'Account'} found
              </span>
            </div>

            <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 800, color: '#1B5E20' }}>
              Enter OTP
            </h2>
            <p style={{ margin: '0 0 32px', fontSize: '0.875rem', color: '#78909C', lineHeight: 1.5 }}>
              We sent a 6-digit code to{' '}
              <strong style={{ color: '#263238' }}>+91 {phone}</strong>
            </p>

            <form onSubmit={handleVerifyOtp}>
              {/* OTP boxes */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '32px' }}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => { otpInputRefs.current[index] = el; }}
                    id={`app-login-otp-${index}`}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(index, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(index, e)}
                    style={{
                      width: '48px', height: '56px',
                      textAlign: 'center', fontSize: '1.4rem', fontWeight: 700,
                      border: `2px solid ${digit ? (detectedRole ? roleColor[detectedRole] : '#2E7D32') : '#E0E0E0'}`,
                      borderRadius: '14px', background: '#fff', outline: 'none',
                      color: '#263238', transition: 'border-color 0.15s',
                      fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    }}
                  />
                ))}
              </div>

              <button
                id="app-login-verify-btn"
                type="submit"
                disabled={isLoading || otp.join('').length !== 6}
                style={{
                  width: '100%', padding: '18px',
                  borderRadius: '16px', border: 'none',
                  background: otp.join('').length === 6 && !isLoading
                    ? `linear-gradient(135deg, ${detectedRole ? roleColor[detectedRole] : '#2E7D32'} 0%, ${detectedRole ? roleColor[detectedRole] + 'cc' : '#43A047'} 100%)`
                    : '#E0E0E0',
                  color: otp.join('').length === 6 && !isLoading ? '#fff' : '#9E9E9E',
                  fontSize: '1rem', fontWeight: 700,
                  cursor: otp.join('').length === 6 && !isLoading ? 'pointer' : 'not-allowed',
                  boxShadow: otp.join('').length === 6 && !isLoading
                    ? `0 4px 16px ${detectedRole ? roleColor[detectedRole] + '55' : 'rgba(46,125,50,0.35)'}` : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {isLoading ? 'Verifying...' : 'Verify & Login'}
              </button>

              {/* Resend */}
              <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.875rem', color: '#78909C' }}>
                {resendTimer > 0 ? (
                  <>Resend OTP in <strong style={{ color: '#2E7D32' }}>{resendTimer}s</strong></>
                ) : (
                  <>
                    Didn't receive it?{' '}
                    <button
                      id="app-login-resend-btn"
                      onClick={handleResend}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#2E7D32', fontWeight: 700, fontSize: '0.875rem', padding: 0,
                      }}
                    >
                      Resend OTP
                    </button>
                  </>
                )}
              </p>
            </form>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 24px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: '0.875rem', color: '#78909C' }}>
          Don't have an account?{' '}
          <button
            id="app-login-register-link"
            onClick={() => navigate('/app/register')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#2E7D32', fontWeight: 700, fontSize: '0.875rem', padding: 0,
            }}
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
};

export default AppLogin;
