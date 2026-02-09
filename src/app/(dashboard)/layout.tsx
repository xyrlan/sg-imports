import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { OrganizationProvider } from '@/contexts/organization-context';
import { getUserOrganizations, getOrganizationById } from '@/services/organization.service';
import type { ReactNode } from 'react';

/**
 * Dashboard Layout - Multi-tenant Organization Context
 * 
 * Server Component that:
 * 1. Validates user authentication via Supabase
 * 2. Reads organization selection from cookie
 * 3. Fetches organization data via Drizzle
 * 4. Provides initial data to client OrganizationProvider
 * 
 * This approach prevents loading flashes and ensures
 * server components have access to organization context
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Step 1: Validate authentication
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Step 2: Read organization cookie
  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get('active_organization_id')?.value;

  // Step 3: Fetch user's organizations
  const userOrgs = await getUserOrganizations(user.id);

  // Step 4: Handle organization selection logic
  if (!activeOrgId) {
    // No cookie set - force organization selection
    if (userOrgs.length === 0) {
      // User has no organizations - redirect to onboarding/creation page
      redirect('/onboarding');
    }
    
    // User has organizations but hasn't selected one
    redirect('/select-organization');
  }

  // Step 5: Fetch selected organization data
  const currentOrgData = await getOrganizationById(activeOrgId, user.id);

  // Step 6: Security check - Ensure user has access to selected org
  if (!currentOrgData) {
    // Cookie contains invalid org ID or user lost access
    // Clear the invalid cookie and redirect to selection
    cookieStore.delete('active_organization_id');
    redirect('/select-organization');
  }

  // Step 6.5: Check if organization needs onboarding
  // Organization needs onboarding if missing billing or delivery address
  const needsOnboarding = 
    !currentOrgData.organization.billingAddressId || 
    !currentOrgData.organization.deliveryAddressId;

  if (needsOnboarding) {
    redirect('/onboarding');
  }

  // Step 7: Prepare initial state for client provider
  const initialData = {
    currentOrganization: currentOrgData.organization,
    membership: currentOrgData.membership,
    availableOrganizations: userOrgs,
    isLoading: false,
  };

  return (
    <OrganizationProvider initialData={initialData}>
      {children}
    </OrganizationProvider>
  );
}
