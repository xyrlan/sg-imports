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
  organizationId: string;
  supplierId: string;
}

export async function SuppliersLoader({
  organizationId,
  supplierId,
}: SuppliersLoaderProps) {
  const [organizations, suppliers, selectedSupplier] = await Promise.all([
    getOrganizationsForSelect(),
    organizationId && isValidUuid(organizationId)
      ? getAllSuppliers(organizationId)
      : Promise.resolve([]),
    supplierId && isValidUuid(supplierId)
      ? getSupplierWithSubSuppliers(supplierId)
      : Promise.resolve(null),
  ]);

  return (
    <SuppliersSection
      organizations={organizations}
      suppliers={suppliers}
      selectedSupplier={selectedSupplier}
      initialOrganizationId={organizationId}
      initialSupplierId={supplierId}
    />
  );
}
