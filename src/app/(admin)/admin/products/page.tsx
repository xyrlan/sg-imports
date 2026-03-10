import { getAllProducts, getAllHsCodes } from '@/services/admin';
import { ProductsContent } from './products-content';

/**
 * Admin Products Page - Server Component
 * Fetches initial data for products and NCMs tables
 */
export default async function AdminProductsPage() {
  const [productsResult, hsCodesResult] = await Promise.all([
    getAllProducts({ page: 0, pageSize: 50, sortBy: 'createdAt', sortOrder: 'desc' }),
    getAllHsCodes({ page: 0, pageSize: 50, sortBy: 'code', sortOrder: 'asc' }),
  ]);

  return (
    <ProductsContent
      initialProducts={productsResult.data}
      initialHsCodes={hsCodesResult.data}
    />
  );
}
