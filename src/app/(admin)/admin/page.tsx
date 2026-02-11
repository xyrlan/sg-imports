import { redirect } from 'next/navigation';

/**
 * Admin Dashboard Home
 * Redirects to management page for now.
 * Will become a stats/overview page in the future.
 */
export default function AdminPage() {
  redirect('/admin/management');
}
