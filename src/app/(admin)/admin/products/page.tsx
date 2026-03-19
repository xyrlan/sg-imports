import { getAllProducts, getAllHsCodes } from '@/services/admin';
import { ProductsContent } from './products-content';

/**
 * Admin Products Page - Server Component
 * Fetches initial page of products and NCMs for server-side paginated tables
 */
export default async function AdminProductsPage() {
  const [productsResult, hsCodesResult] = await Promise.all([
    getAllProducts({ page: 0, pageSize: 10, sortBy: 'createdAt', sortOrder: 'desc' }),
    getAllHsCodes({ page: 0, pageSize: 10, sortBy: 'code', sortOrder: 'asc' }),
  ]);

  return (
    <ProductsContent
      initialProducts={productsResult}
      initialHsCodes={hsCodesResult}
    />
  );
}
