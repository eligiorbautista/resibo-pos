import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest';
import * as tableController from '../controllers/table.controller';

const router = express.Router();

// Get all tables (requires authentication)
router.get('/', authenticate, tableController.getAllTables);

// Get table by ID (requires authentication)
router.get('/:id', authenticate, tableController.getTableById);

// Create table (requires authentication)
router.post(
  '/',
  authenticate,
  [
    body('number').notEmpty().withMessage('Table number is required'),
    body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
    body('status').optional({ checkFalsy: true }).isIn(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'NEEDS_CLEANING']).withMessage('Invalid table status'),
    body('location').optional({ checkFalsy: true }).isString().withMessage('Location must be a string'),
  ],
  validateRequest,
  tableController.createTable
);

// Update table (requires authentication)
router.put(
  '/:id',
  authenticate,
  [
    body('number').optional({ checkFalsy: true }).notEmpty().withMessage('Table number cannot be empty'),
    body('capacity').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
    body('status').optional({ checkFalsy: true }).isIn(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'NEEDS_CLEANING']).withMessage('Invalid table status'),
    body('location').optional({ checkFalsy: true }).isString().withMessage('Location must be a string'),
    body('currentOrderId').optional({ checkFalsy: true }).isString().withMessage('Current order ID must be a string'),
    body('reservationName').optional({ checkFalsy: true }).isString().withMessage('Reservation name must be a string'),
  ],
  validateRequest,
  tableController.updateTable
);

// Delete table (requires authentication)
router.delete(
  '/:id',
  authenticate,
  tableController.deleteTable
);

export default router;

