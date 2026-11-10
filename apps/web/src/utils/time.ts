export function elapsedSeconds(startedAt: string, now: number): number | null {
  const start = Date.parse(startedAt);
  return Number.isFinite(start) ? Math.max(0, Math.floor((now - start) / 1000)) : null;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'No disponible';
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return [hours, minutes, value % 60].map((part) => String(part).padStart(2, '0')).join(':');
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('es-CO', options).format(date) : 'Fecha no disponible';
}

export const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
export const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', second: '2-digit' };
