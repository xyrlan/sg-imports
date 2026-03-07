import { redirect } from 'next/navigation';
import { signOut } from '@/services/auth.service';

/**
 * Logout Page - Signs out and redirects to login
 * Escape hatch for users stuck in redirect loops
 */
export default async function LogoutPage() {
  await signOut();
  redirect('/login');
}
