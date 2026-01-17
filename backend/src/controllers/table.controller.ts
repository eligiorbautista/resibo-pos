import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response.utils';
import { TableStatus } from '@prisma/client';

// Get all tables
export const getAllTables = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tables = await prisma.table.findMany({
      orderBy: {
        number: 'asc',
      },
    });

    // Get current orders for tables that have them
    const tablesWithOrders = await Promise.all(
      tables.map(async (table) => {
        let currentOrder = null;
        if (table.currentOrderId) {
          const order = await prisma.transaction.findUnique({
            where: { id: table.currentOrderId },
            select: {
              id: true,
              status: true,
              timestamp: true,
              totalAmount: true,
            },
          });
          if (order) {
            currentOrder = {
              ...order,
              totalAmount: parseFloat(order.totalAmount.toString()),
            };
          }
        }
        return {
          ...table,
          currentOrder,
        };
      })
    );

    sendSuccess(res, tablesWithOrders);
  } catch (error) {
    next(error);
  }
};

// Get table by ID
export const getTableById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        reservations: {
          where: {
            status: {
              in: ['CONFIRMED', 'SEATED'],
            },
          },
          orderBy: {
            reservationTime: 'asc',
          },
        },
      },
    });

    if (!table) {
      return sendError(res, 'Table not found', 'TABLE_NOT_FOUND', 404);
    }

    // Get current order if exists
    let currentOrder = null;
    if (table.currentOrderId) {
      const order = await prisma.transaction.findUnique({
        where: { id: table.currentOrderId },
        include: {
          items: {
            take: 5, // First 5 items
          },
        },
      });
      if (order) {
        currentOrder = {
          ...order,
          totalAmount: parseFloat(order.totalAmount.toString()),
          items: order.items.map((item: any) => ({
            ...item,
            price: parseFloat(item.price.toString()),
          })),
        };
      }
    }

    // Convert Decimal to number
    const formattedTable = {
      ...table,
      currentOrder,
    };

    sendSuccess(res, formattedTable);
  } catch (error) {
    next(error);
  }
};

// Create table
export const createTable = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      number,
      capacity,
      location,
      status,
    } = req.body;

    if (!number || !number.trim()) {
      return sendError(res, 'Table number is required', 'MISSING_TABLE_NUMBER', 400);
    }

    if (!capacity || capacity < 1) {
      return sendError(res, 'Capacity must be at least 1', 'INVALID_CAPACITY', 400);
    }

    // Check if table number already exists
    const existingTable = await prisma.table.findUnique({
      where: { number: number.trim() },
    });

    if (existingTable) {
      return sendError(res, 'Table number already exists', 'DUPLICATE_TABLE_NUMBER', 409);
    }

    const table = await prisma.table.create({
      data: {
        number: number.trim(),
        capacity: parseInt(capacity),
        location: location?.trim() || null,
        status: status || TableStatus.AVAILABLE,
      },
    });

    const formattedTable = {
      ...table,
      currentOrder: null,
    };

    sendSuccess(res, formattedTable, 'Table created successfully', 201);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return sendError(res, 'Table number already exists', 'DUPLICATE_TABLE_NUMBER', 409);
    }
    next(error);
  }
};

// Update table
export const updateTable = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      number,
      capacity,
      status,
      location,
      currentOrderId,
      reservationName,
    } = req.body;

    // Check if table exists
    const existingTable = await prisma.table.findUnique({
      where: { id },
    });

    if (!existingTable) {
      return sendError(res, 'Table not found', 'TABLE_NOT_FOUND', 404);
    }

    const updateData: any = {};

    if (number !== undefined) updateData.number = number.trim();
    if (capacity !== undefined) updateData.capacity = parseInt(capacity);
    if (status !== undefined) {
      // Validate status
      if (!Object.values(TableStatus).includes(status)) {
        return sendError(res, 'Invalid table status', 'INVALID_STATUS', 400);
      }
      updateData.status = status;
    }
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (currentOrderId !== undefined) {
      if (currentOrderId === null || currentOrderId === '') {
        updateData.currentOrderId = null;
      } else {
        // Verify order exists
        const order = await prisma.transaction.findUnique({
          where: { id: currentOrderId },
        });
        if (!order) {
          return sendError(res, 'Order not found', 'ORDER_NOT_FOUND', 404);
        }
        updateData.currentOrderId = currentOrderId;
      }
    }
    if (reservationName !== undefined) updateData.reservationName = reservationName?.trim() || null;

    const table = await prisma.table.update({
      where: { id },
      data: updateData,
    });

    // Get current order if exists
    let currentOrder = null;
    if (table.currentOrderId) {
      const order = await prisma.transaction.findUnique({
        where: { id: table.currentOrderId },
        select: {
          id: true,
          status: true,
          timestamp: true,
          totalAmount: true,
        },
      });
      if (order) {
        currentOrder = {
          ...order,
          totalAmount: parseFloat(order.totalAmount.toString()),
        };
      }
    }

    // Convert Decimal to number
    const formattedTable = {
      ...table,
      currentOrder,
    };

    sendSuccess(res, formattedTable, 'Table updated successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Table not found', 'TABLE_NOT_FOUND', 404);
    }
    if (error.code === 'P2002') {
      return sendError(res, 'Table number already exists', 'DUPLICATE_TABLE_NUMBER', 409);
    }
    next(error);
  }
};

// Delete table
export const deleteTable = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if table exists
    const existingTable = await prisma.table.findUnique({
      where: { id },
      include: {
        transactions: {
          where: {
            status: {
              in: ['PENDING', 'PREPARING', 'READY'],
            },
          },
        },
      },
    });

    if (!existingTable) {
      return sendError(res, 'Table not found', 'TABLE_NOT_FOUND', 404);
    }

    // Check if table has active orders
    if (existingTable.transactions.length > 0) {
      return sendError(res, 'Cannot delete table with active orders', 'TABLE_HAS_ACTIVE_ORDERS', 400);
    }

    await prisma.table.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Table deleted successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Table not found', 'TABLE_NOT_FOUND', 404);
    }
    next(error);
  }
};

