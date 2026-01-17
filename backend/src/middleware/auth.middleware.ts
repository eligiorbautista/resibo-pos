import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    employeeId: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'No token provided',
          code: 'NO_TOKEN',
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        id: string;
        role: string;
        employeeId: string;
      };

      // Verify employee still exists
      const employee = await prisma.employee.findUnique({
        where: { id: decoded.employeeId },
        select: { id: true, role: true, status: true },
      });

      if (!employee) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Employee not found',
            code: 'EMPLOYEE_NOT_FOUND',
          },
        });
      }

      req.user = {
        id: decoded.id,
        role: employee.role,
        employeeId: employee.id,
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized',
          code: 'UNAUTHORIZED',
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Forbidden: Insufficient permissions',
          code: 'FORBIDDEN',
        },
      });
    }

    next();
  };
};

