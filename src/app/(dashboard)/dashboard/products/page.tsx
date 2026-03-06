import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationById } from '@/services/organization.service';
import { getProductsByOrganization } from '@/services/product.service';
import { ProductsPageContent } from './components/products-page-content';

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get('active_organization_id')?.value;

  if (!activeOrgId) {
    redirect('/select-organization');
  }

  const access = await getOrganizationById(activeOrgId, user.id);

  if (!access) {
    redirect('/select-organization');
  }

  const { data: initialProducts, paging } = await getProductsByOrganization(activeOrgId, {
    page: 1,
    pageSize: 100,
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <p className="text-muted text-sm">
          Manage your product catalog
        </p>
      </div>

      <ProductsPageContent
        initialProducts={initialProducts}
        organizationId={activeOrgId}
        initialPaging={paging}
      />
    </div>
  );
}
