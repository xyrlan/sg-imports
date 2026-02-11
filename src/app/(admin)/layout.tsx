import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/services/auth.service';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import type { ReactNode } from 'react';

/**
 * Admin Layout - System-level Super Admin Area
 *
 * Server Component that:
 * 1. Validates user authentication via Supabase
 * 2. Checks the user has SUPER_ADMIN system role
 * 3. Renders sidebar + main content area
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Step 1: Validate authentication
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Step 2: Check super-admin role
  const profile = await getUserProfile(user.id);

  if (!profile || profile.systemRole !== 'SUPER_ADMIN') {
    // Non-admin users get redirected to regular dashboard
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      {/* Main content offset by sidebar collapsed width */}
      <main className="ml-[83px] min-h-screen p-6">
        {children}
      </main>
    </div>
  );
}
