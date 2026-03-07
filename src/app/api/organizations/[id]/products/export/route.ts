import { getAuthenticatedUser } from '@/services/auth.service';
import { getOrganizationById } from '@/services/organization.service';
import { exportProductsToRows } from '@/services/product.service';
import { NextRequest, NextResponse } from 'next/server';
import { stringify } from 'csv-stringify/sync';

/**
 * POST /api/organizations/[id]/products/export
 * Export products as CSV (requires membership)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id: orgId } = await params;
    const access = await getOrganizationById(orgId, user.id);

    if (!access) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const queryCriteria = body.queryCriteria ?? {};

    const rows = await exportProductsToRows(orgId, queryCriteria);

    const csv = stringify(rows, {
      header: true,
      delimiter: ';',
      columns: [
        'sku',
        'name',
        'description',
        'boxQuantity',
        'boxWeight',
        'variantName',
        'priceUsd',
        'height',
        'width',
        'length',
        'netWeight',
        'unitWeight',
      ],
    });

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=produtos_${orgId}.csv`,
      },
    });
  } catch (err) {
    console.error('POST /api/organizations/[id]/products/export:', err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
