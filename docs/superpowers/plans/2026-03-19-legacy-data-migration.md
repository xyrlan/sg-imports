# Legacy Data Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all data from the legacy euimportador database (Prisma/PostgreSQL) to the new sg-imports database (Drizzle/PostgreSQL), including Supabase Auth user creation.

**Architecture:** A standalone TypeScript migration script using raw `postgres.js` for both source and target databases, plus Supabase Admin API for auth. Runs in 8 sequential phases with ID remapping. Each phase is a separate file for clarity.

**Tech Stack:** Bun runtime, postgres.js (raw SQL), @supabase/supabase-js (Admin API), dotenv

**Spec:** `docs/superpowers/specs/2026-03-19-legacy-data-migration-design.md`

---

## File Structure

```
scripts/migrate-legacy/
  index.ts              — CLI entry point, runs phases in order, prints summary
  connection.ts         — postgres.js clients for legacy + new DBs
  id-map.ts             — In-memory Map<string, string> per entity with helpers
  supabase-admin.ts     — Supabase Admin client for user creation
  phases/
    01-foundation.ts    — hsCodes, carriers, ports, terminals, config tables
    02-auth-orgs.ts     — Supabase Auth users, profiles, organizations, memberships, addresses
    03-products.ts      — suppliers, wallets, products, productVariants
    04-logistics.ts     — storageRules, periods, freights, pricingRules, serviceFees, freightProposals
    05-quotes.ts        — quotes, quoteItems, quoteObservations
    06-shipments.ts     — shipments, containers, steps, documents, expenses, changeRequests, freightReceipts
    07-financial.ts     — transactions, exchangeContracts, walletTransactions
    08-system.ts        — notifications, webhookEvents
```

Each phase file exports: `async function runPhaseN(legacy: Sql, target: Sql, idMap: IdMap, supabase?: SupabaseClient): Promise<PhaseResult>`

---

## Task 0: Schema Prerequisite — Add taxId and maritalStatus to profiles

**Files:**
- Modify: `src/db/schema/auth.ts:17-28`

- [ ] **Step 1: Add columns to profiles table in Drizzle schema**

In `src/db/schema/auth.ts`, add two new columns to the `profiles` table:

```typescript
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  phone: text('phone'),
  taxId: text('tax_id'),                     // CPF from legacy
  maritalStatus: text('marital_status'),      // From legacy User.maritalStatus enum
  documentPhotoUrl: text('document_photo_url'),
  addressProofUrl: text('address_proof_url'),
  systemRole: systemRoleEnum('system_role').notNull().default('USER'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

- [ ] **Step 2: Generate Drizzle migration**

Run: `cd /home/xyrlan/github/refactor/sg-imports && bunx drizzle-kit generate`

Expected: New migration file in `drizzle/` adding `tax_id` and `marital_status` columns.

- [ ] **Step 3: Push schema to database**

Run: `cd /home/xyrlan/github/refactor/sg-imports && bunx drizzle-kit push`

Expected: Schema synced with database.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema/auth.ts drizzle/
git commit -m "feat: add taxId and maritalStatus columns to profiles table for legacy migration"
```

---

## Task 1: Infrastructure — connection.ts, id-map.ts, supabase-admin.ts

**Files:**
- Create: `scripts/migrate-legacy/connection.ts`
- Create: `scripts/migrate-legacy/id-map.ts`
- Create: `scripts/migrate-legacy/supabase-admin.ts`

- [ ] **Step 1: Create connection.ts**

```typescript
import postgres from 'postgres';
import 'dotenv/config';

export function createLegacyClient() {
  const url = process.env.DIRECT_URL_PROD;
  if (!url) throw new Error('DIRECT_URL_PROD env var is required');
  return postgres(url, { max: 1 });
}

export function createTargetClient() {
  const url = process.env.DIRECT_URL;
  if (!url) throw new Error('DIRECT_URL env var is required');
  return postgres(url, { max: 1 });
}

export type Sql = ReturnType<typeof postgres>;
```

- [ ] **Step 2: Create id-map.ts**

```typescript
export class IdMap {
  private maps = new Map<string, Map<string, string>>();

  set(entity: string, oldId: string, newId: string) {
    if (!this.maps.has(entity)) this.maps.set(entity, new Map());
    this.maps.get(entity)!.set(oldId, newId);
  }

  get(entity: string, oldId: string | null | undefined): string | null {
    if (!oldId) return null;
    return this.maps.get(entity)?.get(oldId) ?? null;
  }

  getRequired(entity: string, oldId: string): string {
    const newId = this.get(entity, oldId);
    if (!newId) throw new Error(`ID not found for ${entity}: ${oldId}`);
    return newId;
  }

  count(entity: string): number {
    return this.maps.get(entity)?.size ?? 0;
  }
}

export interface PhaseResult {
  phase: string;
  tables: { name: string; migrated: number; skipped: number; errors: string[] }[];
}
```

- [ ] **Step 3: Create supabase-admin.ts**

```typescript
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

const TEMP_PASSWORD = 'MudarSenha123!';

export async function createAuthUser(
  supabase: ReturnType<typeof createClient>,
  email: string,
  fullName?: string | null,
): Promise<string | null> {
  // Try to create user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: TEMP_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName || '' },
  });

  if (error) {
    // If user already exists, fetch their ID by iterating pages
    if (error.message?.includes('already been registered') || error.status === 422) {
      let page = 1;
      while (page <= 20) {
        const { data: listData } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        const existing = listData?.users?.find(u => u.email === email);
        if (existing) return existing.id;
        if (!listData?.users?.length || listData.users.length < 1000) break;
        page++;
      }
      return null;
    }
    console.error(`  [WARN] Failed to create auth user for ${email}: ${error.message}`);
    return null;
  }

  return data.user.id;
}
```

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-legacy/
git commit -m "feat: add migration infrastructure - connections, id-map, supabase admin"
```

---

## Task 2: Phase 01 — Foundation

**Files:**
- Create: `scripts/migrate-legacy/phases/01-foundation.ts`

- [ ] **Step 1: Create 01-foundation.ts**

```typescript
import type { Sql } from '../connection';
import type { IdMap, PhaseResult } from '../id-map';

export async function runPhase01(legacy: Sql, target: Sql, idMap: IdMap): Promise<PhaseResult> {
  const result: PhaseResult = { phase: '01-foundation', tables: [] };

  // --- hsCodes (from Ncm) ---
  {
    const rows = await legacy`SELECT * FROM "Ncm"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        const [inserted] = await target`
          INSERT INTO hs_codes (id, code, description, ii, ipi, pis, cofins, antidumping_tax, updated_at)
          VALUES (gen_random_uuid(), ${r.codigo}, ${null}, ${r.ii ?? 0}, ${r.ipi ?? 0}, ${r.pis ?? 0}, ${r.cofins ?? 0}, ${r.antidumping ?? 0}, ${r.updatedAt ?? new Date()})
          ON CONFLICT (code) DO NOTHING
          RETURNING id`;
        if (inserted) { idMap.set('ncm', r.id, inserted.id); migrated++; }
        else skipped++;
      } catch (e: any) { errors.push(`Ncm ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'hsCodes', migrated, skipped, errors });
    console.log(`  [hsCodes] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- carriers ---
  {
    const rows = await legacy`SELECT * FROM "Carrier"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        const [inserted] = await target`
          INSERT INTO carriers (id, name, scac_code)
          VALUES (gen_random_uuid(), ${r.name}, ${r.apiCode})
          ON CONFLICT (scac_code) DO NOTHING
          RETURNING id`;
        if (inserted) { idMap.set('carrier', r.id, inserted.id); migrated++; }
        else skipped++;
      } catch (e: any) { errors.push(`Carrier ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'carriers', migrated, skipped, errors });
    console.log(`  [carriers] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- ports ---
  {
    const rows = await legacy`SELECT * FROM "Port"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        const [inserted] = await target`
          INSERT INTO ports (id, name, code, country)
          VALUES (gen_random_uuid(), ${r.name}, ${r.code ?? r.id}, ${r.country ?? 'Brazil'})
          ON CONFLICT (code) DO NOTHING
          RETURNING id`;
        if (inserted) { idMap.set('port', r.id, inserted.id); migrated++; }
        else skipped++;
      } catch (e: any) { errors.push(`Port ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'ports', migrated, skipped, errors });
    console.log(`  [ports] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- terminals ---
  {
    const rows = await legacy`SELECT * FROM "Terminal"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        const [inserted] = await target`
          INSERT INTO terminals (id, name, code)
          VALUES (gen_random_uuid(), ${r.tradeName}, ${r.code})
          RETURNING id`;
        idMap.set('terminal', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`Terminal ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'terminals', migrated, skipped, errors });
    console.log(`  [terminals] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- containers (build lookup map, no target table) ---
  {
    const rows = await legacy`SELECT * FROM "Container"`;
    for (const r of rows) {
      // Store container metadata for later lookup: id -> { size, cargoType }
      idMap.set('container', r.id, JSON.stringify({ size: r.size, cargoType: r.cargoType }));
    }
    console.log(`  [containers] mapped: ${rows.length} (lookup only, no target table)`);
  }

  // --- stateIcmsRates (from AliquotaEstado) ---
  {
    const rows = await legacy`SELECT * FROM "aliquota_estados"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    const difalMap: Record<string, string> = { POR_DENTRO: 'INSIDE', POR_FORA: 'OUTSIDE' };
    for (const r of rows) {
      try {
        await target`
          INSERT INTO state_icms_rates (state, difal, icms_rate, updated_at)
          VALUES (${r.estado}, ${difalMap[r.difal] ?? 'INSIDE'}, ${r.aliquota}, NOW())
          ON CONFLICT (state, difal) DO NOTHING`;
        idMap.set('aliquotaEstado', r.id, `${r.estado}_${r.difal}`);
        migrated++;
      } catch (e: any) { errors.push(`AliquotaEstado ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'stateIcmsRates', migrated, skipped, errors });
    console.log(`  [stateIcmsRates] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- siscomexFeeConfig (from TaxaSiscomex) ---
  {
    const rows = await legacy`SELECT * FROM "taxa_siscomex" WHERE "isActive" = true LIMIT 1`;
    if (rows.length > 0) {
      const r = rows[0];
      await target`
        INSERT INTO siscomex_fee_config (id, registration_value, additions, additions_11_to_20, additions_21_to_50, additions_51_and_above, updated_at)
        VALUES (gen_random_uuid(), ${r.valorRegistro}, ${r.adicoes ?? []}, ${r.valorFixoAdicao11a20}, ${r.valorFixoAdicao21Plus}, ${r.valorFixoAdicao51Plus}, NOW())`;
      console.log(`  [siscomexFeeConfig] migrated: 1`);
    }
  }

  // --- globalPlatformRates (from ImpostoAfrmm, SeguroInternacional, DespachoAduaneiroSDA, RevenueTaxes) ---
  {
    let migrated = 0;
    const errors: string[] = [];

    // AFRMM
    const afrmm = await legacy`SELECT * FROM "imposto_afrmm" WHERE "isActive" = true LIMIT 1`;
    if (afrmm.length > 0) {
      await target`
        INSERT INTO global_platform_rates (id, rate_type, value, unit, description, updated_at)
        VALUES (gen_random_uuid(), 'AFRMM', ${afrmm[0].percentual}, 'PERCENT', 'AFRMM - Adicional ao Frete para Renovação da Marinha Mercante', NOW())
        ON CONFLICT (rate_type) DO NOTHING`;
      migrated++;
    }

    // Insurance
    const seguro = await legacy`SELECT * FROM "seguro_internacional" WHERE "isActive" = true LIMIT 1`;
    if (seguro.length > 0) {
      await target`
        INSERT INTO global_platform_rates (id, rate_type, value, unit, description, updated_at)
        VALUES (gen_random_uuid(), 'INTL_INSURANCE', ${seguro[0].percentualSeguro}, 'PERCENT', 'Seguro Internacional', NOW())
        ON CONFLICT (rate_type) DO NOTHING`;
      migrated++;
    }

    // Customs broker SDA
    const sda = await legacy`SELECT * FROM "despacho_aduaneiro_sda" WHERE "isActive" = true LIMIT 1`;
    if (sda.length > 0) {
      await target`
        INSERT INTO global_platform_rates (id, rate_type, value, unit, description, updated_at)
        VALUES (gen_random_uuid(), 'CUSTOMS_BROKER_SDA', ${sda[0].valor}, 'FIXED_BRL', 'Serviço de Desembaraço Aduaneiro', NOW())
        ON CONFLICT (rate_type) DO NOTHING`;
      migrated++;
      if (Number(sda[0].desovaContainer) > 0) {
        await target`
          INSERT INTO global_platform_rates (id, rate_type, value, unit, description, updated_at)
          VALUES (gen_random_uuid(), 'CONTAINER_UNSTUFFING', ${sda[0].desovaContainer}, 'PER_CONTAINER_BRL', 'Desova de Container', NOW())
          ON CONFLICT (rate_type) DO NOTHING`;
        migrated++;
      }
      if (Number(sda[0].lavagemContainer) > 0) {
        await target`
          INSERT INTO global_platform_rates (id, rate_type, value, unit, description, updated_at)
          VALUES (gen_random_uuid(), 'CONTAINER_WASHING', ${sda[0].lavagemContainer}, 'PER_CONTAINER_BRL', 'Lavagem de Container', NOW())
          ON CONFLICT (rate_type) DO NOTHING`;
        migrated++;
      }
    }

    // Revenue taxes
    const rev = await legacy`SELECT * FROM "revenue_taxes" LIMIT 1`;
    if (rev.length > 0) {
      await target`
        INSERT INTO global_platform_rates (id, rate_type, value, unit, description, updated_at)
        VALUES (gen_random_uuid(), 'PIS_DEFAULT', ${rev[0].pisPercent}, 'PERCENT', 'PIS padrão sobre receita', NOW())
        ON CONFLICT (rate_type) DO NOTHING`;
      await target`
        INSERT INTO global_platform_rates (id, rate_type, value, unit, description, updated_at)
        VALUES (gen_random_uuid(), 'COFINS_DEFAULT', ${rev[0].cofinsPercent}, 'PERCENT', 'COFINS padrão sobre receita', NOW())
        ON CONFLICT (rate_type) DO NOTHING`;
      migrated += 2;
    }
    result.tables.push({ name: 'globalPlatformRates', migrated, skipped: 0, errors });
    console.log(`  [globalPlatformRates] migrated: ${migrated}`);
  }

  // --- currencyExchangeBrokers (from CorretorasCambio) ---
  {
    const rows = await legacy`SELECT * FROM "corretoras_cambio"`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        const [inserted] = await target`
          INSERT INTO currency_exchange_brokers (id, name)
          VALUES (gen_random_uuid(), ${r.nome})
          RETURNING id`;
        idMap.set('corretora', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`Corretora ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'currencyExchangeBrokers', migrated, skipped: 0, errors });
    console.log(`  [currencyExchangeBrokers] migrated: ${migrated}`);
  }

  return result;
}
```

- [ ] **Step 2: Verify by reading legacy table counts**

Run: `cd /home/xyrlan/github/refactor/sg-imports && bun run scripts/migrate-legacy/index.ts --dry-run`

(We'll add index.ts in a later task — for now just commit this phase)

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-legacy/phases/01-foundation.ts
git commit -m "feat: add Phase 01 - foundation data migration (hsCodes, carriers, ports, terminals, configs)"
```

---

## Task 3: Phase 02 — Auth & Organizations

**Files:**
- Create: `scripts/migrate-legacy/phases/02-auth-orgs.ts`

- [ ] **Step 1: Create 02-auth-orgs.ts**

```typescript
import type { Sql } from '../connection';
import type { IdMap, PhaseResult } from '../id-map';
import { createAuthUser } from '../supabase-admin';
import type { SupabaseClient } from '@supabase/supabase-js';

const SYSTEM_ROLE_MAP: Record<string, string> = {
  ADMIN: 'SUPER_ADMIN',
  USER: 'USER',
  EMPLOYEE: 'USER',
  SELLER: 'USER',
  CUSTOMS_BROKER: 'USER',
  SUPPLIER: 'USER',
};

const ORG_ROLE_MAP: Record<string, string | null> = {
  ADMIN: null, // no membership
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
  legacy: Sql, target: Sql, idMap: IdMap, supabase: SupabaseClient
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

  // --- Users → Supabase Auth + profiles ---
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
        // Store role for membership creation
        idMap.set('userRole', r.id, r.role);
        migrated++;
      } catch (e: any) { errors.push(`User ${r.id}: ${e.message}`); }
    }
    // Track first admin for fallback createdById
    const firstAdmin = rows.find(r => r.role === 'ADMIN');
    if (firstAdmin) {
      const adminNewId = idMap.get('user', firstAdmin.id);
      if (adminNewId) idMap.set('meta', 'firstAdminProfileId', adminNewId);
    }
    result.tables.push({ name: 'profiles', migrated, skipped, errors });
    console.log(`  [profiles] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- Companies → organizations ---
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

        // Track BR TRADING
        if (r.cnpj?.replace(/\D/g, '') === '46388683000105') {
          idMap.set('meta', 'brTradingOrgId', inserted.id);
        }
        migrated++;
      } catch (e: any) { errors.push(`Company ${r.id}: ${e.message}`); }
    }

    // If BR TRADING wasn't found in legacy, create it
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

  // --- User↔Company M2M → memberships ---
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
      if (!membershipRole) { skipped++; continue; } // ADMIN has no membership

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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-legacy/phases/02-auth-orgs.ts
git commit -m "feat: add Phase 02 - auth users, profiles, organizations, memberships migration"
```

---

## Task 4: Phase 03 — Products

**Files:**
- Create: `scripts/migrate-legacy/phases/03-products.ts`

- [ ] **Step 1: Create 03-products.ts**

```typescript
import type { Sql } from '../connection';
import type { IdMap, PhaseResult } from '../id-map';

export async function runPhase03(legacy: Sql, target: Sql, idMap: IdMap): Promise<PhaseResult> {
  const result: PhaseResult = { phase: '03-products', tables: [] };
  const brTradingId = idMap.getRequired('meta', 'brTradingOrgId');

  // --- suppliers (from OperadorEstrangeiro) ---
  {
    const rows = await legacy`SELECT * FROM "operador_estrangeiro"`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        const [inserted] = await target`
          INSERT INTO suppliers (id, organization_id, name, tax_id, country_code, email, address, siscomex_id)
          VALUES (gen_random_uuid(), ${brTradingId}, ${r.nome}, ${r.tin}, ${r.codigoPais ?? 'CN'}, ${r.email}, ${r.endereco}, ${r.siscomexId})
          ON CONFLICT (siscomex_id) DO NOTHING
          RETURNING id`;
        if (inserted) { idMap.set('operadorEstrangeiro', r.id, inserted.id); migrated++; }
      } catch (e: any) { errors.push(`Supplier ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'suppliers', migrated, skipped: 0, errors });
    console.log(`  [suppliers] migrated: ${migrated}, errors: ${errors.length}`);
  }

  // --- subSuppliers (from SubOperadorEstrangeiro) ---
  {
    const rows = await legacy`SELECT * FROM "sub_operador_estrangeiro"`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const supplierId = idMap.get('operadorEstrangeiro', r.operadorEstrangeiroId);
      if (!supplierId) continue;
      try {
        const [inserted] = await target`
          INSERT INTO sub_suppliers (id, supplier_id, name, tax_id, country_code, email, address)
          VALUES (gen_random_uuid(), ${supplierId}, ${r.nome}, ${null}, ${null}, ${r.email}, ${r.endereco})
          RETURNING id`;
        idMap.set('subOperador', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`SubSupplier ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'subSuppliers', migrated, skipped: 0, errors });
    console.log(`  [subSuppliers] migrated: ${migrated}, errors: ${errors.length}`);
  }

  // --- suppliersWallets (from OperadorEstrangeiroWallet) ---
  {
    const rows = await legacy`SELECT * FROM "operador_estrangeiro_wallet"`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const supplierId = idMap.get('operadorEstrangeiro', r.operadorEstrangeiroId);
      if (!supplierId) continue;
      try {
        const [inserted] = await target`
          INSERT INTO suppliers_wallets (id, supplier_id, balance_usd)
          VALUES (gen_random_uuid(), ${supplierId}, ${Number(r.balanceUsd).toFixed(2)})
          RETURNING id`;
        idMap.set('wallet', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`Wallet ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'suppliersWallets', migrated, skipped: 0, errors });
    console.log(`  [suppliersWallets] migrated: ${migrated}, errors: ${errors.length}`);
  }

  // --- products ---
  {
    const rows = await legacy`SELECT * FROM "Product"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const orgId = idMap.get('company', r.companyId);
      if (!orgId) { skipped++; continue; }
      const hsCodeId = idMap.get('ncm', r.ncmId);
      const supplierId = idMap.get('operadorEstrangeiro', r.operadorEstrangeiroId);
      try {
        const [inserted] = await target`
          INSERT INTO products (id, organization_id, style_code, name, description, photos, hs_code_id, supplier_id, siscomex_id, created_at, updated_at)
          VALUES (gen_random_uuid(), ${orgId}, ${r.codigoInterno}, ${r.nome ?? r.nomeIngles}, ${r.descricao}, ${r.fotos ?? []}, ${hsCodeId}, ${supplierId}, ${r.siscomexCodigo}, ${r.createdAt}, ${r.createdAt})
          RETURNING id`;
        idMap.set('product', r.id, inserted.id);

        // Create default variant from product base data
        const tamanhoCaixa = await legacy`SELECT * FROM "TamanhoCaixa" WHERE "productId" = ${r.id} LIMIT 1`;
        const tc = tamanhoCaixa[0];
        const sku = r.codigoInterno || `LEGACY-${r.id.substring(4, 12)}`;

        const [variant] = await target`
          INSERT INTO product_variants (id, product_id, organization_id, sku, name, price_usd, units_per_carton, carton_height, carton_width, carton_length, carton_weight)
          VALUES (gen_random_uuid(), ${inserted.id}, ${orgId}, ${sku}, ${r.nomeIngles || 'Default'}, ${r.precoDolar}, ${r.quantidadePorCaixa ?? 1}, ${tc?.altura ?? 0}, ${tc?.largura ?? 0}, ${tc?.comprimento ?? 0}, ${r.pesoCaixa ?? 0})
          ON CONFLICT (organization_id, sku) DO NOTHING
          RETURNING id`;
        if (variant) idMap.set('defaultVariant', r.id, variant.id);

        // Create additional variants from Variacao/ElementoVariacao
        const variacoes = await legacy`SELECT * FROM "Variacao" WHERE "productId" = ${r.id}`;
        for (const v of variacoes) {
          const elementos = await legacy`SELECT * FROM "ElementoVariacao" WHERE "variacaoId" = ${v.id}`;
          for (const el of elementos) {
            const variantSku = `${sku}-${el.nome.replace(/\s+/g, '-').substring(0, 20)}`;
            const variantPrice = el.preco ? parseFloat(el.preco) : r.precoDolar;
            try {
              const [ev] = await target`
                INSERT INTO product_variants (id, product_id, organization_id, sku, name, price_usd, units_per_carton, carton_height, carton_width, carton_length, carton_weight, attributes)
                VALUES (gen_random_uuid(), ${inserted.id}, ${orgId}, ${variantSku}, ${el.nome}, ${variantPrice}, ${r.quantidadePorCaixa ?? 1}, ${tc?.altura ?? 0}, ${tc?.largura ?? 0}, ${tc?.comprimento ?? 0}, ${r.pesoCaixa ?? 0}, ${JSON.stringify({ [v.nomeVariacao]: el.nome })})
                ON CONFLICT (organization_id, sku) DO NOTHING
                RETURNING id`;
              if (ev) idMap.set('elementoVariacao', el.id, ev.id);
            } catch (e: any) { errors.push(`Variant ${el.id}: ${e.message}`); }
          }
        }
        migrated++;
      } catch (e: any) { errors.push(`Product ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'products+variants', migrated, skipped, errors });
    console.log(`  [products+variants] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-legacy/phases/03-products.ts
git commit -m "feat: add Phase 03 - products, suppliers, wallets migration"
```

---

## Task 5: Phase 04 — Logistics Config

**Files:**
- Create: `scripts/migrate-legacy/phases/04-logistics.ts`

- [ ] **Step 1: Create 04-logistics.ts**

```typescript
import type { Sql } from '../connection';
import type { IdMap, PhaseResult } from '../id-map';

const CARGO_TO_MODALITY: Record<string, string> = { FCL: 'SEA_FCL', LCL: 'SEA_LCL', PARTLOT: 'SEA_FCL_PARTIAL' };
const CONTAINER_SIZE_MAP: Record<string, string | null> = { STD_20: 'GP_20', STD_40: 'GP_40', HC_40: 'HC_40', HQ_40: 'HC_40', LCL_WM: null };
const FEE_BASIS_MAP: Record<string, string> = { PER_BL: 'PER_BL', PER_CONTAINER: 'PER_CONTAINER', PER_WM: 'PER_WM', PER_BOX: 'PER_BOX', FIXED_TOTAL: 'PER_BL' };

function resolveContainerType(containerId: string | null, idMap: IdMap): string | null {
  if (!containerId) return null;
  const meta = idMap.get('container', containerId);
  if (!meta) return null;
  try {
    const { size } = JSON.parse(meta);
    return CONTAINER_SIZE_MAP[size] ?? null;
  } catch { return null; }
}

export async function runPhase04(legacy: Sql, target: Sql, idMap: IdMap): Promise<PhaseResult> {
  const result: PhaseResult = { phase: '04-logistics', tables: [] };

  // --- storageRules + storagePeriods + additionalFees ---
  {
    const rules = await legacy`SELECT * FROM "StorageRule"`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rules) {
      const terminalId = idMap.get('terminal', r.terminalId);
      if (!terminalId) continue;
      try {
        // Fetch additional fees for this rule
        const fees = await legacy`SELECT * FROM "AdditionalFee" WHERE "storageRuleId" = ${r.id}`;
        const additionalFeesJson = fees.map((f: any) => ({
          name: f.name,
          value: Number(f.value),
          basis: FEE_BASIS_MAP[f.basis] ?? 'PER_BL',
        }));

        const [inserted] = await target`
          INSERT INTO storage_rules (id, terminal_id, shipment_type, currency, min_value, free_days, cif_insurance, additional_fees)
          VALUES (gen_random_uuid(), ${terminalId}, ${CARGO_TO_MODALITY[r.cargoType] ?? 'SEA_FCL'}, ${r.currency ?? 'BRL'}, ${Number(r.minimumValue)}, ${0}, ${Number(r.generalMinCIF)}, ${JSON.stringify(additionalFeesJson)})
          RETURNING id`;
        idMap.set('storageRule', r.id, inserted.id);

        // Migrate periods
        const periods = await legacy`SELECT * FROM "StoragePeriod" WHERE "storageRuleId" = ${r.id} ORDER BY "periodNumber" ASC`;
        for (const p of periods) {
          const chargeType = Number(p.cifPercent) > 0 ? 'PERCENTAGE' : 'FIXED';
          const rate = Number(p.cifPercent) > 0 ? Number(p.cifPercent) : Number(p.fixedPrice);
          await target`
            INSERT INTO storage_periods (id, rule_id, days_from, days_to, charge_type, rate, is_daily_rate)
            VALUES (gen_random_uuid(), ${inserted.id}, ${p.daysFrom}, ${p.daysTo}, ${chargeType}, ${rate}, ${p.isDailyRate ?? false})`;
        }
        migrated++;
      } catch (e: any) { errors.push(`StorageRule ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'storageRules+periods', migrated, skipped: 0, errors });
    console.log(`  [storageRules+periods] migrated: ${migrated}, errors: ${errors.length}`);
  }

  // --- internationalFreights + M2M port tables ---
  {
    const rows = await legacy`SELECT * FROM "InternacionalFreight"`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const carrierId = idMap.get('carrier', r.carrierId);
      const containerType = resolveContainerType(r.containerId, idMap);
      try {
        const [inserted] = await target`
          INSERT INTO international_freights (id, shipping_modality, carrier_id, container_type, value, currency, free_time_days, expected_profit, valid_from, valid_to, created_at, updated_at)
          VALUES (gen_random_uuid(), ${containerType ? 'SEA_FCL' : 'SEA_LCL'}, ${carrierId}, ${containerType}, ${Number(r.value)}, ${r.currency ?? 'USD'}, ${r.freeTime ?? 0}, ${r.expectedProfit ? Number(r.expectedProfit) : null}, ${r.createdAt}, ${r.validTo}, ${r.createdAt}, ${r.updatedAt})
          RETURNING id`;
        idMap.set('internacionalFreight', r.id, inserted.id);

        // M2M ports of loading
        const loadingPorts = await legacy`
          SELECT "B" as port_id FROM "_PortOfLoadingInternacionalFreights" WHERE "A" = ${r.id}`;
        for (const lp of loadingPorts) {
          const portId = idMap.get('port', lp.port_id);
          if (portId) {
            await target`
              INSERT INTO int_freight_ports_loading (international_freight_id, port_id)
              VALUES (${inserted.id}, ${portId})
              ON CONFLICT DO NOTHING`;
          }
        }

        // M2M ports of discharge
        const dischargePorts = await legacy`
          SELECT "B" as port_id FROM "_PortOfDischargeInternacionalFreights" WHERE "A" = ${r.id}`;
        for (const dp of dischargePorts) {
          const portId = idMap.get('port', dp.port_id);
          if (portId) {
            await target`
              INSERT INTO int_freight_ports_discharge (international_freight_id, port_id)
              VALUES (${inserted.id}, ${portId})
              ON CONFLICT DO NOTHING`;
          }
        }
        migrated++;
      } catch (e: any) { errors.push(`IntlFreight ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'internationalFreights', migrated, skipped: 0, errors });
    console.log(`  [internationalFreights] migrated: ${migrated}, errors: ${errors.length}`);
  }

  // --- pricingRules + pricingItems ---
  {
    const rules = await legacy`SELECT * FROM "PricingRule"`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rules) {
      const carrierId = idMap.get('carrier', r.carrierId);
      if (!carrierId) continue;
      const portId = idMap.get('port', r.portId);
      const containerType = resolveContainerType(r.containerId, idMap);
      try {
        const [inserted] = await target`
          INSERT INTO pricing_rules (id, carrier_id, port_id, container_type, scope, valid_from, valid_to, created_at, updated_at)
          VALUES (gen_random_uuid(), ${carrierId}, ${portId}, ${containerType}, ${r.scope ?? 'SPECIFIC'}, ${r.validFrom}, ${r.validTo}, NOW(), NOW())
          RETURNING id`;
        idMap.set('pricingRule', r.id, inserted.id);

        // Items (only those with pricingRuleId, skip orderId-linked ones)
        const items = await legacy`SELECT * FROM "PricingItem" WHERE "pricingRuleId" = ${r.id}`;
        for (const item of items) {
          await target`
            INSERT INTO pricing_items (id, pricing_rule_id, name, amount, currency, basis, created_at, updated_at)
            VALUES (gen_random_uuid(), ${inserted.id}, ${item.name}, ${Number(item.amount)}, ${item.currency ?? 'BRL'}, ${FEE_BASIS_MAP[item.basis] ?? 'PER_CONTAINER'}, NOW(), NOW())`;
        }
        migrated++;
      } catch (e: any) { errors.push(`PricingRule ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'pricingRules+items', migrated, skipped: 0, errors });
    console.log(`  [pricingRules+items] migrated: ${migrated}, errors: ${errors.length}`);
  }

  // --- globalServiceFeeConfig (from HonorarioConfig isGlobal=true) ---
  {
    const rows = await legacy`
      SELECT hc.*, mw.value as "mwValue"
      FROM "HonorarioConfig" hc
      LEFT JOIN "MinimumWage" mw ON hc."minimumWageId" = mw.id
      WHERE hc."isGlobal" = true AND hc."isActive" = true
      LIMIT 1`;
    if (rows.length > 0) {
      const r = rows[0];
      await target`
        INSERT INTO global_service_fee_config (id, minimum_wage_brl, default_multiplier, default_percentage, default_apply_to_china, updated_at)
        VALUES (gen_random_uuid(), ${r.mwValue ?? 1530}, ${r.minimumWageMultiplier ?? 2}, ${r.percentualHonorarios ?? 2.5}, ${r.aplicarSobreMercadoriaChina ?? true}, NOW())`;
      console.log(`  [globalServiceFeeConfig] migrated: 1`);
    }
  }

  // --- serviceFeeConfigs (from HonorarioConfig per company) ---
  {
    const rows = await legacy`SELECT * FROM "HonorarioConfig" WHERE "isGlobal" = false AND "companyId" IS NOT NULL`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const orgId = idMap.get('company', r.companyId);
      if (!orgId) continue;
      try {
        await target`
          INSERT INTO service_fee_configs (id, organization_id, minimum_value_multiplier, percentage, apply_to_china_products, updated_at)
          VALUES (gen_random_uuid(), ${orgId}, ${r.minimumWageMultiplier ?? 2}, ${r.percentualHonorarios ?? 2.5}, ${r.aplicarSobreMercadoriaChina ?? true}, NOW())
          ON CONFLICT (organization_id) DO NOTHING`;
        migrated++;
      } catch (e: any) { errors.push(`ServiceFee ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'serviceFeeConfigs', migrated, skipped: 0, errors });
    console.log(`  [serviceFeeConfigs] migrated: ${migrated}, errors: ${errors.length}`);
  }

  // --- freightProposals ---
  {
    const rows = await legacy`SELECT * FROM "FreightProposal"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    const statusMap: Record<string, string> = { SENT: 'SENT', NOT_SENT: 'DRAFT' };
    for (const r of rows) {
      const intlFreightId = idMap.get('internacionalFreight', r.internacionalFreightId);
      const createdById = idMap.get('user', r.createdById);
      if (!intlFreightId || !createdById) { skipped++; continue; }
      const orgId = idMap.get('company', r.companyId);
      try {
        const [inserted] = await target`
          INSERT INTO freight_proposals (id, organization_id, international_freight_id, status, freight_value, total_value, custom_taxes, transit_time_days, valid_until, pdf_url, cnpj, email, reference, incoterm, created_by_id, created_at, updated_at)
          VALUES (gen_random_uuid(), ${orgId}, ${intlFreightId}, ${statusMap[r.status] ?? 'DRAFT'}, ${Number(r.freightValue)}, ${Number(r.totalValue)}, ${r.customTaxes ? JSON.stringify(r.customTaxes) : null}, ${r.transitTime}, ${r.validUntil}, ${r.pdfUrl}, ${r.cnpj}, ${r.email}, ${r.reference}, ${r.incoterm ?? 'FOB'}, ${createdById}, ${r.createdAt}, ${r.updatedAt})
          RETURNING id`;
        idMap.set('freightProposal', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`FreightProposal ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'freightProposals', migrated, skipped, errors });
    console.log(`  [freightProposals] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-legacy/phases/04-logistics.ts
git commit -m "feat: add Phase 04 - logistics config, freights, pricing rules migration"
```

---

## Task 6: Phase 05 — Quotes

**Files:**
- Create: `scripts/migrate-legacy/phases/05-quotes.ts`

- [ ] **Step 1: Create 05-quotes.ts**

```typescript
import type { Sql } from '../connection';
import type { IdMap, PhaseResult } from '../id-map';

const PROFORMA_STATUS_MAP: Record<string, string> = {
  UNUSED: 'DRAFT',
  ADDED_TO_CART: 'SENT',
  CONTRACT_SIGNING: 'PENDING_SIGNATURE',
  COMPLETED: 'CONVERTED',
};

const MODALITY_MAP: Record<string, string> = { MARITIMO: 'SEA_FCL', AEREO: 'AIR' };

export async function runPhase05(legacy: Sql, target: Sql, idMap: IdMap): Promise<PhaseResult> {
  const result: PhaseResult = { phase: '05-quotes', tables: [] };
  const brTradingId = idMap.getRequired('meta', 'brTradingOrgId');
  const fallbackCreatedById = idMap.get('meta', 'firstAdminProfileId') ?? brTradingId;

  // --- quotes (from Proforma + ProformaMetadata) ---
  {
    const rows = await legacy`
      SELECT p.*, pm.incoterm, pm."despesasUSD", pm."modalidadeFrete", pm."firstPaymentPercentage" as "metaFpp",
             pm.commission as "metaCommission", pm.icms as "metaIcms", pm."pedidoResumido"
      FROM "Proforma" p
      LEFT JOIN "ProformaMetadata" pm ON pm."proformaId" = p.id`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const clientOrgId = idMap.get('company', r.companyId);
      if (!clientOrgId) { skipped++; continue; }
      try {
        const metadata = JSON.stringify({
          commissionPercent: r.metaCommission ?? r.commission,
          firstPaymentFobPercent: r.metaFpp ?? r.firstPaymentPercentage,
        });
        const shippingModality = r.modalidadeFrete ? (MODALITY_MAP[r.modalidadeFrete] ?? null) : null;

        const [inserted] = await target`
          INSERT INTO quotes (id, seller_organization_id, client_organization_id, created_by_id, public_token, type, status, name, target_dolar, incoterm, metadata, shipping_modality, created_at, updated_at)
          VALUES (gen_random_uuid(), ${brTradingId}, ${clientOrgId}, ${fallbackCreatedById}, ${r.shareLink}, 'PROFORMA', ${PROFORMA_STATUS_MAP[r.status] ?? 'DRAFT'}, ${r.name ?? 'Proforma legada'}, ${5.70}, ${r.incoterm ?? 'FOB'}, ${metadata}, ${shippingModality}, ${r.createdAt}, ${r.updatedAt})
          RETURNING id`;
        idMap.set('proforma', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`Proforma ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'quotes(proforma)', migrated, skipped, errors });
    console.log(`  [quotes(proforma)] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- quotes (from Simulation) ---
  {
    const rows = await legacy`SELECT * FROM "Simulation"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const clientOrgId = idMap.get('company', r.companyId);
      if (!clientOrgId) { skipped++; continue; }
      try {
        const [inserted] = await target`
          INSERT INTO quotes (id, seller_organization_id, client_organization_id, created_by_id, type, status, name, target_dolar, created_at, updated_at)
          VALUES (gen_random_uuid(), ${brTradingId}, ${clientOrgId}, ${fallbackCreatedById}, 'SIMULATION', 'DRAFT', ${r.nome ?? 'Simulacao legada'}, ${5.70}, ${r.createdAt}, ${r.updatedAt})
          RETURNING id`;
        idMap.set('simulation', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`Simulation ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'quotes(simulation)', migrated, skipped, errors });
    console.log(`  [quotes(simulation)] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- quoteItems (from CartItem with proformaId or simulationId) ---
  {
    const rows = await legacy`SELECT * FROM "CartItem" WHERE "proformaId" IS NOT NULL OR "simulationId" IS NOT NULL`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const quoteId = r.proformaId
        ? idMap.get('proforma', r.proformaId)
        : idMap.get('simulation', r.simulationId);
      if (!quoteId) { skipped++; continue; }

      // Try to resolve variant: first elementoVariacao, then defaultVariant
      let variantId = idMap.get('elementoVariacao', r.sellerProductId)
        ?? idMap.get('defaultVariant', r.sellerProductId)
        ?? idMap.get('defaultVariant', r.product_id);

      // If no variant, use product JSON as snapshot
      const snapshot = !variantId && r.product ? JSON.stringify(r.product) : null;

      try {
        const [inserted] = await target`
          INSERT INTO quote_items (id, quote_id, variant_id, simulated_product_snapshot, quantity, price_usd)
          VALUES (gen_random_uuid(), ${quoteId}, ${variantId}, ${snapshot}, ${r.quantity}, ${r.price ?? 0})
          RETURNING id`;
        idMap.set('cartItem', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`CartItem ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'quoteItems', migrated, skipped, errors });
    console.log(`  [quoteItems] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- quoteObservations (from ProformaObservation) ---
  {
    const rows = await legacy`SELECT * FROM "ProformaObservation" WHERE "proformaId" IS NOT NULL`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const quoteId = idMap.get('proforma', r.proformaId);
      if (!quoteId) { skipped++; continue; }
      try {
        // Fetch attachments
        const attachments = await legacy`SELECT * FROM "ProformaAttachment" WHERE "observationId" = ${r.id}`;
        const docs = attachments.map((a: any) => ({ name: a.fileName, url: a.fileUrl }));

        await target`
          INSERT INTO quote_observations (id, quote_id, description, documents, created_at, updated_at)
          VALUES (gen_random_uuid(), ${quoteId}, ${r.content}, ${JSON.stringify(docs)}, ${r.createdAt}, ${r.updatedAt})`;
        migrated++;
      } catch (e: any) { errors.push(`Observation ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'quoteObservations', migrated, skipped, errors });
    console.log(`  [quoteObservations] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-legacy/phases/05-quotes.ts
git commit -m "feat: add Phase 05 - quotes, quote items, observations migration"
```

---

## Task 7: Phase 06 — Shipments

**Files:**
- Create: `scripts/migrate-legacy/phases/06-shipments.ts`

- [ ] **Step 1: Create 06-shipments.ts**

This is the most complex phase. Key mappings:

```typescript
import type { Sql } from '../connection';
import type { IdMap, PhaseResult } from '../id-map';

const CONTAINER_SIZE_MAP: Record<string, string | null> = { STD_20: 'GP_20', STD_40: 'GP_40', HC_40: 'HC_40', HQ_40: 'HC_40', LCL_WM: null };

const STEP_SEQUENCE_TO_ENUM: Record<number, string> = {
  1: 'CONTRACT_CREATION',
  2: 'MERCHANDISE_PAYMENT',
  3: 'MERCHANDISE_PAYMENT',
  4: 'SHIPPING_PREPARATION',
  5: 'DOCUMENT_PREPARATION',
  6: 'CUSTOMS_CLEARANCE',
  7: 'COMPLETION',
};

const STEP_SEQUENCE_TO_STATUS: Record<number, string> = {
  1: 'PRODUCTION',
  2: 'PRODUCTION',
  3: 'BOOKED',
  4: 'IN_TRANSIT',
  5: 'CUSTOMS_CLEARANCE',
  6: 'RELEASED',
  7: 'RELEASED',
};

function resolveContainerType(containerId: string | null, idMap: IdMap): string | null {
  if (!containerId) return null;
  const meta = idMap.get('container', containerId);
  if (!meta) return null;
  try { return ({ STD_20: 'GP_20', STD_40: 'GP_40', HC_40: 'HC_40', HQ_40: 'HC_40' } as any)[JSON.parse(meta).size] ?? null; } catch { return null; }
}

export async function runPhase06(legacy: Sql, target: Sql, idMap: IdMap): Promise<PhaseResult> {
  const result: PhaseResult = { phase: '06-shipments', tables: [] };
  const brTradingId = idMap.getRequired('meta', 'brTradingOrgId');

  // Pre-load StepTemplates for mapping
  const stepTemplates = await legacy`SELECT * FROM "StepTemplate" ORDER BY sequence ASC`;
  const stepTemplateMap = new Map<number, any>();
  for (const st of stepTemplates) stepTemplateMap.set(st.id, st);

  // --- shipments (from Order + legacy Shipment + Contract) ---
  {
    const rows = await legacy`
      SELECT o.*, s."bookingNumber", s."shipsgoShipmentId", s."shipsgoStatus", s."shipsgoLastUpdate",
             s."containerSizes", s."carrierScac", s."containerQuantity",
             c."zapSignId", c."zapSignDocument", c.status as "contractStatus"
      FROM "Order" o
      LEFT JOIN "Shipment" s ON o."shipmentId" = s.id
      LEFT JOIN "Contract" c ON o."contractId" = c.id
      ORDER BY o."createdAt" ASC`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];

    for (const r of rows) {
      const clientOrgId = idMap.get('company', r.companyId);
      if (!clientOrgId) { skipped++; continue; }

      // Resolve carrier from SCAC code
      let carrierId = null;
      if (r.carrierScac) {
        const [carrier] = await target`SELECT id FROM carriers WHERE scac_code = ${r.carrierScac} LIMIT 1`;
        if (carrier) carrierId = carrier.id;
      }

      // Determine status
      let status = 'PENDING';
      if (r.status === 'COMPLETED') status = 'FINISHED';
      else if (r.status === 'CANCELLED') status = 'CANCELED';
      else if (r.status === 'IN_PROGRESS' && r.currentStepId) {
        const step = await legacy`SELECT "stepTemplateId" FROM "OrderStep" WHERE id = ${r.currentStepId}`;
        if (step.length > 0) {
          const template = stepTemplateMap.get(step[0].stepTemplateId);
          status = template ? (STEP_SEQUENCE_TO_STATUS[template.sequence] ?? 'PRODUCTION') : 'PRODUCTION';
        }
      }

      // Determine currentStep enum
      let currentStep = 'CONTRACT_CREATION';
      if (r.currentStepId) {
        const step = await legacy`SELECT "stepTemplateId" FROM "OrderStep" WHERE id = ${r.currentStepId}`;
        if (step.length > 0) {
          const template = stepTemplateMap.get(step[0].stepTemplateId);
          currentStep = template ? (STEP_SEQUENCE_TO_ENUM[template.sequence] ?? 'CONTRACT_CREATION') : 'CONTRACT_CREATION';
        }
      }

      // ZapSign
      const zapSignStatus = r.contractStatus === 'SIGNED' ? 'signed' : r.contractStatus === 'PENDING' ? 'pending' : 'created';

      try {
        const [inserted] = await target`
          INSERT INTO shipments (id, seller_organization_id, client_organization_id, status, booking_number, carrier_id,
            fob_advance_percentage, current_step, zap_sign_id, zap_sign_status,
            ships_go_id, ships_go_last_update,
            created_at, updated_at)
          VALUES (gen_random_uuid(), ${brTradingId}, ${clientOrgId}, ${status}, ${r.bookingNumber},
            ${carrierId}, ${r.firstPaymentPercentage ?? 0.3},
            ${currentStep}, ${r.zapSignId}, ${zapSignStatus},
            ${r.shipsgoShipmentId}, ${r.shipsgoLastUpdate},
            ${r.createdAt}, ${r.updatedAt})
          RETURNING id`;
        idMap.set('order', r.id, inserted.id);

        // Migrate container rows from legacy Shipment.containerSizes array
        if (r.containerSizes && Array.isArray(r.containerSizes)) {
          for (const size of r.containerSizes) {
            const ct = CONTAINER_SIZE_MAP[size];
            if (ct) {
              await target`
                INSERT INTO shipment_containers (id, shipment_id, type)
                VALUES (gen_random_uuid(), ${inserted.id}, ${ct})`;
            }
          }
        }
        migrated++;
      } catch (e: any) { errors.push(`Order ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'shipments', migrated, skipped, errors });
    console.log(`  [shipments] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- shipmentStepHistory (from OrderStep) ---
  {
    const rows = await legacy`SELECT * FROM "OrderStep"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const shipmentId = idMap.get('order', r.orderId);
      if (!shipmentId) { skipped++; continue; }
      const template = stepTemplateMap.get(r.stepTemplateId);
      const stepEnum = template ? (STEP_SEQUENCE_TO_ENUM[template.sequence] ?? 'CONTRACT_CREATION') : 'CONTRACT_CREATION';
      const completedById = idMap.get('user', r.completedById);
      try {
        await target`
          INSERT INTO shipment_step_history (id, shipment_id, step, status, started_at, completed_at, completed_by_id)
          VALUES (gen_random_uuid(), ${shipmentId}, ${stepEnum}, ${r.status === 'IN_PROGRESS' ? 'COMPLETED' : r.status}, NOW(), ${r.completedAt}, ${completedById})`;
        migrated++;
      } catch (e: any) { errors.push(`OrderStep ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'shipmentStepHistory', migrated, skipped, errors });
    console.log(`  [shipmentStepHistory] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- shipmentDocuments (from Document) ---
  {
    const VALID_DOC_TYPES = new Set(['COMMERCIAL_INVOICE','PACKING_LIST','BILL_OF_LADING','IMPORT_DECLARATION','ORIGIN_CERTIFICATE','SISCOMEX_RECEIPT','ICMS_PROOF','MBL_DOCUMENT','HBL_DOCUMENT','STORAGE_INVOICE','SALES_INVOICE_PDF','SALES_INVOICE_XML','OTHER']);
    const rows = await legacy`SELECT * FROM "Document"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const shipmentId = idMap.get('order', r.orderId);
      if (!shipmentId) { skipped++; continue; }
      if (!r.file) { skipped++; continue; } // url is NOT NULL
      const docType = VALID_DOC_TYPES.has(r.type) ? r.type : 'OTHER';
      try {
        const [inserted] = await target`
          INSERT INTO shipment_documents (id, shipment_id, type, name, url, created_at)
          VALUES (gen_random_uuid(), ${shipmentId}, ${docType}, ${r.name ?? 'Documento'}, ${r.file}, ${r.createdAt})
          RETURNING id`;
        idMap.set('document', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`Document ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'shipmentDocuments', migrated, skipped, errors });
    console.log(`  [shipmentDocuments] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- shipmentExpenses (from OrderExpense, denormalized) ---
  {
    const rows = await legacy`SELECT * FROM "OrderExpense"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    const expenseFields: [string, string][] = [
      ['ii', 'TAX_II'], ['ipi', 'TAX_IPI'], ['pis', 'TAX_PIS'], ['cofins', 'TAX_COFINS'],
      ['taxaSiscomex', 'TAX_SISCOMEX'], ['freteInternacional', 'FREIGHT_INTL'],
      ['armazenagem', 'STORAGE'], ['servicoDesembaraco', 'CUSTOMS_BROKER'],
      ['desovaContainer', 'HANDLING'], ['lavagemContainer', 'HANDLING'],
      ['discount', 'DISCOUNT'], ['multas', 'OTHER'], ['afrmm', 'OTHER'],
      ['seguroInternacional', 'OTHER'], ['dtcDta', 'OTHER'],
      ['difal', 'TAX_ICMS'], ['icmsTributosSaida', 'TAX_ICMS'], ['juros', 'OTHER'],
    ];
    for (const r of rows) {
      const shipmentId = idMap.get('order', r.orderId);
      if (!shipmentId) { skipped++; continue; }
      try {
        for (const [field, category] of expenseFields) {
          const val = Number(r[field]);
          if (val && val !== 0) {
            await target`
              INSERT INTO shipment_expenses (id, shipment_id, category, description, value, currency)
              VALUES (gen_random_uuid(), ${shipmentId}, ${category}, ${field}, ${Math.abs(val)}, 'BRL')`;
            migrated++;
          }
        }
      } catch (e: any) { errors.push(`OrderExpense ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'shipmentExpenses', migrated, skipped, errors });
    console.log(`  [shipmentExpenses] migrated: ${migrated} rows, skipped: ${skipped}`);
  }

  // --- shipmentChangeRequests (from OrderChangeRequest) ---
  {
    const rows = await legacy`SELECT * FROM "OrderChangeRequest"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    const statusMap: Record<string, string> = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED', CANCELLED: 'REJECTED', FAILED: 'REJECTED' };
    for (const r of rows) {
      const shipmentId = idMap.get('order', r.orderId);
      const requestedById = idMap.get('user', r.requestedById);
      if (!shipmentId || !requestedById) { skipped++; continue; }
      try {
        await target`
          INSERT INTO shipment_change_requests (id, shipment_id, requested_by_id, status, description, changes_json, admin_response, processed_at, created_at)
          VALUES (gen_random_uuid(), ${shipmentId}, ${requestedById}, ${statusMap[r.status] ?? 'PENDING'}, ${r.requestType ?? 'Change request'}, ${JSON.stringify({ currentItems: r.currentItems, proposedItems: r.proposedItems })}, ${r.adminNotes}, ${r.processedAt}, ${r.createdAt})`;
        migrated++;
      } catch (e: any) { errors.push(`ChangeRequest ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'shipmentChangeRequests', migrated, skipped, errors });
    console.log(`  [shipmentChangeRequests] migrated: ${migrated}, skipped: ${skipped}`);
  }

  // --- shipmentFreightReceipts (from InternationalFreightReceipt) ---
  {
    const rows = await legacy`SELECT * FROM "InternationalFreightReceipt"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const shipmentId = idMap.get('order', r.orderId);
      if (!shipmentId) { skipped++; continue; }
      const carrierId = idMap.get('carrier', r.carrierId);
      const containerType = resolveContainerType(r.containerId, idMap);
      const portLoadingId = idMap.get('port', r.portOfLoadingId);
      const portDischargeId = idMap.get('port', r.portOfDischargeId);
      const documentId = idMap.get('document', r.documentId);
      if (!carrierId || !containerType || !portLoadingId || !portDischargeId) { skipped++; continue; }
      try {
        await target`
          INSERT INTO shipment_freight_receipts (id, shipment_id, carrier_id, container_type, container_quantity, port_of_loading_id, port_of_discharge_id, freight_value, dolar_quotation, document_id, freight_expenses, pricing_items, created_at, updated_at)
          VALUES (gen_random_uuid(), ${shipmentId}, ${carrierId}, ${containerType}, ${r.containerQuantity ?? 1}, ${portLoadingId}, ${portDischargeId}, ${Number(r.freightValue)}, ${Number(r.dolarQuotation)}, ${documentId}, ${JSON.stringify(r.freightExpenses ?? [])}, ${JSON.stringify(r.pricingItems ?? [])}, ${r.createdAt}, NOW())`;
        migrated++;
      } catch (e: any) { errors.push(`FreightReceipt ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'shipmentFreightReceipts', migrated, skipped, errors });
    console.log(`  [shipmentFreightReceipts] migrated: ${migrated}, skipped: ${skipped}`);
  }

  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-legacy/phases/06-shipments.ts
git commit -m "feat: add Phase 06 - shipments, steps, documents, expenses, change requests migration"
```

---

## Task 8: Phase 07 — Financial

**Files:**
- Create: `scripts/migrate-legacy/phases/07-financial.ts`

- [ ] **Step 1: Create 07-financial.ts**

```typescript
import type { Sql } from '../connection';
import type { IdMap, PhaseResult } from '../id-map';

const PAYMENT_STATUS_MAP: Record<string, string> = {
  PENDING: 'PENDING', PAID: 'PAID', FAILED: 'OVERDUE', REFUNDED: 'PAID',
};

export async function runPhase07(legacy: Sql, target: Sql, idMap: IdMap): Promise<PhaseResult> {
  const result: PhaseResult = { phase: '07-financial', tables: [] };

  // --- transactions (from Payment) ---
  {
    const rows = await legacy`SELECT * FROM "Payment"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const shipmentId = idMap.get('order', r.orderId);
      const orgId = idMap.get('company', r.companyId);
      if (!shipmentId || !orgId) { skipped++; continue; }
      try {
        const [inserted] = await target`
          INSERT INTO transactions (id, organization_id, shipment_id, type, status, amount_brl, exchange_rate, gateway_id, paid_at, created_at)
          VALUES (gen_random_uuid(), ${orgId}, ${shipmentId}, 'MERCHANDISE', ${PAYMENT_STATUS_MAP[r.status] ?? 'PENDING'}, ${r.value}, ${r.dolar}, ${r.asaasPaymentId}, ${r.status === 'PAID' ? r.updatedAt : null}, ${r.createdAt})
          RETURNING id`;
        idMap.set('payment', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`Payment ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'transactions', migrated, skipped, errors });
    console.log(`  [transactions] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- exchangeContracts ---
  {
    const rows = await legacy`SELECT * FROM "ExchangeContract"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const transactionId = idMap.get('payment', r.paymentId);
      if (!transactionId) { skipped++; continue; }
      if (!r.numeroContratoCambio || !r.cambioCloseDate) { skipped++; errors.push(`ExchangeContract ${r.id}: missing contractNumber or closedAt`); continue; }

      // Resolve document URLs
      let contractFileUrl = null;
      let swiftFileUrl = null;
      if (r.contratoCambioId) {
        const [doc] = await legacy`SELECT file FROM "Document" WHERE id = ${r.contratoCambioId}`;
        if (doc) contractFileUrl = doc.file;
      }
      if (r.swiftDocId) {
        const [doc] = await legacy`SELECT file FROM "Document" WHERE id = ${r.swiftDocId}`;
        if (doc) swiftFileUrl = doc.file;
      }

      // Try to resolve broker
      const brokerId = idMap.get('corretora', r.corretoraCambio);

      try {
        const [inserted] = await target`
          INSERT INTO exchange_contracts (id, transaction_id, broker_id, contract_number, broker_name, closed_at, amount_usd, exchange_rate, contract_file_url, swift_file_url)
          VALUES (gen_random_uuid(), ${transactionId}, ${brokerId}, ${r.numeroContratoCambio}, ${r.corretoraCambio}, ${r.cambioCloseDate}, ${r.dolarCarriedOut}, ${r.exchangeRate}, ${contractFileUrl}, ${swiftFileUrl})
          RETURNING id`;
        idMap.set('exchangeContract', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`ExchangeContract ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'exchangeContracts', migrated, skipped, errors });
    console.log(`  [exchangeContracts] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- suppliersWalletTransactions ---
  {
    const rows = await legacy`SELECT * FROM "operador_estrangeiro_wallet_transaction"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const walletId = idMap.get('wallet', r.walletId);
      const exchangeContractId = idMap.get('exchangeContract', r.exchangeContractId);
      const shipmentId = idMap.get('order', r.orderId);
      const transactionId = idMap.get('payment', r.paymentId);
      if (!walletId || !shipmentId) { skipped++; continue; }
      try {
        await target`
          INSERT INTO suppliers_wallet_transactions (id, wallet_id, exchange_contract_id, order_id, transaction_id, amount, type, created_at)
          VALUES (gen_random_uuid(), ${walletId}, ${exchangeContractId}, ${shipmentId}, ${transactionId}, ${Number(r.amount).toFixed(2)}, ${r.type}, ${r.createdAt})
          ON CONFLICT (wallet_id, order_id, type) DO NOTHING`;
        migrated++;
      } catch (e: any) { errors.push(`WalletTx ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'suppliersWalletTransactions', migrated, skipped, errors });
    console.log(`  [suppliersWalletTransactions] migrated: ${migrated}, skipped: ${skipped}`);
  }

  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-legacy/phases/07-financial.ts
git commit -m "feat: add Phase 07 - transactions, exchange contracts, wallet transactions migration"
```

---

## Task 9: Phase 08 — System

**Files:**
- Create: `scripts/migrate-legacy/phases/08-system.ts`

- [ ] **Step 1: Create 08-system.ts**

```typescript
import type { Sql } from '../connection';
import type { IdMap, PhaseResult } from '../id-map';

const WEBHOOK_STATUS_MAP: Record<string, string> = {
  PENDING: 'PENDING', PROCESSING: 'PROCESSING', COMPLETED: 'COMPLETED', FAILED: 'FAILED',
};

export async function runPhase08(legacy: Sql, target: Sql, idMap: IdMap): Promise<PhaseResult> {
  const result: PhaseResult = { phase: '08-system', tables: [] };

  // --- notifications ---
  {
    const rows = await legacy`SELECT * FROM "Notification"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const profileId = idMap.get('user', r.userId);
      if (!profileId) { skipped++; continue; }
      const isRead = r.status === 'COMPLETED' || r.status === 'APPROVED';
      try {
        await target`
          INSERT INTO notifications (id, profile_id, title, message, type, read, created_at)
          VALUES (gen_random_uuid(), ${profileId}, ${'Notificacao migrada'}, ${r.message}, 'INFO', ${isRead}, ${r.timestamp})`;
        migrated++;
      } catch (e: any) { errors.push(`Notification ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'notifications', migrated, skipped, errors });
    console.log(`  [notifications] migrated: ${migrated}, skipped: ${skipped}`);
  }

  // --- webhookEvents ---
  {
    const rows = await legacy`SELECT * FROM "WebhookEvent"`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        await target`
          INSERT INTO webhook_events (id, provider, event_type, external_id, payload, status, attempts, last_error, processed_at, created_at, updated_at)
          VALUES (gen_random_uuid(), ${r.provider}, ${r.eventType}, ${r.externalId}, ${JSON.stringify(r.payload)}, ${WEBHOOK_STATUS_MAP[r.status] ?? 'PENDING'}, ${r.attempts}, ${r.lastError}, ${r.processedAt}, ${r.createdAt}, ${r.updatedAt ?? new Date()})
          ON CONFLICT (provider, external_id, event_type) DO NOTHING`;
        migrated++;
      } catch (e: any) { errors.push(`WebhookEvent ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'webhookEvents', migrated, skipped: 0, errors });
    console.log(`  [webhookEvents] migrated: ${migrated}, errors: ${errors.length}`);
  }

  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-legacy/phases/08-system.ts
git commit -m "feat: add Phase 08 - notifications, webhook events migration"
```

---

## Task 10: Orchestrator — index.ts

**Files:**
- Create: `scripts/migrate-legacy/index.ts`

- [ ] **Step 1: Create index.ts**

```typescript
import 'dotenv/config';
import { createLegacyClient, createTargetClient } from './connection';
import { IdMap, type PhaseResult } from './id-map';
import { createSupabaseAdmin } from './supabase-admin';
import { runPhase01 } from './phases/01-foundation';
import { runPhase02 } from './phases/02-auth-orgs';
import { runPhase03 } from './phases/03-products';
import { runPhase04 } from './phases/04-logistics';
import { runPhase05 } from './phases/05-quotes';
import { runPhase06 } from './phases/06-shipments';
import { runPhase07 } from './phases/07-financial';
import { runPhase08 } from './phases/08-system';

async function main() {
  console.log('=== Legacy Data Migration: euimportador → sg-imports ===\n');

  const legacy = createLegacyClient();
  const target = createTargetClient();
  const supabase = createSupabaseAdmin();
  const idMap = new IdMap();
  const results: PhaseResult[] = [];

  const phases = [
    { name: 'Phase 1: Foundation', fn: () => runPhase01(legacy, target, idMap) },
    { name: 'Phase 2: Auth & Organizations', fn: () => runPhase02(legacy, target, idMap, supabase) },
    { name: 'Phase 3: Products', fn: () => runPhase03(legacy, target, idMap) },
    { name: 'Phase 4: Logistics Config', fn: () => runPhase04(legacy, target, idMap) },
    { name: 'Phase 5: Quotes', fn: () => runPhase05(legacy, target, idMap) },
    { name: 'Phase 6: Shipments', fn: () => runPhase06(legacy, target, idMap) },
    { name: 'Phase 7: Financial', fn: () => runPhase07(legacy, target, idMap) },
    { name: 'Phase 8: System', fn: () => runPhase08(legacy, target, idMap) },
  ];

  for (const phase of phases) {
    console.log(`\n--- ${phase.name} ---`);
    try {
      const phaseResult = await phase.fn();
      results.push(phaseResult);
    } catch (err: any) {
      console.error(`\n[FATAL] ${phase.name} failed: ${err.message}`);
      console.error(err.stack);
      results.push({ phase: phase.name, tables: [{ name: 'FATAL', migrated: 0, skipped: 0, errors: [err.message] }] });
    }
  }

  // Print summary
  console.log('\n\n========== MIGRATION SUMMARY ==========\n');
  let totalMigrated = 0, totalSkipped = 0, totalErrors = 0;
  for (const r of results) {
    console.log(`[${r.phase}]`);
    for (const t of r.tables) {
      console.log(`  ${t.name}: ${t.migrated} migrated, ${t.skipped} skipped, ${t.errors.length} errors`);
      if (t.errors.length > 0) {
        for (const e of t.errors.slice(0, 5)) console.log(`    ERROR: ${e}`);
        if (t.errors.length > 5) console.log(`    ... and ${t.errors.length - 5} more errors`);
      }
      totalMigrated += t.migrated;
      totalSkipped += t.skipped;
      totalErrors += t.errors.length;
    }
  }
  console.log(`\nTOTAL: ${totalMigrated} migrated, ${totalSkipped} skipped, ${totalErrors} errors`);

  await legacy.end();
  await target.end();
  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Test the script runs (dry connectivity check)**

Run: `cd /home/xyrlan/github/refactor/sg-imports && bun run scripts/migrate-legacy/index.ts`

Expected: Script starts, connects to both databases, runs phases, prints summary.

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-legacy/index.ts
git commit -m "feat: add migration orchestrator - runs all 8 phases with summary report"
```

---

## Task 11: End-to-End Testing & Fixes

- [ ] **Step 1: Run full migration**

Run: `cd /home/xyrlan/github/refactor/sg-imports && bun run scripts/migrate-legacy/index.ts`

- [ ] **Step 2: Review the summary output**

Check for:
- Any FATAL phase failures
- High error counts on specific tables
- Skipped records that shouldn't be skipped

- [ ] **Step 3: Fix any issues found**

Common issues to check:
- Column name mismatches (Prisma uses camelCase, but PostgreSQL table may use snake_case)
- Enum values not matching
- NULL constraint violations
- Unique constraint conflicts

- [ ] **Step 4: Re-run until clean**

Run again after fixes until the summary shows acceptable numbers.

- [ ] **Step 5: Final commit**

```bash
git add scripts/migrate-legacy/
git commit -m "fix: migration script adjustments after end-to-end testing"
```
