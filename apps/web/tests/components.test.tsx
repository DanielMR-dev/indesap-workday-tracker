import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmployeeForm } from '../src/components/EmployeeForm';
import { WorkTimer } from '../src/components/WorkTimer';
import { WorkSession } from '../src/components/WorkSession';
import { SessionSummary } from '../src/components/SessionSummary';
import { formatDate, timeOptions } from '../src/utils/time';

const session = { id: 1, employee: { id: 1, code: 'EMP001', name: 'Ana' }, startedAt: '2026-11-10T13:00:00.000Z', endedAt: null, workedSeconds: null };
describe('EmployeeForm', () => {
  it('validates, trims and submits with Enter', async () => {
    const user = userEvent.setup(); const onStart = vi.fn();
    render(<EmployeeForm onStart={onStart} loading={false} error={null} />);
    const input = screen.getByRole('textbox', { name: /código de trabajador/i });
    await user.click(screen.getByRole('button', { name: /iniciar jornada/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresa tu código');
    await user.type(input, '  EMP001  {Enter}');
    expect(onStart).toHaveBeenCalledWith('EMP001');
  });
  it('shows server errors and disables controls while loading', () => {
    const { rerender } = render(<EmployeeForm onStart={vi.fn()} loading={false} error="Error del servidor" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Error del servidor');
    rerender(<EmployeeForm onStart={vi.fn()} loading error={null} />);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
describe('WorkTimer', () => {
  it('updates from the start time, handles long durations and cleans its interval', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-11T14:01:01.000Z'));
    const clear = vi.spyOn(window, 'clearInterval');
    const { unmount } = render(<WorkTimer startedAt={session.startedAt} />);
    expect(screen.getByLabelText('Cronómetro de jornada en curso')).toHaveTextContent('25:01:01');
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByLabelText('Cronómetro de jornada en curso')).toHaveTextContent('25:01:03');
    unmount(); expect(clear).toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it('handles invalid timestamps', () => {
    render(<WorkTimer startedAt="invalid" />);
    expect(screen.getByLabelText('Tiempo no disponible')).toHaveTextContent('No disponible');
  });
});
it('shows the active session, loading state and errors', () => {
  render(<WorkSession session={session} loading error="No se pudo finalizar" onEnd={vi.fn()} />);
  expect(screen.getByText(/Hola, Ana/)).toBeInTheDocument();
  expect(screen.getByText(/EMP001/)).toBeInTheDocument();
  expect(screen.getByText('Jornada activa')).toBeInTheDocument();
  expect(screen.getByLabelText('Cronómetro de jornada en curso')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /finalizando/i })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('No se pudo finalizar');
});
it('shows official summary values and resets', () => {
  const reset = vi.fn(); const completed = { ...session, endedAt: '2026-11-10T14:30:45.000Z', workedSeconds: 5445 };
  render(<SessionSummary session={completed} onReset={reset} />);
  expect(screen.getByText('Jornada finalizada correctamente')).toBeInTheDocument();
  expect(screen.getByText(formatDate(session.startedAt, timeOptions))).toBeInTheDocument();
  expect(screen.getByText(formatDate(completed.endedAt, timeOptions))).toBeInTheDocument();
  expect(screen.getByText('01:30:45')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /nueva jornada/i })); expect(reset).toHaveBeenCalledOnce();
});
