import { getTranslations } from 'next-intl/server';
import { requireAuthAndOrg } from '@/services/auth.service';
import { getAllSuppliers } from '@/services/admin';
import { getProductsByOrganization } from '@/services/product.service';
import { ProductsPageContent } from './components/products-page-content';

export default async function ProductsPage() {
  const t = await getTranslations('Products');
  const { activeOrgId } = await requireAuthAndOrg();

  const [{ data: initialProducts, paging }, initialSuppliers] = await Promise.all([
    getProductsByOrganization(activeOrgId, { page: 1, pageSize: 100 }),
    getAllSuppliers(activeOrgId),
  ]);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted text-sm">
          {t('description')}
        </p>
      </div>

      <ProductsPageContent
        initialProducts={initialProducts}
        initialSuppliers={initialSuppliers}
        organizationId={activeOrgId}
        initialPaging={paging}
      />
    </div>
  );
}
