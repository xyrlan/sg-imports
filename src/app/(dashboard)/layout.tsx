import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getOrganizationCookie } from '@/services/auth.service';
import { OrganizationProvider } from '@/contexts/organization-context';
import { ProformaQuoteProvider } from '@/contexts/proforma-quote-context';
import { getUserOrganizations, getOrganizationById } from '@/services/organization.service';
import { getProformaQuotesByOrganization } from '@/services/quote.service';
import { getProformaQuoteCookie } from '@/app/(dashboard)/actions';
import { Navbar } from '@/components/layout';
import { AuthSessionRefresher } from '@/components/auth/auth-session-refresher';
import { Suspense, type ReactNode } from 'react';
import { getUserProfile } from '@/services/auth.service';

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
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');

  const activeOrgId = await getOrganizationCookie();
  const userOrgs = await getUserOrganizations(user.id);
  const userProfile = await getUserProfile(user.id);

  // Handle organization selection (edge cases; middleware is primary)
  if (!activeOrgId) {
    // No cookie set - force organization selection
    if (userOrgs.length === 0) {
      redirect('/create-organization');
    }
    
    // User has organizations but hasn't selected one
    redirect('/select-organization');
  }

  const currentOrgData = await getOrganizationById(activeOrgId, user.id);
  if (!currentOrgData) redirect('/select-organization');

  // Edge case: org missing addresses (metadata says onboarded but DB inconsistent)
  const needsOnboarding = 
    !currentOrgData.organization.billingAddressId || 
    !currentOrgData.organization.deliveryAddressId;

  if (needsOnboarding) {
    redirect('/onboarding');
  }

  const initialData = {
    currentOrganization: currentOrgData.organization,
    membership: currentOrgData.membership,
    profile: userProfile,
    availableOrganizations: userOrgs,
    isLoading: false,
  };

  const canSelectProforma =
    currentOrgData.role === 'SELLER' || userProfile?.systemRole === 'SUPER_ADMIN';

  let proformaInitialData = {
    currentQuote: null as Awaited<ReturnType<typeof getProformaQuotesByOrganization>>[number] | null,
    availableQuotes: [] as Awaited<ReturnType<typeof getProformaQuotesByOrganization>>,
    isLoading: false,
  };

  if (canSelectProforma) {
    const availableQuotes = await getProformaQuotesByOrganization(
      currentOrgData.organization.id,
      user.id
    );
    const activeQuoteId = await getProformaQuoteCookie();
    const currentQuote =
      activeQuoteId && availableQuotes.some((q) => q.id === activeQuoteId)
        ? availableQuotes.find((q) => q.id === activeQuoteId) ?? null
        : null;

    proformaInitialData = {
      currentQuote,
      availableQuotes,
      isLoading: false,
    };
  }

  return (
    <OrganizationProvider initialData={initialData}>
      <ProformaQuoteProvider initialData={proformaInitialData}>
        <Suspense fallback={null}>
          <AuthSessionRefresher />
        </Suspense>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </ProformaQuoteProvider>
    </OrganizationProvider>
  );
}