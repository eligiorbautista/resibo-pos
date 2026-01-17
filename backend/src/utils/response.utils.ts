import { Response } from 'express';

export const sendSuccess = (res: Response, data: any, message?: string, statusCode: number = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (res: Response, message: string, code: string, statusCode: number = 400) => {
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
    },
  });
};

