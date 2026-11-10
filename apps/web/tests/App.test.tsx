import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { SessionApiError, startSession, endSession, getActiveSession } from '../src/services/sessionApi';

vi.mock('../src/services/sessionApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/services/sessionApi')>();
  return { ...original, startSession: vi.fn(), endSession: vi.fn(), getActiveSession: vi.fn() };
});
const employee = { id: 1, code: 'EMP001', name: 'Ana' };
const session = { id: 1, employee, startedAt: '2026-11-10T13:00:00.000Z', endedAt: null, workedSeconds: null };
const active = { employee, session: { id: 1, startedAt: session.startedAt, endedAt: null, workedSeconds: null } };
const key = 'indesap.activeEmployeeCode';
const mockedStart = vi.mocked(startSession); const mockedEnd = vi.mocked(endSession); const mockedActive = vi.mocked(getActiveSession);
beforeEach(() => { vi.clearAllMocks(); });
async function submitCode() {
  const user = userEvent.setup();
  await user.type(await screen.findByRole('textbox', { name: /código de trabajador/i }), 'EMP001');
  await user.click(screen.getByRole('button', { name: /iniciar jornada/i }));
}
describe('App flows', () => {
  it('starts, ends and returns to the form', async () => {
    mockedStart.mockResolvedValue(session);
    mockedEnd.mockResolvedValue({ ...session, endedAt: '2026-11-10T14:30:45.000Z', workedSeconds: 5445 });
    render(<App />); await submitCode();
    expect(await screen.findByText(/Hola, Ana/)).toBeInTheDocument();
    expect(sessionStorage.getItem(key)).toBe('EMP001');
    await userEvent.click(screen.getByRole('button', { name: /terminar jornada/i }));
    expect(await screen.findByText('01:30:45')).toBeInTheDocument();
    expect(sessionStorage.getItem(key)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /nueva jornada/i }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
  it('recovers the original session in Strict Mode', async () => {
    sessionStorage.setItem(key, 'EMP001'); mockedActive.mockResolvedValue(active);
    render(<StrictMode><App /></StrictMode>);
    expect(await screen.findByText(/Hola, Ana/)).toBeInTheDocument();
    expect(mockedActive).toHaveBeenCalledWith('EMP001', expect.any(AbortSignal));
    expect(screen.getByText(/Inicio de jornada/).parentElement).toHaveTextContent(new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(session.startedAt)));
  });
  it('shows unknown employee error', async () => {
    mockedStart.mockRejectedValue(new SessionApiError('Trabajador inexistente', 404, 'EMPLOYEE_NOT_FOUND'));
    render(<App />); await submitCode();
    expect(await screen.findByRole('alert')).toHaveTextContent('Trabajador inexistente');
    expect(screen.queryByText('Jornada activa')).not.toBeInTheDocument();
  });
  it('recovers an existing session after conflict', async () => {
    mockedStart.mockRejectedValue(new SessionApiError('Existe', 409, 'ACTIVE_SESSION_EXISTS')); mockedActive.mockResolvedValue(active);
    render(<App />); await submitCode();
    expect(await screen.findByText(/Hola, Ana/)).toBeInTheDocument();
    expect(mockedActive).toHaveBeenCalledWith('EMP001', undefined);
  });
  it('preserves the reference and offers retry on recovery failure', async () => {
    sessionStorage.setItem(key, 'EMP001'); mockedActive.mockRejectedValueOnce(new SessionApiError('Sin conexión', null, null)).mockResolvedValueOnce(active);
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    expect(sessionStorage.getItem(key)).toBe('EMP001');
    expect(screen.queryByText(/finalizada correctamente/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reintentar consulta/i }));
    expect(await screen.findByText(/Hola, Ana/)).toBeInTheDocument();
  });
  it('rechecks uncertain finalization without claiming success', async () => {
    mockedStart.mockResolvedValue(session); mockedEnd.mockRejectedValue(new SessionApiError('Sin conexión', null, null)); mockedActive.mockResolvedValue(active);
    render(<App />); await submitCode(); await screen.findByText(/Hola, Ana/);
    await userEvent.click(screen.getByRole('button', { name: /terminar jornada/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible confirmar la finalización');
    expect(mockedActive).toHaveBeenCalledWith('EMP001', undefined);
    expect(screen.queryByText(/finalizada correctamente/i)).not.toBeInTheDocument();
  });
  it('prevents repeated requests while start and end are pending', async () => {
    let resolveStart!: (value: typeof session) => void;
    mockedStart.mockReturnValue(new Promise((resolve) => { resolveStart = resolve; }));
    let resolveEnd!: (value: typeof session) => void;
    mockedEnd.mockReturnValue(new Promise((resolve) => { resolveEnd = resolve; }));
    render(<App />); await submitCode();
    const form = screen.getByRole('textbox').closest('form')!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(mockedStart).toHaveBeenCalledTimes(1);
    await act(async () => resolveStart(session));
    const button = await screen.findByRole('button', { name: /terminar jornada/i });
    fireEvent.click(button); fireEvent.click(button);
    expect(mockedEnd).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /finalizando/i })).toBeDisabled();
    await act(async () => resolveEnd({ ...session, endedAt: '2026-11-10T14:00:00.000Z', workedSeconds: 3600 }));
    await waitFor(() => expect(screen.getByText('01:00:00')).toBeInTheDocument());
  });
});
