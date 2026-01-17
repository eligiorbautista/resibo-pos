import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response.utils';
import { Prisma } from '@prisma/client';

// Get all cash drawers
export const getAllCashDrawers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const cashDrawers = await prisma.cashDrawer.findMany({
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        transactions: {
          include: {
            transaction: {
              select: {
                id: true,
                timestamp: true,
                totalAmount: true,
                payments: true,
              },
            },
          },
        },
        cashDrops: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        cashPickups: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        shiftNotes: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        openedAt: 'desc',
      },
    });

    // Convert Decimal to number and format response
    const formattedDrawers = cashDrawers.map(drawer => ({
      id: drawer.id,
      employeeId: drawer.employeeId,
      openingAmount: parseFloat(drawer.openingAmount.toString()),
      closingAmount: drawer.closingAmount ? parseFloat(drawer.closingAmount.toString()) : undefined,
      expectedAmount: drawer.expectedAmount ? parseFloat(drawer.expectedAmount.toString()) : undefined,
      actualAmount: drawer.actualAmount ? parseFloat(drawer.actualAmount.toString()) : undefined,
      difference: drawer.difference ? parseFloat(drawer.difference.toString()) : undefined,
      denominationBreakdown: drawer.denominationBreakdown,
      openedAt: drawer.openedAt,
      closedAt: drawer.closedAt,
      createdAt: drawer.createdAt,
      updatedAt: drawer.updatedAt,
      transactions: drawer.transactions.map(t => t.transactionId),
      cashDrops: drawer.cashDrops.map(drop => ({
        id: drop.id,
        drawerId: drop.cashDrawerId,
        amount: parseFloat(drop.amount.toString()),
        reason: drop.reason,
        droppedBy: drop.employeeId,
        droppedAt: drop.droppedAt,
        employee: drop.employee,
      })),
      cashPickups: drawer.cashPickups.map(pickup => ({
        id: pickup.id,
        drawerId: pickup.cashDrawerId,
        amount: parseFloat(pickup.amount.toString()),
        reason: pickup.reason,
        pickedUpBy: pickup.employeeId,
        pickedUpAt: pickup.pickedUpAt,
        employee: pickup.employee,
      })),
      shiftNotes: drawer.shiftNotes.map(note => ({
        id: note.id,
        drawerId: note.cashDrawerId,
        note: note.note,
        createdBy: note.employeeId,
        createdAt: note.createdAt,
        employee: note.employee,
      })),
    }));

    sendSuccess(res, formattedDrawers, 'Cash drawers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get active cash drawer
export const getActiveCashDrawer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const activeDrawer = await prisma.cashDrawer.findFirst({
      where: {
        closedAt: null,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        transactions: {
          include: {
            transaction: {
              select: {
                id: true,
                timestamp: true,
                totalAmount: true,
                payments: true,
              },
            },
          },
        },
        cashDrops: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        cashPickups: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        shiftNotes: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!activeDrawer) {
      return sendSuccess(res, null, 'No active cash drawer');
    }

    // Format response
    const formattedDrawer = {
      id: activeDrawer.id,
      employeeId: activeDrawer.employeeId,
      openingAmount: parseFloat(activeDrawer.openingAmount.toString()),
      closingAmount: activeDrawer.closingAmount ? parseFloat(activeDrawer.closingAmount.toString()) : undefined,
      expectedAmount: activeDrawer.expectedAmount ? parseFloat(activeDrawer.expectedAmount.toString()) : undefined,
      actualAmount: activeDrawer.actualAmount ? parseFloat(activeDrawer.actualAmount.toString()) : undefined,
      difference: activeDrawer.difference ? parseFloat(activeDrawer.difference.toString()) : undefined,
      denominationBreakdown: activeDrawer.denominationBreakdown,
      openedAt: activeDrawer.openedAt,
      closedAt: activeDrawer.closedAt,
      createdAt: activeDrawer.createdAt,
      updatedAt: activeDrawer.updatedAt,
      transactions: activeDrawer.transactions.map(t => t.transactionId),
      cashDrops: activeDrawer.cashDrops.map(drop => ({
        id: drop.id,
        drawerId: drop.cashDrawerId,
        amount: parseFloat(drop.amount.toString()),
        reason: drop.reason,
        droppedBy: drop.employeeId,
        droppedAt: drop.droppedAt,
        employee: drop.employee,
      })),
      cashPickups: activeDrawer.cashPickups.map(pickup => ({
        id: pickup.id,
        drawerId: pickup.cashDrawerId,
        amount: parseFloat(pickup.amount.toString()),
        reason: pickup.reason,
        pickedUpBy: pickup.employeeId,
        pickedUpAt: pickup.pickedUpAt,
        employee: pickup.employee,
      })),
      shiftNotes: activeDrawer.shiftNotes.map(note => ({
        id: note.id,
        drawerId: note.cashDrawerId,
        note: note.note,
        createdBy: note.employeeId,
        createdAt: note.createdAt,
        employee: note.employee,
      })),
    };

    sendSuccess(res, formattedDrawer, 'Active cash drawer retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Open cash drawer
export const openCashDrawer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { openingAmount } = req.body;
    const employeeId = (req as any).user?.employeeId || (req as any).user?.id;

    if (!openingAmount || isNaN(parseFloat(openingAmount))) {
      return sendError(res, 'Invalid opening amount', 'INVALID_OPENING_AMOUNT', 400);
    }

    // Check if there's already an active drawer
    const activeDrawer = await prisma.cashDrawer.findFirst({
      where: {
        closedAt: null,
      },
    });

    if (activeDrawer) {
      return sendError(res, 'There is already an active cash drawer', 'ACTIVE_CASH_DRAWER_EXISTS', 400);
    }

    const cashDrawer = await prisma.cashDrawer.create({
      data: {
        employeeId,
        openingAmount: new Prisma.Decimal(openingAmount),
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
    });

    const formattedDrawer = {
      id: cashDrawer.id,
      employeeId: cashDrawer.employeeId,
      openingAmount: parseFloat(cashDrawer.openingAmount.toString()),
      openedAt: cashDrawer.openedAt,
      transactions: [],
      cashDrops: [],
      cashPickups: [],
      shiftNotes: [],
    };

    sendSuccess(res, formattedDrawer, 'Cash drawer opened successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Close cash drawer
export const closeCashDrawer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { closingAmount, expectedAmount, denominationBreakdown } = req.body;

    if (!closingAmount || isNaN(parseFloat(closingAmount))) {
      return sendError(res, 'Invalid closing amount', 'INVALID_CLOSING_AMOUNT', 400);
    }

    const cashDrawer = await prisma.cashDrawer.findUnique({
      where: { id },
      include: {
        transactions: {
          include: {
            transaction: {
              select: {
                payments: true,
              },
            },
          },
        },
      },
    });

    if (!cashDrawer) {
      return sendError(res, 'Cash drawer not found', 'CASH_DRAWER_NOT_FOUND', 404);
    }

    if (cashDrawer.closedAt) {
      return sendError(res, 'Cash drawer is already closed', 'CASH_DRAWER_ALREADY_CLOSED', 400);
    }

    const actualAmount = new Prisma.Decimal(closingAmount);
    const expected = expectedAmount ? new Prisma.Decimal(expectedAmount) : cashDrawer.openingAmount;
    const difference = actualAmount.minus(expected);

    const updatedDrawer = await prisma.cashDrawer.update({
      where: { id },
      data: {
        closingAmount: actualAmount,
        expectedAmount: expected,
        actualAmount: actualAmount,
        difference: difference,
        closedAt: new Date(),
        denominationBreakdown: denominationBreakdown || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        transactions: {
          include: {
            transaction: {
              select: {
                id: true,
                timestamp: true,
                totalAmount: true,
                payments: true,
              },
            },
          },
        },
        cashDrops: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        cashPickups: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        shiftNotes: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const formattedDrawer = {
      id: updatedDrawer.id,
      employeeId: updatedDrawer.employeeId,
      openingAmount: parseFloat(updatedDrawer.openingAmount.toString()),
      closingAmount: parseFloat(updatedDrawer.closingAmount!.toString()),
      expectedAmount: parseFloat(updatedDrawer.expectedAmount!.toString()),
      actualAmount: parseFloat(updatedDrawer.actualAmount!.toString()),
      difference: parseFloat(updatedDrawer.difference!.toString()),
      denominationBreakdown: updatedDrawer.denominationBreakdown,
      openedAt: updatedDrawer.openedAt,
      closedAt: updatedDrawer.closedAt,
      transactions: updatedDrawer.transactions.map(t => t.transactionId),
      cashDrops: updatedDrawer.cashDrops.map(drop => ({
        id: drop.id,
        drawerId: drop.cashDrawerId,
        amount: parseFloat(drop.amount.toString()),
        reason: drop.reason,
        droppedBy: drop.employeeId,
        droppedAt: drop.droppedAt,
        employee: drop.employee,
      })),
      cashPickups: updatedDrawer.cashPickups.map(pickup => ({
        id: pickup.id,
        drawerId: pickup.cashDrawerId,
        amount: parseFloat(pickup.amount.toString()),
        reason: pickup.reason,
        pickedUpBy: pickup.employeeId,
        pickedUpAt: pickup.pickedUpAt,
        employee: pickup.employee,
      })),
      shiftNotes: updatedDrawer.shiftNotes.map(note => ({
        id: note.id,
        drawerId: note.cashDrawerId,
        note: note.note,
        createdBy: note.employeeId,
        createdAt: note.createdAt,
        employee: note.employee,
      })),
    };

    sendSuccess(res, formattedDrawer, 'Cash drawer closed successfully');
  } catch (error) {
    next(error);
  }
};

// Add cash drop
export const addCashDrop = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { drawerId, amount, reason } = req.body;
    const employeeId = (req as any).user?.employeeId || (req as any).user?.id;

    if (!drawerId || !amount || !reason) {
      return sendError(res, 'Missing required fields', 'MISSING_REQUIRED_FIELDS', 400);
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return sendError(res, 'Invalid amount', 'INVALID_AMOUNT', 400);
    }

    const cashDrop = await prisma.cashDrop.create({
      data: {
        cashDrawerId: drawerId,
        employeeId,
        amount: new Prisma.Decimal(amount),
        reason,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const formattedDrop = {
      id: cashDrop.id,
      drawerId: cashDrop.cashDrawerId,
      amount: parseFloat(cashDrop.amount.toString()),
      reason: cashDrop.reason,
      droppedBy: cashDrop.employeeId,
      droppedAt: cashDrop.droppedAt,
      employee: cashDrop.employee,
    };

    sendSuccess(res, formattedDrop, 'Cash drop recorded successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Add cash pickup
export const addCashPickup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { drawerId, amount, reason } = req.body;
    const employeeId = (req as any).user?.employeeId || (req as any).user?.id;

    if (!drawerId || !amount || !reason) {
      return sendError(res, 'Missing required fields', 'MISSING_REQUIRED_FIELDS', 400);
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return sendError(res, 'Invalid amount', 'INVALID_AMOUNT', 400);
    }

    const cashPickup = await prisma.cashPickup.create({
      data: {
        cashDrawerId: drawerId,
        employeeId,
        amount: new Prisma.Decimal(amount),
        reason,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const formattedPickup = {
      id: cashPickup.id,
      drawerId: cashPickup.cashDrawerId,
      amount: parseFloat(cashPickup.amount.toString()),
      reason: cashPickup.reason,
      pickedUpBy: cashPickup.employeeId,
      pickedUpAt: cashPickup.pickedUpAt,
      employee: cashPickup.employee,
    };

    sendSuccess(res, formattedPickup, 'Cash pickup recorded successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Add shift note
export const addShiftNote = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { drawerId, note } = req.body;
    const employeeId = (req as any).user?.employeeId || (req as any).user?.id;

    if (!drawerId || !note) {
      return sendError(res, 'Missing required fields', 'MISSING_REQUIRED_FIELDS', 400);
    }

    const shiftNote = await prisma.shiftNote.create({
      data: {
        cashDrawerId: drawerId,
        employeeId,
        note,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const formattedNote = {
      id: shiftNote.id,
      drawerId: shiftNote.cashDrawerId,
      note: shiftNote.note,
      createdBy: shiftNote.employeeId,
      createdAt: shiftNote.createdAt,
      employee: shiftNote.employee,
    };

    sendSuccess(res, formattedNote, 'Shift note added successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Add transaction to drawer
export const addTransactionToDrawer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { drawerId, transactionId } = req.body;

    if (!drawerId || !transactionId) {
      return sendError(res, 'Missing required fields', 'MISSING_REQUIRED_FIELDS', 400);
    }

    // Check if drawer exists and is active
    const drawer = await prisma.cashDrawer.findUnique({
      where: { id: drawerId },
    });

    if (!drawer) {
      return sendError(res, 'Cash drawer not found', 'CASH_DRAWER_NOT_FOUND', 404);
    }

    if (drawer.closedAt) {
      return sendError(res, 'Cannot add transaction to closed drawer', 'CASH_DRAWER_CLOSED', 400);
    }

    // Check if transaction exists
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return sendError(res, 'Transaction not found', 'TRANSACTION_NOT_FOUND', 404);
    }

    // Create or update the relationship
    await prisma.cashDrawerTransaction.upsert({
      where: {
        cashDrawerId_transactionId: {
          cashDrawerId: drawerId,
          transactionId: transactionId,
        },
      },
      create: {
        cashDrawerId: drawerId,
        transactionId: transactionId,
      },
      update: {},
    });

    sendSuccess(res, { drawerId, transactionId }, 'Transaction added to drawer successfully');
  } catch (error) {
    next(error);
  }
};

