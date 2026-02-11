import { db } from '@/db';
import { profiles, memberships, organizations } from '@/db/schema';
import { eq, ilike, or, sql, desc, asc, type AnyColumn } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { type AdminQueryParams, type PaginatedResult, buildPaginatedResult } from './types';

export type Profile = InferSelectModel<typeof profiles>;

export interface AdminUpdateProfileData {
  fullName?: string;
  phone?: string;
  systemRole?: 'USER' | 'SUPER_ADMIN' | 'SUPER_ADMIN_EMPLOYEE';
  documentPhotoUrl?: string;
  addressProofUrl?: string;
}

// ============================================
// Sortable columns mapping
// ============================================

const SORT_COLUMNS: Record<string, AnyColumn> = {
  fullName: profiles.fullName,
  email: profiles.email,
  systemRole: profiles.systemRole,
  createdAt: profiles.createdAt,
};

// ============================================
// Queries
// ============================================

/**
 * Fetch all profiles with pagination, sorting, and search.
 */
export async function getAllProfiles(
  params: AdminQueryParams = {},
): Promise<PaginatedResult<Profile>> {
  const {
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 0,
    pageSize = 10,
  } = params;

  const offset = page * pageSize;

  const whereConditions = search
    ? or(
        ilike(profiles.fullName, `%${search}%`),
        ilike(profiles.email, `%${search}%`),
        ilike(profiles.phone, `%${search}%`),
      )
    : undefined;

  const sortColumn = SORT_COLUMNS[sortBy] ?? profiles.createdAt;
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(profiles)
      .where(whereConditions)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(profiles)
      .where(whereConditions),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return buildPaginatedResult(data, total, page, pageSize);
}

/**
 * Fetch a single profile by ID (admin-level, no membership check).
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  const result = await db.query.profiles.findFirst({
    where: eq(profiles.id, id),
  });
  return result ?? null;
}

/**
 * Update any profile field as admin (including systemRole).
 */
export async function updateProfileAsAdmin(
  id: string,
  data: AdminUpdateProfileData,
): Promise<Profile | null> {
  const [updated] = await db
    .update(profiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(profiles.id, id))
    .returning();
  return updated ?? null;
}

export interface ProfileMembership {
  organizationId: string;
  organizationName: string;
  organizationDocument: string;
  role: string;
}

/**
 * Fetch all organizations a profile belongs to (admin-level).
 */
export async function getProfileMemberships(profileId: string): Promise<ProfileMembership[]> {
  const rows = await db
    .select({
      organizationId: memberships.organizationId,
      organizationName: organizations.name,
      organizationDocument: organizations.document,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.profileId, profileId));

  return rows;
}
