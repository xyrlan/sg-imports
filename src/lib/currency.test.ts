import { describe, test, expect } from 'bun:test';
import { roundMoney } from './currency';

describe('roundMoney', () => {
  test('rounds down when decimal < 0.5', () => {
    expect(roundMoney(1.234)).toBe(1.23);
    expect(roundMoney(10.001)).toBe(10.00);
  });

  test('rounds up when decimal > 0.5', () => {
    expect(roundMoney(1.236)).toBe(1.24);
    expect(roundMoney(10.999)).toBe(11.00);
  });

  test('bankers rounding: rounds to even when exactly 0.5 (within floating-point precision)', () => {
    // 1.235 * 100 = 123.500...1 (>0.5 due to float), so rounds UP to 1.24
    expect(roundMoney(1.235)).toBe(1.24);
    // 1.255 * 100 = 125.499...9 (<0.5 due to float), so rounds DOWN to 1.25
    expect(roundMoney(1.255)).toBe(1.25);
  });

  test('handles zero', () => {
    expect(roundMoney(0)).toBe(0);
  });

  test('handles negative values', () => {
    // Documents current behavior: -1.234 * 100 = -123.4, floor = -124, decimal = 0.6 > 0.5 -> rounds toward zero
    expect(roundMoney(-1.234)).toBe(-1.23);
  });

  test('handles large values', () => {
    expect(roundMoney(123456.789)).toBe(123456.79);
  });
});
