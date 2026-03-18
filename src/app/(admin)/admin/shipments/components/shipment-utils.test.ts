import { describe, test, expect } from 'bun:test';
import { formatDateBR, formatBrl, formatUsd } from './shipment-utils';

describe('formatDateBR', () => {
  test('formats Date object as DD/MM/YYYY', () => {
    const date = new Date('2026-03-18T00:00:00');
    expect(formatDateBR(date)).toBe('18/03/2026');
  });

  test('formats ISO string as DD/MM/YYYY', () => {
    expect(formatDateBR('2026-03-18T00:00:00')).toMatch(/18\/03\/2026/);
  });

  test('returns dash for null', () => {
    expect(formatDateBR(null)).toBe('—');
  });

  test('returns dash for undefined', () => {
    expect(formatDateBR(undefined)).toBe('—');
  });
});

describe('formatBrl', () => {
  test('formats number as BRL currency', () => {
    const result = formatBrl(1500.50);
    expect(result).toContain('1.500,50');
  });

  test('formats string number', () => {
    const result = formatBrl('2500.00');
    expect(result).toContain('2.500,00');
  });

  test('handles null — returns R$ 0,00', () => {
    // null triggers the guard: returns the literal string 'R$ 0,00'
    expect(formatBrl(null)).toBe('R$ 0,00');
  });

  test('handles zero', () => {
    const result = formatBrl(0);
    expect(result).toContain('0,00');
  });
});

describe('formatUsd', () => {
  test('formats number as USD', () => {
    const result = formatUsd(1500.50);
    expect(result).toContain('$');
    expect(result).toContain('1,500.50');
  });

  test('handles null — returns $0.00', () => {
    // null triggers the guard: returns the literal string '$0.00'
    expect(formatUsd(null)).toBe('$0.00');
  });

  test('handles string number', () => {
    const result = formatUsd('250.75');
    expect(result).toContain('$');
    expect(result).toContain('250.75');
  });

  test('handles zero', () => {
    const result = formatUsd(0);
    expect(result).toBe('$0.00');
  });
});
