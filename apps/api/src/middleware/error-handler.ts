import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof ZodError || (error instanceof SyntaxError && 'status' in error && error.status === 400)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Los datos de la solicitud no son válidos.' } });
    return;
  }
  // Express's JSON parser also rejects oversized requests before routing.
  if (error instanceof Error && 'status' in error && error.status === 413) {
    res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'La solicitud es demasiado grande.' } });
    return;
  }
  console.error(error);
  res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Ocurrió un error interno.' } });
};
