import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest';
import * as productController from '../controllers/product.controller';

const router = express.Router();

// Get all products (requires authentication)
router.get('/', authenticate, productController.getAllProducts);

// Get product by ID (requires authentication)
router.get('/:id', authenticate, productController.getProductById);

// Create product (requires manager role)
router.post(
  '/',
  authenticate,
  authorize('MANAGER'),
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('category').notEmpty().trim().withMessage('Category is required'),
    body('basePrice').isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
    body('costPrice').isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('imageUrl').optional().isString().withMessage('Image URL must be a string'),
    body('reorderPoint').optional().isInt({ min: 0 }).withMessage('Reorder point must be a non-negative integer'),
    body('totalStock').optional().isInt({ min: 0 }).withMessage('Total stock must be a non-negative integer'),
  ],
  validateRequest,
  productController.createProduct
);

// Update product (requires manager role)
router.put(
  '/:id',
  authenticate,
  authorize('MANAGER'),
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
    body('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
    body('costPrice').optional().isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('imageUrl').optional().isString().withMessage('Image URL must be a string'),
    body('reorderPoint').optional().isInt({ min: 0 }).withMessage('Reorder point must be a non-negative integer'),
    body('totalStock').optional().isInt({ min: 0 }).withMessage('Total stock must be a non-negative integer'),
  ],
  validateRequest,
  productController.updateProduct
);

// Delete product (requires manager role)
router.delete('/:id', authenticate, authorize('MANAGER'), productController.deleteProduct);

export default router;

