import { useEffect, useState } from 'react';
import { elapsedSeconds, formatDuration } from '../utils/time';

export function WorkTimer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const elapsed = elapsedSeconds(startedAt, now);
  return <p className="timer" aria-label={elapsed === null ? 'Tiempo no disponible' : 'Cronómetro de jornada en curso'}>{elapsed === null ? 'No disponible' : formatDuration(elapsed)}</p>;
}
