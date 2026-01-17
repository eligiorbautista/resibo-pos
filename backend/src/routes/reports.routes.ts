import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as reportsController from '../controllers/reports.controller';

const router = express.Router();

// All report routes require authentication
router.use(authenticate);

// Get system grand total (accessible to all authenticated users)
router.get('/grand-total', reportsController.getSystemGrandTotal);

// Z-Reading routes (manager only)
router.get('/z-reading', authorize('MANAGER'), reportsController.getAllZReadings);
router.get('/z-reading/:date', authorize('MANAGER'), reportsController.getZReadingByDate);
router.post('/z-reading/generate', authorize('MANAGER'), reportsController.generateZReading);

// eSales export (manager only)
router.get('/esales-export', authorize('MANAGER'), reportsController.exportESales);

export default router;

