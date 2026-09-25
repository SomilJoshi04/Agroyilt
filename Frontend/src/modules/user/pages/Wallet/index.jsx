import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiLoader } from 'react-icons/fi';
import { MdAccountBalanceWallet } from 'react-icons/md';
import { toastManager } from '../../../../utils/toastManager';
import { walletService } from '../../../../services/walletService';
import LogoLoader from '../../../../components/common/LogoLoader';
import NotificationBell from '../../components/common/NotificationBell';
import { themeColors } from '../../../../theme';
import { useSocket } from '../../../../context/SocketContext';
import WithdrawalModal from '../../../../components/common/WithdrawalModal';
import WithdrawalHistoryList from '../../../../components/common/WithdrawalHistoryList';

const Wallet = () => {
  const navigate = useNavigate();
  const socket = useSocket();
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txLimit, setTxLimit] = useState(10);
  const [txPagination, setTxPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [txSummary, setTxSummary] = useState({ totalSpent: 0, totalPenalty: 0 });
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [amountToAdd, setAmountToAdd] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Load Razorpay Script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const loadTransactions = async (page = 1, limit = txLimit, showIndicator = true) => {
    try {
      if (showIndicator) setTxLoading(true);
      const res = await walletService.getTransactions({ page, limit });
      if (res.success) {
        setTransactions(res.data || []);
        if (res.pagination) {
          setTxPagination(res.pagination);
          setTxPage(res.pagination.page);
        }
        if (res.summary) {
          setTxSummary(res.summary);
        }
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toastManager.error('Failed to load transactions');
    } finally {
      if (showIndicator) setTxLoading(false);
    }
  };

  const loadWalletData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const [balanceResponse, transactionsResponse] = await Promise.all([
        walletService.getBalance(),
        walletService.getTransactions({ page: txPage, limit: txLimit })
      ]);

      if (balanceResponse.success) {
        setWalletBalance(balanceResponse.data.balance || 0);
      }

      if (transactionsResponse.success) {
        setTransactions(transactionsResponse.data || []);
        if (transactionsResponse.pagination) {
          setTxPagination(transactionsResponse.pagination);
          setTxPage(transactionsResponse.pagination.page);
        }
        if (transactionsResponse.summary) {
          setTxSummary(transactionsResponse.summary);
        }
      }
    } catch (error) {
      if (showLoader) toastManager.error('Failed to load wallet data');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData(true);
  }, []);

  // Listen for real-time wallet events
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data) => {
      if (data && data.balance !== undefined) {
        setWalletBalance(data.balance);
      }
      loadWalletData(false);
    };

    socket.on('wallet_balance_updated', handleUpdate);
    socket.on('wallet_updated', handleUpdate);

    return () => {
      socket.off('wallet_balance_updated', handleUpdate);
      socket.off('wallet_updated', handleUpdate);
    };
  }, [socket]);

  const handleAddMoney = async (e) => {
    e.preventDefault();
    if (!amountToAdd || isNaN(amountToAdd) || Number(amountToAdd) < 100) {
      return toastManager.error('Minimum amount to add is ₹100');
    }

    try {
      setIsProcessing(true);
      const res = await walletService.addMoney(Number(amountToAdd));

      if (res.success) {
        setShowAddMoney(false);
        const options = {
          key: res.data.key,
          amount: Math.round(res.data.amount * 100),
          currency: res.data.currency,
          name: 'Agroyilt',
          description: 'Wallet Top-up',
          order_id: res.data.orderId,
          handler: async function (response) {
            try {
              const verifyRes = await walletService.verifyTopup({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: Number(amountToAdd)
              });

              if (verifyRes.success) {
                toastManager.success('Money added to wallet successfully!');
                setWalletBalance(verifyRes.data.balance);
                setAmountToAdd('');
                const tRes = await walletService.getTransactions({ page: 1, limit: txLimit });
                if (tRes.success) {
                  setTransactions(tRes.data || []);
                  if (tRes.pagination) setTxPagination(tRes.pagination);
                  if (tRes.summary) setTxSummary(tRes.summary);
                  setTxPage(1);
                }
              }
            } catch (error) {
              toastManager.error('Payment verification failed');
            }
          },
          theme: { color: themeColors?.brand?.teal || '#347989' }
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          toastManager.error(response.error.description || 'Payment Failed');
        });
        rzp.open();
      }
    } catch (error) {
      toastManager.error(error.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 relative bg-white">
      {/* Refined Brand Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0"
          style={{
            background: `
              radial-gradient(at 0% 0%, ${themeColors?.brand?.teal || '#347989'}25 0%, transparent 70%),
              radial-gradient(at 100% 0%, ${themeColors?.brand?.yellow || '#D68F35'}20 0%, transparent 70%),
              radial-gradient(at 100% 100%, ${themeColors?.brand?.orange || '#BB5F36'}15 0%, transparent 75%),
              radial-gradient(at 0% 100%, ${themeColors?.brand?.teal || '#347989'}10 0%, transparent 70%),
              radial-gradient(at 50% 50%, ${themeColors?.brand?.teal || '#347989'}03 0%, transparent 100%),
              #FFFFFF
            `
          }}
        />
        {/* Elegant Dot Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(${themeColors?.brand?.teal || '#347989'} 0.8px, transparent 0.8px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Modern Glassmorphism Header */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/40 border-b border-black/[0.03] px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-black/[0.02]"
            >
              <FiArrowLeft className="w-5 h-5 text-black" />
            </button>
            <h1 className="text-xl font-extrabold text-black tracking-tight">Wallet</h1>
          </div>
          <NotificationBell />
        </header>

        <main className="px-4 py-6">
          {/* Referral Banner */}
          <div className="bg-gray-100 rounded-xl p-4 mb-4 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-lg font-bold text-black">Refer your friends and earn</h2>
            </div>
            {/* Gift Box Illustration */}
            <div className="absolute right-4 top-2 z-0">
              <div className="relative">
                <div className="w-20 h-20 bg-purple-400 rounded-lg flex items-center justify-center transform rotate-12 shadow-md">
                  <div className="w-16 h-16 bg-pink-300 rounded-lg flex items-center justify-center">
                    <span className="text-3xl">🎁</span>
                  </div>
                </div>
                {/* Sparkles */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-300 rounded-full"></div>
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-200 rounded-full"></div>
                <div className="absolute top-4 -left-2 w-2 h-2 bg-white rounded-full opacity-80"></div>
                <div className="absolute bottom-4 -right-2 w-2 h-2 bg-white rounded-full opacity-80"></div>
              </div>
            </div>
          </div>

          {/* Main Balance Card */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 mb-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>

            <div className="relative z-10 flex justify-between items-end">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">Current Balance</p>
                <h2 className="text-4xl font-bold text-white">
                  ₹{walletBalance.toLocaleString('en-IN')}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <MdAccountBalanceWallet className="w-4 h-4" /> Withdraw
                </button>
                <button
                  onClick={() => setShowAddMoney(true)}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-1"
                >
                  <span className="text-lg leading-none">+</span> Add Money
                </button>
              </div>
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-xs font-medium">Total Spent</p>
              <p className="text-lg font-bold text-gray-900">
                ₹{(
                  txSummary.totalSpent !== undefined
                    ? txSummary.totalSpent
                    : (
                      transactions
                        .filter(t => ['payment', 'withdrawal', 'platform_fee', 'convenience_fee', 'gst', 'worker_payment', 'cash_collected'].includes(t.type))
                        .reduce((sum, t) => sum + t.amount, 0) -
                      transactions
                        .filter(t => ['refund', 'cashback'].includes(t.type))
                        .reduce((sum, t) => sum + t.amount, 0)
                    )
                ).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-gray-500 text-xs font-medium">Total Penalty</p>
              <p className="text-lg font-bold text-orange-600">
                ₹{(
                  txSummary.totalPenalty !== undefined
                    ? txSummary.totalPenalty
                    : transactions
                      .filter(t => ['penalty', 'fine', 'cancellation_fee', 'debit'].includes(t.type))
                      .reduce((sum, t) => sum + t.amount, 0)
                ).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Recent Transactions List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-black">Recent Transactions</h3>
              {txPagination.total > 0 && (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  {txPagination.total} {txPagination.total === 1 ? 'transaction' : 'transactions'}
                </span>
              )}
            </div>

            <div className={`space-y-3 transition-opacity ${txLoading ? 'opacity-50' : 'opacity-100'}`}>
              {loading ? (
                <div className="text-center py-20">
                  <LogoLoader fullScreen={false} />
                  <p className="text-sm text-gray-500 mt-4">Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">No wallet activity yet</p>
                </div>
              ) : (
                transactions.map((item, index) => {
                  const date = new Date(item.date);
                  const formattedDate = date.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  // Determine styles based on transaction type
                  let typeStyle = { color: 'text-gray-600', bg: 'bg-gray-100', icon: '?', sign: '' };

                  if (['credit', 'refund', 'topup', 'referral', 'cashback', 'cash_collected'].includes(item.type)) {
                    typeStyle = { color: 'text-green-600', bg: 'bg-green-50', icon: '↓', sign: '' };
                  } else if (['payment', 'withdrawal'].includes(item.type)) {
                    typeStyle = { color: 'text-red-600', bg: 'bg-red-50', icon: '↑', sign: '-' };
                  } else if (['penalty', 'fine', 'cancellation_fee', 'debit'].includes(item.type)) {
                    typeStyle = { color: 'text-orange-600', bg: 'bg-orange-50', icon: '!', sign: '-' };
                  }

                  return (
                    <div
                      key={item.id || index}
                      className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${typeStyle.bg}`}
                        >
                          <span className={`text-lg font-bold ${typeStyle.color}`}>
                            {item.type === 'penalty' ? '!' : typeStyle.sign}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                            {item.description || item.title || 'Transaction'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-500">{formattedDate}</p>
                            {item.type && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${typeStyle.bg} ${typeStyle.color}`}>
                                {item.type}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-bold ${typeStyle.color}`}
                        >
                          {typeStyle.sign}₹{item.amount.toLocaleString('en-IN')}
                        </p>
                        {item.balanceAfter !== undefined && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Bal: ₹{item.balanceAfter.toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Transactions Pagination Controls */}
            {!loading && txPagination.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs text-gray-500 mt-3">
                <div className="flex items-center gap-2">
                  <span>
                    Showing <span className="font-bold text-gray-900">{(txPagination.page - 1) * txPagination.limit + 1}</span> - <span className="font-bold text-gray-900">{Math.min(txPagination.page * txPagination.limit, txPagination.total)}</span> of <span className="font-bold text-gray-900">{txPagination.total}</span>
                  </span>
                  {txLoading && <FiLoader className="w-3.5 h-3.5 animate-spin text-teal-600" />}
                </div>

                {txPagination.pages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => loadTransactions(txPagination.page - 1, txLimit)}
                      disabled={txPagination.page <= 1 || txLoading}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-sm active:scale-95"
                    >
                      <FiChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {[...Array(txPagination.pages)].map((_, i) => {
                        const p = i + 1;
                        if (txPagination.pages > 6 && Math.abs(p - txPagination.page) > 2 && p !== 1 && p !== txPagination.pages) {
                          if (Math.abs(p - txPagination.page) === 3) {
                            return <span key={p} className="px-1 text-gray-400">...</span>;
                          }
                          return null;
                        }
                        const isActive = p === txPagination.page;
                        return (
                          <button
                            key={p}
                            onClick={() => loadTransactions(p, txLimit)}
                            disabled={txLoading}
                            className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all ${isActive
                                ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => loadTransactions(txPagination.page + 1, txLimit)}
                      disabled={txPagination.page >= txPagination.pages || txLoading}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-sm active:scale-95"
                    >
                      <span>Next</span>
                      <FiChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Withdrawal History Section */}
          <div className="mt-8">
            <WithdrawalHistoryList refreshTrigger={historyRefreshKey} />
          </div>
        </main>
      </div>

      {/* Withdrawal Modal */}
      <WithdrawalModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onSuccess={() => {
          loadWalletData(false);
          setHistoryRefreshKey(k => k + 1);
        }}
        role="farmer"
      />

      {/* Add Money Modal */}
      {showAddMoney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isProcessing && setShowAddMoney(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-black">Add Money</h3>
              <button onClick={() => setShowAddMoney(false)} disabled={isProcessing} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMoney}>
              <div className="mb-6">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Amount (₹)</label>
                <input
                  type="number"
                  value={amountToAdd}
                  onChange={(e) => setAmountToAdd(e.target.value)}
                  placeholder="Enter amount (Min ₹100)"
                  min="100"
                  required
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xl font-black outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[100, 500, 1000].map(amt => (
                  <button
                    key={amt} type="button"
                    onClick={() => setAmountToAdd(amt.toString())}
                    className="py-2.5 rounded-xl border-2 border-gray-100 text-sm font-bold text-gray-600 hover:border-teal-500 hover:text-teal-600 transition-colors">
                    +₹{amt}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={isProcessing || !amountToAdd || Number(amountToAdd) < 100}
                className="w-full bg-teal-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-teal-600/20 disabled:opacity-50 active:scale-95 transition-all">
                {isProcessing ? 'Processing...' : 'Proceed to Pay'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
