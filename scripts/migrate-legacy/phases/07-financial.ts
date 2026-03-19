import type { Sql } from '../connection';
import type { IdMap, PhaseResult } from '../id-map';

const PAYMENT_STATUS_MAP: Record<string, string> = {
  PENDING: 'PENDING', PAID: 'PAID', FAILED: 'OVERDUE', REFUNDED: 'PAID',
};

export async function runPhase07(legacy: Sql, target: Sql, idMap: IdMap): Promise<PhaseResult> {
  const result: PhaseResult = { phase: '07-financial', tables: [] };

  // --- transactions (from Payment) ---
  {
    const rows = await legacy`SELECT * FROM "Payment"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const shipmentId = idMap.get('order', r.orderId);
      const orgId = idMap.get('company', r.companyId);
      if (!shipmentId || !orgId) { skipped++; continue; }
      try {
        const [inserted] = await target`
          INSERT INTO transactions (id, organization_id, shipment_id, type, status, amount_brl, exchange_rate, gateway_id, paid_at, created_at)
          VALUES (gen_random_uuid(), ${orgId}, ${shipmentId}, 'MERCHANDISE', ${PAYMENT_STATUS_MAP[r.status] ?? 'PENDING'}, ${r.value}, ${r.dolar}, ${r.asaasPaymentId}, ${r.status === 'PAID' ? r.updatedAt : null}, ${r.createdAt})
          RETURNING id`;
        idMap.set('payment', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`Payment ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'transactions', migrated, skipped, errors });
    console.log(`  [transactions] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- exchangeContracts ---
  {
    const rows = await legacy`SELECT * FROM "ExchangeContract"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const transactionId = idMap.get('payment', r.paymentId);
      if (!transactionId) { skipped++; continue; }
      if (!r.numeroContratoCambio || !r.cambioCloseDate) { skipped++; errors.push(`ExchangeContract ${r.id}: missing contractNumber or closedAt`); continue; }

      // Resolve document URLs
      let contractFileUrl = null;
      let swiftFileUrl = null;
      if (r.contratoCambioId) {
        const [doc] = await legacy`SELECT file FROM "Document" WHERE id = ${r.contratoCambioId}`;
        if (doc) contractFileUrl = doc.file;
      }
      if (r.swiftDocId) {
        const [doc] = await legacy`SELECT file FROM "Document" WHERE id = ${r.swiftDocId}`;
        if (doc) swiftFileUrl = doc.file;
      }

      // Try to resolve broker
      const brokerId = idMap.get('corretora', r.corretoraCambio);

      try {
        const [inserted] = await target`
          INSERT INTO exchange_contracts (id, transaction_id, broker_id, contract_number, broker_name, closed_at, amount_usd, exchange_rate, contract_file_url, swift_file_url)
          VALUES (gen_random_uuid(), ${transactionId}, ${brokerId}, ${r.numeroContratoCambio}, ${r.corretoraCambio}, ${r.cambioCloseDate}, ${r.dolarCarriedOut}, ${r.exchangeRate}, ${contractFileUrl}, ${swiftFileUrl})
          RETURNING id`;
        idMap.set('exchangeContract', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`ExchangeContract ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'exchangeContracts', migrated, skipped, errors });
    console.log(`  [exchangeContracts] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- suppliersWalletTransactions ---
  {
    const rows = await legacy`SELECT * FROM "operador_estrangeiro_wallet_transaction"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const walletId = idMap.get('wallet', r.walletId);
      const exchangeContractId = idMap.get('exchangeContract', r.exchangeContractId);
      const shipmentId = idMap.get('order', r.orderId);
      const transactionId = idMap.get('payment', r.paymentId);
      if (!walletId || !shipmentId) { skipped++; continue; }
      try {
        await target`
          INSERT INTO suppliers_wallet_transactions (id, wallet_id, exchange_contract_id, order_id, transaction_id, amount, type, created_at)
          VALUES (gen_random_uuid(), ${walletId}, ${exchangeContractId}, ${shipmentId}, ${transactionId}, ${Number(r.amount).toFixed(2)}, ${r.type}, ${r.createdAt})
          ON CONFLICT (wallet_id, order_id, type) DO NOTHING`;
        migrated++;
      } catch (e: any) { errors.push(`WalletTx ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'suppliersWalletTransactions', migrated, skipped, errors });
    console.log(`  [suppliersWalletTransactions] migrated: ${migrated}, skipped: ${skipped}`);
  }

  return result;
}
