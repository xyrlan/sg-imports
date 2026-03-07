import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Logout Page - Signs out and redirects to login
 * Escape hatch for users stuck in redirect loops
 */
export default async function LogoutPage() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
