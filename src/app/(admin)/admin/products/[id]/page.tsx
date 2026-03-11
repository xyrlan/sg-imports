import { notFound } from 'next/navigation';
import { getProductByIdAsAdmin } from '@/services/admin';
import { ProductEditForm } from './product-edit-form';

interface AdminProductEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminProductEditPage({ params }: AdminProductEditPageProps) {
  const { id } = await params;

  const product = await getProductByIdAsAdmin(id);
  if (!product) {
    notFound();
  }

  return (
    <ProductEditForm
      product={product}
      organizationId={product.organizationId}
    />
  );
}
