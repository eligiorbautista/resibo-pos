import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest';
import * as transactionController from '../controllers/transaction.controller';

const router = express.Router();

// Get all transactions (requires authentication)
router.get('/', authenticate, transactionController.getAllTransactions);

// Get transaction by ID (requires authentication)
router.get('/:id', authenticate, transactionController.getTransactionById);

// Create transaction (requires authentication)
router.post(
  '/',
  authenticate,
  [
    body('employeeId').optional().isString().withMessage('Employee ID must be a string'),
    body('customerId').optional().isString().withMessage('Customer ID must be a string'),
    body('serverId').optional().isString().withMessage('Server ID must be a string'),
    body('tableId').optional().isString().withMessage('Table ID must be a string'),
    body('orderType').optional().isIn(['DINE_IN', 'TAKEOUT', 'DELIVERY']).withMessage('Invalid order type'),
    body('status').optional().isIn(['PENDING', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'VOIDED']).withMessage('Invalid status'),
    body('items').isArray().withMessage('Items must be an array'),
    body('items.*.name').notEmpty().withMessage('Item name is required'),
    body('items.*.price').isFloat({ min: 0 }).withMessage('Item price must be a positive number'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be a positive integer'),
    body('subtotal').isFloat({ min: 0 }).withMessage('Subtotal must be a positive number'),
    body('tax').optional().isFloat({ min: 0 }).withMessage('Tax must be a positive number'),
    body('serviceCharge').optional().isFloat({ min: 0 }).withMessage('Service charge must be a positive number'),
    body('discountTotal').optional().isFloat({ min: 0 }).withMessage('Discount total must be a positive number'),
    body('discountType').optional().isIn(['NONE', 'PWD', 'SENIOR_CITIZEN']).withMessage('Invalid discount type'),
    body('tip').optional().isFloat({ min: 0 }).withMessage('Tip must be a positive number'),
    body('payments').isArray().withMessage('Payments must be an array'),
    body('payments.*.method').isIn(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'GCASH', 'PAYMAYA']).withMessage('Invalid payment method'),
    body('payments.*.amount').isFloat({ min: 0 }).withMessage('Payment amount must be a positive number'),
  ],
  validateRequest,
  transactionController.createTransaction
);

// Update transaction (requires authentication)
router.put(
  '/:id',
  authenticate,
  [
    body('status').optional().isIn(['PENDING', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'VOIDED']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
    body('kitchenNotes').optional().isString().withMessage('Kitchen notes must be a string'),
    body('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
    body('estimatedPrepTime').optional().isInt({ min: 0 }).withMessage('Estimated prep time must be a non-negative integer'),
  ],
  validateRequest,
  transactionController.updateTransaction
);

// Void transaction (requires authentication)
router.post(
  '/:id/void',
  authenticate,
  [
    body('note').optional().isString().withMessage('Note must be a string'),
  ],
  validateRequest,
  transactionController.voidTransaction
);

// Refund transaction (requires authentication)
router.post(
  '/:id/refund',
  authenticate,
  [
    body('reason').notEmpty().withMessage('Refund reason is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Refund amount must be a positive number'),
    body('method').isIn(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'GCASH', 'PAYMAYA']).withMessage('Invalid refund method'),
    body('items').optional().isArray().withMessage('Items must be an array'),
  ],
  validateRequest,
  transactionController.refundTransaction
);

export default router;

