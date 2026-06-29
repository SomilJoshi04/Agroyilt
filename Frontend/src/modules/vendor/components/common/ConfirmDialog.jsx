import React from 'react';
import { createPortal } from 'react-dom';
import { FiAlertCircle, FiX, FiCheck, FiInfo } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { vendorTheme as themeColors } from '../../../../theme';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'warning', // warning, danger, info, success
}) => {
  const typeConfig = {
    warning: {
      icon: <FiAlertCircle className="w-8 h-8" />,
      color: '#F59E0B',
      bg: '#FEF3C7',
    },
    danger: {
      icon: <FiAlertCircle className="w-8 h-8" />,
      color: '#EF4444',
      bg: '#FEE2E2',
    },
    info: {
      icon: <FiInfo className="w-8 h-8" />,
      color: themeColors.button,
      bg: `${themeColors.button}15`,
    },
    success: {
      icon: <FiCheck className="w-8 h-8" />,
      color: '#10B981',
      bg: '#D1FAE5',
    },
  };

  const config = typeConfig[type] || typeConfig.warning;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 bg-black/50 backdrop-blur-sm" style={{ minHeight: '100dvh' }}>
          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 sm:p-8 relative z-10 flex flex-col items-center text-center overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-5 h-5" />
            </button>

            {/* Icon Container */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: config.bg || '#FEF3C7',
                color: config.color || '#F59E0B',
                boxShadow: `0 8px 16px ${(config.color || '#F59E0B')}20`
              }}
            >
              {config.icon || <FiAlertCircle className="w-8 h-8" />}
            </div>

            {/* Content */}
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 font-medium mb-6">
              {message}
            </p>

            {/* Actions */}
            <div className="w-full flex flex-col gap-3 mt-auto">
              <button
                onClick={handleConfirm}
                className="w-full py-3.5 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95"
                style={{
                  background: type === 'danger' ? '#EF4444' : themeColors.button,
                  boxShadow: `0 8px 16px ${type === 'danger' ? '#EF444440' : themeColors.button + '40'}`
                }}
              >
                {confirmLabel}
              </button>

              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all active:scale-95"
              >
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default ConfirmDialog;

