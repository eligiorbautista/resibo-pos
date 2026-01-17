import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest';
import * as customerController from '../controllers/customer.controller';

const router = express.Router();

// Get all customers (requires authentication)
router.get('/', authenticate, customerController.getAllCustomers);

// Get customer by ID (requires authentication)
router.get('/:id', authenticate, customerController.getCustomerById);

// Create customer (requires authentication)
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('membershipCardNumber').optional({ checkFalsy: true }).isString().withMessage('Membership card number must be a string'),
    body('birthday').optional({ checkFalsy: true }).isISO8601().withMessage('Birthday must be a valid date'),
    body('tags').optional({ checkFalsy: true }).isArray().withMessage('Tags must be an array'),
    body('loyaltyPoints').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Loyalty points must be a non-negative integer'),
  ],
  validateRequest,
  customerController.createCustomer
);

// Update customer (requires authentication)
router.put(
  '/:id',
  authenticate,
  [
    body('name').optional({ checkFalsy: true }).notEmpty().withMessage('Name cannot be empty'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
    body('phone').optional({ checkFalsy: true }).notEmpty().withMessage('Phone cannot be empty'),
    body('membershipCardNumber').optional({ checkFalsy: true }).isString().withMessage('Membership card number must be a string'),
    body('birthday').optional({ checkFalsy: true }).isISO8601().withMessage('Birthday must be a valid date'),
    body('tags').optional({ checkFalsy: true }).isArray().withMessage('Tags must be an array'),
    body('loyaltyPoints').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Loyalty points must be a non-negative integer'),
  ],
  validateRequest,
  customerController.updateCustomer
);

// Delete customer (requires authentication)
router.delete('/:id', authenticate, customerController.deleteCustomer);

export default router;

