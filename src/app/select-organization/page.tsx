import { redirect } from 'next/navigation';
import { requireAuthWithOrgs } from '@/services/auth.service';
import { UserHeaderWithLogout } from '@/components/auth/user-header-with-logout';
import { Logo } from '@/components/logo';
import { OrganizationSelector } from '@/app/select-organization/organization-selector';

/**
 * Organization Selection Page
 *
 * Server Component that fetches available organizations
 * and displays them for user selection
 */
export default async function SelectOrganizationPage() {
  const { user, userOrgs } = await requireAuthWithOrgs();

  if (userOrgs.length === 0) {
    redirect('/create-organization');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-8 px-4 bg-linear-to-br from-green-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-6xl space-y-6">
        <div className="flex justify-center mb-2">
          <Logo />
        </div>
        <UserHeaderWithLogout
          email={user.email ?? ''}
          name={user.user_metadata?.full_name}
          maxWidth="max-w-6xl"
        />
        <OrganizationSelector organizations={userOrgs} />
      </div>
    </div>
  );
}
