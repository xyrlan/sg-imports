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

  // 6. Criar NCM (HS Code) de teste para cálculos fiscais
  await db.insert(schema.hsCodes).values({
    code: '8517.13.00',
    description: 'Smartphones',
    ii: '11.20',
    ipi: '15.00',
    pis: '2.10',
    cofins: '9.65',
  });

  // 7. Criar Fornecedor e Produto Base
  const [supplier] = await db.insert(schema.suppliers).values({
    organizationId: org.id,
    name: 'Shenzhen Global Export',
    countryCode: 'CN',
  }).returning();

  const [product] = await db.insert(schema.products).values({
    organizationId: org.id,
    name: 'iPhone 15 Pro Max Clone',
    supplierId: supplier.id,
  }).returning();

  await db.insert(schema.productVariants).values({
    productId: product.id,
    organizationId: org.id,
    sku: 'IPHONE-15-CLONE-BLK',
    name: 'Black 256GB',
    priceUsd: '450.00',
    unitsPerCarton: 10,
    cartonHeight: '30',
    cartonWidth: '20',
    cartonLength: '15',
    cartonWeight: '3.200',
  });

  console.log('📦 Catálogo de teste populado!');
  console.log('\n✅ SEED FINALIZADO COM SUCESSO!');
  console.log('👉 ID da Org para seu Cookie:', org.id);
  
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});