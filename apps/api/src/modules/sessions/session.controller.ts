import type { RequestHandler } from 'express';
import { codeSchema, sessionRequestSchema } from './session.schema.js';
import { SessionService } from './session.service.js';

export class SessionController {
  constructor(private readonly service: SessionService) {}

  start: RequestHandler = (req, res) => {
    const { code } = sessionRequestSchema.parse(req.body);
    res.status(201).json(this.service.start(code));
  };

  active: RequestHandler = (req, res) => {
    const code = codeSchema.parse(req.params.code);
    res.json(this.service.active(code));
  };

  end: RequestHandler = (req, res) => {
    const { code } = sessionRequestSchema.parse(req.body);
    res.json(this.service.end(code));
  };
}
