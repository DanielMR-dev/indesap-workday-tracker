import express from 'express';
import type Database from 'better-sqlite3';
import { errorHandler } from './middleware/error-handler.js';
import { sessionRoutes } from './modules/sessions/session.routes.js';

export function createApp(database: Database.Database) {
  const app = express();
  app.use(express.json());
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'indesap-workday-api' });
  });
  app.use('/api/sessions', sessionRoutes(database));
  app.use(errorHandler);
  return app;
}
