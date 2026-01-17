import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validateRequest';
import * as employeeController from '../controllers/employee.controller';

const router = express.Router();

// Get all employees (requires authentication)
router.get('/', authenticate, employeeController.getAllEmployees);

// Get employee by ID (requires authentication)
router.get('/:id', authenticate, employeeController.getEmployeeById);

// Create employee (requires manager role)
router.post(
  '/',
  authenticate,
  authorize('MANAGER'),
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('role').isIn(['MANAGER', 'CASHIER', 'SERVER', 'KITCHEN']).withMessage('Invalid role'),
    body('pin').isLength({ min: 4, max: 4 }).matches(/^\d{4}$/).withMessage('PIN must be exactly 4 digits'),
    body('hourlyRate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
  ],
  validateRequest,
  employeeController.createEmployee
);

// Update employee (requires manager role)
router.put(
  '/:id',
  authenticate,
  authorize('MANAGER'),
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('role').optional().isIn(['MANAGER', 'CASHIER', 'SERVER', 'KITCHEN']).withMessage('Invalid role'),
    body('pin').optional().isLength({ min: 4, max: 4 }).matches(/^\d{4}$/).withMessage('PIN must be exactly 4 digits'),
    body('hourlyRate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
  ],
  validateRequest,
  employeeController.updateEmployee
);

// Delete employee (requires manager role)
router.delete('/:id', authenticate, authorize('MANAGER'), employeeController.deleteEmployee);

// Clock in (requires authentication)
router.post('/:id/clock-in', authenticate, employeeController.clockIn);

// Clock out (requires authentication)
router.post('/:id/clock-out', authenticate, employeeController.clockOut);

// Start break (requires authentication)
router.post(
  '/:id/breaks/start',
  authenticate,
  [
    body('type').isIn(['BREAK', 'LUNCH']).withMessage('Break type must be BREAK or LUNCH'),
  ],
  validateRequest,
  employeeController.startBreak
);

// End break (requires authentication)
router.post('/:id/breaks/end', authenticate, employeeController.endBreak);

// Get time records (requires authentication)
router.get('/:id/time-records', authenticate, employeeController.getTimeRecords);

// Mark salary as paid (requires manager role)
router.post(
  '/:id/payroll/pay',
  authenticate,
  authorize('MANAGER'),
  [
    body('periodStart').isISO8601().withMessage('Valid period start date is required (ISO8601)'),
    body('periodEnd').isISO8601().withMessage('Valid period end date is required (ISO8601)'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('hoursWorked').isFloat({ min: 0 }).withMessage('Hours worked must be a positive number'),
    body('regularPay').isFloat({ min: 0 }).withMessage('Regular pay must be a positive number'),
    body('overtimePay').isFloat({ min: 0 }).withMessage('Overtime pay must be a positive number'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ],
  validateRequest,
  employeeController.markSalaryAsPaid
);

// Get payroll payment history (requires authentication)
router.get('/:id/payroll/payments', authenticate, employeeController.getPayrollPayments);

export default router;

