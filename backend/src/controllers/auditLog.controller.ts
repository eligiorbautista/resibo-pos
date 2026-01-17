import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response.utils';

// Get all audit logs (manager only - read-only access)
export const getAllAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate, action, employeeId, entityType, page = '1', limit = '50' } = req.query;

    const where: any = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    
    if (action) where.action = action;
    if (employeeId) where.employeeId = employeeId;
    if (entityType) where.entityType = entityType;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const formattedLogs = logs.map(log => ({
      ...log,
      details: log.details || {},
    }));

    sendSuccess(res, {
      logs: formattedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get audit log by ID
export const getAuditLogById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!log) {
      return sendError(res, 'Audit log not found', 'AUDIT_LOG_NOT_FOUND', 404);
    }

    sendSuccess(res, {
      ...log,
      details: log.details || {},
    });
  } catch (error) {
    next(error);
  }
};

// Get audit logs for a specific entity
export const getAuditLogsByEntity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { entityType, entityId } = req.params;

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    sendSuccess(res, logs.map(log => ({
      ...log,
      details: log.details || {},
    })));
  } catch (error) {
    next(error);
  }
};

