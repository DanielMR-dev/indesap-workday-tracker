import Database from 'better-sqlite3';
import type { Employee, Session } from './session.types.js';

export class SessionRepository {
  constructor(private readonly database: Database.Database) {}

  findEmployee(code: string): Employee | undefined {
    return this.database.prepare('SELECT id, code, name FROM employees WHERE code = ?').get(code) as Employee | undefined;
  }

  findActive(employeeId: number): Session | undefined {
    return this.database.prepare(`SELECT id, started_at AS startedAt, ended_at AS endedAt,
      worked_seconds AS workedSeconds FROM work_sessions WHERE employee_id = ? AND ended_at IS NULL`)
      .get(employeeId) as Session | undefined;
  }

  create(employeeId: number, startedAt: string): Session {
    const result = this.database.prepare('INSERT INTO work_sessions (employee_id, started_at) VALUES (?, ?)')
      .run(employeeId, startedAt);
    return { id: Number(result.lastInsertRowid), startedAt, endedAt: null, workedSeconds: null };
  }

  end(id: number, endedAt: string, workedSeconds: number): boolean {
    return this.database.prepare(`UPDATE work_sessions SET ended_at = ?, worked_seconds = ?
      WHERE id = ? AND ended_at IS NULL`).run(endedAt, workedSeconds, id).changes === 1;
  }
}

export function isActiveSessionConflict(error: unknown): boolean {
  return error instanceof Database.SqliteError && error.code === 'SQLITE_CONSTRAINT_UNIQUE'
    && error.message.includes('work_sessions.employee_id');
}
