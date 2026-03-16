import { NextResponse } from 'next/server';
import { db } from '@/db';
import { quotes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import { verifyDocumentSigned } from '@/services/zapsign.service';

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

    if (!quote || quote.status !== 'PENDING_SIGNATURE') {
      return NextResponse.json({ received: true });
    }

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
  } catch {
    // Always return 200 to avoid ZapSign retries for unrecoverable errors
    return NextResponse.json({ received: true });
  }
}
