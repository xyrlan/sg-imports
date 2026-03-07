import { redirect } from 'next/navigation';
import { requireAuthWithOrgs } from '@/services/auth.service';
import { getProfile } from '@/services/profile.service';
import { ProfilePageContent } from './profile-page-content';

/**
 * Profile Page - Server Component
 * Fetches profile and organizations, renders client content
 */
export default async function ProfilePage() {
  const { user, userOrgs } = await requireAuthWithOrgs();
  const profile = await getProfile(user.id);

  if (!profile) redirect('/login');

  return (
    <ProfilePageContent
      profile={profile}
      userOrganizations={userOrgs}
    />
  );
}
