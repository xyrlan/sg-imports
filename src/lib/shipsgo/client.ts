/**
 * ShipsGo API Client — Ocean carriers sync
 * @see https://api.shipsgo.com/v2/ocean/carriers
 */

const BASE_URL = process.env.SHIPSGO_BASE_URL ?? 'https://api.shipsgo.com/v2';
const API_KEY = process.env.SHIPSGO_API_KEY;

export type OceanCarrierStatus = 'ACTIVE' | 'PASSIVE';

export interface OceanCarrier {
  scac: string;
  name: string;
  status: OceanCarrierStatus;
}

export interface ShipsGoCarriersMeta {
  more: boolean;
  total: number | null;
}

export interface ShipsGoCarriersResponse {
  message: string;
  carriers: OceanCarrier[];
  meta: ShipsGoCarriersMeta;
}

function getAuthHeaders(): HeadersInit {
  if (!API_KEY) {
    throw new Error('SHIPSGO_API_KEY is not configured');
  }
  return {
    'X-Shipsgo-User-Token': API_KEY,
    'Content-Type': 'application/json',
  };
}

export interface FetchCarriersOptions {
  filters?: {
    status?: OceanCarrierStatus;
    name?: string;
    nameContains?: string;
  };
  take?: number;
  skip?: number;
  orderBy?: string;
}

/**
 * Fetches carriers from ShipsGo /ocean/carriers endpoint.
 */
export async function fetchCarriers(
  options: FetchCarriersOptions = {},
): Promise<ShipsGoCarriersResponse> {
  const { filters = {}, take = 100, skip = 0, orderBy } = options;
  const params = new URLSearchParams();

  if (filters.status) {
    params.set('filters[status]', `eq:${filters.status}`);
  }
  if (filters.name) {
    params.set('filters[name]', `eq:${filters.name}`);
  }
  if (filters.nameContains) {
    params.set('filters[name]', `contains:${filters.nameContains}`);
  }
  params.set('take', String(Math.min(100, Math.max(1, take))));
  params.set('skip', String(Math.max(0, skip)));
  if (orderBy) {
    params.set('order_by', orderBy);
  }

  const url = `${BASE_URL}/ocean/carriers?${params.toString()}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ShipsGo API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<ShipsGoCarriersResponse>;
}
