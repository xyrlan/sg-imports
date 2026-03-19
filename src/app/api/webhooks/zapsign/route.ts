import { NextResponse } from 'next/server';
import { db } from '@/db';
import { quotes, shipments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import { verifyDocumentSigned } from '@/services/zapsign.service';

// Handles amendment signing — checked after quote contract lookup misses
async function handleAmendmentWebhook(docToken: string): Promise<void> {
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.zapSignToken, docToken),
    columns: { id: true, status: true },
  });

  if (shipment && shipment.status !== 'CANCELED') {
    await inngest.send({
      name: 'shipment/amendment.signed',
      data: { shipmentId: shipment.id, docToken },
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.event_type !== 'doc_signed') {
      return NextResponse.json({ received: true });
    }

    const docToken = body.token as string;
    if (!docToken) {
      return NextResponse.json({ received: true });
    }

    const quote = await db.query.quotes.findFirst({
      where: eq(quotes.zapSignDocToken, docToken),
      columns: { id: true, status: true },
    });

    if (quote && quote.status === 'PENDING_SIGNATURE') {
      // Verify with ZapSign API that the document is actually signed
      const isVerified = await verifyDocumentSigned(docToken);
      if (!isVerified) {
        console.warn('ZapSign webhook verification failed for doc:', docToken);
        return NextResponse.json({ received: true });
      }

      await inngest.send({
        name: 'quote/contract.signed',
        data: { quoteId: quote.id },
      });

      return NextResponse.json({ received: true });
    }

    // Check if this is a shipment amendment
    await handleAmendmentWebhook(docToken);

    return NextResponse.json({ received: true });
  } catch {
    // Always return 200 to avoid ZapSign retries for unrecoverable errors
    return NextResponse.json({ received: true });
  }
}
