import { notFound } from 'next/navigation';
import {
  getOrganizationWithAddresses,
  getOrganizationMembers,
  getServiceFeeConfig,
} from '@/services/admin';
import { OrganizationEditForm } from './organization-edit-form';

interface AdminOrganizationPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrganizationPage({
  params,
}: AdminOrganizationPageProps) {
  const { id } = await params;

  const [organization, members, feeConfig] = await Promise.all([
    getOrganizationWithAddresses(id),
    getOrganizationMembers(id),
    getServiceFeeConfig(id),
  ]);

  if (!organization) {
    notFound();
  }

  return (
    <OrganizationEditForm
      organization={organization}
      members={members}
      feeConfig={feeConfig}
    />
  );
}
