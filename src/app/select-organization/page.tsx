import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserOrganizations } from '@/services/organization.service';
import { OrganizationSelector } from '@/app/select-organization/organization-selector';

/**
 * Organization Selection Page
 * 
 * Server Component that fetches available organizations
 * and displays them for user selection
 */
export default async function SelectOrganizationPage() {
  // Validate authentication
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Fetch user's organizations
  const userOrgs = await getUserOrganizations(user.id);

  // If no organizations, redirect to onboarding
  if (userOrgs.length === 0) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <OrganizationSelector organizations={userOrgs} />
    </div>
  );
}
