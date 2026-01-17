import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response.utils';

// Get pending E-Invoice payloads
export const getPendingEInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [payloads, total] = await Promise.all([
      prisma.eInvoicePayload.findMany({
        where: {
          status: 'PENDING',
        },
        include: {
          transaction: {
            select: {
              id: true,
              officialInvoiceNumber: true,
              timestamp: true,
              totalAmount: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        skip,
        take: limitNum,
      }),
      prisma.eInvoicePayload.count({
        where: {
          status: 'PENDING',
        },
      }),
    ]);

    sendSuccess(res, {
      payloads: payloads.map(p => ({
        ...p,
        payloadJson: p.payloadJson,
      })),
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

// Get E-Invoice payload by transaction ID
export const getEInvoiceByTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { transactionId } = req.params;

    const payload = await prisma.eInvoicePayload.findUnique({
      where: { transactionId },
      include: {
        transaction: {
          select: {
            id: true,
            officialInvoiceNumber: true,
            timestamp: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!payload) {
      return sendError(res, 'E-Invoice payload not found', 'EINVOICE_NOT_FOUND', 404);
    }

    sendSuccess(res, {
      ...payload,
      payloadJson: payload.payloadJson,
    });
  } catch (error) {
    next(error);
  }
};

// Mark E-Invoice as sent (after successful transmission to BIR EIS)
export const markEInvoiceAsSent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { transactionId } = req.params;
    const authReq = req as any;

    const payload = await prisma.eInvoicePayload.findUnique({
      where: { transactionId },
    });

    if (!payload) {
      return sendError(res, 'E-Invoice payload not found', 'EINVOICE_NOT_FOUND', 404);
    }

    if (payload.status === 'SENT') {
      return sendError(res, 'E-Invoice already marked as sent', 'EINVOICE_ALREADY_SENT', 400);
    }

    const updated = await prisma.eInvoicePayload.update({
      where: { transactionId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        employeeId: authReq.user.id,
        action: 'EINVOICE_SENT',
        entityType: 'EINVOICE',
        entityId: updated.id,
        details: {
          transactionId,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    sendSuccess(res, updated, 'E-Invoice marked as sent');
  } catch (error) {
    next(error);
  }
};

// Mark E-Invoice as failed (if transmission to BIR EIS fails)
export const markEInvoiceAsFailed = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { transactionId } = req.params;
    const { error: errorMessage } = req.body;
    const authReq = req as any;

    const payload = await prisma.eInvoicePayload.findUnique({
      where: { transactionId },
    });

    if (!payload) {
      return sendError(res, 'E-Invoice payload not found', 'EINVOICE_NOT_FOUND', 404);
    }

    const updated = await prisma.eInvoicePayload.update({
      where: { transactionId },
      data: {
        status: 'FAILED',
        lastError: errorMessage || 'Transmission failed',
      },
    });

    // Log the failure
    await prisma.auditLog.create({
      data: {
        employeeId: authReq.user.id,
        action: 'EINVOICE_FAILED',
        entityType: 'EINVOICE',
        entityId: updated.id,
        details: {
          transactionId,
          error: errorMessage,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    sendSuccess(res, updated, 'E-Invoice marked as failed');
  } catch (error) {
    next(error);
  }
};

// Get E-Invoice statistics
export const getEInvoiceStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [pending, sent, failed] = await Promise.all([
      prisma.eInvoicePayload.count({ where: { status: 'PENDING' } }),
      prisma.eInvoicePayload.count({ where: { status: 'SENT' } }),
      prisma.eInvoicePayload.count({ where: { status: 'FAILED' } }),
    ]);

    sendSuccess(res, {
      pending,
      sent,
      failed,
      total: pending + sent + failed,
    });
  } catch (error) {
    next(error);
  }
};

