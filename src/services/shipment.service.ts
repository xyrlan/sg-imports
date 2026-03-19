/**
 * Shipment Data Access Service — queries and read operations for shipments.
 */

import { db } from '@/db';
import {
  shipments,
  transactions,
} from '@/db/schema';
import { eq, and, sum } from 'drizzle-orm';

/** Fetch a shipment by ID with all relations needed for step evaluation */
export async function getShipmentById(shipmentId: string) {
  return db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
    with: {
      sellerOrganization: true,
      clientOrganization: true,
      quote: { with: { items: true } },
      transactions: { with: { exchangeContracts: true } },
      documents: true,
      containers: true,
      expenses: true,
      stepHistory: true,
      freightReceipt: true,
    },
  });
}

/** Get total paid in USD for MERCHANDISE transactions */
export async function getTotalMerchandisePaidUsd(shipmentId: string): Promise<number> {
  const [result] = await db
    .select({ total: sum(transactions.amountUsd) })
    .from(transactions)
    .where(
      and(
        eq(transactions.shipmentId, shipmentId),
        eq(transactions.type, 'MERCHANDISE'),
        eq(transactions.status, 'PAID')
      )
    );
  return parseFloat(result?.total ?? '0');
}

/** Get total paid in BRL for MERCHANDISE transactions (for 90% invoice calc) */
export async function getTotalMerchandisePaidBrl(shipmentId: string): Promise<number> {
  const [result] = await db
    .select({ total: sum(transactions.amountBrl) })
    .from(transactions)
    .where(
      and(
        eq(transactions.shipmentId, shipmentId),
        eq(transactions.type, 'MERCHANDISE'),
        eq(transactions.status, 'PAID')
      )
    );
  return parseFloat(result?.total ?? '0');
}

/** Check if the 90% invoice (BALANCE type) is paid */
export async function is90InvoicePaid(shipmentId: string): Promise<boolean> {
  const result = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.shipmentId, shipmentId),
      eq(transactions.type, 'BALANCE'),
      eq(transactions.status, 'PAID')
    ),
  });
  return !!result;
}

/** Get exchange contract summary for Step 3 display */
export async function getExchangeContractSummary(shipmentId: string) {
  const txns = await db.query.transactions.findMany({
    where: and(
      eq(transactions.shipmentId, shipmentId),
      eq(transactions.type, 'MERCHANDISE'),
      eq(transactions.status, 'PAID')
    ),
    with: {
      exchangeContracts: { with: { broker: true } },
    },
  });

  return txns.map((t) => ({
    transactionId: t.id,
    amountUsd: t.amountUsd,
    amountBrl: t.amountBrl,
    exchangeRate: t.exchangeRate,
    contracts: t.exchangeContracts,
  }));
}
