import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiStar } from 'react-icons/fi';
import { getPlans } from '../../services/planService';
import { userAuthService } from '../../../../services/authService';
import { toastManager } from '../../../../utils/toastManager';

const MyPlan = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to determine card styling based on plan name
  const getCardStyle = (name) => {
    const lower = name.toLowerCase();

    if (lower.includes('platinum')) {
      return {
        container: 'bg-slate-900 text-white border-slate-700 ring-1 ring-slate-700',
        button: 'bg-white text-slate-900 hover:bg-slate-100',
        icon: 'text-slate-900 bg-white'
      };
    }
    if (lower.includes('diamond')) {
      return {
        container: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white border-transparent shadow-xl ring-0',
        button: 'bg-white text-indigo-600 hover:bg-gray-50',
        icon: 'text-indigo-600 bg-white'
      }
    }
    if (lower.includes('gold')) {
      return {
        container: 'bg-gradient-to-br from-amber-100 to-yellow-100 border-amber-200 text-amber-900',
        button: 'bg-amber-600 text-white hover:bg-amber-700',
        icon: 'text-amber-100 bg-amber-600'
      };
    }
    if (lower.includes('silver')) {
      return {
        container: 'bg-gradient-to-br from-gray-100 to-slate-200 border-gray-300 text-gray-800',
        button: 'bg-gray-800 text-white hover:bg-gray-900',
        icon: 'text-gray-700 bg-white/60'
      };
    }

    // Default
    return {
      container: 'bg-white border-gray-100 text-gray-800',
      button: 'bg-primary-600 text-white hover:bg-primary-700',
      icon: 'text-white bg-primary-400'
    };
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansRes, userRes] = await Promise.all([
        getPlans(),
        userAuthService.getProfile()
      ]);

      if (plansRes.success) setPlans(plansRes.data);
      if (userRes.success) setUser(userRes.user);

    } catch (error) {
      console.error(error);
      toastManager.error('Could not load data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Subscription Plans</h1>
        </div>
      </header>

      <main className="px-4 py-8 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Choose the Right Plan for You</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">Unlock exclusive services and premium features by subscribing to one of our plans.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const style = getCardStyle(plan.name);
              const isBestValue = plan.name.toLowerCase().includes('gold') || plan.name.toLowerCase().includes('diamond');

              const currentPlan = user?.plans;
              const hasActivePlan = currentPlan?.isActive;
              const isCurrent = hasActivePlan && currentPlan?.name === plan.name;

              // Upgrade logic: if user has plan, check price
              // If user has NO active plan, everything is selectable (Upgrade false)
              const userPlanPrice = currentPlan?.price || 0;
              const isUpgrade = hasActivePlan && plan.price > userPlanPrice;

              // Disable logic: 
              // 1. Current Plan -> Disabled
              // 2. Lower Plan -> Disabled (User said "only upgrade")
              // 3. Same Price Plan (if different name) -> Disabled? Assume yes.
              const isDowngradeOrSame = hasActivePlan && plan.price <= userPlanPrice && !isCurrent;

              const isDisabled = isCurrent || isDowngradeOrSame;

              let buttonText = `Select ${plan.name}`;
              if (isCurrent) buttonText = 'Current Plan';
              if (isUpgrade) buttonText = 'Upgrade';

              return (
                <div
                  key={plan._id}
                  onClick={() => navigate(`/user/my-plan/${plan._id}`)}
                  className={`relative cursor-pointer rounded-3xl p-6 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl border flex flex-col h-full ${style.container} ${isDisabled && !isCurrent ? 'opacity-80 grayscale-[0.5]' : ''}`}
                >
                  {/* Popular Badge */}
                  {isBestValue && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                      POPULAR CHOICE
                    </div>
                  )}

                  <div className="mb-6 mt-2 text-center">
                    <h3 className="text-lg font-bold uppercase tracking-widest opacity-90 mb-2">{plan.name}</h3>
                    <div className="flex items-center justify-center">
                      <span className="text-sm font-semibold mr-1 opacity-70">₹</span>
                      <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="w-full h-px bg-current opacity-10 mb-6"></div>
                    <ul className="space-y-4 mb-8">
                      {(plan.highlights || plan.services || []).slice(0, 4).map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${style.icon}`}>
                            <FiCheck className="w-3.5 h-3.5" />
                          </div>
                          <p className="ml-3 text-sm font-medium opacity-90 line-clamp-1">{feature}</p>
                        </li>
                      ))}
                      {(plan.highlights || plan.services || []).length > 4 && (
                        <li className="text-xs opacity-60 font-bold ml-8">+ {(plan.highlights || plan.services || []).length - 4} more benefits</li>
                      )}
                      {(plan.highlights || plan.services || []).length === 0 && (
                        <li className="flex items-center justify-center text-sm opacity-60 italic">
                          Standard benefits included
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="mt-auto">
                    <button
                      className={`w-full py-3.5 px-4 rounded-xl font-bold shadow-md transition-all active:scale-95 ${style.button} ${isDisabled && !isCurrent ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      {isCurrent ? 'View Details' : buttonText}
                    </button>
                  </div>
                </div>
              )
            })}
            {plans.length === 0 && (
              <div className="col-span-full text-center py-20 text-gray-500 bg-white rounded-2xl border border-dashed">
                <FiStar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p>No subscription plans are currently available.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyPlan;
