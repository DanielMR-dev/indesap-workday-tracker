import { useEffect, useRef, useState } from 'react';
import { EmployeeForm } from './components/EmployeeForm';
import { SessionSummary } from './components/SessionSummary';
import { WorkSession } from './components/WorkSession';
import { endSession, getActiveSession, SessionApiError, startSession } from './services/sessionApi';
import type { SessionResponse } from './types/session.types';

const storageKey = 'indesap.activeEmployeeCode';
function storedCode(): string | null {
  try { return sessionStorage.getItem(storageKey); } catch { return null; }
}
function storeCode(code: string | null) {
  try {
    if (code === null) sessionStorage.removeItem(storageKey);
    else sessionStorage.setItem(storageKey, code);
  } catch { /* Storage may be unavailable; the current view still works. */ }
}

type View =
  | { kind: 'initializing' }
  | { kind: 'idle'; error: string | null }
  | { kind: 'starting' }
  | { kind: 'recovery'; code: string; error: string }
  | { kind: 'active'; session: SessionResponse; error: string | null }
  | { kind: 'ending'; session: SessionResponse }
  | { kind: 'completed'; session: SessionResponse };

const messageOf = (error: unknown) => error instanceof SessionApiError ? error.message : 'No fue posible completar la solicitud. Inténtalo nuevamente.';
const isCode = (error: unknown, code: string) => error instanceof SessionApiError && error.code === code;

export default function App() {
  const [view, setView] = useState<View>({ kind: 'initializing' });
  const busy = useRef(false);
  const mounted = useRef(false);

  async function recover(code: string, signal?: AbortSignal, notice?: string) {
    try {
      const result = await getActiveSession(code, signal);
      if (signal?.aborted || !mounted.current) return;
      if (result.session) {
        storeCode(result.employee.code);
        setView({ kind: 'active', session: { ...result.session, employee: result.employee }, error: notice ?? null });
      } else {
        storeCode(null);
        setView({ kind: 'idle', error: notice ?? null });
      }
    } catch (error) {
      if (signal?.aborted || !mounted.current) return;
      if (isCode(error, 'EMPLOYEE_NOT_FOUND')) {
        storeCode(null);
        setView({ kind: 'idle', error: messageOf(error) });
      } else {
        storeCode(code);
        setView({ kind: 'recovery', code, error: `${notice ? `${notice} ` : ''}${messageOf(error)}` });
      }
    }
  }

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    const code = storedCode();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      if (code) void recover(code, controller.signal);
      else setView({ kind: 'idle', error: null });
    });
    return () => { mounted.current = false; controller.abort(); };
  }, []);

  async function start(code: string) {
    if (busy.current) return;
    busy.current = true;
    setView({ kind: 'starting' });
    try {
      const session = await startSession(code);
      if (!mounted.current) return;
      storeCode(session.employee.code);
      setView({ kind: 'active', session, error: null });
    } catch (error) {
      if (!mounted.current) return;
      if (isCode(error, 'ACTIVE_SESSION_EXISTS')) {
        storeCode(code);
        await recover(code, undefined, 'Ya existía una jornada activa; se consultó su estado.');
      } else if (error instanceof SessionApiError && error.status === null) {
        storeCode(code);
        await recover(code, undefined, 'No fue posible confirmar el inicio. Consulta el estado antes de volver a intentarlo.');
      } else setView({ kind: 'idle', error: messageOf(error) });
    } finally { busy.current = false; }
  }

  async function end(session: SessionResponse) {
    if (busy.current) return;
    busy.current = true;
    setView({ kind: 'ending', session });
    try {
      const completed = await endSession(session.employee.code);
      if (!mounted.current) return;
      storeCode(null);
      setView({ kind: 'completed', session: completed });
    } catch (error) {
      if (!mounted.current) return;
      if (isCode(error, 'NO_ACTIVE_SESSION')) {
        await recover(session.employee.code, undefined, 'La jornada ya no está activa. No se recibió un resumen de finalización.');
      } else if (error instanceof SessionApiError && error.status === null) {
        await recover(session.employee.code, undefined, 'No fue posible confirmar la finalización.');
      } else setView({ kind: 'active', session, error: messageOf(error) });
    } finally { busy.current = false; }
  }

  return (
    <main className="shell">
      <div className="layout">
        <header className="mb-10 flex items-center gap-3"><span aria-hidden="true" className="brand-mark">i.</span><div><h1 className="text-sm font-bold tracking-wide text-white">INDESAP</h1><p className="text-xs text-slate-400">Workday Tracker</p></div></header>
        {view.kind === 'initializing' && <section className="panel" role="status"><p className="eyebrow">Un momento</p><h2 className="mt-3 text-2xl font-semibold text-white">Consultando tu jornada…</h2></section>}
        {(view.kind === 'idle' || view.kind === 'starting') && <EmployeeForm onStart={start} loading={view.kind === 'starting'} error={view.kind === 'idle' ? view.error : null} />}
        {(view.kind === 'active' || view.kind === 'ending') && <WorkSession session={view.session} loading={view.kind === 'ending'} error={view.kind === 'active' ? view.error : null} onEnd={() => void end(view.session)} />}
        {view.kind === 'completed' && <SessionSummary session={view.session} onReset={() => setView({ kind: 'idle', error: null })} />}
        {view.kind === 'recovery' && <section className="panel"><p className="eyebrow">Estado pendiente</p><h2 className="mt-3 text-3xl font-semibold text-white">No pudimos consultar tu jornada</h2><p role="alert" className="error mt-5">{view.error}</p><p className="mt-4 text-sm leading-relaxed text-slate-300">Conservamos el código de esta pestaña para volver a consultar el estado en el servidor.</p><button type="button" className="button-primary mt-6" onClick={() => { const code = view.code; setView({ kind: 'initializing' }); void recover(code); }}>Reintentar consulta <span aria-hidden="true">→</span></button></section>}
        <footer className="mt-8 text-center text-xs leading-relaxed text-slate-500">Control de jornadas · Indesap Workday Tracker</footer>
      </div>
    </main>
  );
}
