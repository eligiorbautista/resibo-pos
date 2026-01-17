import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest';
import * as shiftScheduleController from '../controllers/shiftSchedule.controller';

const router = express.Router();

// Get all shift schedules (requires authentication)
router.get('/', authenticate, shiftScheduleController.getAllShiftSchedules);

// Get shift schedules by employee ID (requires authentication)
router.get('/employee/:employeeId', authenticate, shiftScheduleController.getShiftSchedulesByEmployee);

// Create shift schedule(s) (requires manager role)
router.post(
  '/',
  authenticate,
  authorize('MANAGER'),
  [
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('startTime').notEmpty().withMessage('Start time is required'),
    body('endTime').notEmpty().withMessage('End time is required'),
    body('daysOfWeek').isArray().withMessage('Days of week must be an array'),
    body('daysOfWeek.*').isInt({ min: 0, max: 6 }).withMessage('Day of week must be between 0 and 6'),
    body('isRecurring').optional().isBoolean().withMessage('isRecurring must be a boolean'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  ],
  validateRequest,
  shiftScheduleController.createShiftSchedule
);

// Update shift schedule (requires manager role)
router.put(
  '/:id',
  authenticate,
  authorize('MANAGER'),
  [
    body('startTime').optional().notEmpty().withMessage('Start time cannot be empty'),
    body('endTime').optional().notEmpty().withMessage('End time cannot be empty'),
    body('dayOfWeek').optional().isInt({ min: 0, max: 6 }).withMessage('Day of week must be between 0 and 6'),
    body('isRecurring').optional().isBoolean().withMessage('isRecurring must be a boolean'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  ],
  validateRequest,
  shiftScheduleController.updateShiftSchedule
);

// Delete shift schedule (requires manager role)
router.delete('/:id', authenticate, authorize('MANAGER'), shiftScheduleController.deleteShiftSchedule);

export default router;

