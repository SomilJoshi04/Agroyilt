const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isAdmin, isSuperAdmin } = require('../../middleware/roleMiddleware');
const {
  generateMonthlyPayroll,
  getPayrolls,
  getPayrollById,
  updatePayrollStatus,
  addPayrollAdjustment,
  recordPayment,
  reversePayment,
  getMyPayrollHistory,
  getPaymentProof,
  exportPayrollReconciliation,
  getAdminSalaryList
} = require('../../controllers/adminControllers/adminPayrollController');

// All payroll routes require authenticated Admin session
router.use(authenticate, isAdmin);

// ── Field Admin / Self-service routes (Must come before /:id wildcard) ───────
router.get('/my-history', getMyPayrollHistory);

// ── Super Admin Management routes ──────────────────────────────────────────
router.get('/admin-salary-list', isSuperAdmin, getAdminSalaryList);  // NEW: simplified list
router.get('/export/csv', isSuperAdmin, exportPayrollReconciliation);
router.post('/generate', isSuperAdmin, generateMonthlyPayroll);
router.get('/', isSuperAdmin, getPayrolls);

// ── Specific Payroll actions ────────────────────────────────────────────────
router.get('/:id', getPayrollById);
router.patch('/:id/status', isSuperAdmin, updatePayrollStatus);
router.post('/:id/adjustment', isSuperAdmin, addPayrollAdjustment);
router.post('/:id/payment', isSuperAdmin, recordPayment);
router.post('/:id/reverse-payment', isSuperAdmin, reversePayment);
router.get('/:id/proof/:paymentId', getPaymentProof);

module.exports = router;

