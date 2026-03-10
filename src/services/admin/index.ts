/**
 * Admin Services — barrel export
 *
 * Structure:
 *   admin/
 *     types.ts                  — shared AdminQueryParams, PaginatedResult
 *     profiles.service.ts       — getAllProfiles
 *     organizations.service.ts  — getAllOrganizations
 *     stats.service.ts          — getAdminStats
 *     index.ts                  — this file (re-exports everything)
 *
 * To add a new admin-managed entity:
 *   1. Create  admin/<entity>.service.ts
 *   2. Re-export from this file
 *   3. Done — all consumers import from '@/services/admin'
 */

// Shared types
export type { AdminQueryParams, PaginatedResult } from './types';
export { buildPaginatedResult } from './types';

// Entity services
export {
  getAllProfiles,
  getProfileById,
  updateProfileAsAdmin,
  getProfileMemberships,
  type Profile,
  type AdminUpdateProfileData,
  type ProfileMembership,
} from './profiles.service';
export {
  getAllOrganizations,
  getOrganizationByIdAsAdmin,
  getOrganizationWithAddresses,
  getOrganizationMembers,
  updateOrganizationAsAdmin,
  updateMembershipRole,
  getServiceFeeConfig,
  upsertServiceFeeConfig,
  type OrganizationWithMemberCount,
  type OrganizationWithAddresses,
  type OrganizationAddress,
  type OrganizationMember,
  type AdminUpdateOrgData,
  type ServiceFeeConfig,
  type UpsertServiceFeeData,
} from './organizations.service';

// Dashboard stats
export { getAdminStats } from './stats.service';

// Platform config (Honorários, Impostos, Siscomex, etc.)
export {
  getGlobalServiceFeeConfig,
  upsertGlobalServiceFeeConfig,
  getStateIcmsRates,
  upsertStateIcmsRates,
  getSiscomexFeeConfig,
  upsertSiscomexFeeConfig,
  getGlobalPlatformRates,
  upsertGlobalPlatformRate,
  type GlobalServiceFeeConfig,
  type StateIcmsRate,
  type SiscomexFeeConfig,
  type GlobalPlatformRate,
  type UpsertGlobalServiceFeeData,
  type UpsertStateIcmsData,
  type UpsertSiscomexFeeData,
  type UpsertGlobalPlatformRateData,
} from './config.service';

// Ports
export {
  getAllPorts,
  getPortById,
  getPortsByType,
  createPort,
  updatePort,
  deletePort,
  type Port,
  type PortType,
  type CreatePortData,
  type UpdatePortData,
} from './ports.service';

// Carriers (synced from ShipsGo)
export {
  getAllCarriers,
  getCarriersPaginated,
  getCarrierById,
  syncCarriersFromShipsGo,
  type Carrier,
} from './carriers.service';

// Currency Exchange Brokers (corretoras de câmbio)
export {
  getAllCurrencyExchangeBrokers,
  getCurrencyExchangeBrokerById,
  createCurrencyExchangeBroker,
  updateCurrencyExchangeBroker,
  deleteCurrencyExchangeBroker,
  type CurrencyExchangeBroker,
  type CreateCurrencyExchangeBrokerData,
  type UpdateCurrencyExchangeBrokerData,
} from './currency-exchange-brokers.service';

// International Freights
export {
  getAllInternationalFreights,
  getInternationalFreightById,
  getInternationalFreightByCarrierAndContainer,
  getInternationalFreightByCarrier,
  createInternationalFreight,
  updateInternationalFreight,
  deleteInternationalFreight,
  type InternationalFreight,
  type InternationalFreightWithPorts,
  type PortSummary,
  type ShippingModalityForFreight,
  type CreateInternationalFreightData,
  type UpdateInternationalFreightData,
} from './international-freights.service';

// Pricing Rules (Taxas de Frete)
export {
  getAllPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  resolveEffectivePricing,
  type PricingRule,
  type PricingItem,
  type PricingRuleWithRelations,
  type CreatePricingRuleData,
  type UpdatePricingRuleData,
  type ResolvedPricingItem,
  type ResolutionResult,
  type PortDirection,
  type PricingScope,
} from './pricing-rules.service';

// Products (admin-level, all orgs)
export {
  getAllProducts,
  getProductByIdAsAdmin,
  deleteProductAsAdmin,
  type ProductWithOrgAndNcm,
} from './products.service';

// HS Codes (NCMs)
export {
  getAllHsCodes,
  getHsCodeById,
  updateHsCode,
  deleteHsCode,
  type HsCode,
  type UpdateHsCodeData,
} from './hs-codes.service';

// Audit log
export {
  recordAuditInternal,
  withAuditTransaction,
  getAuditLogsPaginated,
  type DbTransaction,
  type RecordAuditData,
  type AuditLogEntry,
  type GetAuditLogsParams,
  type AuditLogsResult,
} from './audit.service';

// Terminals & storage rules
export {
  getAllTerminals,
  getTerminalById,
  getTerminalWithRules,
  createTerminal,
  updateTerminal,
  deleteTerminal,
  createStorageRule,
  updateStorageRule,
  deleteStorageRule,
  findStorageRuleConflict,
  createStorageRuleWithPeriods,
  updateStorageRuleWithPeriods,
  duplicateStorageRule,
  createStoragePeriod,
  updateStoragePeriod,
  deleteStoragePeriod,
  type Terminal,
  type TerminalWithRules,
  type StorageRule,
  type StoragePeriod,
  type CreateTerminalData,
  type UpdateTerminalData,
  type UpsertStorageRuleData,
  type UpsertStoragePeriodData,
  type CreateStorageRuleWithPeriodsData,
  type ContainerType,
} from './terminals.service';
