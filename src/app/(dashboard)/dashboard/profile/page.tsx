import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/services/profile.service';
import { getUserOrganizations } from '@/services/organization.service';
import { ProfilePageContent } from './profile-page-content';

/**
 * Profile Page - Server Component
 * Fetches profile and organizations, renders client content
 */
export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const [profile, userOrgs] = await Promise.all([
    getProfile(user.id),
    getUserOrganizations(user.id),
  ]);

  if (!profile) {
    redirect('/login');
  }

  return (
    <ProfilePageContent
      profile={profile}
      userOrganizations={userOrgs}
    />
  );
}
