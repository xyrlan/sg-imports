import { redirect } from 'next/navigation';
import { requireAuthWithOrgs } from '@/services/auth.service';
import { OrganizationSelector } from '@/app/select-organization/organization-selector';

/**
 * Organization Selection Page
 *
 * Server Component that fetches available organizations
 * and displays them for user selection
 */
export default async function SelectOrganizationPage() {
  const { userOrgs } = await requireAuthWithOrgs();

  if (userOrgs.length === 0) {
    redirect('/create-organization');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <OrganizationSelector organizations={userOrgs} />
    </div>
  );
}
