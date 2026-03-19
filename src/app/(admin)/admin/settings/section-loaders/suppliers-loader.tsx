import {
  getAllSuppliers,
  getOrganizationsForSelect,
  getSupplierWithSubSuppliers,
} from '@/services/admin';
import { SuppliersSection } from '../components';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

interface SuppliersLoaderProps {
  supplierId: string;
}

export async function SuppliersLoader({
  supplierId,
}: SuppliersLoaderProps) {
  const [organizations, suppliers, selectedSupplier] = await Promise.all([
    getOrganizationsForSelect(),
    getAllSuppliers(),
    supplierId && isValidUuid(supplierId)
      ? getSupplierWithSubSuppliers(supplierId)
      : Promise.resolve(null),
  ]);

  return (
    <SuppliersSection
      organizations={organizations}
      suppliers={suppliers}
      selectedSupplier={selectedSupplier}
      initialSupplierId={supplierId}
    />
  );
}
