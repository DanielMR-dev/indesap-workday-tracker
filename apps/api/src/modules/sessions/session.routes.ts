import { Router } from 'express';
import type Database from 'better-sqlite3';
import { SessionController } from './session.controller.js';
import { SessionRepository } from './session.repository.js';
import { SessionService } from './session.service.js';

export function sessionRoutes(database: Database.Database): Router {
  const router = Router();
  const controller = new SessionController(new SessionService(new SessionRepository(database)));
  router.post('/start', controller.start);
  router.get('/active/:code', controller.active);
  router.post('/end', controller.end);
  return router;
}
