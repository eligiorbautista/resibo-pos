import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest';
import * as variantController from '../controllers/variant.controller';

const router = express.Router();

// Get variants by product ID (requires authentication)
router.get('/product/:productId', authenticate, variantController.getVariantsByProduct);

// Create variant (requires manager role)
router.post(
  '/',
  authenticate,
  authorize('MANAGER'),
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('sku').optional().isString().withMessage('SKU must be a string'),
  ],
  validateRequest,
  variantController.createVariant
);

// Update variant (requires manager role)
router.put(
  '/:id',
  authenticate,
  authorize('MANAGER'),
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('sku').optional().isString().withMessage('SKU must be a string'),
  ],
  validateRequest,
  variantController.updateVariant
);

// Delete variant (requires manager role)
router.delete('/:id', authenticate, authorize('MANAGER'), variantController.deleteVariant);

export default router;

