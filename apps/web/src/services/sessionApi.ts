import type { ActiveSessionResponse, SessionResponse } from '../types/session.types';

export class SessionApiError extends Error {
  constructor(message: string, public readonly status: number | null, public readonly code: string | null) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, options);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new SessionApiError('No fue posible conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.', null, null);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === 'object' && 'error' in body ? body.error : null;
    const error = detail && typeof detail === 'object' ? detail : null;
    const code = error && 'code' in error && typeof error.code === 'string' ? error.code : null;
    const message = error && 'message' in error && typeof error.message === 'string'
      ? error.message : 'No fue posible completar la solicitud. Inténtalo nuevamente.';
    throw new SessionApiError(message, response.status, code);
  }
  if (body === null) throw new SessionApiError('El servidor devolvió una respuesta inesperada.', response.status, null);
  return body as T;
}

function post(code: string): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) };
}

export const startSession = (code: string) => request<SessionResponse>('/api/sessions/start', post(code));
export const endSession = (code: string) => request<SessionResponse>('/api/sessions/end', post(code));
export const getActiveSession = (code: string, signal?: AbortSignal) =>
  request<ActiveSessionResponse>(`/api/sessions/active/${encodeURIComponent(code)}`, { signal });
