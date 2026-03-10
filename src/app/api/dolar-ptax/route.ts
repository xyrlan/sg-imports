import { getAuthenticatedUser } from '@/services/auth.service';
import { getDolarPTAX } from '@/lib/fetch-dolar';
import { NextResponse } from 'next/server';

/**
 * GET /api/dolar-ptax
 * Returns the PTAX dollar rate (cotação compra + spread) from BCB.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const rate = await getDolarPTAX();
    return NextResponse.json({ rate });
  } catch (err) {
    console.error('GET /api/dolar-ptax:', err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
