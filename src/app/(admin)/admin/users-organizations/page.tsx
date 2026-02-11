import { getAllProfiles, getAllOrganizations } from '@/services/admin';
import { UsersOrganizationsContent } from './users-organizations-content';

/**
 * Admin Management Page - Server Component
 * Fetches initial data for users and organizations tables
 */
export default async function ManagementPage() {
  const [profilesResult, organizationsResult] = await Promise.all([
    getAllProfiles({ page: 0, pageSize: 10, sortBy: 'createdAt', sortOrder: 'desc' }),
    getAllOrganizations({ page: 0, pageSize: 10, sortBy: 'createdAt', sortOrder: 'desc' }),
  ]);

  return (
    <UsersOrganizationsContent
      initialProfiles={profilesResult.data}
      initialOrganizations={organizationsResult.data}
    />
  );
}
