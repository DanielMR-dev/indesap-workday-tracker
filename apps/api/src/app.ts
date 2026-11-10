import express from 'express';
import { errorHandler } from './middleware/error-handler.js';

export const app = express();
app.use(express.json());
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'indesap-workday-api' });
});
app.use(errorHandler);
