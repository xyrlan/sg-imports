/**
 * Unit tests for Landed Cost Engine
 * Mock FOB, Freight, Rates; assert CIF and Landed Cost correct.
 */

import { describe, test, expect } from 'bun:test';
import { runLandedCostEngine } from './landed-cost-engine';
import type { LandedCostEngineContext, LandedCostEngineItemInput } from './types';

describe('runLandedCostEngine', () => {
  const baseContext: LandedCostEngineContext = {
    targetDolar: 5.5,
    exchangeRateIof: 0,
    shippingModality: 'AIR',
    totalFreightUsd: 100,
    totalInsuranceUsd: 20,
    totalSiscomexBrl: 0,
  };

  test('single item: CIF = (FOB + freight + insurance) * dolar', () => {
    const items: LandedCostEngineItemInput[] = [
      {
        id: 'item-1',
        priceUsd: 10,
        quantity: 10,
        weightSnapshot: 10,
        fobUsd: 100,
        iiRate: 0,
        ipiRate: 0,
        pisRate: 0,
        cofinsRate: 0,
      },
    ];

    const results = runLandedCostEngine(baseContext, items);
    expect(results).toHaveLength(1);

    const r = results[0];
    expect(r.fobUsd.toNumber()).toBe(100);
    expect(r.freightShareUsd.toNumber()).toBe(100);
    expect(r.insuranceShareUsd.toNumber()).toBe(20);
    const cifBrl = (100 + 100 + 20) * 5.5;
    expect(r.cifBrl.toNumber()).toBeCloseTo(cifBrl, 2);
    expect(r.iiValue.toNumber()).toBe(0);
    expect(r.ipiValue.toNumber()).toBe(0);
    expect(r.pisValue.toNumber()).toBe(0);
    expect(r.cofinsValue.toNumber()).toBe(0);
    expect(r.landedCostTotalBrl.toNumber()).toBeCloseTo(cifBrl, 2);
    expect(r.landedCostUnitBrl.toNumber()).toBeCloseTo(cifBrl / 10, 2);
  });

  test('single item with II tax: II = CIF * iiRate', () => {
    const items: LandedCostEngineItemInput[] = [
      {
        id: 'item-1',
        priceUsd: 100,
        quantity: 1,
        weightSnapshot: 1,
        fobUsd: 100,
        iiRate: 10,
        ipiRate: 0,
        pisRate: 0,
        cofinsRate: 0,
      },
    ];

    const ctx: LandedCostEngineContext = {
      ...baseContext,
      totalFreightUsd: 0,
      totalInsuranceUsd: 0,
    };

    const results = runLandedCostEngine(ctx, items);
    expect(results).toHaveLength(1);

    const r = results[0];
    const cifBrl = 100 * 5.5;
    expect(r.cifBrl.toNumber()).toBeCloseTo(cifBrl, 2);
    const expectedIi = Math.round(cifBrl * 0.1 * 100) / 100;
    expect(r.iiValue.toNumber()).toBeCloseTo(expectedIi, 2);
    expect(r.landedCostTotalBrl.toNumber()).toBeGreaterThanOrEqual(cifBrl);
  });

  test('EXPRESS modality: II = 60% of CIF, IPI=PIS=COFINS=0', () => {
    const items: LandedCostEngineItemInput[] = [
      {
        id: 'item-1',
        priceUsd: 100,
        quantity: 1,
        weightSnapshot: 1,
        fobUsd: 100,
        iiRate: 0,
        ipiRate: 0,
        pisRate: 0,
        cofinsRate: 0,
      },
    ];

    const ctx: LandedCostEngineContext = {
      ...baseContext,
      shippingModality: 'EXPRESS',
      totalFreightUsd: 0,
      totalInsuranceUsd: 0,
    };

    const results = runLandedCostEngine(ctx, items);
    expect(results).toHaveLength(1);

    const r = results[0];
    const cifBrl = 100 * 5.5;
    expect(r.cifBrl.toNumber()).toBeCloseTo(cifBrl, 2);
    const expectedIi = Math.round(cifBrl * 0.6 * 100) / 100;
    expect(r.iiValue.toNumber()).toBeCloseTo(expectedIi, 2);
    expect(r.ipiValue.toNumber()).toBe(0);
    expect(r.pisValue.toNumber()).toBe(0);
    expect(r.cofinsValue.toNumber()).toBe(0);
  });

  test('two items: freight apportioned by weight', () => {
    const items: LandedCostEngineItemInput[] = [
      {
        id: 'item-1',
        priceUsd: 10,
        quantity: 1,
        weightSnapshot: 3,
        fobUsd: 10,
        iiRate: 0,
        ipiRate: 0,
        pisRate: 0,
        cofinsRate: 0,
      },
      {
        id: 'item-2',
        priceUsd: 20,
        quantity: 1,
        weightSnapshot: 7,
        fobUsd: 20,
        iiRate: 0,
        ipiRate: 0,
        pisRate: 0,
        cofinsRate: 0,
      },
    ];

    const ctx: LandedCostEngineContext = {
      ...baseContext,
      totalFreightUsd: 100,
      totalInsuranceUsd: 0,
      totalSiscomexBrl: 0,
    };

    const results = runLandedCostEngine(ctx, items);
    expect(results).toHaveLength(2);

    const totalWeight = 3 + 7;
    const item1FreightShare = (3 / totalWeight) * 100;
    const item2FreightShare = (7 / totalWeight) * 100;

    expect(results[0].freightShareUsd.toNumber()).toBeCloseTo(item1FreightShare, 2);
    expect(results[1].freightShareUsd.toNumber()).toBeCloseTo(item2FreightShare, 2);

    const sumFreight = results[0].freightShareUsd.plus(results[1].freightShareUsd).toNumber();
    expect(sumFreight).toBeCloseTo(100, 2);
  });

  test('ICMS por dentro: baseIcms / (1 - rate) - baseIcms', () => {
    const items: LandedCostEngineItemInput[] = [
      {
        id: 'item-1',
        priceUsd: 100,
        quantity: 1,
        weightSnapshot: 1,
        fobUsd: 100,
        iiRate: 0,
        ipiRate: 0,
        pisRate: 0,
        cofinsRate: 0,
      },
    ];

    const ctx: LandedCostEngineContext = {
      ...baseContext,
      totalFreightUsd: 0,
      totalInsuranceUsd: 0,
      icmsRate: 18,
    };

    const results = runLandedCostEngine(ctx, items);
    expect(results).toHaveLength(1);

    const r = results[0];
    const cifBrl = 100 * 5.5;
    const baseIcms = cifBrl;
    const expectedIcms = baseIcms / (1 - 0.18) - baseIcms;
    expect(r.icmsValue.toNumber()).toBeCloseTo(expectedIcms, 2);
    expect(r.landedCostTotalBrl.toNumber()).toBeCloseTo(cifBrl + expectedIcms, 2);
  });

  test('empty items returns empty array', () => {
    const results = runLandedCostEngine(baseContext, []);
    expect(results).toHaveLength(0);
  });
});
