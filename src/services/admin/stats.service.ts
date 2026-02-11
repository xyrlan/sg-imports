import { db } from '@/db';
import { profiles, organizations } from '@/db/schema';
import { sql } from 'drizzle-orm';

/**
 * Aggregate stats for the admin dashboard home page.
 * Add new counters here as more entities become relevant.
 */
export async function getAdminStats() {
  const [usersCount, orgsCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(profiles),
    db.select({ count: sql<number>`count(*)` }).from(organizations),
  ]);

  return {
    totalUsers: Number(usersCount[0]?.count ?? 0),
    totalOrganizations: Number(orgsCount[0]?.count ?? 0),
  };
}
