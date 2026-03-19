import { NextRequest, NextResponse } from 'next/server';
import { validateWebhookToken } from '@/lib/asaas/client';
import { inngest } from '@/inngest/client';
import { db } from '@/db';
import { transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('asaas-access-token') ?? '';
    if (!validateWebhookToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const { event, payment } = payload;

    if (event !== 'PAYMENT_CONFIRMED' && event !== 'PAYMENT_RECEIVED') {
      return NextResponse.json({ ok: true });
    }

    const externalRef = payment.externalReference as string | undefined;
    const gatewayId = payment.id as string;

    const txn = await db.query.transactions.findFirst({
      where: externalRef
        ? eq(transactions.id, externalRef)
        : eq(transactions.gatewayId, gatewayId),
      columns: { id: true, shipmentId: true, status: true },
    });

    if (!txn || !txn.shipmentId) {
      return NextResponse.json({ ok: true });
    }

    if (txn.status === 'PAID') {
      return NextResponse.json({ ok: true });
    }

    await inngest.send({
      name: 'shipment/payment.received',
      data: { transactionId: txn.id, shipmentId: txn.shipmentId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Asaas webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}
