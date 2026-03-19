import { describe, test, expect } from 'bun:test';
import { STEP_ORDER } from './shipment-constants';

describe('STEP_ORDER', () => {
  test('has exactly 6 steps', () => {
    expect(STEP_ORDER).toHaveLength(6);
  });

  test('starts with CONTRACT_CREATION', () => {
    expect(STEP_ORDER[0]).toBe('CONTRACT_CREATION');
  });

  test('ends with COMPLETION', () => {
    expect(STEP_ORDER[STEP_ORDER.length - 1]).toBe('COMPLETION');
  });

  test('MERCHANDISE_PAYMENT comes before SHIPPING_PREPARATION', () => {
    const mpIdx = STEP_ORDER.indexOf('MERCHANDISE_PAYMENT');
    const spIdx = STEP_ORDER.indexOf('SHIPPING_PREPARATION');
    expect(mpIdx).toBeLessThan(spIdx);
  });

  test('CUSTOMS_CLEARANCE comes before COMPLETION', () => {
    const ccIdx = STEP_ORDER.indexOf('CUSTOMS_CLEARANCE');
    const compIdx = STEP_ORDER.indexOf('COMPLETION');
    expect(ccIdx).toBeLessThan(compIdx);
  });

  test('all steps are unique', () => {
    const unique = new Set(STEP_ORDER);
    expect(unique.size).toBe(STEP_ORDER.length);
  });

  test('contains all expected step names', () => {
    const expectedSteps = [
      'CONTRACT_CREATION',
      'MERCHANDISE_PAYMENT',
      'SHIPPING_PREPARATION',
      'DOCUMENT_PREPARATION',
      'CUSTOMS_CLEARANCE',
      'COMPLETION',
    ];
    for (const step of expectedSteps) {
      expect(STEP_ORDER).toContain(step);
    }
  });
});
