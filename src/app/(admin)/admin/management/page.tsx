import { getAllProfiles, getAllOrganizations } from '@/services/admin.service';
import { ManagementContent } from './management-content';

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
    <ManagementContent
      initialProfiles={profilesResult.data}
      initialOrganizations={organizationsResult.data}
    />
  );
}
