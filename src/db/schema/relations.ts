import { relations } from 'drizzle-orm';

import { organizations, memberships, profiles, addresses } from './auth';
import { hsCodes, suppliers, products, productVariants, suppliersWallets, suppliersWalletTransactions, subSuppliers } from './products';
import { quotes, quoteItems } from './quotes';
import { shipments, shipmentStepHistory, shipmentContainers, shipmentExpenses, shipmentDocuments, shipmentChangeRequests } from './shipments';
import { carriers, currencyExchangeBrokers, ports, terminals, storageRules, storagePeriods, serviceFeeConfigs } from './admin-config';
import { transactions, exchangeContracts } from './financial';
import { internationalFreights, internationalFreightPortsOfLoading, internationalFreightPortsOfDischarge, freightProposals, pricingRules, pricingItems, shipmentFreightReceipts } from './freight';
import { notifications } from './notifications';
import { integrationLogs, webhookEvents, auditLogs } from './system';

// ==========================================
// 13. RELATIONS (Application Level) - COMPLETO
// ==========================================

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  members: many(memberships),
  products: many(products),
  shipmentsAsSeller: many(shipments, { relationName: 'shipmentsAsSeller' }),
  shipmentsAsClient: many(shipments, { relationName: 'shipmentsAsClient' }),
  quotesAsSeller: many(quotes, { relationName: 'quotesAsSeller' }),
  quotesAsClient: many(quotes, { relationName: 'quotesAsClient' }),
  suppliers: many(suppliers),
  freightProposals: many(freightProposals),
  feeConfig: one(serviceFeeConfigs, {
    fields: [organizations.id],
    references: [serviceFeeConfigs.organizationId]
  }),
  billingAddress: one(addresses, { fields: [organizations.billingAddressId], references: [addresses.id] }),
  deliveryAddress: one(addresses, { fields: [organizations.deliveryAddressId], references: [addresses.id] }),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, { fields: [memberships.organizationId], references: [organizations.id] }),
  profile: one(profiles, { fields: [memberships.profileId], references: [profiles.id] }),
}));

export const profilesRelations = relations(profiles, ({ many }) => ({
  memberships: many(memberships),
  uploadedDocuments: many(shipmentDocuments),
  changeRequests: many(shipmentChangeRequests),
  notifications: many(notifications),
  freightProposalsCreated: many(freightProposals),
  quotesCreated: many(quotes),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  organization: one(organizations, { fields: [products.organizationId], references: [organizations.id] }),
  hsCode: one(hsCodes, { fields: [products.hsCodeId], references: [hsCodes.id] }),
  supplier: one(suppliers, { fields: [products.supplierId], references: [suppliers.id] }),
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}));

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  quote: one(quotes, { fields: [shipments.quoteId], references: [quotes.id] }),
  sellerOrganization: one(organizations, { fields: [shipments.sellerOrganizationId], references: [organizations.id], relationName: 'shipmentsAsSeller' }),
  clientOrganization: one(organizations, { fields: [shipments.clientOrganizationId], references: [organizations.id], relationName: 'shipmentsAsClient' }),
  carrier: one(carriers, { fields: [shipments.carrierId], references: [carriers.id] }),

  // Logística e Financeiro
  containers: many(shipmentContainers),
  expenses: many(shipmentExpenses),
  transactions: many(transactions),
  documents: many(shipmentDocuments),
  freightReceipt: one(shipmentFreightReceipts),

  // Auditoria e Histórico
  stepHistory: many(shipmentStepHistory),
  changeRequests: many(shipmentChangeRequests),

  // Integrações Externas
  integrationLogs: many(integrationLogs),
}));

export const integrationLogsRelations = relations(integrationLogs, ({ one }) => ({
  shipment: one(shipments, { fields: [integrationLogs.shipmentId], references: [shipments.id] }),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  sellerOrganization: one(organizations, { fields: [quotes.sellerOrganizationId], references: [organizations.id], relationName: 'quotesAsSeller' }),
  clientOrganization: one(organizations, { fields: [quotes.clientOrganizationId], references: [organizations.id], relationName: 'quotesAsClient' }),
  createdBy: one(profiles, { fields: [quotes.createdById], references: [profiles.id] }),
  items: many(quoteItems),
  generatedShipment: one(shipments, { fields: [quotes.generatedShipmentId], references: [shipments.id] }),
}));

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, { fields: [quoteItems.quoteId], references: [quotes.id] }),
  variant: one(productVariants, { fields: [quoteItems.variantId], references: [productVariants.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  shipment: one(shipments, { fields: [transactions.shipmentId], references: [shipments.id] }),
  exchangeContracts: many(exchangeContracts),
}));

export const exchangeContractsRelations = relations(exchangeContracts, ({ one }) => ({
  transaction: one(transactions, {
    fields: [exchangeContracts.transactionId],
    references: [transactions.id],
  }),
  broker: one(currencyExchangeBrokers, {
    fields: [exchangeContracts.brokerId],
    references: [currencyExchangeBrokers.id],
  }),
  supplier: one(suppliers, {
    fields: [exchangeContracts.supplierId],
    references: [suppliers.id],
  }),
}));

export const currencyExchangeBrokersRelations = relations(
  currencyExchangeBrokers,
  ({ many }) => ({
    exchangeContracts: many(exchangeContracts),
  }),
);

export const shipmentDocumentsRelations = relations(shipmentDocuments, ({ one }) => ({
  shipment: one(shipments, { fields: [shipmentDocuments.shipmentId], references: [shipments.id] }),
  uploadedBy: one(profiles, { fields: [shipmentDocuments.uploadedById], references: [profiles.id] }),
  freightReceipt: one(shipmentFreightReceipts),
}));

export const shipmentChangeRequestsRelations = relations(shipmentChangeRequests, ({ one }) => ({
  shipment: one(shipments, { fields: [shipmentChangeRequests.shipmentId], references: [shipments.id] }),
  requestedBy: one(profiles, { fields: [shipmentChangeRequests.requestedById], references: [profiles.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  profile: one(profiles, { fields: [notifications.profileId], references: [profiles.id] }),
}));

export const terminalsRelations = relations(terminals, ({ many }) => ({
  storageRules: many(storageRules),
}));

export const storageRulesRelations = relations(storageRules, ({ one, many }) => ({
  terminal: one(terminals, { fields: [storageRules.terminalId], references: [terminals.id] }),
  periods: many(storagePeriods),
}));

export const storagePeriodsRelations = relations(storagePeriods, ({ one }) => ({
  rule: one(storageRules, { fields: [storagePeriods.ruleId], references: [storageRules.id] }),
}));

export const carriersRelations = relations(carriers, ({ many }) => ({
  internationalFreights: many(internationalFreights),
  pricingRules: many(pricingRules),
  freightReceipts: many(shipmentFreightReceipts),
}));

export const internationalFreightPortsOfLoadingRelations = relations(
  internationalFreightPortsOfLoading,
  ({ one }) => ({
    internationalFreight: one(internationalFreights, {
      fields: [internationalFreightPortsOfLoading.internationalFreightId],
      references: [internationalFreights.id],
    }),
    port: one(ports, {
      fields: [internationalFreightPortsOfLoading.portId],
      references: [ports.id],
    }),
  })
);

export const internationalFreightPortsOfDischargeRelations = relations(
  internationalFreightPortsOfDischarge,
  ({ one }) => ({
    internationalFreight: one(internationalFreights, {
      fields: [internationalFreightPortsOfDischarge.internationalFreightId],
      references: [internationalFreights.id],
    }),
    port: one(ports, {
      fields: [internationalFreightPortsOfDischarge.portId],
      references: [ports.id],
    }),
  })
);

export const internationalFreightsRelations = relations(internationalFreights, ({ one, many }) => ({
  carrier: one(carriers, { fields: [internationalFreights.carrierId], references: [carriers.id] }),
  portsOfLoading: many(internationalFreightPortsOfLoading),
  portsOfDischarge: many(internationalFreightPortsOfDischarge),
  freightProposals: many(freightProposals),
}));

export const freightProposalsRelations = relations(freightProposals, ({ one }) => ({
  organization: one(organizations, { fields: [freightProposals.organizationId], references: [organizations.id] }),
  internationalFreight: one(internationalFreights, { fields: [freightProposals.internationalFreightId], references: [internationalFreights.id] }),
  createdBy: one(profiles, { fields: [freightProposals.createdById], references: [profiles.id] }),
}));

export const pricingRulesRelations = relations(pricingRules, ({ one, many }) => ({
  carrier: one(carriers, { fields: [pricingRules.carrierId], references: [carriers.id] }),
  port: one(ports, { fields: [pricingRules.portId], references: [ports.id] }),
  items: many(pricingItems),
}));

export const pricingItemsRelations = relations(pricingItems, ({ one }) => ({
  pricingRule: one(pricingRules, { fields: [pricingItems.pricingRuleId], references: [pricingRules.id] }),
}));

export const shipmentFreightReceiptsRelations = relations(shipmentFreightReceipts, ({ one }) => ({
  shipment: one(shipments, { fields: [shipmentFreightReceipts.shipmentId], references: [shipments.id] }),
  carrier: one(carriers, { fields: [shipmentFreightReceipts.carrierId], references: [carriers.id] }),
  portOfLoading: one(ports, { fields: [shipmentFreightReceipts.portOfLoadingId], references: [ports.id], relationName: 'freightReceiptLoading' }),
  portOfDischarge: one(ports, { fields: [shipmentFreightReceipts.portOfDischargeId], references: [ports.id], relationName: 'freightReceiptDischarge' }),
  document: one(shipmentDocuments, { fields: [shipmentFreightReceipts.documentId], references: [shipmentDocuments.id] }),
}));

export const portsRelations = relations(ports, ({ many }) => ({
  internationalFreightLoadings: many(internationalFreightPortsOfLoading),
  internationalFreightDischarges: many(internationalFreightPortsOfDischarge),
  pricingRules: many(pricingRules),
  freightReceiptsAsLoading: many(shipmentFreightReceipts, { relationName: 'freightReceiptLoading' }),
  freightReceiptsAsDischarge: many(shipmentFreightReceipts, { relationName: 'freightReceiptDischarge' }),
}));
