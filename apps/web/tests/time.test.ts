import { describe, expect, it } from 'vitest';
import { elapsedSeconds, formatDate, formatDuration } from '../src/utils/time';

describe('time utilities', () => {
  it('calculates elapsed seconds safely', () => {
    const start = '2026-11-10T13:00:00.000Z';
    const time = Date.parse(start);
    expect(elapsedSeconds(start, time + 65432)).toBe(65);
    expect(elapsedSeconds(start, time)).toBe(0);
    expect(elapsedSeconds(start, time + 90061000)).toBe(90061);
    expect(elapsedSeconds(start, time - 1000)).toBe(0);
    expect(elapsedSeconds('invalid', time)).toBeNull();
  });
  it.each([[0, '00:00:00'], [5, '00:00:05'], [65, '00:01:05'], [3600, '01:00:00'], [3661, '01:01:01'], [28800, '08:00:00'], [90061, '25:01:01']])('formats %i seconds', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
  it('handles invalid and negative durations safely', () => {
    expect(formatDuration(-1)).toBe('00:00:00');
    expect(formatDuration(NaN)).toBe('No disponible');
    expect(formatDuration(Infinity)).toBe('No disponible');
  });
  it('formats dates with the runtime local zone and handles invalid dates', () => {
    const iso = '2026-11-10T13:00:00.000Z';
    const options: Intl.DateTimeFormatOptions = { dateStyle: 'full', timeStyle: 'long' };
    expect(formatDate(iso, options)).toBe(new Intl.DateTimeFormat('es-CO', options).format(new Date(iso)));
    expect(formatDate('invalid', options)).toBe('Fecha no disponible');
  });
});
