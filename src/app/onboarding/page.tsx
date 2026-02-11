import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getUserOrganizations, getOrganizationById } from '@/services/organization.service';
import { getProfile } from '@/services/profile.service';
import { OnboardingForm } from './onboarding-form';

/**
 * Onboarding Page - Multi-step organization setup
 *
 * Guides users through completing their organization profile:
 * - Step 1: Organization details (trade name, tax info)
 * - Step 2: Address (billing and delivery)
 * - Step 3: Document uploads (profile documents + organization documents)
 *
 * Note: Service fee config will be managed by admin in the dashboard.
 */
export default async function OnboardingPage() {
  // Step 1: Validate authentication
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Step 2: Get user's organizations
  const userOrgs = await getUserOrganizations(user.id);

  // If user has no organizations at all, they shouldn't be here
  // They should go through the registration flow first
  if (userOrgs.length === 0) {
    redirect('/login');
  }

  // Step 3: Get the organization to onboard
  // Try to get from cookie, otherwise use the first organization
  const cookieStore = await cookies();
  let activeOrgId = cookieStore.get('active_organization_id')?.value;

  if (!activeOrgId || !userOrgs.find(org => org.organization.id === activeOrgId)) {
    activeOrgId = userOrgs[0].organization.id;
  }

  // Step 4: Fetch organization data with membership
  const orgData = await getOrganizationById(activeOrgId, user.id);

  if (!orgData) {
    redirect('/select-organization');
  }

  // Step 5: Detect current onboarding step based on existing data
  const { organization, membership } = orgData;
  const profile = await getProfile(user.id);
  
  let initialStep = 1;
  
  // Check Step 1: Organization Details
  if (organization.tradeName) {
    initialStep = 2;

    // Check Step 2: Address
    if (organization.billingAddressId && organization.deliveryAddressId) {
      initialStep = 3;

      // Check Step 3: Documents - if complete, redirect to dashboard
      if (profile?.documentPhotoUrl && profile?.addressProofUrl) {
        if (membership.role === 'SELLER' || organization.socialContractUrl) {
          redirect('/dashboard');
        }
      }
    }
  }

  const profileHasDocuments = !!(profile?.documentPhotoUrl && profile?.addressProofUrl);

  // Step 6: Render onboarding form with detected initial step
  return (
    <OnboardingForm
      organizationName={organization.name}
      role={membership.role}
      initialStep={initialStep}
      profileHasDocuments={profileHasDocuments}
    />
  );
}
