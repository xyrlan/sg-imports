# Legacy Data Migration: euimportador → sg-imports

## Context

Migrate all data from the legacy euimportador database (Prisma/PostgreSQL) to the new sg-imports database (Drizzle/PostgreSQL). The schemas differ significantly in table names, column names, enums, and structure.

## Connections

- **Source (legacy):** `DIRECT_URL_PROD` env var
- **Target (new):** `DIRECT_URL` env var
- **Supabase Auth:** `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (Admin API for user creation)

## Schema Prerequisite

Add two columns to the `profiles` table before migration:

- `taxId` (text, nullable) — maps from legacy `User.cpf`
- `maritalStatus` (text, nullable) — maps from legacy `User.maritalStatus`

## ID Strategy

- Generate new UUIDs for all records
- Maintain an in-memory `Map<string, string>` (`oldId → newId`) per entity to resolve foreign keys
- No need to preserve legacy prefixed IDs (`usr_`, `cmp_`, etc.)
- **Exception:** `stateIcmsRates` uses composite PK `(state, difal)` — use `oldId → compositeKey` map

## Seller Organization

BR TRADING (CNPJ: 46.388.683/0001-05) is the `sellerOrganizationId` for all quotes and shipments. Created or found in Phase 2.

## User Migration

- Create Supabase Auth users via Admin API with temporary password `MudarSenha123!`
- **Duplicate handling:** If email already exists in Supabase Auth, skip creation and use existing auth user ID
- Users must reset password on first login
- Role mapping:

| Legacy `User.role` | `profiles.systemRole` | `memberships.role` |
|---|---|---|
| ADMIN | SUPER_ADMIN | — (no membership) |
| USER | USER | OWNER |
| EMPLOYEE | USER | EMPLOYEE |
| SELLER | USER | SELLER |
| CUSTOMS_BROKER | USER | CUSTOMS_BROKER |
| SUPPLIER | USER | VIEWER |

## Enum Mappings

### ContainerSize → containerTypeEnum

| Legacy (`ContainerSize`) | New (`containerTypeEnum`) |
|---|---|
| STD_20 | GP_20 |
| STD_40 | GP_40 |
| HC_40 | HC_40 |
| HQ_40 | HC_40 (closest match) |
| LCL_WM | null (LCL shipments don't use container type) |

### CargoType → shippingModalityEnum

| Legacy (`CargoType`) | New (`shippingModalityEnum`) |
|---|---|
| FCL | SEA_FCL |
| LCL | SEA_LCL |
| PARTLOT | SEA_FCL_PARTIAL |

### OrderStatus → shipmentStatusEnum

| Legacy (`OrderStatus`) | New (`shipmentStatusEnum`) | Rule |
|---|---|---|
| OPEN | PENDING | Direct |
| IN_PROGRESS | Derived from `currentStep.stepTemplate.sequence` | See mapping below |
| COMPLETED | FINISHED | Direct |
| CANCELLED | CANCELED | Direct |

**IN_PROGRESS step-to-status mapping** (by StepTemplate sequence/name):

| StepTemplate sequence | shipmentStatusEnum |
|---|---|
| 1 (Contract/Initial) | PRODUCTION |
| 2 (Payment) | PRODUCTION |
| 3 (Shipping) | BOOKED |
| 4 (in transit) | IN_TRANSIT |
| 5 (Customs) | CUSTOMS_CLEARANCE |
| 6+ (Delivery/Final) | RELEASED |

### ProformaStatus → quoteStatusEnum

| Legacy | New |
|---|---|
| UNUSED | DRAFT |
| ADDED_TO_CART | SENT |
| CONTRACT_SIGNING | PENDING_SIGNATURE |
| COMPLETED | CONVERTED |

### Notification.status → read boolean

| Legacy (`Status`) | `read` |
|---|---|
| COMPLETED, APPROVED | true |
| PENDING, INCOMPLETE, REJECTED, FAILED | false |

### FreightProposalStatus → freightProposalStatusEnum

| Legacy | New |
|---|---|
| SENT | SENT |
| NOT_SENT | DRAFT |

## Required Fallback Values

Fields that are NOT NULL in the new schema but absent/nullable in legacy:

| New Field | Fallback | Reason |
|---|---|---|
| `quotes.createdById` | First SUPER_ADMIN profile ID | Legacy Proforma has no creator field |
| `quotes.targetDolar` | `5.70` | No legacy equivalent; use reasonable default |
| `organizations.document` | Skip record if `Company.cnpj` is NULL | Cannot insert without CNPJ |
| `addresses.*` (street, number, etc.) | `''` (empty string) | Legacy fields are nullable, new are NOT NULL |
| `internationalFreights.validFrom` | Legacy `createdAt` value | Legacy has no validFrom |
| `suppliers.organizationId` | BR TRADING org ID | Legacy OperadorEstrangeiro has no org link |

## Migration Phases

### Phase 1 — Foundation (no external FKs)

| Legacy Table | New Table | Key Mappings |
|---|---|---|
| Ncm | hsCodes | codigo→code, ii/ipi/pis/cofins/antidumping direct |
| Carrier | carriers | name direct, apiCode→scacCode |
| Port | ports | name/code/country direct |
| Terminal | terminals | tradeName→name, code direct. Legacy `name` field dropped (nullable, `tradeName` is the required one) |
| AliquotaEstado | stateIcmsRates | estado→state, aliquota→icmsRate, difal: POR_DENTRO→INSIDE / POR_FORA→OUTSIDE. Composite PK (state, difal) |
| TaxaSiscomex | siscomexFeeConfig | valorRegistro→registrationValue, adicoes→additions, etc. |
| ImpostoAfrmm | globalPlatformRates | Row with rateType=AFRMM, percentual→value, unit=PERCENT |
| SeguroInternacional | globalPlatformRates | Row with rateType=INTL_INSURANCE |
| DespachoAduaneiroSDA | globalPlatformRates | Rows: CUSTOMS_BROKER_SDA (valor), CONTAINER_UNSTUFFING (desovaContainer), CONTAINER_WASHING (lavagemContainer) |
| CorretorasCambio | currencyExchangeBrokers | nome→name |
| RevenueTaxes | globalPlatformRates | Rows: PIS_DEFAULT, COFINS_DEFAULT |

### Phase 2 — Auth & Organizations

| Legacy | New | Key Mappings |
|---|---|---|
| Address | addresses | street/number/city/neighborhood/state/postalCode/complement direct. Nullable fields use `''` fallback |
| User | Supabase Auth + profiles | name→fullName, email, phone, documentPhoto→documentPhotoUrl, addressProof→addressProofUrl, cpf→taxId, maritalStatus→maritalStatus, role→systemRole. Skip duplicate emails in Supabase Auth |
| Company | organizations | name, tradeName, cnpj→document (**skip if cnpj is NULL**), email, phone, taxRegime, stateRegistration→stateRegistry, articlesOfIncorporation→socialContractUrl, minOrder→minOrderValue, orderType: ENCOMENDA→ORDER / CONTA_E_ORDEM→DIRECT_ORDER, asaasCustomerId, billingAddressId/deliveryAddressId (remapped) |
| User↔Company M2M (_CompanyToUser) | memberships | role based on User.role mapping. One User with multiple Companies = multiple memberships with same role |

**Company fields that do NOT migrate** (no equivalent in new schema): `isSelected`, `isDocumentsVerified`, `isDataVerified`, `approvalStatus`, `industryArea`, `openingDate`, `situation`, `type`, `size`, `legalNature`, `situationDate`, `situationReason`, `lastUpdate`, `status`, `efr`, `specialSituation`, `specialSituationDate`, `capitalStock`, `icms`, `wechat`, `whatsapp`.

**User fields that do NOT migrate**: `isDocumentsVerified`, `isDataVerified`, `approvalStatus`, `isVerified`, `rg`, `hashedPassword`, `forgotPasswordToken`, `verifyToken` and related expiry fields.

### Phase 3 — Products

| Legacy | New | Key Mappings |
|---|---|---|
| OperadorEstrangeiro | suppliers | nome→name, tin→taxId, codigoPais→countryCode, email, endereco→address, siscomexId. organizationId = BR TRADING |
| SubOperadorEstrangeiro | subSuppliers | nome→name, same pattern |
| OperadorEstrangeiroWallet | suppliersWallets | balanceUsd direct. **Note:** Precision downgrade from Decimal(18,4) to Decimal(10,2) — values rounded to 2 decimal places |
| Product | products | nome→name, descricao→description, fotos→photos, codigoInterno→styleCode, ncmId→hsCodeId, operadorEstrangeiroId→supplierId, companyId→organizationId |
| Product + TamanhoCaixa + Variacao + ElementoVariacao | productVariants | One default variant per product: sku=codigoInterno, name=nomeIngles or "Default", precoDolar→priceUsd, quantidadePorCaixa→unitsPerCarton, pesoCaixa→cartonWeight, TamanhoCaixa→cartonHeight/Width/Length. Additional variants from Variacao/ElementoVariacao with attributes JSON: `{nomeVariacao: elementoNome}` |

### Phase 4 — Logistics Config & Freight

| Legacy | New | Key Mappings |
|---|---|---|
| StorageRule | storageRules | terminalId (remapped), cargoType→shipmentType (see enum mapping), minimumValue→minValue. `AdditionalFee` rows aggregated into `additionalFees` JSONB: `[{name, value, basis}]` |
| StoragePeriod | storagePeriods | storageRuleId→ruleId (remapped), daysFrom/daysTo direct. cifPercent→rate with chargeType=PERCENTAGE, fixedPrice→rate with chargeType=FIXED, isDailyRate direct. `periodNumber` NOT migrated (column doesn't exist in new schema) |
| InternacionalFreight | internationalFreights | value, currency, freeTime→freeTimeDays, expectedProfit, carrierId (remapped), validFrom=createdAt. Container resolved: legacy `containerId` → lookup Container.size → containerTypeEnum mapping. Ports via M2M junction tables (internationalFreightPortsOfLoading, internationalFreightPortsOfDischarge) |
| PricingRule | pricingRules | carrierId (remapped), portId (remapped), containerId→containerType (via Container lookup), scope, validFrom/validTo |
| PricingItem (pricingRuleId set) | pricingItems | name/amount/currency/basis direct, pricingRuleId remapped. **PricingItem rows with orderId set are skipped** (those are shipment-specific freight expenses, handled in Phase 6 via OrderExpense) |
| HonorarioConfig (isGlobal=true) | globalServiceFeeConfig | MinimumWage.value→minimumWageBrl, minimumWageMultiplier→defaultMultiplier, percentualHonorarios→defaultPercentage, aplicarSobreMercadoriaChina→defaultApplyToChina |
| HonorarioConfig (isGlobal=false) | serviceFeeConfigs | companyId→organizationId, minimumWageMultiplier→minimumValueMultiplier, percentualHonorarios→percentage, aplicarSobreMercadoriaChina→applyToChinaProducts |
| FreightProposal | freightProposals | cnpj, email, reference, status: NOT_SENT→DRAFT / SENT→SENT, freightValue, totalValue, customTaxes (JSON direct), transitTime→transitTimeDays, validUntil, pdfUrl, createdById (remapped), internacionalFreightId (remapped), companyId→organizationId. **Fields NOT migrated:** `idInterno`, `freeTime`, `pricingItems` (JSON, no column in new schema), `carrierId`/`containerId`/`portOfLoadingId`/`portOfDischargeId` (resolved through internacionalFreightId relationship) |

### Phase 5 — Quotes

| Legacy | New | Key Mappings |
|---|---|---|
| Proforma + ProformaMetadata | quotes | type=PROFORMA, name, status (see enum mapping), companyId→clientOrganizationId, sellerOrganizationId=BR TRADING, shareLink→publicToken, createdById=first SUPER_ADMIN, targetDolar=5.70. From ProformaMetadata: incoterm, modalidadeFrete→shippingModality (MARITIMO→SEA_FCL, AEREO→AIR), commission→metadata.commissionPercent, firstPaymentPercentage→metadata.firstPaymentFobPercent. `honorarioConfigId` intentionally discarded (fee config now per-org, not per-quote). `cnpj`, `icms`, `isSelected` not migrated (redundant with org data) |
| Simulation | quotes (type=SIMULATION) | nome→name, companyId→clientOrganizationId, sellerOrganizationId=BR TRADING, status=DRAFT, createdById=first SUPER_ADMIN, targetDolar=5.70 |
| CartItem (proformaId not null) | quoteItems | quantity, price→priceUsd, sellerProductId→variantId (remapped). If no sellerProductId, product JSON→simulatedProductSnapshot |
| CartItem (simulationId not null) | quoteItems | Same logic, linked to simulation-origin quote |
| ProformaObservation | quoteObservations | content→description, createdById used for provenance. ProformaAttachment rows→documents JSON `[{name: fileName, url: fileUrl}]` |

**Note:** ProformaObservation rows linked to Orders (via M2M `orders`) but NOT to any Proforma are migrated as quoteObservations only if they have a `proformaId`. Order-only observations are not migrated (no equivalent in new schema for shipment-level observations separate from documents).

### Phase 6 — Shipments

| Legacy | New | Key Mappings |
|---|---|---|
| Order | shipments | companyId→clientOrganizationId, sellerOrganizationId=BR TRADING, status (see enum mapping), firstPaymentPercentage→fobAdvancePercentage, commission (direct), shipmentId→link to legacy Shipment for booking/tracking fields |
| Legacy Shipment model | shipments fields | bookingNumber, shipsgoShipmentId→shipsGoId, shipsgoLastUpdate. `terminalId` not migrated (no column in new shipments). `carrierScac`→resolve to carrierId via Carrier.scacCode lookup. `followers`/`tags` not migrated. `containerQuantity` not migrated directly (derived from shipmentContainers count) |
| Legacy Shipment.containerSizes | shipmentContainers | Each ContainerSize value → one shipmentContainers row with type mapped via enum mapping |
| Contract | shipments zapSign fields | zapSignId→zapSignId, zapSignDocument JSON→zapSignStatus extraction, Contract.status→zapSignStatus: PENDING→'created', SIGNED→'signed' |
| OrderStep | shipmentStepHistory | Map stepTemplateId to shipmentStepEnum via StepTemplate lookup. status: PENDING→PENDING, COMPLETED→COMPLETED, FAILED→FAILED, IN_PROGRESS→COMPLETED (as started). completedById (remapped), completedAt |
| Document | shipmentDocuments | name, file→url, type string→documentTypeEnum (unmapped types→OTHER), orderId→shipmentId |
| OrderExpense | shipmentExpenses | Each non-zero field becomes a row: ii→TAX_II, ipi→TAX_IPI, pis→TAX_PIS, cofins→TAX_COFINS, taxaSiscomex→TAX_SISCOMEX, afrmm→OTHER, freteInternacional→FREIGHT_INTL, armazenagem→STORAGE, seguroInternacional→OTHER, servicoDesembaraco→CUSTOMS_BROKER, desovaContainer→HANDLING, lavagemContainer→HANDLING, discount→DISCOUNT, multas→OTHER, dtcDta→OTHER, difal→TAX_ICMS, icmsTributosSaida→TAX_ICMS, juros→OTHER. Description = field name for traceability |
| OrderChangeRequest | shipmentChangeRequests | requestedById (remapped), status: PENDING/APPROVED/REJECTED direct / CANCELLED→REJECTED / FAILED→REJECTED, requestType+adminNotes→description, proposedItems+currentItems→changesJson |
| InternationalFreightReceipt | shipmentFreightReceipts | orderId→shipmentId, carrierId (remapped), containerId→containerType (via Container lookup), containerQuantity, freightValue, dolarQuotation, documentId→remapped to shipmentDocuments ID, freightExpenses/pricingItems JSON direct |

### Phase 7 — Financial

| Legacy | New | Key Mappings |
|---|---|---|
| Payment | transactions | orderId→shipmentId, companyId→organizationId, value→amountBrl, status: PENDING→PENDING / PAID→PAID / FAILED→OVERDUE / REFUNDED→PAID, asaasPaymentId→gatewayId, paymentType→type (map to MERCHANDISE/FREIGHT/TAXES/SERVICE_FEE based on context, default MERCHANDISE), dolar→exchangeRate |
| ExchangeContract | exchangeContracts | paymentId→transactionId (remapped), numeroContratoCambio→contractNumber, corretoraCambio→brokerName, cambioCloseDate→closedAt, dolarCarriedOut→amountUsd, exchangeRate direct, contratoCambioId→resolve Document.file→contractFileUrl, swiftDocId→resolve Document.file→swiftFileUrl. `fornecedorCambio`→supplierId (lookup supplier by name). `fabricanteCambio` not migrated. `valueCarriedOut` (BRL) not migrated (can be derived: amountUsd * exchangeRate) |
| OperadorEstrangeiroWalletTransaction | suppliersWalletTransactions | walletId (remapped), operadorEstrangeiroId→via wallet's supplierId, exchangeContractId (remapped), orderId→shipmentId (remapped), paymentId→transactionId (remapped), amount (rounded to 2dp), type direct |

### Phase 8 — System

| Legacy | New | Key Mappings |
|---|---|---|
| Notification | notifications | userId→profileId, message direct, status→read boolean (see enum mapping). orderStepId discarded. title=`'Notificacao migrada'`, type='INFO', actionUrl=null |
| WebhookEvent | webhookEvents | provider/eventType/externalId/payload/attempts/lastError/processedAt direct. status string→webhookStatusEnum mapping |

## Data That Does NOT Migrate

| Entity/Field | Reason |
|---|---|
| QSA | No equivalent in new schema |
| Activity | No equivalent in new schema |
| User.hashedPassword | Replaced by Supabase Auth temp password |
| User.rg | No equivalent |
| User.forgotPasswordToken, verifyToken, etc. | Supabase Auth handles this |
| User verification flags (isDocumentsVerified, isDataVerified, approvalStatus, isVerified) | No equivalent |
| Company metadata (industryArea, openingDate, situation, type, size, legalNature, capitalStock, etc.) | CNPJ/Receita Federal data not carried over |
| Company flags (isSelected, isDocumentsVerified, isDataVerified, approvalStatus) | No equivalent |
| Company.icms, wechat, whatsapp | No direct equivalent |
| Cart (as entity) | Absorbed into quotes/shipments |
| Variacao/ElementoVariacao (as tables) | Absorbed into productVariants.attributes |
| MinimumWage (table) | Absorbed into globalServiceFeeConfig.minimumWageBrl |
| HonorarioConfigAudit | Historical audits not worth migrating |
| PaymentError | No direct equivalent |
| StepTemplate | Replaced by shipmentStepEnum |
| Container (model) | Replaced by containerTypeEnum |
| Legacy Shipment.followers, tags | No equivalent |
| Legacy Shipment.terminalId | No column on new shipments |
| ExchangeContract.fabricanteCambio | No equivalent |
| FreightProposal.idInterno, freeTime, pricingItems | No columns in new schema |
| ProformaObservation linked only to Orders (no proformaId) | No equivalent for shipment-level observations |

## Script Structure

```
sg-imports/scripts/migrate-legacy/
  index.ts              — orchestrator: runs phases in order, reports results
  connection.ts         — legacy (DIRECT_URL_PROD) + new (DIRECT_URL) connections
  id-map.ts             — Map<string, string> per entity, get/set helpers
  supabase-admin.ts     — Supabase Admin client for auth user creation
  phases/
    01-foundation.ts
    02-auth-orgs.ts
    03-products.ts
    04-logistics.ts
    05-quotes.ts
    06-shipments.ts
    07-financial.ts
    08-system.ts
```

## Error Handling

- Each phase runs in a database transaction
- On failure: rollback phase, log error with record details, continue to next phase (skip dependent phases)
- Console logging with progress: `[Phase 2] Migrating organizations... 45/120`
- Duplicate handling: skip on conflict (emails in Supabase Auth, unique constraints)
- Final summary: records migrated per table, skipped records, errors encountered

## Running

```bash
cd sg-imports
bun run scripts/migrate-legacy/index.ts
```

Requires env vars: `DIRECT_URL_PROD`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
