import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/auth.middleware';
import * as authController from '../controllers/auth.controller';

const router = express.Router();

// Login with PIN (no auth required)
router.post(
  '/login',
  [
    body('pin').notEmpty().withMessage('PIN is required'),
  ],
  validateRequest,
  authController.login
);

// Get current user (requires auth)
router.get('/me', authenticate, authController.getCurrentUser);

// Refresh token (no auth required)
router.post('/refresh', authController.refreshToken);

// Logout (requires auth)
router.post('/logout', authenticate, authController.logout);

export default router;

