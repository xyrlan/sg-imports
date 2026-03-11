import { db } from './index';
import * as schema from './schema';

async function main() {
  console.log('🚀 Iniciando Nuke & Seed...');

  // 1. Limpeza total na ordem correta das Foreign Keys
  // Isso evita erros de "violates foreign key constraint"
  await db.delete(schema.memberships);
  await db.delete(schema.quoteItems);
  await db.delete(schema.quotes);
  await db.delete(schema.productVariants);
  await db.delete(schema.products);
  await db.delete(schema.suppliers);
  await db.delete(schema.organizations);
  await db.delete(schema.auditLogs);
  await db.delete(schema.profiles);
  await db.delete(schema.addresses);
  await db.delete(schema.hsCodes);

  console.log('🧹 Banco de dados limpo!');

  // 2. Criar Endereços (Necessários para passar na checa do DashboardLayout)
  const [addrBilling] = await db.insert(schema.addresses).values({
    street: 'Av. Paulista',
    number: '1000',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    postalCode: '01310-100',
  }).returning();

  const [addrDelivery] = await db.insert(schema.addresses).values({
    street: 'Rua das Importações',
    number: '500',
    neighborhood: 'Centro',
    city: 'Santos',
    state: 'SP',
    postalCode: '11010-000',
  }).returning();

  // 3. Criar Perfil do Usuário
  // IMPORTANTE: O ID abaixo deve ser o mesmo que está no seu Supabase Auth
  const userId = '72c4876b-8a27-4394-a3cf-009ff1f3db88';
  
  const [profile] = await db.insert(schema.profiles).values({
    id: userId,
    email: 'pedro@dev.com',
    fullName: 'Pedro Fullstack',
    systemRole: 'SUPER_ADMIN',
  }).returning();

  console.log('👤 Perfil criado:', profile.email);

  // 4. Criar Organização com os Endereços já vinculados
  // Isso evita que o DashboardLayout te redirecione para o Onboarding
  const [org] = await db.insert(schema.organizations).values({
    name: 'Terralogs International',
    tradeName: 'Terralogs',
    document: '12.345.678/0001-99',
    billingAddressId: addrBilling.id,
    deliveryAddressId: addrDelivery.id,
    orderType: 'ORDER',
  }).returning();

  console.log('🏢 Organização criada:', org.name);

  // 5. Criar Membership (Vínculo Usuário-Empresa)
  await db.insert(schema.memberships).values({
    organizationId: org.id,
    profileId: profile.id,
    role: 'OWNER',
  });

  // 6. Criar NCMs (HS Codes) para cálculos fiscais
  const [ncmSmartphone, ncmNotebook, ncmCamiseta, ncmMoveis, ncmCalcados] = await db
    .insert(schema.hsCodes)
    .values([
      { code: '8517.13.00', description: 'Smartphones', ii: '11.20', ipi: '15.00', pis: '2.10', cofins: '9.65' },
      { code: '8471.30.00', description: 'Notebooks e portáteis', ii: '0', ipi: '0', pis: '2.10', cofins: '9.65' },
      { code: '6109.10.00', description: 'Camisetas de algodão', ii: '26.00', ipi: '0', pis: '2.10', cofins: '9.65' },
      { code: '9403.60.00', description: 'Móveis de madeira', ii: '18.00', ipi: '5.00', pis: '2.10', cofins: '9.65' },
      { code: '6404.11.00', description: 'Calçados com solado de borracha', ii: '35.00', ipi: '0', pis: '2.10', cofins: '9.65' },
    ])
    .returning();

  console.log('📋 NCMs criados:', ncmSmartphone.code, ncmNotebook.code, ncmCamiseta.code, ncmMoveis.code, ncmCalcados.code);

  // 7. Criar Fornecedores
  const [supplierTech, supplierTextile] = await db
    .insert(schema.suppliers)
    .values([
      { organizationId: org.id, name: 'Shenzhen Global Export', countryCode: 'CN' },
      { organizationId: org.id, name: 'Guangzhou Textile Co', countryCode: 'CN' },
    ])
    .returning();

  // 8. Criar Produtos com NCM vinculado
  const [productPhone, productNotebook, productCamiseta, productMoveis, productCalcados] = await db
    .insert(schema.products)
    .values([
      { organizationId: org.id, name: 'iPhone 15 Pro Max Clone', supplierId: supplierTech.id, hsCodeId: ncmSmartphone.id },
      { organizationId: org.id, name: 'Notebook Lenovo ThinkPad', supplierId: supplierTech.id, hsCodeId: ncmNotebook.id },
      { organizationId: org.id, name: 'Camiseta Básica Algodão', supplierId: supplierTextile.id, hsCodeId: ncmCamiseta.id },
      { organizationId: org.id, name: 'Mesa de Jantar em Madeira', supplierId: supplierTech.id, hsCodeId: ncmMoveis.id },
      { organizationId: org.id, name: 'Tênis Esportivo', supplierId: supplierTextile.id, hsCodeId: ncmCalcados.id },
    ])
    .returning();

  // 9. Criar Variantes dos Produtos
  await db.insert(schema.productVariants).values([
    { productId: productPhone.id, organizationId: org.id, sku: 'IPHONE-15-CLONE-BLK', name: 'Black 256GB', priceUsd: '450.00', unitsPerCarton: 10, cartonHeight: '30', cartonWidth: '20', cartonLength: '15', cartonWeight: '3.200' },
    { productId: productNotebook.id, organizationId: org.id, sku: 'NOTEBOOK-THINKPAD-X1', name: 'X1 Carbon 14"', priceUsd: '899.00', unitsPerCarton: 2, cartonHeight: '35', cartonWidth: '50', cartonLength: '25', cartonWeight: '4.500' },
    { productId: productCamiseta.id, organizationId: org.id, sku: 'CAMISETA-BASICA-P', name: 'Preta - P', priceUsd: '8.50', unitsPerCarton: 50, cartonHeight: '25', cartonWidth: '40', cartonLength: '30', cartonWeight: '5.000' },
    { productId: productMoveis.id, organizationId: org.id, sku: 'MESA-JANTAR-6P', name: 'Mesa 6 lugares', priceUsd: '320.00', unitsPerCarton: 1, cartonHeight: '80', cartonWidth: '150', cartonLength: '90', cartonWeight: '35.000' },
    { productId: productCalcados.id, organizationId: org.id, sku: 'TENIS-ESPORTIVO-42', name: 'Tênis Branco 42', priceUsd: '45.00', unitsPerCarton: 24, cartonHeight: '30', cartonWidth: '40', cartonLength: '50', cartonWeight: '12.000' },
  ]);

  console.log('📦 Catálogo de teste populado (5 produtos com NCM)!');
  console.log('\n✅ SEED FINALIZADO COM SUCESSO!');
  console.log('👉 ID da Org para seu Cookie:', org.id);
  
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});