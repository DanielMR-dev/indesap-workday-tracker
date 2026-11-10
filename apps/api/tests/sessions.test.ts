import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';

let db: Database.Database;
const schema = readFileSync(new URL('../src/database/schema.sql', import.meta.url), 'utf8');
beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(schema);
  db.exec("INSERT INTO employees (code, name) VALUES ('EMP001', 'Ana'), ('EMP002', 'Luis')");
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); db.close(); });
const rows = () => db.prepare('SELECT * FROM work_sessions ORDER BY id').all();
const start = (code = 'EMP001') => request(createApp(db)).post('/api/sessions/start').send({ code });
const end = (code = 'EMP001') => request(createApp(db)).post('/api/sessions/end').send({ code });

describe('session HTTP integration', () => {
  it('serves the health check', async () => {
    const response = await request(createApp(db)).get('/api/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', service: 'indesap-workday-api' });
  });
  it('starts, retrieves and ends a session without altering it on duplicate requests', async () => {
    const created = (await start().expect(201)).body;
    expect(created).toMatchObject({ id: expect.any(Number), employee: { code: 'EMP001', name: 'Ana' }, endedAt: null, workedSeconds: null });
    expect(Number.isFinite(Date.parse(created.startedAt))).toBe(true);
    const original = rows();
    expect((await start().expect(409)).body.error.code).toBe('ACTIVE_SESSION_EXISTS');
    expect(rows()).toEqual(original);
    const active = (await request(createApp(db)).get('/api/sessions/active/EMP001').expect(200)).body;
    expect(active).toEqual({ employee: created.employee, session: { id: created.id, startedAt: created.startedAt, endedAt: null, workedSeconds: null } });
    const completed = (await end().expect(200)).body;
    expect(completed.endedAt).toEqual(expect.any(String));
    expect(completed.workedSeconds).toBeGreaterThanOrEqual(0);
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toMatchObject({ ended_at: completed.endedAt, worked_seconds: completed.workedSeconds });
    const finished = rows();
    expect((await end().expect(409)).body.error.code).toBe('NO_ACTIVE_SESSION');
    expect(rows()).toEqual(finished);
    expect((await request(createApp(db)).get('/api/sessions/active/EMP001').expect(200)).body.session).toBeNull();
  });
  it('returns an existing employee without an active session', async () => {
    expect((await request(createApp(db)).get('/api/sessions/active/EMP001').expect(200)).body).toMatchObject({ employee: { code: 'EMP001' }, session: null });
  });
  it.each(['start', 'end', 'active'])('rejects unknown employees for %s', async (action) => {
    const app = request(createApp(db));
    const response = action === 'active' ? await app.get('/api/sessions/active/UNKNOWN') : await app.post(`/api/sessions/${action}`).send({ code: 'UNKNOWN' });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('EMPLOYEE_NOT_FOUND');
    expect(rows()).toEqual([]);
  });
  it.each([{ code: '' }, { code: '   ' }, { code: 123 }, { code: null }, {}])('rejects invalid body %j', async (body) => {
    const response = await request(createApp(db)).post('/api/sessions/start').send(body).expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(rows()).toEqual([]);
  });
  it('rejects malformed JSON without writes', async () => {
    const response = await request(createApp(db)).post('/api/sessions/start').set('Content-Type', 'application/json').send('{').expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(rows()).toEqual([]);
  });
  it('keeps employees independent', async () => {
    const one = (await start()).body;
    const two = (await start('EMP002')).body;
    await end().expect(200);
    const active = (await request(createApp(db)).get('/api/sessions/active/EMP002').expect(200)).body;
    expect(active.session.id).toBe(two.id);
    expect(active.session.endedAt).toBeNull();
    expect(one.id).not.toBe(two.id);
    expect(rows()).toHaveLength(2);
  });
  it('accepts exactly one of two concurrent requests in the same process', async () => {
    const [a, b] = await Promise.all([start(), start()]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect((a.status === 409 ? a : b).body.error.code).toBe('ACTIVE_SESSION_EXISTS');
    expect(rows()).toHaveLength(1);
  });
  it('calculates exact UTC duration with a controlled clock', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-10T13:00:00.000Z'));
    const created = (await start().expect(201)).body;
    vi.setSystemTime(new Date('2026-11-10T14:30:45.000Z'));
    const completed = (await end().expect(200)).body;
    expect(created.startedAt).toBe('2026-11-10T13:00:00.000Z');
    expect(completed).toMatchObject({ endedAt: '2026-11-10T14:30:45.000Z', workedSeconds: 5445 });
  });
  it('sanitizes unexpected internal errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db, 'prepare').mockImplementation(() => { throw new Error('secret SQL SELECT stack'); });
    const response = await start().expect(500);
    expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(JSON.stringify(response.body)).not.toMatch(/secret|SELECT|stack/);
  });
});

describe('SQLite integrity', () => {
  it('enforces foreign keys, active uniqueness, nonnegative durations and retains finished rows', () => {
    expect(() => db.prepare("INSERT INTO work_sessions (employee_id, started_at) VALUES (99, 'start')").run()).toThrow();
    db.exec("INSERT INTO work_sessions (employee_id, started_at) VALUES (1, 'start')");
    expect(() => db.exec("INSERT INTO work_sessions (employee_id, started_at) VALUES (1, 'start')")).toThrow();
    expect(() => db.exec("UPDATE work_sessions SET ended_at = 'end', worked_seconds = -1")).toThrow();
    db.exec("UPDATE work_sessions SET ended_at = 'end', worked_seconds = 5; INSERT INTO work_sessions (employee_id, started_at) VALUES (1, 'next')");
    expect(rows()[0]).toMatchObject({ started_at: 'start', ended_at: 'end', worked_seconds: 5 });
  });
  it('persists across independent connections to a temporary database', () => {
    const dir = mkdtempSync(join(tmpdir(), 'indesap-test-'));
    const path = join(dir, 'test.sqlite');
    try {
      const first = new Database(path);
      try { first.pragma('foreign_keys = ON'); first.exec(schema); first.exec("INSERT INTO employees (code, name) VALUES ('P', 'Persisted')"); } finally { first.close(); }
      const second = new Database(path);
      try { expect(second.prepare('SELECT name FROM employees WHERE code = ?').get('P')).toEqual({ name: 'Persisted' }); } finally { second.close(); }
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
