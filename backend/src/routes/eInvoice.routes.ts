import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as eInvoiceController from '../controllers/eInvoice.controller';

const router = express.Router();

// All E-Invoice routes require authentication and manager role
router.use(authenticate);
router.use(authorize('MANAGER'));

// Get pending E-Invoices
router.get('/pending', eInvoiceController.getPendingEInvoices);

// Get E-Invoice statistics
router.get('/stats', eInvoiceController.getEInvoiceStats);

// Get E-Invoice by transaction ID
router.get('/transaction/:transactionId', eInvoiceController.getEInvoiceByTransaction);

// Mark E-Invoice as sent
router.post('/:transactionId/sent', eInvoiceController.markEInvoiceAsSent);

// Mark E-Invoice as failed
router.post('/:transactionId/failed', eInvoiceController.markEInvoiceAsFailed);

export default router;

