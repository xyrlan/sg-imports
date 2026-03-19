import { describe, test, expect } from 'bun:test';
import { generateAmendmentHtml, generateAmendmentPdfBase64 } from './amendment-pdf';

describe('generateAmendmentHtml', () => {
  const baseData = {
    shipmentCode: 123,
    clientName: 'Test Client',
    date: '18/03/2026',
    changes: [],
    oldTotalFobUsd: 10000,
    newTotalFobUsd: 12000,
  };

  test('includes shipment code in title', () => {
    const html = generateAmendmentHtml(baseData);
    expect(html).toContain('Pedido #123');
  });

  test('includes client name', () => {
    const html = generateAmendmentHtml(baseData);
    expect(html).toContain('Test Client');
  });

  test('includes FOB totals and difference', () => {
    const html = generateAmendmentHtml(baseData);
    expect(html).toContain('$10000.00');
    expect(html).toContain('$12000.00');
    expect(html).toContain('$2000.00');
  });

  test('renders ADD change row', () => {
    const data = {
      ...baseData,
      changes: [{ type: 'ADD' as const, productName: 'New Widget', newQuantity: 50, newPriceUsd: 10 }],
    };
    const html = generateAmendmentHtml(data);
    expect(html).toContain('Adicionado');
    expect(html).toContain('New Widget');
    expect(html).toContain('50');
    expect(html).toContain('$10.00');
  });

  test('renders REMOVE change row', () => {
    const data = {
      ...baseData,
      changes: [{ type: 'REMOVE' as const, productName: 'Old Widget', oldQuantity: 30, oldPriceUsd: 5 }],
    };
    const html = generateAmendmentHtml(data);
    expect(html).toContain('Removido');
    expect(html).toContain('Old Widget');
    expect(html).toContain('$5.00');
  });

  test('renders UPDATE change row', () => {
    const data = {
      ...baseData,
      changes: [{ type: 'UPDATE' as const, productName: 'Widget', oldQuantity: 10, newQuantity: 20, oldPriceUsd: 5, newPriceUsd: 4.5 }],
    };
    const html = generateAmendmentHtml(data);
    expect(html).toContain('Alterado');
    expect(html).toContain('Widget');
    expect(html).toContain('10');
    expect(html).toContain('20');
  });

  test('renders em-dash for missing optional fields', () => {
    const data = {
      ...baseData,
      changes: [{ type: 'ADD' as const, productName: 'Solo Widget', newQuantity: 5, newPriceUsd: 2 }],
    };
    const html = generateAmendmentHtml(data);
    // oldQuantity and oldPriceUsd are absent, should render '—'
    expect(html).toContain('—');
  });

  test('produces valid HTML document', () => {
    const html = generateAmendmentHtml(baseData);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
  });
});

describe('generateAmendmentPdfBase64', () => {
  test('returns base64 string', async () => {
    const result = await generateAmendmentPdfBase64({
      shipmentCode: 1,
      clientName: 'Test',
      date: '01/01/2026',
      changes: [],
      oldTotalFobUsd: 100,
      newTotalFobUsd: 100,
    });
    expect(typeof result).toBe('string');
    // Verify it's valid base64 by decoding and checking for DOCTYPE
    const decoded = Buffer.from(result, 'base64').toString();
    expect(decoded).toContain('<!DOCTYPE html>');
  });

  test('encodes shipment code into the base64 output', async () => {
    const result = await generateAmendmentPdfBase64({
      shipmentCode: 999,
      clientName: 'Acme Corp',
      date: '15/06/2026',
      changes: [],
      oldTotalFobUsd: 500,
      newTotalFobUsd: 750,
    });
    const decoded = Buffer.from(result, 'base64').toString();
    expect(decoded).toContain('Pedido #999');
    expect(decoded).toContain('Acme Corp');
  });
});
