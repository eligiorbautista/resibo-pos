import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as auditLogController from '../controllers/auditLog.controller';

const router = express.Router();

// All audit log routes require authentication and manager role
router.use(authenticate);
router.use(authorize('MANAGER'));

// Get all audit logs
router.get('/', auditLogController.getAllAuditLogs);

// Get audit log by ID
router.get('/:id', auditLogController.getAuditLogById);

// Get audit logs for a specific entity
router.get('/entity/:entityType/:entityId', auditLogController.getAuditLogsByEntity);

export default router;

