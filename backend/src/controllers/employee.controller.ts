import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response.utils';

// Get all employees
export const getAllEmployees = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        lastClockIn: true,
        totalSales: true,
        totalTips: true,
        hourlyRate: true,
        createdAt: true,
        updatedAt: true,
        timeRecords: {
          include: {
            breaks: {
              orderBy: {
                startTime: 'asc',
              },
            },
          },
          orderBy: {
            clockIn: 'desc',
          },
          take: 100, // Get recent 100 time records per employee
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    sendSuccess(res, employees);
  } catch (error) {
    next(error);
  }
};

// Get employee by ID
export const getEmployeeById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        lastClockIn: true,
        totalSales: true,
        totalTips: true,
        hourlyRate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }

    sendSuccess(res, employee);
  } catch (error) {
    next(error);
  }
};

// Create employee
export const createEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, role, pin, hourlyRate } = req.body;

    // Validate PIN format
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return sendError(res, 'PIN must be exactly 4 digits', 'INVALID_PIN_FORMAT', 400);
    }

    // Since PINs are hashed in database, we need to check all employees
    // This is not ideal but necessary for PIN uniqueness validation
    const allEmployees = await prisma.employee.findMany({
      select: { pin: true },
    });

    let pinExists = false;
    for (const emp of allEmployees) {
      try {
        const isMatch = await bcrypt.compare(pin, emp.pin);
        if (isMatch) {
          pinExists = true;
          break;
        }
      } catch (error) {
        // If PIN is not hashed (old data), compare directly
        if (emp.pin === pin) {
          pinExists = true;
          break;
        }
      }
    }

    if (pinExists) {
      return sendError(res, 'This PIN is already in use by another employee', 'PIN_ALREADY_EXISTS', 409);
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        name: name.trim(),
        role: role,
        pin: hashedPin,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        status: 'OUT',
        totalSales: 0,
      },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        lastClockIn: true,
        totalSales: true,
        totalTips: true,
        hourlyRate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, employee, 'Employee created successfully', 201);
  } catch (error: any) {
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      return sendError(res, 'Employee data already exists', 'DUPLICATE_EMPLOYEE', 409);
    }
    next(error);
  }
};

// Update employee
export const updateEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, role, pin, hourlyRate } = req.body;

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }

    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (role !== undefined) {
      updateData.role = role;
    }

    if (hourlyRate !== undefined) {
      updateData.hourlyRate = hourlyRate ? parseFloat(hourlyRate) : null;
    }

    // If PIN is being updated, validate and hash it
    if (pin !== undefined) {
      // Validate PIN format
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return sendError(res, 'PIN must be exactly 4 digits', 'INVALID_PIN_FORMAT', 400);
      }

      // Check if PIN is already in use by another employee
      const allEmployees = await prisma.employee.findMany({
        where: { id: { not: id } }, // Exclude current employee
        select: { pin: true },
      });

      let pinExists = false;
      for (const emp of allEmployees) {
        try {
          const isMatch = await bcrypt.compare(pin, emp.pin);
          if (isMatch) {
            pinExists = true;
            break;
          }
        } catch (error) {
          // If PIN is not hashed (old data), compare directly
          if (emp.pin === pin) {
            pinExists = true;
            break;
          }
        }
      }

      if (pinExists) {
        return sendError(res, 'This PIN is already in use by another employee', 'PIN_ALREADY_EXISTS', 409);
      }

      // Hash new PIN
      updateData.pin = await bcrypt.hash(pin, 10);
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        lastClockIn: true,
        totalSales: true,
        totalTips: true,
        hourlyRate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, employee, 'Employee updated successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }
    next(error);
  }
};

// Delete employee
export const deleteEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }

    // Delete employee (cascade will handle related records)
    await prisma.employee.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Employee deleted successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }
    next(error);
  }
};

// Clock in
export const clockIn = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }

    // Check if employee is already clocked in
    if (employee.status === 'IN') {
      return sendError(res, 'Employee is already clocked in', 'ALREADY_CLOCKED_IN', 400);
    }

    const now = new Date();

    // Create time record
    const timeRecord = await prisma.timeRecord.create({
      data: {
        employeeId: id,
        clockIn: now,
      },
    });

    // Update employee status
    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        status: 'IN',
        lastClockIn: now,
      },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        lastClockIn: true,
        totalSales: true,
        totalTips: true,
        hourlyRate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, {
      employee: updatedEmployee,
      timeRecord: {
        id: timeRecord.id,
        clockIn: timeRecord.clockIn,
        clockOut: timeRecord.clockOut,
        breaks: [],
      },
    }, 'Clock in successful');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }
    next(error);
  }
};

// Clock out
export const clockOut = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        timeRecords: {
          where: {
            clockOut: null, // Find active time record
          },
          orderBy: {
            clockIn: 'desc',
          },
          take: 1,
          include: {
            breaks: true,
          },
        },
      },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }

    // Check if employee is clocked in
    if (employee.status === 'OUT') {
      return sendError(res, 'Employee is not clocked in', 'NOT_CLOCKED_IN', 400);
    }

    const now = new Date();

    // Update the active time record
    let timeRecord;
    if (employee.timeRecords.length > 0) {
      timeRecord = await prisma.timeRecord.update({
        where: { id: employee.timeRecords[0].id },
        data: {
          clockOut: now,
        },
        include: {
          breaks: true,
        },
      });
    } else {
      // Create a time record if none exists (shouldn't happen but handle it)
      timeRecord = await prisma.timeRecord.create({
        data: {
          employeeId: id,
          clockIn: employee.lastClockIn || now,
          clockOut: now,
        },
        include: {
          breaks: true,
        },
      });
    }

    // Update employee status
    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        status: 'OUT',
      },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        lastClockIn: true,
        totalSales: true,
        totalTips: true,
        hourlyRate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, {
      employee: updatedEmployee,
      timeRecord: {
        id: timeRecord.id,
        clockIn: timeRecord.clockIn,
        clockOut: timeRecord.clockOut,
        breaks: timeRecord.breaks.map(b => ({
          id: b.id,
          startTime: b.startTime,
          endTime: b.endTime,
          type: b.type,
        })),
      },
    }, 'Clock out successful');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }
    next(error);
  }
};

// Start break
export const startBreak = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'BREAK' or 'LUNCH'

    if (!type || !['BREAK', 'LUNCH'].includes(type)) {
      return sendError(res, 'Break type must be BREAK or LUNCH', 'INVALID_BREAK_TYPE', 400);
    }

    // Check if employee exists and is clocked in
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        timeRecords: {
          where: {
            clockOut: null, // Find active time record
          },
          orderBy: {
            clockIn: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }

    if (employee.status === 'OUT') {
      return sendError(res, 'Employee must be clocked in to start a break', 'NOT_CLOCKED_IN', 400);
    }

    if (employee.timeRecords.length === 0) {
      return sendError(res, 'No active time record found', 'NO_ACTIVE_TIME_RECORD', 400);
    }

    const now = new Date();
    const activeTimeRecord = employee.timeRecords[0];

    // Create break record
    const breakRecord = await prisma.breakRecord.create({
      data: {
        timeRecordId: activeTimeRecord.id,
        startTime: now,
        type: type,
      },
    });

    sendSuccess(res, {
      break: {
        id: breakRecord.id,
        startTime: breakRecord.startTime,
        endTime: breakRecord.endTime,
        type: breakRecord.type,
      },
    }, 'Break started');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }
    next(error);
  }
};

// End break
export const endBreak = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if employee exists and is clocked in
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        timeRecords: {
          where: {
            clockOut: null, // Find active time record
          },
          orderBy: {
            clockIn: 'desc',
          },
          take: 1,
          include: {
            breaks: {
              where: {
                endTime: null, // Find active break
              },
              orderBy: {
                startTime: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }

    if (employee.status === 'OUT') {
      return sendError(res, 'Employee must be clocked in to end a break', 'NOT_CLOCKED_IN', 400);
    }

    if (employee.timeRecords.length === 0) {
      return sendError(res, 'No active time record found', 'NO_ACTIVE_TIME_RECORD', 400);
    }

    const activeTimeRecord = employee.timeRecords[0];

    if (activeTimeRecord.breaks.length === 0) {
      return sendError(res, 'No active break found', 'NO_ACTIVE_BREAK', 400);
    }

    const now = new Date();
    const activeBreak = activeTimeRecord.breaks[0];

    // Update break record
    const breakRecord = await prisma.breakRecord.update({
      where: { id: activeBreak.id },
      data: {
        endTime: now,
      },
    });

    sendSuccess(res, {
      break: {
        id: breakRecord.id,
        startTime: breakRecord.startTime,
        endTime: breakRecord.endTime,
        type: breakRecord.type,
      },
    }, 'Break ended');
  } catch (error: any) {
    if (error.code === 'P2025') {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }
    next(error);
  }
};

// Get employee time records
export const getTimeRecords = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }

    // Build where clause
    const where: any = {
      employeeId: id,
    };

    if (startDate || endDate) {
      where.clockIn = {};
      if (startDate) {
        where.clockIn.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.clockIn.lte = new Date(endDate as string);
      }
    }

    // Get time records
    const timeRecords = await prisma.timeRecord.findMany({
      where,
      include: {
        breaks: {
          orderBy: {
            startTime: 'asc',
          },
        },
      },
      orderBy: {
        clockIn: 'desc',
      },
    });

    sendSuccess(res, timeRecords);
  } catch (error) {
    next(error);
  }
};

// Mark salary as paid
export const markSalaryAsPaid = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { periodStart, periodEnd, amount, hoursWorked, regularPay, overtimePay, notes } = req.body;
    const authReq = req as any;
    const paidBy = authReq.user.id; // The manager who is processing the payment

    // Verify employee exists
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }

    // Create payroll payment record
    const payment = await prisma.payrollPayment.create({
      data: {
        employeeId: id,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        amount: parseFloat(amount),
        hoursWorked: parseFloat(hoursWorked),
        regularPay: parseFloat(regularPay),
        overtimePay: parseFloat(overtimePay),
        paidBy,
        notes: notes || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
          },
        },
        paidByEmployee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Delete time records within the paid period to reset them
    await prisma.timeRecord.deleteMany({
      where: {
        employeeId: id,
        clockIn: {
          gte: new Date(periodStart),
          lte: new Date(periodEnd),
        },
      },
    });

    sendSuccess(res, payment, 'Salary marked as paid and time records reset successfully');
  } catch (error) {
    next(error);
  }
};

// Get payroll payment history
export const getPayrollPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Verify employee exists
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }

    const payments = await prisma.payrollPayment.findMany({
      where: {
        employeeId: id,
      },
      include: {
        paidByEmployee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        paidAt: 'desc',
      },
    });

    sendSuccess(res, payments);
  } catch (error) {
    next(error);
  }
};

