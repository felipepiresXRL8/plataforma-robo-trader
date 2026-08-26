import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  details?: any;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  console.error(`[API Error] ${req.method} ${req.originalUrl} - Status: ${statusCode}:`, err);

  res.status(statusCode).json({
    error: message,
    statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack, details: err.details }),
  });
};
