import { AppError } from '../../middleware/error-handler.js';
import { isActiveSessionConflict, SessionRepository } from './session.repository.js';
import type { ActiveSessionResponse, Employee, SessionResponse } from './session.types.js';

const noActiveSession = () => new AppError(409, 'NO_ACTIVE_SESSION', 'El trabajador no tiene una jornada activa.');
const activeSessionExists = () => new AppError(409, 'ACTIVE_SESSION_EXISTS', 'El trabajador ya tiene una jornada activa.');

export class SessionService {
  constructor(private readonly repository: SessionRepository) {}

  private employee(code: string): Employee {
    const employee = this.repository.findEmployee(code);
    if (!employee) throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'El trabajador no existe.');
    return employee;
  }

  start(code: string): SessionResponse {
    const employee = this.employee(code);
    if (this.repository.findActive(employee.id)) throw activeSessionExists();
    try {
      const session = this.repository.create(employee.id, new Date().toISOString());
      return { ...session, employee };
    } catch (error) {
      if (isActiveSessionConflict(error)) throw activeSessionExists();
      throw error;
    }
  }

  active(code: string): ActiveSessionResponse {
    const employee = this.employee(code);
    return { employee, session: this.repository.findActive(employee.id) ?? null };
  }

  end(code: string): SessionResponse {
    const employee = this.employee(code);
    const session = this.repository.findActive(employee.id);
    if (!session) throw noActiveSession();
    const endTime = Date.now();
    const startTime = Date.parse(session.startedAt);
    if (!Number.isFinite(startTime) || endTime < startTime) {
      throw new Error('Invalid session start time or server clock moved backwards');
    }
    const endedAt = new Date(endTime).toISOString();
    const workedSeconds = Math.floor((endTime - startTime) / 1000);
    if (!this.repository.end(session.id, endedAt, workedSeconds)) throw noActiveSession();
    return { ...session, employee, endedAt, workedSeconds };
  }
}
