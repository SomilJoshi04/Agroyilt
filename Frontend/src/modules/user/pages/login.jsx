import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiPhone, FiArrowRight, FiCheckCircle, FiChevronLeft } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../theme';
import { userAuthService } from '../../../services/authService';
import Logo from '../../../components/common/Logo';
import LogoLoader from '../../../components/common/LogoLoader';

import { z } from "zod";

// Zod schema
const phoneSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian phone number"),
});

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('phone'); // 'phone' or 'mpin'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mpin, setMpin] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);

  // Refs for focus management
  const phoneInputRef = useRef(null);
  const mpinInputRefs = useRef([]);

  // Auto-focus logic
  useEffect(() => {
    // Redirect if already logged in
    if (localStorage.getItem('accessToken')) {
      navigate('/user', { replace: true });
      return;
    }

    if (step === 'phone' && phoneInputRef.current) {
      setTimeout(() => phoneInputRef.current.focus(), 100);
    } else if (step === 'mpin' && mpinInputRefs.current[0]) {
      setTimeout(() => mpinInputRefs.current[0].focus(), 100);
    }
  }, [step, navigate]);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();

    // Zod Validation
    const validationResult = phoneSchema.safeParse({ phone: phoneNumber });
    if (!validationResult.success) {
      toast.error(validationResult.error?.issues?.[0]?.message || 'Invalid phone number');
      return;
    }

    setStep('mpin');
  };

  const handleMpinChange = (index, value) => {
    if (value && !/^\d+$/.test(value)) return;
    if (value.length > 1) {
      if (index === 0 && value.length === 4) {
        setMpin(value.split(''));
        mpinInputRefs.current[3]?.focus();
      }
      return;
    }
    const newMpin = [...mpin];
    newMpin[index] = value;
    setMpin(newMpin);
    if (value && index < 3) {
      mpinInputRefs.current[index + 1]?.focus();
    }
  };

  const handleMpinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !mpin[index] && index > 0) {
      mpinInputRefs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    const mpinValue = mpin.join('');
    if (mpinValue.length === 4 && !isLoading) {
      handleMpinSubmit();
    }
  }, [mpin]);

  const handleMpinSubmit = async (e) => {
    if (e) e.preventDefault();
    const mpinValue = mpin.join('');
    if (mpinValue.length !== 4) {
      toast.error('Please enter 4-digit MPIN');
      return;
    }
    setIsLoading(true);
    try {
      const response = await userAuthService.loginWithMpin({
        phone: phoneNumber.replace(/\D/g, ''),
        mpin: mpinValue
      });

      if (response.success) {
        toast.success('Welcome back!');
        navigate('/user', { replace: true });
      }
    } catch (error) {
      setIsLoading(false);
      if (error.response?.status === 404) {
        toast.error('Account not found. Please register.');
        navigate('/user/signup', { state: { phone: phoneNumber } });
      } else if (error.response?.data?.requiresMpinSetup) {
        toast.error('MPIN not set. Please setup your MPIN.');
        navigate('/user/forgot-mpin', { state: { phone: phoneNumber, isSetup: true } });
      } else {
        toast.error(error.response?.data?.message || 'Invalid MPIN');
        setMpin(['', '', '', '']);
        mpinInputRefs.current[0]?.focus();
      }
    }
  };

  // Dark Green Theme Colors from Mockup
  const brandColor = '#426B4F'; // Solid dark green for buttons and text
  const inputBgColor = '#DFE8E2'; // Light green for inputs

  return (
    <div
      className="min-h-[100dvh] flex flex-col relative overflow-x-hidden bg-white justify-center items-center"
    >
      {/* Top Background with Wave */}
      <div
        className="absolute top-0 left-0 w-full h-[25vh] bg-cover bg-center z-0 sm:hidden"
        style={{ backgroundImage: "url('/auth-bg.jpg')", filter: 'brightness(0.95)' }}
      >
        <svg className="absolute bottom-0 w-full text-white" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ height: '50px', transform: 'translateY(1px)' }}>
          <path fill="currentColor" fillOpacity="1" d="M0,224L80,197.3C160,171,320,117,480,122.7C640,128,800,192,960,208C1120,224,1280,192,1360,176L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
        </svg>
      </div>

      <div className="bg-transparent px-8 py-4 w-full z-20 sm:max-w-md sm:mx-auto relative flex flex-col justify-center pb-10 sm:pb-0">
        <div className="mb-8 text-center relative z-10 flex flex-col items-center">


          <div className="relative inline-block mb-2">
            {step === 'phone' ? (
              <Logo className="h-16 w-auto" />
            ) : (
              <h2 className="text-[32px] font-bold tracking-tight mb-2" style={{ color: brandColor }}>
                Verify Phone
              </h2>
            )}
          </div>
          <p className="text-sm font-medium text-gray-500">
            {step === 'phone'
              ? 'Login to your account'
              : `Code sent to +91 ${phoneNumber}`
            }
          </p>
        </div>

        {step === 'phone' ? (
          <form className="space-y-6" onSubmit={handlePhoneSubmit}>
            <div>
              <div
                className="relative flex items-center rounded-xl overflow-hidden px-4 py-1 border border-transparent focus-within:border-[#426B4F]/30 transition-colors"
                style={{ backgroundColor: inputBgColor }}
              >
                <div className="flex items-center text-[#426B4F] mr-3">
                  <FiPhone className="h-5 w-5" />
                  <span className="font-semibold ml-2 border-r border-[#426B4F]/20 pr-3">+91</span>
                </div>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  id="phone"
                  className="block w-full py-4 bg-transparent border-none focus:ring-0 text-[#426B4F] font-bold placeholder-[#426B4F]/60 sm:text-sm"
                  placeholder="Mobile Number"
                  value={phoneNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) setPhoneNumber(val);
                  }}
                />
              </div>
            </div>



            <div className="flex items-center justify-between text-xs px-2 mt-2">
              <label className="flex items-center text-[#426B4F] font-medium cursor-pointer">
                <input type="checkbox" className="mr-2 rounded-full text-[#426B4F] focus:ring-[#426B4F] border-gray-300 shadow-sm" />
                Remember Me
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || phoneNumber.length < 10}
                className="w-full flex justify-center py-4 px-4 rounded-3xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 shadow-lg relative overflow-hidden"
                style={{ backgroundColor: brandColor, boxShadow: '0 4px 14px 0 rgba(66, 107, 79, 0.39)' }}
              >
                {isLoading ? (
                  <LogoLoader fullScreen={false} inline={true} size="w-6 h-6" />
                ) : (
                  <span>Next</span>
                )}
              </button>
            </div>



            <div className="mt-8 text-center text-sm">
              <span className="text-gray-400 font-medium">Don't have account? </span>
              <Link to="/user/signup" className="text-[#426B4F] font-bold hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        ) : (
          <form className="space-y-8" onSubmit={handleMpinSubmit}>
            <div className="flex justify-center gap-3 py-4">
              {mpin.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (mpinInputRefs.current[index] = el)}
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleMpinChange(index, e.target.value)}
                  onKeyDown={(e) => handleMpinKeyDown(index, e)}
                  className="w-14 h-14 text-center text-2xl font-bold rounded-xl focus:ring-2 focus:ring-[#426B4F] border-transparent transition-all duration-300 shadow-sm"
                  style={{ backgroundColor: inputBgColor, color: brandColor }}
                />
              ))}
            </div>

            <div className="flex items-center justify-between px-2 text-sm font-medium">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setMpin(['', '', '', '']);
                  setStep('phone');
                }}
                className="flex items-center text-gray-400 hover:text-[#426B4F] transition-colors"
              >
                <FiChevronLeft className="mr-1" /> Change Number
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate('/user/forgot-mpin', { state: { phone: phoneNumber } });
                }}
                className="text-[#426B4F] hover:underline font-bold"
              >
                Forgot MPIN?
              </button>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || mpin.join('').length !== 4}
                className="w-full flex justify-center py-4 px-4 rounded-3xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:-translate-y-0.5"
                style={{ backgroundColor: brandColor }}
              >
                {isLoading ? (
                  <LogoLoader fullScreen={false} inline={true} size="w-6 h-6" />
                ) : (
                  <span>Login</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div >
  );
};

export default Login;
