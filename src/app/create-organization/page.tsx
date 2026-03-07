import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserOrganizations } from '@/services/organization.service';
import { CreateOrganizationForm } from './create-organization-form';

/**
 * Create Organization Page - Fallback for users with zero organizations
 *
 * Prevents infinite redirect loops when user is logged in but has no orgs.
 * Accessible when !isOnboarded (middleware allows this route).
 */
export default async function CreateOrganizationPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const userOrgs = await getUserOrganizations(user.id);

  if (userOrgs.length > 0) {
    redirect('/select-organization');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <CreateOrganizationForm />
    </div>
  );
}
