import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { generateTokens } from '../utils/jwt.utils';
import { sendSuccess, sendError } from '../utils/response.utils';
import { AuthRequest } from '../middleware/auth.middleware';

// Login with PIN
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pin } = req.body;

    // Find employee by PIN (PINs are hashed in database)
    const employee = await prisma.employee.findFirst({
      where: {
        // We'll need to compare hashed PINs
        // For now, we'll search and then verify
      },
    });

    // Since PINs might not be hashed initially, we'll check all employees
    // In production, you should hash PINs and use findUnique with proper indexing
    const employees = await prisma.employee.findMany();
    
    let foundEmployee = null;
    for (const emp of employees) {
      // Check if PIN matches (handle both hashed and plain text during migration)
      const isMatch = await bcrypt.compare(pin, emp.pin).catch(() => {
        // If PIN is not hashed yet, compare directly
        return emp.pin === pin;
      });
      
      if (isMatch) {
        foundEmployee = emp;
        break;
      }
    }

    if (!foundEmployee) {
      return sendError(res, 'Invalid PIN', 'INVALID_PIN', 401);
    }

    // Generate tokens
    const tokens = generateTokens({
      id: foundEmployee.id,
      employeeId: foundEmployee.id,
      role: foundEmployee.role,
    });

    // Update last login time (optional - you can add lastLoginAt field to schema)
    await prisma.employee.update({
      where: { id: foundEmployee.id },
      data: { lastClockIn: new Date() },
    });

    // Log successful login
    await prisma.auditLog.create({
      data: {
        employeeId: foundEmployee.id,
        action: 'LOGIN_SUCCESS',
        entityType: 'EMPLOYEE',
        entityId: foundEmployee.id,
        details: {
          role: foundEmployee.role,
        },
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    sendSuccess(res, {
      employee: {
        id: foundEmployee.id,
        name: foundEmployee.name,
        role: foundEmployee.role,
        status: foundEmployee.status,
      },
      ...tokens,
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// Get current user
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    
    const employee = await prisma.employee.findUnique({
      where: { id: authReq.user!.employeeId },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        lastClockIn: true,
        totalSales: true,
        totalTips: true,
        hourlyRate: true,
      },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 'EMPLOYEE_NOT_FOUND', 404);
    }

    sendSuccess(res, { employee });
  } catch (error) {
    next(error);
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendError(res, 'Refresh token is required', 'NO_REFRESH_TOKEN', 400);
    }

    // Verify refresh token (implementation needed)
    // For now, return error
    return sendError(res, 'Refresh token functionality not yet implemented', 'NOT_IMPLEMENTED', 501);
  } catch (error) {
    next(error);
  }
};

// Logout
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In a full implementation, you might want to blacklist the token
    // For now, just return success
    sendSuccess(res, null, 'Logout successful');
  } catch (error) {
    next(error);
  }
};

