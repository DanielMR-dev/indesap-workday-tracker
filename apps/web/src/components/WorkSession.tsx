import type { SessionResponse } from '../types/session.types';
import { dateOptions, formatDate, timeOptions } from '../utils/time';
import { WorkTimer } from './WorkTimer';

interface Props { session: SessionResponse; loading: boolean; error: string | null; onEnd: () => void }
export function WorkSession({ session, loading, error, onEnd }: Props) {
  return (
    <section className="panel">
      <div className="badge"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Jornada activa</div>
      <p className="eyebrow mt-7">Tu espacio de trabajo</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Hola, {session.employee.name}</h2>
      <p className="mt-2 text-sm text-slate-400">Código · {session.employee.code}</p>
      <div className="timer-box mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Tiempo transcurrido</p>
        <WorkTimer startedAt={session.startedAt} />
        <p className="mt-3 text-sm text-slate-400">Tiempo aproximado según el reloj de este dispositivo.</p>
      </div>
      <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm"><span className="text-slate-400">Inicio de jornada</span><span className="font-medium text-slate-200">{formatDate(session.startedAt, dateOptions)} · {formatDate(session.startedAt, timeOptions)}</span></div>
      {error && <p role="alert" className="error mt-5">{error}</p>}
      <button className="button-secondary mt-8" type="button" onClick={onEnd} disabled={loading}>{loading ? 'Finalizando jornada…' : 'Terminar jornada'} <span aria-hidden="true">↗</span></button>
    </section>
  );
}
