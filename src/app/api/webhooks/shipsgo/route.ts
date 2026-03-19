import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { inngest } from '@/inngest/client';
import { db } from '@/db';
import { shipments } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-shipsgo-webhook-token') ?? '';
    const expectedToken = process.env.SHIPSGO_WEBHOOK_TOKEN;
    if (!expectedToken || token.length !== expectedToken.length || !timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const shipsGoId = payload.trackingId ?? payload.id;

    if (!shipsGoId) {
      return NextResponse.json({ error: 'Missing tracking ID' }, { status: 400 });
    }

    const shipment = await db.query.shipments.findFirst({
      where: eq(shipments.shipsGoId, String(shipsGoId)),
      columns: { id: true },
    });

    if (!shipment) {
      return NextResponse.json({ ok: true });
    }

    await inngest.send({
      name: 'shipment/shipsgo.updated',
      data: {
        shipmentId: shipment.id,
        shipsGoId: String(shipsGoId),
        payload,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('ShipsGo webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}
