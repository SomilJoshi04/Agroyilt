import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDollarSign, FiArrowRight, FiCreditCard, FiAlertCircle, FiCheckCircle, FiClock, FiCheck, FiLock } from 'react-icons/fi';
import { vendorTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import withdrawalService from '../../../../services/withdrawalService';
import BankDetailsSection from '../../../../components/common/BankDetailsSection';
import WithdrawalHistoryList from '../../../../components/common/WithdrawalHistoryList';
import { toastManager } from '../../../../utils/toastManager';
import LogoLoader from '../../../../components/common/LogoLoader';

const WithdrawalRequest = () => {
  const navigate = useNavigate();
  const [balanceData, setBalanceData] = useState(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('withdraw'); // 'withdraw' | 'history'

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = themeColors.backgroundGradient;

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      setLoading(true);
      const res = await withdrawalService.getBalance();
      if (res.success) {
        setBalanceData(res.data);
      }
    } catch (err) {
      console.error('Error loading balance:', err);
      toastManager.error('Failed to load wallet balance');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (val) => {
    const clean = val.replace(/[^0-9]/g, '');
    setAmount(clean);
    setError('');

    const num = parseInt(clean, 10);
    if (!clean) return;

    if (balanceData) {
      if (num < balanceData.minWithdrawalAmount) {
        setError(`Minimum withdrawal amount is ₹${balanceData.minWithdrawalAmount}. Please enter ₹${balanceData.minWithdrawalAmount} or more to continue.`);
      } else if (num > balanceData.withdrawableBalance) {
        setError(`Your available withdrawal balance is ₹${balanceData.withdrawableBalance}.`);
      }
    }
  };

  const handleMaxAmount = () => {
    if (balanceData && balanceData.withdrawableBalance > 0) {
      const maxVal = Math.floor(balanceData.withdrawableBalance);
      setAmount(maxVal.toString());
      if (maxVal < balanceData.minWithdrawalAmount) {
        setError(`Minimum withdrawal amount is ₹${balanceData.minWithdrawalAmount}. Please enter ₹${balanceData.minWithdrawalAmount} or more to continue.`);
      } else {
        setError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseInt(amount, 10);

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return setError('Please enter a valid withdrawal amount');
    }

    if (!balanceData?.hasBankDetails) {
      setShowBankModal(true);
      return;
    }

    if (numAmount < balanceData.minWithdrawalAmount) {
      return setError(`Minimum withdrawal amount is ₹${balanceData.minWithdrawalAmount}. Please enter ₹${balanceData.minWithdrawalAmount} or more to continue.`);
    }

    if (numAmount > balanceData.withdrawableBalance) {
      return setError(`Your available withdrawal balance is ₹${balanceData.withdrawableBalance}.`);
    }

    try {
      setSubmitting(true);
      const res = await withdrawalService.requestWithdrawal({
        amount: numAmount,
        notes: notes.trim()
      });

      if (res.success) {
        toastManager.success('Withdrawal request submitted successfully');
        setAmount('');
        setNotes('');
        await loadBalance();
        setHistoryRefreshKey(k => k + 1);
        setActiveTab('history');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit withdrawal request';
      setError(msg);
      toastManager.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !balanceData) {
    return <LogoLoader text="Loading wallet details..." />;
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Owner Withdrawals" />

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Navigation Tabs */}
        <div className="flex bg-white/80 backdrop-blur p-1 rounded-2xl shadow-sm border border-gray-100">
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'withdraw'
                ? 'bg-green-700 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Request Payout
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-green-700 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Payout History
          </button>
        </div>

        {activeTab === 'withdraw' ? (
          <>
            {/* Total Balance Card */}
            <div className="rounded-2xl p-6 shadow-xl relative overflow-hidden bg-gradient-to-br from-green-700 to-emerald-900 text-white">
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-white/80 text-[11px] font-bold uppercase tracking-[0.2em] mb-1">
                  Available Redeemable Earnings
                </span>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-2xl font-black text-white/80">₹</span>
                  <span className="text-5xl font-black text-white tracking-tight">
                    {(balanceData?.withdrawableBalance || 0).toLocaleString()}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
                  <div className="px-3 py-1 bg-white/10 text-white rounded-full text-[11px] font-semibold border border-white/20 backdrop-blur-sm flex items-center gap-1">
                    <FiCheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                    Min Payout: ₹{(balanceData?.minWithdrawalAmount || 300).toLocaleString()}
                  </div>
                  {balanceData?.reservedBalance > 0 && (
                    <div className="px-3 py-1 bg-amber-400/20 text-amber-200 rounded-full text-[11px] font-semibold border border-amber-300/30 flex items-center gap-1">
                      <FiClock className="w-3.5 h-3.5" />
                      Pending: ₹{balanceData.reservedBalance.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 text-white/10 transform rotate-12 pointer-events-none">
                <FiDollarSign className="w-40 h-40" />
              </div>
            </div>

            {/* Bank Details Check Card */}
            {balanceData?.hasBankDetails ? (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                    <FiCreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Registered Bank Account</p>
                    <p className="font-mono font-bold text-gray-900 text-sm">{balanceData.bankAccountMasked}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBankModal(true)}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <FiAlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Banking Details Required</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Please add your banking details before requesting a withdrawal.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBankModal(true)}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  Add Banking Details
                </button>
              </div>
            )}

            {/* Withdrawal Input Form */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Withdraw Amount
                    </label>
                    <button
                      type="button"
                      onClick={handleMaxAmount}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      Withdraw All
                    </button>
                  </div>

                  <div className="relative">
                    <span className="absolute left-4 top-3 text-xl font-bold text-gray-400">₹</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder={balanceData ? `Min ₹${balanceData.minWithdrawalAmount}` : '0'}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-green-600 font-mono"
                    />
                  </div>
                </div>

                {/* Quick Chips */}
                <div className="flex items-center gap-2">
                  {[500, 1000, 2000, 5000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleAmountChange(val.toString())}
                      className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Notes (Optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Weekly settlement payout"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                    <FiAlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !amount || !balanceData?.hasBankDetails}
                  className="w-full py-3.5 bg-green-700 hover:bg-green-800 text-white rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiLock className="w-4 h-4" />
                  )}
                  Submit Withdrawal Request
                </button>
              </form>
            </div>
          </>
        ) : (
          /* History View */
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <WithdrawalHistoryList refreshTrigger={historyRefreshKey} />
          </div>
        )}
      </main>

      {/* Banking details modal */}
      <BankDetailsSection
        isModalMode={true}
        isOpen={showBankModal}
        onClose={() => setShowBankModal(false)}
        onSuccess={() => {
          setShowBankModal(false);
          loadBalance();
        }}
      />

      <BottomNav />
    </div>
  );
};

export default WithdrawalRequest;
