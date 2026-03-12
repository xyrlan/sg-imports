import { redirect } from 'next/navigation';
import { requireAuthWithOrgs } from '@/services/auth.service';
import { UserHeaderWithLogout } from '@/components/auth/user-header-with-logout';
import { Logo } from '@/components/logo';
import { CreateOrganizationForm } from './create-organization-form';

/**
 * Create Organization Page - Fallback for users with zero organizations
 *
 * Prevents infinite redirect loops when user is logged in but has no orgs.
 * Accessible when !isOnboarded (middleware allows this route).
 */
export default async function CreateOrganizationPage() {
  const { user, userOrgs } = await requireAuthWithOrgs();

  if (userOrgs.length > 0) {
    redirect('/select-organization');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-8 px-4 bg-linear-to-br from-green-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center mb-2">
          <Logo />
        </div>
        <UserHeaderWithLogout
          email={user.email ?? ''}
          name={user.user_metadata?.full_name}
        />
        <CreateOrganizationForm />
      </div>
    </div>
  );
}
