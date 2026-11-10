import { beforeEach, describe, expect, it, vi } from 'vitest';
import { endSession, getActiveSession, SessionApiError, startSession } from '../src/services/sessionApi';

const employee = { id: 1, code: 'EMP001', name: 'Ana' };
const session = { id: 1, employee, startedAt: '2026-11-10T13:00:00.000Z', endedAt: null, workedSeconds: null };
const fetchMock = vi.fn();
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('session API', () => {
  it('posts JSON to start and returns the server response', async () => {
    fetchMock.mockResolvedValue(reply(session, 201));
    expect(await startSession('EMP001')).toEqual(session);
    expect(fetchMock).toHaveBeenCalledWith('/api/sessions/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'EMP001' }) });
  });
  it.each([null, { id: 1, startedAt: session.startedAt, endedAt: null, workedSeconds: null }])('encodes the code and returns active session %j', async (active) => {
    fetchMock.mockResolvedValue(reply({ employee, session: active }));
    expect(await getActiveSession('A/B ?')).toEqual({ employee, session: active });
    expect(fetchMock).toHaveBeenCalledWith('/api/sessions/active/A%2FB%20%3F', { signal: undefined });
  });
  it('posts the end request and preserves official values', async () => {
    const completed = { ...session, endedAt: '2026-11-10T14:00:00.000Z', workedSeconds: 3600 };
    fetchMock.mockResolvedValue(reply(completed));
    expect(await endSession('EMP001')).toEqual(completed);
    expect(fetchMock).toHaveBeenCalledWith('/api/sessions/end', expect.objectContaining({ method: 'POST', body: '{"code":"EMP001"}' }));
  });
  it.each([400, 404, 409, 500])('preserves HTTP error details for %i', async (status) => {
    fetchMock.mockResolvedValue(reply({ error: { code: 'TEST_ERROR', message: 'Mensaje' } }, status));
    const error = await startSession('X').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SessionApiError);
    expect(error).toMatchObject({ message: 'Mensaje', status, code: 'TEST_ERROR' });
  });
  it('distinguishes network failure, invalid JSON and cancellation', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await expect(startSession('X')).rejects.toMatchObject({ status: null, code: null });
    fetchMock.mockResolvedValueOnce(new Response('invalid', { status: 200 }));
    await expect(startSession('X')).rejects.toMatchObject({ status: 200, message: 'El servidor devolvió una respuesta inesperada.' });
    const controller = new AbortController();
    controller.abort();
    const aborted = new DOMException('aborted', 'AbortError');
    fetchMock.mockRejectedValueOnce(aborted);
    await expect(getActiveSession('X', controller.signal)).rejects.toBe(aborted);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/sessions/active/X', { signal: controller.signal });
  });
});
