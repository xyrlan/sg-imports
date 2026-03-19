interface ItemChange {
  type: 'ADD' | 'REMOVE' | 'UPDATE';
  productName: string;
  oldQuantity?: number;
  newQuantity?: number;
  oldPriceUsd?: number;
  newPriceUsd?: number;
}

interface AmendmentData {
  shipmentCode: number;
  clientName: string;
  date: string;
  changes: ItemChange[];
  oldTotalFobUsd: number;
  newTotalFobUsd: number;
}

export function generateAmendmentHtml(data: AmendmentData): string {
  const typeLabels = { ADD: 'Adicionado', REMOVE: 'Removido', UPDATE: 'Alterado' };

  const changeRows = data.changes.map((c) => {
    return `<tr>
      <td>${typeLabels[c.type]}</td>
      <td>${c.productName}</td>
      <td>${c.oldQuantity ?? '—'}</td>
      <td>${c.newQuantity ?? '—'}</td>
      <td>${c.oldPriceUsd != null ? `$${c.oldPriceUsd.toFixed(2)}` : '—'}</td>
      <td>${c.newPriceUsd != null ? `$${c.newPriceUsd.toFixed(2)}` : '—'}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; padding: 40px; font-size: 12px; }
  h1 { font-size: 18px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #f5f5f5; }
  .total { font-weight: bold; font-size: 14px; margin-top: 20px; }
</style></head><body>
  <h1>Aditivo Contratual — Pedido #${data.shipmentCode}</h1>
  <p>Cliente: ${data.clientName}</p>
  <p>Data: ${data.date}</p>
  <h2>Alterações</h2>
  <table>
    <tr><th>Tipo</th><th>Produto</th><th>Qtd Anterior</th><th>Qtd Nova</th><th>Preço Anterior</th><th>Preço Novo</th></tr>
    ${changeRows}
  </table>
  <p class="total">FOB Anterior: $${data.oldTotalFobUsd.toFixed(2)}</p>
  <p class="total">FOB Novo: $${data.newTotalFobUsd.toFixed(2)}</p>
  <p class="total">Diferença: $${(data.newTotalFobUsd - data.oldTotalFobUsd).toFixed(2)}</p>
</body></html>`;
}

/**
 * Generate amendment as base64 for ZapSign attachment.
 * Note: This generates HTML encoded as base64. For proper PDF generation,
 * integrate puppeteer or @react-pdf/renderer in a future iteration.
 */
export async function generateAmendmentPdfBase64(data: AmendmentData): Promise<string> {
  const html = generateAmendmentHtml(data);
  return Buffer.from(html).toString('base64');
}

export type { AmendmentData, ItemChange };
