'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * AuthSessionRefresher - Client component
 *
 * When the user lands on /dashboard?from=onboarding (after completing onboarding),
 * this component:
 * 1. Refreshes the Supabase session so the client has updated user metadata
 * 2. Triggers router.refresh() to revalidate server components and fetch fresh profile/org data
 * 3. Removes ?from=onboarding from the URL for a clean address bar
 *
 * This ensures the Navbar and other client components show the correct user name
 * and status without requiring a manual F5.
 */
export function AuthSessionRefresher() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('from') !== 'onboarding') return;

    const run = async () => {
      const supabase = createClient();
      await supabase.auth.refreshSession();
      // Brief delay so the new session cookie propagates before the server request
      await new Promise((r) => setTimeout(r, 50));
      router.refresh();

      // Remove ?from=onboarding from URL without full navigation
      const url = new URL(window.location.href);
      url.searchParams.delete('from');
      const cleanUrl = url.pathname + (url.search || '');
      window.history.replaceState(null, '', cleanUrl);
    };

    run();
  }, [searchParams, router]);

  return null;
}
