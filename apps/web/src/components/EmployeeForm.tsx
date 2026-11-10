import { useState, type FormEvent } from 'react';

interface Props { onStart: (code: string) => void; loading: boolean; error: string | null }

export function EmployeeForm({ onStart, loading, error }: Props) {
  const [code, setCode] = useState('');
  const [validation, setValidation] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) { setValidation('Ingresa tu código de trabajador.'); return; }
    setValidation('');
    onStart(trimmed);
  }
  const message = validation || error;
  return (
    <section className="panel">
      <p className="eyebrow">Bienvenido</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Tu jornada comienza aquí.</h2>
      <p className="mt-4 max-w-md leading-relaxed text-slate-300">Ingresa tu código de trabajador para registrar el inicio y llevar el control de tu tiempo.</p>
      <form className="mt-8" onSubmit={submit} noValidate>
        <label htmlFor="employee-code" className="block text-sm font-semibold text-slate-200">Código de trabajador</label>
        <input id="employee-code" className="field mt-2" value={code} onChange={(event) => { setCode(event.target.value); setValidation(''); }} placeholder="Ej. EMP001" autoComplete="off" aria-invalid={Boolean(message)} aria-describedby={message ? 'form-error' : 'code-hint'} disabled={loading} />
        <p id="code-hint" className="mt-2 text-sm text-slate-400">Escríbelo tal como te fue asignado.</p>
        {message && <p id="form-error" role="alert" className="error mt-4">{message}</p>}
        <button className="button-primary mt-6" type="submit" disabled={loading}>{loading ? 'Iniciando jornada…' : 'Iniciar jornada'} <span aria-hidden="true">→</span></button>
      </form>
    </section>
  );
}
