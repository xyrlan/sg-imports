import { db } from '@/db';
import { addresses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

type Address = InferSelectModel<typeof addresses>;
type AddressInsert = InferInsertModel<typeof addresses>;

export interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

/**
 * Fetch address data from ViaCEP API
 * @param cep - CEP without formatting (8 digits)
 * @returns Address data or null if not found
 */
export async function fetchAddressFromCEP(cep: string): Promise<ViaCEPResponse | null> {
  try {
    // Remove formatting from CEP
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length !== 8) {
      return null;
    }

    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      return null;
    }

    const data: ViaCEPResponse = await response.json();

    // ViaCEP returns { erro: true } when CEP is not found
    if (data.erro) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching CEP:', error);
    return null;
  }
}

/**
 * Create a new address in the database
 * @param data - Address data to insert
 * @returns Created address
 */
export async function createAddress(data: AddressInsert): Promise<Address> {
  const [address] = await db.insert(addresses).values(data).returning();
  return address;
}

/**
 * Update an existing address
 * @param id - Address UUID
 * @param data - Updated address data
 * @returns Updated address or null if not found
 */
export async function updateAddress(
  id: string,
  data: Partial<AddressInsert>
): Promise<Address | null> {
  const [address] = await db
    .update(addresses)
    .set(data)
    .where(eq(addresses.id, id))
    .returning();

  return address || null;
}

/**
 * Get address by ID
 * @param id - Address UUID
 * @returns Address or null if not found
 */
export async function getAddressById(id: string): Promise<Address | null> {
  const address = await db.query.addresses.findFirst({
    where: eq(addresses.id, id),
  });

  return address || null;
}

/**
 * Delete an address
 * @param id - Address UUID
 * @returns Success boolean
 */
export async function deleteAddress(id: string): Promise<boolean> {
  const result = await db.delete(addresses).where(eq(addresses.id, id)).returning();
  return result.length > 0;
}
