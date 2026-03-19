'use server';

import { z } from 'zod';
import { requireSuperAdmin } from '@/services/auth.service';
import { getAllProfiles, getAllOrganizations } from '@/services/admin';

const paginationParamsSchema = z.object({
  page: z.number().int().min(0),
  pageSize: z.number().int().min(1).max(100),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export async function fetchProfilesAction(params: unknown) {
  await requireSuperAdmin();
  const validated = paginationParamsSchema.parse(params);
  return getAllProfiles(validated);
}

export async function fetchOrganizationsAction(params: unknown) {
  await requireSuperAdmin();
  const validated = paginationParamsSchema.parse(params);
  return getAllOrganizations(validated);
}
