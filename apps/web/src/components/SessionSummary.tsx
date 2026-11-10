import type { SessionResponse } from '../types/session.types';
import { dateOptions, formatDate, formatDuration, timeOptions } from '../utils/time';

export function SessionSummary({ session, onReset }: { session: SessionResponse; onReset: () => void }) {
  const rows = [ ['Trabajador', session.employee.name], ['Código', session.employee.code], ['Fecha', formatDate(session.startedAt, dateOptions)], ['Hora de entrada', formatDate(session.startedAt, timeOptions)], ['Hora de salida', session.endedAt ? formatDate(session.endedAt, timeOptions) : 'No disponible'] ];
  return (
    <section className="panel">
      <div className="badge"><span aria-hidden="true">✓</span> Registro completado</div>
      <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Jornada finalizada correctamente</h2>
      <p className="mt-3 text-slate-300">Este es el resumen de tu jornada registrada.</p>
      <dl className="mt-7 divide-y divide-slate-700/70">{rows.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><dt className="text-slate-400">{label}</dt><dd className="font-medium text-slate-100">{value}</dd></div>)}</dl>
      <div className="timer-box mt-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Tiempo total trabajado</p><p className="timer">{session.workedSeconds === null ? 'No disponible' : formatDuration(session.workedSeconds)}</p><p className="mt-2 text-sm text-slate-400">Duración registrada por el servidor.</p></div>
      <button className="button-primary mt-7" type="button" onClick={onReset}>Nueva jornada <span aria-hidden="true">→</span></button>
    </section>
  );
}
