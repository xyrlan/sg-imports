import type { Sql } from '../connection';
import type { IdMap, PhaseResult } from '../id-map';
import { createAuthUser, createSupabaseAdmin } from '../supabase-admin';

const SYSTEM_ROLE_MAP: Record<string, string> = {
  ADMIN: 'SUPER_ADMIN',
  USER: 'USER',
  EMPLOYEE: 'USER',
  SELLER: 'USER',
  CUSTOMS_BROKER: 'USER',
  SUPPLIER: 'USER',
};

const ORG_ROLE_MAP: Record<string, string | null> = {
  ADMIN: null,
  USER: 'OWNER',
  EMPLOYEE: 'EMPLOYEE',
  SELLER: 'SELLER',
  CUSTOMS_BROKER: 'CUSTOMS_BROKER',
  SUPPLIER: 'VIEWER',
};

const ORDER_TYPE_MAP: Record<string, string> = {
  ENCOMENDA: 'ORDER',
  CONTA_E_ORDEM: 'DIRECT_ORDER',
};

export async function runPhase02(
  legacy: Sql, target: Sql, idMap: IdMap, supabase: ReturnType<typeof createSupabaseAdmin>
): Promise<PhaseResult> {
  const result: PhaseResult = { phase: '02-auth-orgs', tables: [] };

  // --- Addresses ---
  {
    const rows = await legacy`SELECT * FROM "Address"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        const [inserted] = await target`
          INSERT INTO addresses (id, street, number, complement, neighborhood, city, state, postal_code, country)
          VALUES (gen_random_uuid(), ${r.street ?? ''}, ${r.number ?? ''}, ${r.complement}, ${r.neighborhood ?? ''}, ${r.city ?? ''}, ${r.state ?? ''}, ${r.postalCode ?? ''}, 'Brazil')
          RETURNING id`;
        idMap.set('address', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`Address ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'addresses', migrated, skipped, errors });
    console.log(`  [addresses] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- Users -> Supabase Auth + profiles ---
  {
    const rows = await legacy`SELECT * FROM "User" ORDER BY "createdAt" ASC`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        const authId = await createAuthUser(supabase, r.email, r.name);
        if (!authId) { skipped++; errors.push(`User ${r.id}: failed to create auth user for ${r.email}`); continue; }

        await target`
          INSERT INTO profiles (id, email, full_name, phone, tax_id, marital_status, document_photo_url, address_proof_url, system_role, created_at, updated_at)
          VALUES (${authId}, ${r.email}, ${r.name}, ${r.phone}, ${r.cpf}, ${r.maritalStatus}, ${r.documentPhoto}, ${r.addressProof}, ${SYSTEM_ROLE_MAP[r.role] ?? 'USER'}, ${r.createdAt}, ${r.updatedAt})
          ON CONFLICT (id) DO NOTHING`;
        idMap.set('user', r.id, authId);
        idMap.set('userRole', r.id, r.role);
        migrated++;
      } catch (e: any) { errors.push(`User ${r.id}: ${e.message}`); }
    }
    const firstAdmin = rows.find(r => r.role === 'ADMIN');
    if (firstAdmin) {
      const adminNewId = idMap.get('user', firstAdmin.id);
      if (adminNewId) idMap.set('meta', 'firstAdminProfileId', adminNewId);
    }
    result.tables.push({ name: 'profiles', migrated, skipped, errors });
    console.log(`  [profiles] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- Companies -> organizations ---
  {
    const rows = await legacy`SELECT * FROM "Company"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      if (!r.cnpj) { skipped++; console.log(`  [organizations] SKIP: Company ${r.id} has no CNPJ`); continue; }
      try {
        const billingAddrId = idMap.get('address', r.billingAddressId);
        const deliveryAddrId = idMap.get('address', r.deliveryAddressId);

        const [inserted] = await target`
          INSERT INTO organizations (id, name, trade_name, document, email, phone, tax_regime, state_registry, order_type, min_order_value, asaas_customer_id, billing_address_id, delivery_address_id, social_contract_url, created_at, updated_at)
          VALUES (gen_random_uuid(), ${r.name ?? r.tradeName ?? 'Sem Nome'}, ${r.tradeName}, ${r.cnpj}, ${r.email}, ${r.phone}, ${r.taxRegime}, ${r.stateRegistration}, ${ORDER_TYPE_MAP[r.orderType] ?? 'ORDER'}, ${r.minOrder ?? 0}, ${r.asaasCustomerId}, ${billingAddrId}, ${deliveryAddrId}, ${r.articlesOfIncorporation}, ${r.createdAt}, ${r.updatedAt ?? new Date()})
          ON CONFLICT (document) DO UPDATE SET id = organizations.id
          RETURNING id`;
        idMap.set('company', r.id, inserted.id);

        if (r.cnpj?.replace(/\D/g, '') === '46388683000105') {
          idMap.set('meta', 'brTradingOrgId', inserted.id);
        }
        migrated++;
      } catch (e: any) { errors.push(`Company ${r.id}: ${e.message}`); }
    }

    if (!idMap.get('meta', 'brTradingOrgId')) {
      const [bt] = await target`
        INSERT INTO organizations (id, name, document, created_at, updated_at)
        VALUES (gen_random_uuid(), 'BR TRADING', '46388683000105', NOW(), NOW())
        ON CONFLICT (document) DO UPDATE SET id = organizations.id
        RETURNING id`;
      idMap.set('meta', 'brTradingOrgId', bt.id);
      console.log(`  [organizations] Created BR TRADING placeholder: ${bt.id}`);
    }

    result.tables.push({ name: 'organizations', migrated, skipped, errors });
    console.log(`  [organizations] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- User<->Company M2M -> memberships ---
  {
    const rows = await legacy`SELECT "A" as company_id, "B" as user_id FROM "_CompanyToUser"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const profileId = idMap.get('user', r.user_id);
      const orgId = idMap.get('company', r.company_id);
      const userRole = idMap.get('userRole', r.user_id);

      if (!profileId || !orgId) { skipped++; continue; }
      const membershipRole = ORG_ROLE_MAP[userRole ?? 'USER'];
      if (!membershipRole) { skipped++; continue; }

      try {
        await target`
          INSERT INTO memberships (id, role, organization_id, profile_id, created_at)
          VALUES (gen_random_uuid(), ${membershipRole}, ${orgId}, ${profileId}, NOW())
          ON CONFLICT (organization_id, profile_id) DO NOTHING`;
        migrated++;
      } catch (e: any) { errors.push(`Membership ${r.user_id}-${r.company_id}: ${e.message}`); }
    }
    result.tables.push({ name: 'memberships', migrated, skipped, errors });
    console.log(`  [memberships] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  return result;
}
