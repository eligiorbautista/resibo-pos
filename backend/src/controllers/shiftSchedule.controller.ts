import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';

// Get all shift schedules
export const getAllShiftSchedules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const schedules = await prisma.shiftSchedule.findMany({
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });

    sendSuccess(res, schedules);
  } catch (error) {
    next(error);
  }
};

// Get shift schedules by employee ID
export const getShiftSchedulesByEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { employeeId } = req.params;

    const schedules = await prisma.shiftSchedule.findMany({
      where: { employeeId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });

    sendSuccess(res, schedules);
  } catch (error) {
    next(error);
  }
};

// Create shift schedule(s) - can create multiple for different days
export const createShiftSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { employeeId, startTime, endTime, daysOfWeek, isRecurring, endDate } = req.body;

    // Validate required fields
    if (!employeeId || !startTime || !endTime) {
      return sendError(res, 'Employee ID, start time, and end time are required', 'MISSING_FIELDS', 400);
    }

    // Validate daysOfWeek is an array
    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      return sendError(res, 'At least one day of week must be selected', 'INVALID_DAYS', 400);
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }

    // Create schedules for each selected day
    const schedules = await Promise.all(
      daysOfWeek.map((dayOfWeek: number) =>
        prisma.shiftSchedule.create({
          data: {
            employeeId,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            dayOfWeek,
            isRecurring: isRecurring ?? true,
            endDate: endDate ? new Date(endDate) : null,
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
        })
      )
    );

    sendSuccess(res, schedules, 'Shift schedule(s) created successfully', 201);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return sendError(res, 'Shift schedule already exists for this employee and day', 'DUPLICATE_SCHEDULE', 409);
    }
    next(error);
  }
};

// Update shift schedule
export const updateShiftSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, dayOfWeek, isRecurring, endDate } = req.body;

    // Check if schedule exists
    const existingSchedule = await prisma.shiftSchedule.findUnique({
      where: { id },
    });

    if (!existingSchedule) {
      return sendError(res, 'Shift schedule not found', 'SCHEDULE_NOT_FOUND', 404);
    }

    const updateData: any = {};

    if (startTime !== undefined) {
      updateData.startTime = new Date(startTime);
    }

    if (endTime !== undefined) {
      updateData.endTime = new Date(endTime);
    }

    if (dayOfWeek !== undefined) {
      updateData.dayOfWeek = dayOfWeek;
    }

    if (isRecurring !== undefined) {
      updateData.isRecurring = isRecurring;
    }

    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null;
    }

    const schedule = await prisma.shiftSchedule.update({
      where: { id },
      data: updateData,
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

    sendSuccess(res, schedule, 'Shift schedule updated successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Shift schedule not found', 'SCHEDULE_NOT_FOUND', 404);
    }
    next(error);
  }
};

// Delete shift schedule
export const deleteShiftSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if schedule exists
    const schedule = await prisma.shiftSchedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      return sendError(res, 'Shift schedule not found', 'SCHEDULE_NOT_FOUND', 404);
    }

    await prisma.shiftSchedule.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Shift schedule deleted successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Shift schedule not found', 'SCHEDULE_NOT_FOUND', 404);
    }
    next(error);
  }
};

