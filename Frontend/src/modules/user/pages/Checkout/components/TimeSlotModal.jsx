import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiX, FiClock, FiPlus, FiMinus, FiCalendar } from 'react-icons/fi';
import { themeColors } from '../../../../../theme';

const TimeSlotModal = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  onDateSelect,
  onTimeSelect,
  onSave,
  onQuantityChange,
  getDates,
  getTimeSlots,
  formatDate,
  isDateSelected,
  isTimeSelected,
  rentalType,
  landUnit = 'acre',
  estimatedDuration = 1,
  landSize = 1,
  localDays: localDaysProp = 1,
  cropType = '',
  chemicalUsed = '',
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [localEndDate, setLocalEndDate] = useState(null);
  const [localHours, setLocalHours] = useState(estimatedDuration);
  const [localAcres, setLocalAcres] = useState(landSize);
  const [localDays, setLocalDays] = useState(localDaysProp);
  const [localCropType, setLocalCropType] = useState(cropType);
  const [localChemicalUsed, setLocalChemicalUsed] = useState(chemicalUsed);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalHours(estimatedDuration || 1);
      setLocalAcres(landSize || 1);
      setLocalDays(localDaysProp || 1);
      setLocalCropType(cropType || '');
      setLocalChemicalUsed(chemicalUsed || '');
    }
  }, [isOpen, estimatedDuration, landSize, localDaysProp, cropType, chemicalUsed]);

  // Sync and cap localHours if selectedTime changes
  useEffect(() => {
    if (selectedTime && rentalType === 'hourly') {
      const startHour = parseInt(selectedTime.split(':')[0], 10);
      const maxH = Math.max(1, 19 - startHour); // End of work limit at 7:00 PM (19:00)
      if (localHours > maxH) {
        setLocalHours(maxH);
        onQuantityChange?.({ estimatedDuration: maxH });
      }
    }
  }, [selectedTime, rentalType, localHours]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      setIsClosing(false);
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  if (!isOpen && !isClosing) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity ${isClosing ? 'opacity-0' : 'opacity-100'
          }`}
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* Modal */}
        <div
          className={`bg-white rounded-t-3xl ${isClosing ? 'animate-slide-down' : 'animate-slide-up'
            }`}
          style={{
            maxHeight: '90dvh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiArrowLeft className="w-5 h-5 text-black" />
                </button>
                <h1 className="text-xl font-bold text-black">Select Time Slot</h1>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiX className="w-5 h-5 text-black" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div
            className="px-4 py-4 overflow-y-auto flex-1"
            style={{
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain'
            }}
          >
            <h2 className="text-xl font-bold text-black mb-1">
              {rentalType === 'hourly'
                ? 'When should the equipment arrive?'
                : rentalType === 'land_based'
                ? 'Select start date for land work'
                : rentalType === 'daily'
                ? 'Select equipment start date'
                : 'When should the professional arrive?'}
            </h2>
            {rentalType === 'hourly' && <p className="text-sm text-gray-600 mb-4">Equipment will arrive at selected time</p>}

            {/* Date Selection */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              {getDates().map((date, index) => {
                const { day, date: dateNum } = formatDate(date);
                const isSelected = isDateSelected(date);
                return (
                  <button
                    key={index}
                    onClick={() => onDateSelect(date)}
                    className="shrink-0 px-4 py-3 rounded-lg border-2 transition-all"
                    style={isSelected ? {
                      backgroundColor: `${themeColors.brand.teal}1A`,
                      borderColor: themeColors.button,
                      color: themeColors.button
                    } : {
                      backgroundColor: 'white',
                      borderColor: '#e5e7eb',
                      color: '#374151'
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-medium mb-1">{day}</span>
                      <span className="text-base font-semibold">{dateNum}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Daily: Select Number of Days */}
            {rentalType === 'daily' && (
               <div className="mb-6">
                 <h3 className="text-base font-semibold text-black mb-3">Select number of days</h3>
                 <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                       <FiCalendar className="w-5 h-5" />
                     </div>
                     <div>
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Total Days</p>
                       <p className="text-sm font-extrabold text-gray-900">{localDays || 0} Days</p>
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-1.5 border border-gray-100">
                     <button 
                       onClick={() => { const n = Math.max(1, (Number(localDays)||0)-1); setLocalDays(n); onQuantityChange?.({ localDays: n }); }}
                       className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-600 active:scale-90 transition-transform"
                     >
                       <FiMinus className="w-4 h-4" />
                     </button>
                     <span className="text-base font-black text-gray-900 min-w-[20px] text-center">{localDays || 0}</span>
                     <button 
                       onClick={() => { const n = (Number(localDays)||0)+1; setLocalDays(n); onQuantityChange?.({ localDays: n }); }}
                       className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-600 active:scale-90 transition-transform"
                     >
                       <FiPlus className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               </div>
            )}

            {rentalType === 'hourly' && (
               <div className="mb-6">
                 <h3 className="text-base font-semibold text-black mb-3">Select duration</h3>
                 <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                       <FiClock className="w-5 h-5" />
                     </div>
                     <div>
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Estimated Hours</p>
                       <p className="text-sm font-extrabold text-gray-900">{localHours || 0} Hours</p>
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-1.5 border border-gray-100">
                     <button 
                       onClick={() => { const n = Math.max(1, (Number(localHours)||0)-1); setLocalHours(n); onQuantityChange?.({ estimatedDuration: n }); }}
                       className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-600 active:scale-90 transition-transform"
                     >
                       <FiMinus className="w-4 h-4" />
                     </button>
                     <span className="text-base font-black text-gray-900 min-w-[20px] text-center">{localHours || 0}</span>
                     <button 
                       onClick={() => { 
                         const maxH = selectedTime ? Math.max(1, 19 - parseInt(selectedTime.split(':')[0], 10)) : 12;
                         const n = Math.min(maxH, (Number(localHours)||0)+1); 
                         setLocalHours(n); 
                         onQuantityChange?.({ estimatedDuration: n }); 
                       }}
                       className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-600 active:scale-90 transition-transform"
                     >
                       <FiPlus className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               </div>
            )}

            {rentalType === 'land_based' && (
               <div className="mb-6 space-y-4">
                 <div>
                   <h3 className="text-base font-semibold text-black mb-3">Specify Land Area</h3>
                   <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                         <span className="text-xl">🗺️</span>
                       </div>
                       <div>
                         <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Area in {landUnit}s</p>
                         <p className="text-sm font-extrabold text-gray-900">{localAcres || 0} {landUnit}s</p>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-1.5 border border-gray-100">
                       <button 
                         onClick={() => { const n = Math.max(1, (Number(localAcres)||0)-1); setLocalAcres(n); onQuantityChange?.({ landSize: n }); }}
                         className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-600 active:scale-90 transition-transform"
                       >
                         <FiMinus className="w-4 h-4" />
                       </button>
                       <span className="text-base font-black text-gray-900 min-w-[20px] text-center">{localAcres || 0}</span>
                       <button 
                         onClick={() => { const n = (Number(localAcres)||0)+1; setLocalAcres(n); onQuantityChange?.({ landSize: n }); }}
                         className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-600 active:scale-90 transition-transform"
                       >
                         <FiPlus className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
            )}

            {/* Payment Information */}
            <div className="flex items-center gap-2 mb-4 px-2">
              <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0" style={{ borderColor: '#9ca3af' }}>
                <div className="w-2 h-2 rounded" style={{ backgroundColor: '#6b7280' }}></div>
              </div>
              <p className="text-xs text-gray-600">Online payment only for selected date</p>
            </div>

            {/* Time Selection — for Hourly, Land-Based, or Daily rental */}
            {(rentalType === 'hourly' || rentalType === 'land_based' || rentalType === 'daily') && (
            <div className="mb-4">
              <h3 className="text-base font-semibold text-black mb-3">Select equipment arrival time</h3>
              {getTimeSlots().length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-500 font-medium mb-1">No time slots available</p>
                  <p className="text-sm text-gray-400">Please select a different date</p>
                </div>
              ) : (
                <div
                  className="grid grid-cols-3 gap-2 pb-2"
                  style={{
                    maxHeight: '280px',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain'
                  }}
                >
                  {getTimeSlots().map((slot, index) => {
                    const isSelected = isTimeSelected(slot.value);
                    return (
                      <button
                        key={index}
                        onClick={() => onTimeSelect(slot.value)}
                        className="px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all"
                        style={isSelected ? {
                          backgroundColor: `${themeColors.brand.teal}1A`,
                          borderColor: themeColors.button,
                          color: themeColors.button
                        } : {
                          backgroundColor: 'white',
                          borderColor: '#e5e7eb',
                          color: '#374151'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.target.style.backgroundColor = '#f9fafb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.target.style.backgroundColor = 'white';
                          }
                        }}
                      >
                        {slot.display}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            )}

          </div>
          {/* Proceed Button - Fixed at bottom */}
          <div className="p-4 border-t border-gray-100 bg-white shrink-0">
            <button
              onClick={() => {
                let extraArgs = {
                  estimatedDuration: localHours,
                  landSize: localAcres ? `${localAcres} ${landUnit}s` : undefined,
                  localDays: localDays,
                  cropType: localCropType || undefined,
                  chemicalUsed: localChemicalUsed || undefined
                };

                // Auto-calculate endDate for Daily if needed
                if (rentalType === 'daily' && localDays && selectedDate) {
                  const end = new Date(selectedDate);
                  end.setDate(end.getDate() + (Number(localDays) - 1));
                  extraArgs.endDate = end;
                } else if (rentalType === 'monthly' && selectedDate) {
                  const end = new Date(selectedDate);
                  end.setMonth(end.getMonth() + 1);
                  extraArgs.endDate = end;
                }

                onSave(selectedDate, rentalType === 'monthly' ? '00:00' : selectedTime, extraArgs);
              }}
              disabled={
                !selectedDate ||
                (rentalType === 'daily' && (!selectedDate || !localDays || !selectedTime)) ||
                (rentalType === 'hourly' && (!selectedTime || !localHours)) ||
                (rentalType === 'land_based' && (!selectedDate || !localAcres || !selectedTime))
              }
              className="w-full py-3.5 rounded-lg text-base font-semibold transition-colors"
              style={(selectedDate && (
                (rentalType === 'daily' && localDays && selectedTime) ||
                (rentalType === 'hourly' && selectedTime && localHours) ||
                (rentalType === 'land_based' && localAcres && selectedTime)
              )) ? {
                backgroundColor: themeColors.button,
                color: 'white'
              } : {
                backgroundColor: '#e5e7eb',
                color: '#9ca3af',
                cursor: 'not-allowed'
              }}
              onMouseEnter={(e) => {
                const isValid = selectedDate && (
                  (rentalType === 'daily' && localDays && selectedTime) ||
                  (rentalType === 'hourly' && selectedTime && localHours) ||
                  (rentalType === 'land_based' && localAcres && selectedTime)
                );
                if (isValid) {
                  e.target.style.backgroundColor = themeColors.button;
                }
              }}
              onMouseLeave={(e) => {
                const isValid = selectedDate && (
                  (rentalType === 'daily' && localDays && selectedTime) ||
                  (rentalType === 'hourly' && selectedTime && localHours) ||
                  (rentalType === 'land_based' && localAcres && selectedTime)
                );
                if (isValid) {
                  e.target.style.backgroundColor = themeColors.button;
                }
              }}
            >
              Confirm Slot
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TimeSlotModal;

