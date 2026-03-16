import { redirect } from 'next/navigation';
import {
  requireAuthWithOrgs,
  getOrganizationCookie,
} from '@/services/auth.service';
import { getOrganizationById } from '@/services/organization.service';
import { getProfile } from '@/services/profile.service';
import { getAddressById } from '@/services/address.service';
import { getSafeRedirect, isSafeRedirect } from '@/lib/safe-redirect';
import { UserHeaderWithLogout } from '@/components/auth/user-header-with-logout';
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
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const validatedNext = isSafeRedirect(next) ? next : undefined;
  const { user, userOrgs } = await requireAuthWithOrgs();

  if (userOrgs.length === 0) {
    redirect('/create-organization');
  }

  const activeOrgId = await getOrganizationCookie();

  if (!activeOrgId || !userOrgs.find(org => org.organization.id === activeOrgId)) {
    // Redirect to Route Handler to set cookie (cookies can only be modified in Route Handlers or Server Actions)
    redirect('/api/onboarding/ensure-org');
  }

  // Step 4: Fetch organization data with membership
  const orgData = await getOrganizationById(activeOrgId, user.id);

  if (!orgData) {
    redirect('/api/clear-org');
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
          redirect(getSafeRedirect(validatedNext, '/dashboard'));
        }
      }
    }
  }

  const profileHasDocuments = !!(profile?.documentPhotoUrl && profile?.addressProofUrl);

  // Fetch address data for pre-filling when navigating back
  const [billingAddress, deliveryAddress] = await Promise.all([
    organization.billingAddressId ? getAddressById(organization.billingAddressId) : null,
    organization.deliveryAddressId ? getAddressById(organization.deliveryAddressId) : null,
  ]);

  // Step 6: Render onboarding form with detected initial step
  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-4 px-4 overflow-y-auto bg-linear-to-br from-green-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-2xl space-y-4 flex-1">
        <UserHeaderWithLogout
          email={user.email ?? ''}
          name={user.user_metadata?.full_name}
          maxWidth="max-w-2xl"
          compact
        />
        <OnboardingForm
          organizationName={organization.name}
          role={membership.role}
          initialStep={initialStep}
          profileHasDocuments={profileHasDocuments}
          redirectTo={validatedNext}
          organizationDefaults={{
            tradeName: organization.tradeName ?? '',
            stateRegistry: organization.stateRegistry ?? '',
            taxRegime: organization.taxRegime ?? '',
            email: organization.email ?? '',
            phone: organization.phone ?? '',
          }}
          addressDefaults={billingAddress ? {
            postalCode: billingAddress.postalCode ?? '',
            street: billingAddress.street ?? '',
            number: billingAddress.number ?? '',
            complement: billingAddress.complement ?? '',
            neighborhood: billingAddress.neighborhood ?? '',
            city: billingAddress.city ?? '',
            state: billingAddress.state ?? '',
            deliveryPostalCode: deliveryAddress?.postalCode ?? '',
            deliveryStreet: deliveryAddress?.street ?? '',
            deliveryNumber: deliveryAddress?.number ?? '',
            deliveryComplement: deliveryAddress?.complement ?? '',
            deliveryNeighborhood: deliveryAddress?.neighborhood ?? '',
            deliveryCity: deliveryAddress?.city ?? '',
            deliveryState: deliveryAddress?.state ?? '',
          } : undefined}
        />
      </div>
    </div>
  );
}
