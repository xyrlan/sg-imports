import { db } from '@/db';
import { shipments } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function getAllShipments() {
  return db.query.shipments.findMany({
    with: {
      clientOrganization: { columns: { id: true, name: true, orderType: true } },
      sellerOrganization: { columns: { id: true, name: true } },
    },
    orderBy: [desc(shipments.createdAt)],
  });
}

export async function getShipmentDetail(shipmentId: string) {
  return db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
    with: {
      clientOrganization: true,
      sellerOrganization: true,
      quote: { with: { items: { with: { variant: { with: { product: { with: { supplier: true } } } } } } } },
      transactions: { with: { exchangeContracts: { with: { broker: true, supplier: true } } } },
      documents: true,
      containers: true,
      expenses: true,
      stepHistory: true,
      freightReceipt: true,
    },
  });
}
