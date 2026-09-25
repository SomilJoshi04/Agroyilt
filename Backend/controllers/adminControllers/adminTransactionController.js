'use strict';

const financialAnalyticsService = require('../../services/financialAnalyticsService');

/**
 * Get financial analytics statistics for dashboard cards
 * Single source of truth for Recognized Revenue, Refunds, Net Revenue, Platform Fees & Commissions
 */
const getTransactionStats = async (req, res) => {
  try {
    const { timeFilter, timeRange, startDate, endDate, role, entity, status } = req.query;

    const result = await financialAnalyticsService.getFinancialOverview({
      timeFilter: timeFilter || timeRange || 'all',
      startDate,
      endDate,
      role: role || entity || 'all',
      status: status || 'all'
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[adminTransactionController.getTransactionStats] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch financial analytics'
    });
  }
};

/**
 * Get all transactions with pagination, filtering & normalized financial classification
 */
const getAllTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      timeFilter,
      timeRange,
      startDate,
      endDate,
      role,
      entity,
      status,
      category,
      type
    } = req.query;

    const result = await financialAnalyticsService.getFinancialTransactions({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      timeFilter: timeFilter || timeRange || 'all',
      startDate,
      endDate,
      role: role || entity || 'all',
      status: status || 'all',
      category: category || 'all',
      type: type || 'all'
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[adminTransactionController.getAllTransactions] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
};

/**
 * Backend Financial Health Check & Reconciliation Report
 */
const getReconciliationReport = async (req, res) => {
  try {
    const result = await financialAnalyticsService.reconcileFinancials();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[adminTransactionController.getReconciliationReport] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to run financial reconciliation check'
    });
  }
};

/**
 * Export Financial Transactions to CSV based on active backend filters
 */
const exportTransactionsCSV = async (req, res) => {
  try {
    const {
      search = '',
      timeFilter,
      timeRange,
      startDate,
      endDate,
      role,
      entity,
      status,
      category,
      type
    } = req.query;

    const result = await financialAnalyticsService.getFinancialTransactions({
      page: 1,
      limit: 5000,
      search,
      timeFilter: timeFilter || timeRange || 'all',
      startDate,
      endDate,
      role: role || entity || 'all',
      status: status || 'all',
      category: category || 'all',
      type: type || 'all'
    });

    const txs = result.data || [];

    // Construct CSV Header
    const headers = [
      'Transaction ID',
      'Date & Time (UTC)',
      'Party Name',
      'Party Role',
      'Contact',
      'Raw Type',
      'Financial Category',
      'Amount (INR)',
      'Platform Revenue Impact (INR)',
      'Payment Method',
      'Status',
      'Reference ID',
      'Booking Number',
      'Description'
    ];

    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = txs.map(t => {
      const party = t.userId?.name || t.vendorId?.name || t.workerId?.name || 'Platform/System';
      const contact = t.userId?.phone || t.vendorId?.phone || t.workerId?.phone || '';
      const bookingNo = t.bookingId?.bookingNumber || '';
      const dateStr = t.createdAt ? new Date(t.createdAt).toISOString() : '';

      return [
        escapeCSV(t._id),
        escapeCSV(dateStr),
        escapeCSV(party),
        escapeCSV(t.financialRole || 'system'),
        escapeCSV(contact),
        escapeCSV(t.type),
        escapeCSV(t.financialCategory),
        t.amount || 0,
        t.revenueImpact || 0,
        escapeCSV(t.paymentMethod || 'wallet'),
        escapeCSV(t.status || 'completed'),
        escapeCSV(t.referenceId || ''),
        escapeCSV(bookingNo),
        escapeCSV(t.description || '')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="agroyilt_financial_audit_${Date.now()}.csv"`);
    return res.status(200).send(csvContent);

  } catch (error) {
    console.error('[adminTransactionController.exportTransactionsCSV] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export financial transactions'
    });
  }
};

module.exports = {
  getTransactionStats,
  getAllTransactions,
  getReconciliationReport,
  exportTransactionsCSV
};
