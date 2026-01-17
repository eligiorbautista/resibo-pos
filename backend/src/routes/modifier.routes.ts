import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest';
import * as modifierController from '../controllers/modifier.controller';

const router = express.Router();

// Get modifier groups by product ID
router.get('/product/:productId', authenticate, modifierController.getModifierGroupsByProduct);

// Create modifier group (requires manager role)
router.post(
  '/group',
  authenticate,
  authorize('MANAGER'),
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('required').optional().isBoolean().withMessage('Required must be a boolean'),
    body('maxSelections').optional().isInt({ min: 1 }).withMessage('Max selections must be a positive integer'),
    body('modifiers').optional().isArray().withMessage('Modifiers must be an array'),
    body('modifiers.*.name').optional().notEmpty().withMessage('Modifier name cannot be empty'),
    body('modifiers.*.price').optional().isFloat({ min: 0 }).withMessage('Modifier price must be a positive number'),
    body('modifiers.*.category').optional().isString().withMessage('Modifier category must be a string'),
  ],
  validateRequest,
  modifierController.createModifierGroup
);

// Update modifier group (requires manager role)
router.put(
  '/group/:id',
  authenticate,
  authorize('MANAGER'),
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('required').optional().isBoolean().withMessage('Required must be a boolean'),
    body('maxSelections').optional().isInt({ min: 1 }).withMessage('Max selections must be a positive integer'),
  ],
  validateRequest,
  modifierController.updateModifierGroup
);

// Delete modifier group (requires manager role)
router.delete('/group/:id', authenticate, authorize('MANAGER'), modifierController.deleteModifierGroup);

// Create modifier (requires manager role)
router.post(
  '/',
  authenticate,
  authorize('MANAGER'),
  [
    body('modifierGroupId').notEmpty().withMessage('Modifier group ID is required'),
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category').optional().isString().withMessage('Category must be a string'),
  ],
  validateRequest,
  modifierController.createModifier
);

// Update modifier (requires manager role)
router.put(
  '/:id',
  authenticate,
  authorize('MANAGER'),
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category').optional().isString().withMessage('Category must be a string'),
  ],
  validateRequest,
  modifierController.updateModifier
);

// Delete modifier (requires manager role)
router.delete('/:id', authenticate, authorize('MANAGER'), modifierController.deleteModifier);

export default router;

