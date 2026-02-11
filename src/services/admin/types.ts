/**
 * Shared types for all admin services.
 *
 * Every entity service (profiles, organizations, shipments, …)
 * receives the same query shape and returns the same paginated wrapper.
 * This keeps the admin API surface consistent as new entities are added.
 */

export interface AdminQueryParams {
  /** Free-text search applied with ILIKE across entity-specific columns */
  search?: string;
  /** Column key to sort by (entity-specific, falls back to createdAt) */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Zero-based page index */
  page?: number;
  /** Rows per page */
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/**
 * Helper to build a standard PaginatedResult from a data array + count.
 * Avoids repeating the same math in every service function.
 */
export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  };
}
