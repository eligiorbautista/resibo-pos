import express from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest';
import * as paymentController from '../controllers/payment.controller';

const router = express.Router();

// Create PayMongo payment intent (redirect-based, requires auth)
router.post(
  '/paymongo/redirect',
  authenticate,
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('method').isIn(['GCASH', 'PAYMAYA']).withMessage('Invalid payment method'),
    body('description').optional().isString(),
  ],
  validateRequest,
  paymentController.createPaymongoRedirectIntent
);

// Poll PayMongo intent status (requires auth)
router.get(
  '/paymongo/redirect/:intentId',
  authenticate,
  [param('intentId').isString().withMessage('Intent ID must be a string')],
  validateRequest,
  paymentController.getPaymongoIntentStatus
);

export default router;


