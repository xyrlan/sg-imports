import { db } from '@/db';
import { profiles, organizations, memberships } from '@/db/schema';
import { eq, ilike, or, sql, desc, asc, type AnyColumn } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

// ============================================
// Types
// ============================================

type Profile = InferSelectModel<typeof profiles>;
type Organization = InferSelectModel<typeof organizations>;

export interface AdminQueryParams {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface OrganizationWithMemberCount extends Organization {
  memberCount: number;
}

// ============================================
// Profiles
// ============================================

/**
 * Fetch all profiles with pagination, sorting, and search
 * Used by the super-admin management panel
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

  // Build where conditions
  const whereConditions = search
    ? or(
        ilike(profiles.fullName, `%${search}%`),
        ilike(profiles.email, `%${search}%`),
        ilike(profiles.phone, `%${search}%`),
      )
    : undefined;

  // Build orderBy
  const sortColumn = getSortColumnForProfiles(sortBy);
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  // Execute queries in parallel
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

  return {
    data,
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  };
}

// ============================================
// Organizations
// ============================================

/**
 * Fetch all organizations with member count, pagination, sorting, and search
 * Used by the super-admin management panel
 */
export async function getAllOrganizations(
  params: AdminQueryParams = {},
): Promise<PaginatedResult<OrganizationWithMemberCount>> {
  const {
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 0,
    pageSize = 10,
  } = params;

  const offset = page * pageSize;

  // Build where conditions
  const whereConditions = search
    ? or(
        ilike(organizations.name, `%${search}%`),
        ilike(organizations.tradeName, `%${search}%`),
        ilike(organizations.document, `%${search}%`),
        ilike(organizations.email, `%${search}%`),
      )
    : undefined;

  // Build orderBy
  const sortColumn = getSortColumnForOrganizations(sortBy);
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  // Execute queries in parallel
  const [data, countResult] = await Promise.all([
    db
      .select({
        id: organizations.id,
        name: organizations.name,
        tradeName: organizations.tradeName,
        document: organizations.document,
        email: organizations.email,
        phone: organizations.phone,
        taxRegime: organizations.taxRegime,
        stateRegistry: organizations.stateRegistry,
        orderType: organizations.orderType,
        minOrderValue: organizations.minOrderValue,
        billingAddressId: organizations.billingAddressId,
        deliveryAddressId: organizations.deliveryAddressId,
        socialContractUrl: organizations.socialContractUrl,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        memberCount: sql<number>`(
          SELECT count(*) FROM ${memberships}
          WHERE ${memberships.organizationId} = ${organizations.id}
        )`.as('member_count'),
      })
      .from(organizations)
      .where(whereConditions)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(whereConditions),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return {
    data: data.map((row) => ({
      ...row,
      memberCount: Number(row.memberCount),
    })),
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  };
}

// ============================================
// Stats
// ============================================

/**
 * Get admin dashboard stats
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

// ============================================
// Helpers
// ============================================

function getSortColumnForProfiles(sortBy: string): AnyColumn {
  const columnMap: Record<string, AnyColumn> = {
    fullName: profiles.fullName,
    email: profiles.email,
    systemRole: profiles.systemRole,
    createdAt: profiles.createdAt,
  };
  return columnMap[sortBy] ?? profiles.createdAt;
}

function getSortColumnForOrganizations(sortBy: string): AnyColumn {
  const columnMap: Record<string, AnyColumn> = {
    name: organizations.name,
    document: organizations.document,
    createdAt: organizations.createdAt,
  };
  return columnMap[sortBy] ?? organizations.createdAt;
}
