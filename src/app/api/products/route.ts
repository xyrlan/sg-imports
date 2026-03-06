import { createClient } from '@/lib/supabase/server';
import { getOrganizationById } from '@/services/organization.service';
import { createProduct } from '@/services/product.service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/products
 * Create product (body: { data, organizationId })
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { data, organizationId } = body;

    if (!organizationId || !data) {
      return NextResponse.json(
        { message: 'organizationId and data are required' },
        { status: 400 }
      );
    }

    const access = await getOrganizationById(organizationId, user.id);

    if (!access) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const product = await createProduct(organizationId, data);

    return NextResponse.json(product);
  } catch (err) {
    console.error('POST /api/products:', err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
