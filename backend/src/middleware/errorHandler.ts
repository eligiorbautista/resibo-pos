import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: ApiError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code: string | undefined;

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        message = 'A record with this value already exists';
        code = 'UNIQUE_CONSTRAINT_VIOLATION';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        code = 'RECORD_NOT_FOUND';
        break;
      default:
        statusCode = 400;
        message = 'Database error occurred';
        code = 'DATABASE_ERROR';
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
    code = 'VALIDATION_ERROR';
  } else if ('statusCode' in err && err.statusCode) {
    // Custom API errors
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

