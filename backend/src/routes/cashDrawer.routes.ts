import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as cashDrawerController from '../controllers/cashDrawer.controller';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';

const router = express.Router();

// Get all cash drawers
router.get('/', authenticate, cashDrawerController.getAllCashDrawers);

// Get active cash drawer
router.get('/active', authenticate, cashDrawerController.getActiveCashDrawer);

// Open cash drawer
router.post(
  '/open',
  authenticate,
  [
    body('openingAmount')
      .isFloat({ min: 0 })
      .withMessage('Opening amount must be a positive number'),
  ],
  validateRequest,
  cashDrawerController.openCashDrawer
);

// Close cash drawer
router.post(
  '/:id/close',
  authenticate,
  [
    body('closingAmount')
      .isFloat({ min: 0 })
      .withMessage('Closing amount must be a positive number'),
    body('expectedAmount')
      .optional()
      .isFloat()
      .withMessage('Expected amount must be a number'),
    body('denominationBreakdown')
      .optional()
      .isObject()
      .withMessage('Denomination breakdown must be an object'),
  ],
  validateRequest,
  cashDrawerController.closeCashDrawer
);

// Add cash drop
router.post(
  '/cash-drop',
  authenticate,
  [
    body('drawerId').notEmpty().withMessage('Drawer ID is required'),
    body('amount')
      .isFloat({ min: 0 })
      .withMessage('Amount must be a positive number'),
    body('reason').notEmpty().withMessage('Reason is required'),
  ],
  validateRequest,
  cashDrawerController.addCashDrop
);

// Add cash pickup
router.post(
  '/cash-pickup',
  authenticate,
  [
    body('drawerId').notEmpty().withMessage('Drawer ID is required'),
    body('amount')
      .isFloat({ min: 0 })
      .withMessage('Amount must be a positive number'),
    body('reason').notEmpty().withMessage('Reason is required'),
  ],
  validateRequest,
  cashDrawerController.addCashPickup
);

// Add shift note
router.post(
  '/shift-note',
  authenticate,
  [
    body('drawerId').notEmpty().withMessage('Drawer ID is required'),
    body('note').notEmpty().withMessage('Note is required'),
  ],
  validateRequest,
  cashDrawerController.addShiftNote
);

// Add transaction to drawer
router.post(
  '/add-transaction',
  authenticate,
  [
    body('drawerId').notEmpty().withMessage('Drawer ID is required'),
    body('transactionId').notEmpty().withMessage('Transaction ID is required'),
  ],
  validateRequest,
  cashDrawerController.addTransactionToDrawer
);

export default router;

