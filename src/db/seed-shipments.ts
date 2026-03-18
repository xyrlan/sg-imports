/**
 * Seed script for shipment management test data.
 * Run AFTER the main seed: bun run src/db/seed-shipments.ts
 *
 * Creates 3 shipments in different steps with realistic fake data:
 * 1. Shipment in MERCHANDISE_PAYMENT (30% paid, production in progress)
 * 2. Shipment in DOCUMENT_PREPARATION (fully paid, in transit, docs pending)
 * 3. Shipment in CUSTOMS_CLEARANCE (DUIMP registered, 90% invoice pending)
 */

import { db } from './index';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🚢 Seeding shipment test data...\n');

  // 1. Find existing org and profile from main seed
  const org = await db.query.organizations.findFirst();
  if (!org) {
    console.error('❌ No organization found. Run the main seed first: bun run src/db/seed.ts');
    process.exit(1);
  }

  const profile = await db.query.profiles.findFirst();
  if (!profile) {
    console.error('❌ No profile found. Run the main seed first.');
    process.exit(1);
  }

  // Find product variants and suppliers for quote items
  const variants = await db.query.productVariants.findMany({ limit: 5 });
  const suppliers = await db.query.suppliers.findMany({ limit: 5 });
  if (variants.length === 0 || suppliers.length === 0) {
    console.error('❌ No product variants or suppliers found. Run the main seed first.');
    process.exit(1);
  }

  // Create a second org as client
  const [clientOrg] = await db
    .insert(schema.organizations)
    .values({
      name: 'Importadora São Paulo Ltda',
      tradeName: 'ImportaSP',
      document: '98.765.432/0001-10',
      orderType: 'ORDER',
    })
    .onConflictDoNothing()
    .returning();

  const clientOrgId = clientOrg?.id ?? (await db.query.organizations.findFirst({
    where: eq(schema.organizations.document, '98.765.432/0001-10'),
  }))!.id;

  // Create a DIRECT_ORDER client
  const [directClientOrg] = await db
    .insert(schema.organizations)
    .values({
      name: 'Direct Trade Brasil',
      tradeName: 'DirectTrade',
      document: '11.222.333/0001-44',
      orderType: 'DIRECT_ORDER',
    })
    .onConflictDoNothing()
    .returning();

  const directClientOrgId = directClientOrg?.id ?? (await db.query.organizations.findFirst({
    where: eq(schema.organizations.document, '11.222.333/0001-44'),
  }))!.id;

  console.log('🏢 Client orgs ready');

  // ==========================================
  // SHIPMENT 1: MERCHANDISE_PAYMENT step (ORDER)
  // 30% paid, production date set, 1 exchange contract
  // ==========================================

  const [quote1] = await db
    .insert(schema.quotes)
    .values({
      sellerOrganizationId: org.id,
      clientOrganizationId: clientOrgId,
      createdById: profile.id,
      type: 'STANDARD',
      status: 'CONVERTED',
      name: 'Proposta Smartphones + Notebooks',
      targetDolar: '5.2500',
      shippingModality: 'SEA_FCL',
      exchangeRateIof: '5.3200',
    })
    .returning();

  // Quote items
  const [qi1a, qi1b] = await db
    .insert(schema.quoteItems)
    .values([
      {
        quoteId: quote1.id,
        variantId: variants[0].id,
        quantity: 200,
        priceUsd: '450.00',
        weightSnapshot: '640.000',
        cbmSnapshot: '1.800000',
        unitPriceUsdSnapshot: '450.0000',
        iiRateSnapshot: '11.20',
        ipiRateSnapshot: '15.00',
        pisRateSnapshot: '2.10',
        cofinsRateSnapshot: '9.65',
        landedCostTotalSnapshot: '650000.0000',
        landedCostUnitSnapshot: '3250.0000',
      },
      {
        quoteId: quote1.id,
        variantId: variants[1].id,
        quantity: 50,
        priceUsd: '899.00',
        weightSnapshot: '225.000',
        cbmSnapshot: '0.875000',
        unitPriceUsdSnapshot: '899.0000',
        iiRateSnapshot: '0',
        ipiRateSnapshot: '0',
        pisRateSnapshot: '2.10',
        cofinsRateSnapshot: '9.65',
        landedCostTotalSnapshot: '280000.0000',
        landedCostUnitSnapshot: '5600.0000',
      },
    ])
    .returning();

  const [shipment1] = await db
    .insert(schema.shipments)
    .values({
      quoteId: quote1.id,
      sellerOrganizationId: org.id,
      clientOrganizationId: clientOrgId,
      status: 'PRODUCTION',
      currentStep: 'MERCHANDISE_PAYMENT',
      shipmentType: 'SEA_FCL',
      totalProductsUsd: '134950.00', // 200*450 + 50*899
      totalCostsBrl: '930000.00',
      fobAdvancePercentage: '30',
      productionReadyDate: new Date('2026-04-15'),
      zapSignStatus: 'signed',
    })
    .returning();

  // Update quote with shipment link
  await db.update(schema.quotes).set({ generatedShipmentId: shipment1.id }).where(eq(schema.quotes.id, quote1.id));

  // Step history
  await db.insert(schema.shipmentStepHistory).values([
    { shipmentId: shipment1.id, step: 'CONTRACT_CREATION', status: 'COMPLETED', completedAt: new Date('2026-03-01'), completedById: profile.id },
    { shipmentId: shipment1.id, step: 'MERCHANDISE_PAYMENT', status: 'PENDING' },
  ]);

  // Transactions: 30% advance paid
  const [txn1a] = await db
    .insert(schema.transactions)
    .values({
      organizationId: clientOrgId,
      shipmentId: shipment1.id,
      type: 'MERCHANDISE',
      status: 'PAID',
      amountUsd: '40485.00', // 30% of 134950
      amountBrl: '215380.20',
      exchangeRate: '5.3200',
      paidAt: new Date('2026-03-05'),
    })
    .returning();

  // Exchange contract for the paid amount
  await db.insert(schema.exchangeContracts).values({
    transactionId: txn1a.id,
    supplierId: suppliers[0].id,
    contractNumber: 'CC-2026/001',
    brokerName: 'Abrão Filho Câmbio',
    closedAt: new Date('2026-03-04'),
    amountUsd: '40485.00',
    exchangeRate: '5.3200',
    effectiveRate: '5.3500',
  });

  // 70% remaining — pending
  await db.insert(schema.transactions).values({
    organizationId: clientOrgId,
    shipmentId: shipment1.id,
    type: 'MERCHANDISE',
    status: 'PENDING',
    amountUsd: '94465.00', // 70% of 134950
  });

  console.log(`📦 Shipment 1 created: #${shipment1.code} — MERCHANDISE_PAYMENT (30% paid)`);

  // ==========================================
  // SHIPMENT 2: DOCUMENT_PREPARATION step (ORDER)
  // Fully paid, in transit, MBL registered, docs pending
  // ==========================================

  const [quote2] = await db
    .insert(schema.quotes)
    .values({
      sellerOrganizationId: org.id,
      clientOrganizationId: clientOrgId,
      createdById: profile.id,
      type: 'STANDARD',
      status: 'CONVERTED',
      name: 'Proposta Camisetas + Calçados',
      targetDolar: '5.1500',
      shippingModality: 'SEA_LCL',
      exchangeRateIof: '5.2100',
    })
    .returning();

  await db.insert(schema.quoteItems).values([
    {
      quoteId: quote2.id,
      variantId: variants[2].id,
      quantity: 5000,
      priceUsd: '8.50',
      weightSnapshot: '500.000',
      cbmSnapshot: '6.000000',
      unitPriceUsdSnapshot: '8.5000',
      iiRateSnapshot: '26.00',
      landedCostTotalSnapshot: '350000.0000',
      landedCostUnitSnapshot: '70.0000',
    },
    {
      quoteId: quote2.id,
      variantId: variants[4].id,
      quantity: 2000,
      priceUsd: '45.00',
      weightSnapshot: '1000.000',
      cbmSnapshot: '10.000000',
      unitPriceUsdSnapshot: '45.0000',
      iiRateSnapshot: '35.00',
      landedCostTotalSnapshot: '600000.0000',
      landedCostUnitSnapshot: '300.0000',
    },
  ]);

  const [shipment2] = await db
    .insert(schema.shipments)
    .values({
      quoteId: quote2.id,
      sellerOrganizationId: org.id,
      clientOrganizationId: clientOrgId,
      status: 'IN_TRANSIT',
      currentStep: 'DOCUMENT_PREPARATION',
      shipmentType: 'SEA_LCL',
      totalProductsUsd: '132500.00', // 5000*8.5 + 2000*45
      totalCostsBrl: '950000.00',
      fobAdvancePercentage: '30',
      bookingNumber: 'BK-2026-00847',
      masterBl: 'MSCU2634578',
      shipsGoId: 'sg-tracking-abc123',
      shipsGoTrackingUrl: 'https://shipsgo.com/tracking/sg-tracking-abc123',
      shipsGoLastUpdate: new Date('2026-03-15'),
      etd: new Date('2026-03-10'),
      eta: new Date('2026-04-20'),
      zapSignStatus: 'signed',
    })
    .returning();

  await db.update(schema.quotes).set({ generatedShipmentId: shipment2.id }).where(eq(schema.quotes.id, quote2.id));

  // Step history — all completed up to DOCUMENT_PREPARATION
  await db.insert(schema.shipmentStepHistory).values([
    { shipmentId: shipment2.id, step: 'CONTRACT_CREATION', status: 'COMPLETED', completedAt: new Date('2026-02-15'), completedById: profile.id },
    { shipmentId: shipment2.id, step: 'MERCHANDISE_PAYMENT', status: 'COMPLETED', completedAt: new Date('2026-03-01'), completedById: profile.id },
    { shipmentId: shipment2.id, step: 'SHIPPING_PREPARATION', status: 'COMPLETED', completedAt: new Date('2026-03-10'), completedById: profile.id },
    { shipmentId: shipment2.id, step: 'DOCUMENT_PREPARATION', status: 'PENDING' },
  ]);

  // All FOB paid
  await db.insert(schema.transactions).values([
    {
      organizationId: clientOrgId,
      shipmentId: shipment2.id,
      type: 'MERCHANDISE',
      status: 'PAID',
      amountUsd: '39750.00',
      amountBrl: '207097.50',
      exchangeRate: '5.2100',
      paidAt: new Date('2026-02-20'),
    },
    {
      organizationId: clientOrgId,
      shipmentId: shipment2.id,
      type: 'MERCHANDISE',
      status: 'PAID',
      amountUsd: '92750.00',
      amountBrl: '483227.50',
      exchangeRate: '5.2100',
      paidAt: new Date('2026-03-01'),
    },
  ]);

  // Containers
  await db.insert(schema.shipmentContainers).values([
    { shipmentId: shipment2.id, containerNumber: 'MSCU7654321', type: 'GP_40' },
  ]);

  console.log(`📦 Shipment 2 created: #${shipment2.code} — DOCUMENT_PREPARATION (in transit)`);

  // ==========================================
  // SHIPMENT 3: CUSTOMS_CLEARANCE step (DIRECT_ORDER)
  // DUIMP registered, 90% invoice pending, taxes fetched
  // ==========================================

  const [quote3] = await db
    .insert(schema.quotes)
    .values({
      sellerOrganizationId: org.id,
      clientOrganizationId: directClientOrgId,
      createdById: profile.id,
      type: 'STANDARD',
      status: 'CONVERTED',
      name: 'Proposta Móveis',
      targetDolar: '5.3000',
      shippingModality: 'SEA_FCL',
      exchangeRateIof: '5.3800',
    })
    .returning();

  await db.insert(schema.quoteItems).values([
    {
      quoteId: quote3.id,
      variantId: variants[3].id,
      quantity: 100,
      priceUsd: '320.00',
      weightSnapshot: '3500.000',
      cbmSnapshot: '108.000000',
      unitPriceUsdSnapshot: '320.0000',
      iiRateSnapshot: '18.00',
      ipiRateSnapshot: '5.00',
      pisRateSnapshot: '2.10',
      cofinsRateSnapshot: '9.65',
      landedCostTotalSnapshot: '280000.0000',
      landedCostUnitSnapshot: '2800.0000',
    },
  ]);

  const [shipment3] = await db
    .insert(schema.shipments)
    .values({
      quoteId: quote3.id,
      sellerOrganizationId: org.id,
      clientOrganizationId: directClientOrgId,
      status: 'CUSTOMS_CLEARANCE',
      currentStep: 'CUSTOMS_CLEARANCE',
      shipmentType: 'SEA_FCL',
      totalProductsUsd: '32000.00', // 100*320
      totalCostsBrl: '280000.00',
      fobAdvancePercentage: '30',
      bookingNumber: 'BK-2026-00512',
      masterBl: 'EGLV1234567890',
      etd: new Date('2026-02-20'),
      eta: new Date('2026-03-25'),
      duimpNumber: '26/0012345-6',
      duimpChannel: 'GREEN',
      duimpData: {
        numero: '26/0012345-6',
        canal: 'VERDE',
        impostos: { ii: 5760, ipi: 1881.6, pis: 725.76, cofins: 3336.96, taxaSiscomex: 214 },
      },
      zapSignStatus: 'signed',
    })
    .returning();

  await db.update(schema.quotes).set({ generatedShipmentId: shipment3.id }).where(eq(schema.quotes.id, quote3.id));

  // Step history
  await db.insert(schema.shipmentStepHistory).values([
    { shipmentId: shipment3.id, step: 'CONTRACT_CREATION', status: 'COMPLETED', completedAt: new Date('2026-01-20'), completedById: profile.id },
    { shipmentId: shipment3.id, step: 'MERCHANDISE_PAYMENT', status: 'COMPLETED', completedAt: new Date('2026-02-10'), completedById: profile.id },
    { shipmentId: shipment3.id, step: 'SHIPPING_PREPARATION', status: 'COMPLETED', completedAt: new Date('2026-02-20'), completedById: profile.id },
    { shipmentId: shipment3.id, step: 'DOCUMENT_PREPARATION', status: 'COMPLETED', completedAt: new Date('2026-03-10'), completedById: profile.id },
    { shipmentId: shipment3.id, step: 'CUSTOMS_CLEARANCE', status: 'PENDING' },
  ]);

  // All FOB paid (DIRECT_ORDER — manual)
  await db.insert(schema.transactions).values([
    {
      organizationId: directClientOrgId,
      shipmentId: shipment3.id,
      type: 'MERCHANDISE',
      status: 'PAID',
      amountUsd: '9600.00',
      amountBrl: '51648.00',
      exchangeRate: '5.3800',
      paidAt: new Date('2026-01-25'),
    },
    {
      organizationId: directClientOrgId,
      shipmentId: shipment3.id,
      type: 'MERCHANDISE',
      status: 'PAID',
      amountUsd: '22400.00',
      amountBrl: '120512.00',
      exchangeRate: '5.3800',
      paidAt: new Date('2026-02-10'),
    },
  ]);

  // Shipment expenses from DUIMP
  await db.insert(schema.shipmentExpenses).values([
    { shipmentId: shipment3.id, category: 'TAX_II', description: 'Imposto de Importação - DUIMP 26/0012345-6', value: '5760.00', currency: 'BRL', status: 'PENDING' },
    { shipmentId: shipment3.id, category: 'TAX_IPI', description: 'IPI - DUIMP 26/0012345-6', value: '1881.60', currency: 'BRL', status: 'PENDING' },
    { shipmentId: shipment3.id, category: 'TAX_PIS', description: 'PIS - DUIMP 26/0012345-6', value: '725.76', currency: 'BRL', status: 'PENDING' },
    { shipmentId: shipment3.id, category: 'TAX_COFINS', description: 'COFINS - DUIMP 26/0012345-6', value: '3336.96', currency: 'BRL', status: 'PENDING' },
    { shipmentId: shipment3.id, category: 'TAX_SISCOMEX', description: 'Taxa Siscomex - DUIMP 26/0012345-6', value: '214.00', currency: 'BRL', status: 'PENDING' },
  ]);

  // Containers
  await db.insert(schema.shipmentContainers).values([
    { shipmentId: shipment3.id, containerNumber: 'EGLV9876543', type: 'HC_40' },
    { shipmentId: shipment3.id, containerNumber: 'EGLV9876544', type: 'HC_40' },
  ]);

  // Some documents already uploaded
  await db.insert(schema.shipmentDocuments).values([
    { shipmentId: shipment3.id, type: 'COMMERCIAL_INVOICE', name: 'Invoice - Shenzhen Global Export', url: 'https://placeholder.co/invoice-001.pdf', uploadedById: profile.id, metadata: { supplierId: suppliers[0].id } },
    { shipmentId: shipment3.id, type: 'PACKING_LIST', name: 'Packing List - Shenzhen Global Export', url: 'https://placeholder.co/pl-001.pdf', uploadedById: profile.id, metadata: { supplierId: suppliers[0].id } },
    { shipmentId: shipment3.id, type: 'MBL_DOCUMENT', name: 'MBL EGLV1234567890', url: 'https://placeholder.co/mbl-001.pdf', uploadedById: profile.id },
    { shipmentId: shipment3.id, type: 'HBL_DOCUMENT', name: 'HBL EGLV1234567890-H1', url: 'https://placeholder.co/hbl-001.pdf', uploadedById: profile.id },
  ]);

  console.log(`📦 Shipment 3 created: #${shipment3.code} — CUSTOMS_CLEARANCE (DUIMP Green, DIRECT_ORDER)`);

  // ==========================================
  // Summary
  // ==========================================

  console.log('\n✅ SHIPMENT SEED FINALIZADO!');
  console.log('─────────────────────────────────');
  console.log(`  Shipment 1: #${shipment1.code} → MERCHANDISE_PAYMENT (ORDER, 30% paid)`);
  console.log(`  Shipment 2: #${shipment2.code} → DOCUMENT_PREPARATION (ORDER, in transit)`);
  console.log(`  Shipment 3: #${shipment3.code} → CUSTOMS_CLEARANCE (DIRECT_ORDER, DUIMP Green)`);
  console.log('─────────────────────────────────');
  console.log('👉 Acesse /admin/shipments para visualizar\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro no seed de shipments:', err);
  process.exit(1);
});
