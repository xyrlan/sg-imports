import { db } from '@/db';
import { organizations, memberships, profiles, serviceFeeConfigs } from '@/db/schema';
import { eq, ilike, or, sql, desc, asc, type AnyColumn } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { type AdminQueryParams, type PaginatedResult, buildPaginatedResult } from './types';

export type ServiceFeeConfig = InferSelectModel<typeof serviceFeeConfigs>;

type Organization = InferSelectModel<typeof organizations>;

export interface OrganizationWithMemberCount extends Organization {
  memberCount: number;
}

// ============================================
// Sortable columns mapping
// ============================================

const SORT_COLUMNS: Record<string, AnyColumn> = {
  name: organizations.name,
  document: organizations.document,
  createdAt: organizations.createdAt,
};

// ============================================
// Queries
// ============================================

/**
 * Fetch all organizations with member count, pagination, sorting, and search.
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

  const whereConditions = search
    ? or(
        ilike(organizations.name, `%${search}%`),
        ilike(organizations.tradeName, `%${search}%`),
        ilike(organizations.document, `%${search}%`),
        ilike(organizations.email, `%${search}%`),
      )
    : undefined;

  const sortColumn = SORT_COLUMNS[sortBy] ?? organizations.createdAt;
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

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

  return buildPaginatedResult(
    data.map((row) => ({ ...row, memberCount: Number(row.memberCount) })),
    total,
    page,
    pageSize,
  );
}

// ============================================
// Single-entity queries (admin-level)
// ============================================

/**
 * Fetch a single organization by ID (admin-level, no membership check).
 */
export async function getOrganizationByIdAsAdmin(id: string): Promise<Organization | null> {
  const result = await db.query.organizations.findFirst({
    where: eq(organizations.id, id),
  });
  return result ?? null;
}

export interface OrganizationAddress {
  id: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrganizationWithAddresses extends Organization {
  billingAddress: OrganizationAddress | null;
  deliveryAddress: OrganizationAddress | null;
}

/**
 * Fetch organization with billing and delivery addresses.
 */
export async function getOrganizationWithAddresses(id: string): Promise<OrganizationWithAddresses | null> {
  const result = await db.query.organizations.findFirst({
    where: eq(organizations.id, id),
    with: {
      billingAddress: true,
      deliveryAddress: true,
    },
  });
  if (!result) return null;
  return {
    ...result,
    billingAddress: result.billingAddress ?? null,
    deliveryAddress: result.deliveryAddress ?? null,
  };
}

export interface OrganizationMember {
  profileId: string;
  fullName: string | null;
  email: string;
  role: string;
  avatarUrl: string | null;
  joinedAt: Date;
}

/**
 * Fetch all members of an organization with their profile data.
 */
export async function getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  const rows = await db
    .select({
      profileId: memberships.profileId,
      fullName: profiles.fullName,
      email: profiles.email,
      role: memberships.role,
      avatarUrl: profiles.avatarUrl,
      joinedAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(profiles, eq(memberships.profileId, profiles.id))
    .where(eq(memberships.organizationId, orgId));

  return rows;
}

export interface AdminUpdateOrgData {
  tradeName?: string;
  email?: string;
  phone?: string;
  taxRegime?: string;
  stateRegistry?: string;
  orderType?: 'ORDER' | 'DIRECT_ORDER';
  minOrderValue?: string;
  socialContractUrl?: string;
}

/**
 * Update organization fields as admin (no membership check).
 */
export async function updateOrganizationAsAdmin(
  id: string,
  data: AdminUpdateOrgData,
): Promise<Organization | null> {
  const [updated] = await db
    .update(organizations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning();
  return updated ?? null;
}

/**
 * Update a member's organization role as admin.
 */
export async function updateMembershipRole(
  orgId: string,
  profileId: string,
  role: string,
): Promise<boolean> {
  const result = await db
    .update(memberships)
    .set({ role: role as typeof memberships.$inferInsert.role })
    .where(
      sql`${memberships.organizationId} = ${orgId} AND ${memberships.profileId} = ${profileId}`,
    )
    .returning();
  return result.length > 0;
}

// ============================================
// Service Fee Config
// ============================================

/**
 * Fetch the service fee configuration for an organization.
 */
export async function getServiceFeeConfig(orgId: string): Promise<ServiceFeeConfig | null> {
  const result = await db.query.serviceFeeConfigs.findFirst({
    where: eq(serviceFeeConfigs.organizationId, orgId),
  });
  return result ?? null;
}

export interface UpsertServiceFeeData {
  percentage?: string;
  minimumValueMultiplier?: number;
  applyToChinaProducts?: boolean;
}

/**
 * Create or update the service fee config for an organization.
 */
export async function upsertServiceFeeConfig(
  orgId: string,
  data: UpsertServiceFeeData,
): Promise<ServiceFeeConfig> {
  const [result] = await db
    .insert(serviceFeeConfigs)
    .values({
      organizationId: orgId,
      ...data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: serviceFeeConfigs.organizationId,
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })
    .returning();
  return result;
}
