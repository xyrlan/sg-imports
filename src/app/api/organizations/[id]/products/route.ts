import { createClient } from '@/lib/supabase/server';
import { getOrganizationById } from '@/services/organization.service';
import { getProductsByOrganization } from '@/services/product.service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/organizations/[id]/products
 * List products for organization (requires membership)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: orgId } = await params;
    const access = await getOrganizationById(orgId, user.id);

    if (!access) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '50', 10);
    const search = searchParams.get('search') ?? undefined;
    const orderBy = (searchParams.get('orderBy') as 'name' | 'sku' | 'createdAt') ?? 'name';
    const orderDirection = (searchParams.get('orderDirection') as 'asc' | 'desc') ?? 'asc';

    const result = await getProductsByOrganization(orgId, {
      page,
      pageSize,
      search,
      orderBy,
      orderDirection,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('GET /api/organizations/[id]/products:', err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
