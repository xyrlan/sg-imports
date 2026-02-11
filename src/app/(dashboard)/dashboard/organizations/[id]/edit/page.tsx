import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationById } from '@/services/organization.service';
import { OrganizationEditForm } from './organization-edit-form';

interface OrganizationEditPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Organization Edit Page
 * Only OWNER and ADMIN can access
 */
export default async function OrganizationEditPage({
  params,
}: OrganizationEditPageProps) {
  const { id: organizationId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const orgData = await getOrganizationById(organizationId, user.id);

  if (!orgData) {
    redirect('/dashboard/profile');
  }

  if (orgData.role !== 'OWNER' && orgData.role !== 'ADMIN') {
    redirect('/dashboard/profile');
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <OrganizationEditForm
        organizationId={organizationId}
        organization={{
          name: orgData.organization.name,
          document: orgData.organization.document,
          tradeName: orgData.organization.tradeName,
          stateRegistry: orgData.organization.stateRegistry,
          taxRegime: orgData.organization.taxRegime,
          email: orgData.organization.email,
          phone: orgData.organization.phone,
        }}
      />
    </div>
  );
}
