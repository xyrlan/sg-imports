import { redirect } from 'next/navigation';
import { requireAuthWithOrgs } from '@/services/auth.service';
import { CreateOrganizationForm } from './create-organization-form';

/**
 * Create Organization Page - Fallback for users with zero organizations
 *
 * Prevents infinite redirect loops when user is logged in but has no orgs.
 * Accessible when !isOnboarded (middleware allows this route).
 */
export default async function CreateOrganizationPage() {
  const { userOrgs } = await requireAuthWithOrgs();

  if (userOrgs.length > 0) {
    redirect('/select-organization');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <CreateOrganizationForm />
    </div>
  );
}
