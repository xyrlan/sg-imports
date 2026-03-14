/**
 * Quote Workflow Service — Etapas B, C, D do fluxo de cotação
 * sendQuoteToClient, pullQuoteBackToDraft, acceptQuote, convertQuoteToShipment
 */

import Decimal from 'decimal.js';
import { db } from '@/db';
import { quotes, quoteItems, organizations, shipments, memberships, profiles } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { getOrganizationById } from '@/services/organization.service';
import { getSimulationById } from '@/services/simulation.service';
import { calculateAndPersistLandedCost } from '@/domain/simulation/services/simulation-domain.service';
import { randomBytes } from 'crypto';
import { sendQuoteLinkEmail } from '@/services/email.service';

export interface SendQuoteToClientInput {
  quoteId: string;
  organizationId: string;
  userId: string;
  clientOrganizationId?: string | null;
  clientEmail?: string | null;
}

export interface SendQuoteToClientResult {
  success: boolean;
  error?: string;
}

/**
 * Etapa B: Enviar cotação para o cliente.
 * - Se clientOrganizationId: preenche e notifica membros da org
 * - Se clientEmail (sem org): gera publicToken, envia link por email
 */
export async function sendQuoteToClient(
  input: SendQuoteToClientInput
): Promise<SendQuoteToClientResult> {
  const { quoteId, organizationId, userId, clientOrganizationId, clientEmail } = input;

  const orgData = await getOrganizationById(organizationId, userId);
  if (!orgData) return { success: false, error: 'Acesso negado' };

  const canSend = ['SELLER', 'ADMIN', 'OWNER'].includes(orgData.role);
  if (!canSend) return { success: false, error: 'Apenas Seller/Admin podem enviar cotações' };

  const quote = await db.query.quotes.findFirst({
    where: and(
      eq(quotes.id, quoteId),
      eq(quotes.sellerOrganizationId, organizationId),
      eq(quotes.status, 'DRAFT')
    ),
    with: { sellerOrganization: { columns: { name: true } } },
  });

  if (!quote) return { success: false, error: 'Cotação não encontrada ou já enviada' };

  if (clientOrganizationId) {
    if (clientOrganizationId === organizationId) {
      return { success: false, error: 'Não pode enviar para a própria organização' };
    }
    const [updated] = await db
      .update(quotes)
      .set({
        clientOrganizationId,
        status: 'SENT',
        clientEmail: null,
        publicToken: null,
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, quoteId))
      .returning();
    if (!updated) return { success: false, error: 'Falha ao atualizar' };
    const { notifyOrganizationMembers } = await import('@/services/notification.service');
    await notifyOrganizationMembers(
      clientOrganizationId,
      'Nova proposta de importação',
      'Você recebeu uma nova proposta de importação. Revise o custo posto e aceite quando estiver de acordo.',
      `/dashboard/simulations/${quoteId}`,
      'INFO'
    );
    return { success: true };
  }

  if (clientEmail?.trim()) {
    const publicToken = randomBytes(24).toString('base64url');
    const [updated] = await db
      .update(quotes)
      .set({
        clientEmail: clientEmail.trim(),
        publicToken,
        status: 'SENT',
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, quoteId))
      .returning();
    if (!updated) return { success: false, error: 'Falha ao atualizar' };

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const quoteLink = `${baseUrl}/quote/${publicToken}`;
    const emailSent = await sendQuoteLinkEmail(
      clientEmail.trim(),
      quote.name,
      quoteLink,
      quote.sellerOrganization?.name ?? 'SoulGlobal',
      quoteId
    );

    if (!emailSent) {
      return {
        success: false,
        error:
          'Cotação enviada, mas o e-mail não pôde ser enviado. Tente novamente ou compartilhe o link manualmente.',
      };
    }

    return { success: true };
  }

  return { success: false, error: 'Informe a organização ou o e-mail do cliente' };
}

export interface PullQuoteBackToDraftResult {
  success: boolean;
  error?: string;
}

/**
 * Puxar cotação de volta para DRAFT (apenas Seller, status SENT).
 */
export async function pullQuoteBackToDraft(
  quoteId: string,
  organizationId: string,
  userId: string
): Promise<PullQuoteBackToDraftResult> {
  const orgData = await getOrganizationById(organizationId, userId);
  if (!orgData) return { success: false, error: 'Acesso negado' };

  const quote = await db.query.quotes.findFirst({
    where: and(
      eq(quotes.id, quoteId),
      eq(quotes.sellerOrganizationId, organizationId),
      eq(quotes.status, 'SENT')
    ),
  });

  if (!quote) return { success: false, error: 'Cotação não encontrada ou não está em SENT' };

  await db
    .update(quotes)
    .set({ status: 'DRAFT', clientOrganizationId: null, clientEmail: null, publicToken: null, updatedAt: new Date() })
    .where(eq(quotes.id, quoteId));

  return { success: true };
}

export interface AcceptQuoteResult {
  success: boolean;
  error?: string;
}

/**
 * Etapa C: Cliente aceita a cotação.
 * - Bloqueia se isRecalculationNeeded
 * - Snapshot atômico nos quote_items
 */
export async function acceptQuote(
  quoteId: string,
  organizationId: string,
  userId: string
): Promise<AcceptQuoteResult> {
  const data = await getSimulationById(quoteId, organizationId, userId);
  if (!data) return { success: false, error: 'Cotação não encontrada' };

  const { simulation } = data;
  if (simulation.status !== 'SENT') return { success: false, error: 'Cotação não está aguardando aceite' };
  if (simulation.clientOrganizationId !== organizationId) {
    return { success: false, error: 'Apenas o cliente pode aceitar esta cotação' };
  }
  if (simulation.isRecalculationNeeded) {
    return { success: false, error: 'Esta cotação está desatualizada. Solicite uma atualização ao Seller.' };
  }

  const calcResult = await calculateAndPersistLandedCost(quoteId, organizationId, userId);
  if (!calcResult.success) {
    return { success: false, error: calcResult.errors?.[0] ?? 'Falha ao calcular custo' };
  }

  await db
    .update(quotes)
    .set({ status: 'APPROVED', isRecalculationNeeded: false, updatedAt: new Date() })
    .where(eq(quotes.id, quoteId));

  return { success: true };
}

export interface ConvertQuoteToShipmentResult {
  success: boolean;
  shipmentId?: string;
  error?: string;
}

/**
 * Etapa D: Converter cotação aprovada em Shipment.
 */
export async function convertQuoteToShipment(
  quoteId: string,
  organizationId: string,
  userId: string
): Promise<ConvertQuoteToShipmentResult> {
  const data = await getSimulationById(quoteId, organizationId, userId);
  if (!data) return { success: false, error: 'Cotação não encontrada' };

  const { simulation, items } = data;
  if (simulation.status !== 'APPROVED') return { success: false, error: 'Cotação deve estar aprovada' };

  const isSeller = simulation.sellerOrganizationId === organizationId;
  const isClient = simulation.clientOrganizationId === organizationId;
  if (!isSeller && !isClient) return { success: false, error: 'Acesso negado' };

  if (simulation.generatedShipmentId) {
    return { success: false, error: 'Pedido já foi gerado' };
  }

  const clientOrgId = simulation.clientOrganizationId ?? simulation.sellerOrganizationId;
  const totalProductsUsd = items.reduce(
    (sum, i) => sum.plus(new Decimal(i.priceUsd ?? 0).times(i.quantity)),
    new Decimal(0)
  );
  const totalCostsBrl = items.reduce(
    (sum, i) => sum.plus(new Decimal(i.landedCostTotalSnapshot ?? 0)),
    new Decimal(0)
  );

  const [shipment] = await db
    .insert(shipments)
    .values({
      quoteId,
      sellerOrganizationId: simulation.sellerOrganizationId,
      clientOrganizationId: clientOrgId,
      shipmentType: (simulation.shippingModality as 'SEA_FCL' | 'SEA_LCL' | 'AIR' | 'EXPRESS') ?? 'SEA_FCL',
      totalProductsUsd: totalProductsUsd.toFixed(2),
      totalCostsBrl: totalCostsBrl.toFixed(2),
    })
    .returning();

  if (!shipment) return { success: false, error: 'Falha ao criar pedido' };

  await db
    .update(quotes)
    .set({ generatedShipmentId: shipment.id, status: 'CONVERTED', updatedAt: new Date() })
    .where(eq(quotes.id, quoteId));

  return { success: true, shipmentId: shipment.id };
}

/**
 * Lista organizações disponíveis para envio (exclui a do Seller).
 */
export async function getOrganizationsForQuoteTarget(
  sellerOrganizationId: string
): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(ne(organizations.id, sellerOrganizationId))
    .orderBy(organizations.name);
}

// ==========================================
// Public Quote (unregistered client)
// ==========================================

export interface PublicQuoteData {
  quote: {
    id: string;
    name: string;
    status: string;
    clientEmail: string | null;
    sellerOrganizationName: string;
    isRecalculationNeeded: boolean;
  };
  items: Array<{
    id: string;
    name: string;
    sku: string | null;
    quantity: number;
    priceUsd: string;
    landedCostTotalSnapshot: string;
  }>;
  summary: {
    totalFobUsd: number;
    totalLandedCostBrl: number;
  };
}

/**
 * Fetch quote by public token (no auth).
 * Only for quotes with status SENT and valid publicToken.
 */
export async function getQuoteByPublicToken(
  publicToken: string
): Promise<PublicQuoteData | null> {
  const quote = await db.query.quotes.findFirst({
    where: and(
      eq(quotes.publicToken, publicToken),
      eq(quotes.status, 'SENT')
    ),
    with: {
      sellerOrganization: { columns: { name: true } },
    },
  });

  if (!quote) return null;

  const items = await db.query.quoteItems.findMany({
    where: eq(quoteItems.quoteId, quote.id),
    with: {
      variant: { with: { product: { columns: { name: true } } } },
    },
  });

  let totalFobUsd = 0;
  let totalLandedCostBrl = 0;

  const mappedItems = items.map((i) => {
    const fob = Number(i.priceUsd ?? 0) * i.quantity;
    const landed = Number(i.landedCostTotalSnapshot ?? 0);
    totalFobUsd += fob;
    totalLandedCostBrl += landed;

    const name =
      i.variant?.product?.name ??
      (i.simulatedProductSnapshot as { name?: string } | null)?.name ??
      i.variant?.name ??
      '—';
    const sku = i.variant?.sku ?? null;

    return {
      id: i.id,
      name,
      sku,
      quantity: i.quantity,
      priceUsd: String(i.priceUsd ?? 0),
      landedCostTotalSnapshot: String(i.landedCostTotalSnapshot ?? 0),
    };
  });

  return {
    quote: {
      id: quote.id,
      name: quote.name,
      status: quote.status,
      clientEmail: quote.clientEmail,
      sellerOrganizationName: quote.sellerOrganization?.name ?? '—',
      isRecalculationNeeded: quote.isRecalculationNeeded ?? false,
    },
    items: mappedItems,
    summary: { totalFobUsd, totalLandedCostBrl },
  };
}

export interface LinkQuoteToClientOrganizationResult {
  success: boolean;
  error?: string;
}

/**
 * Vincula a cotação à organização do cliente quando o email coincide.
 * Chamado após o cliente criar conta e ter uma organização.
 */
export async function linkQuoteToClientOrganization(
  quoteId: string,
  publicToken: string,
  clientOrganizationId: string,
  userId: string
): Promise<LinkQuoteToClientOrganizationResult> {
  const quote = await db.query.quotes.findFirst({
    where: and(
      eq(quotes.id, quoteId),
      eq(quotes.publicToken, publicToken),
      eq(quotes.status, 'SENT')
    ),
  });

  if (!quote) return { success: false, error: 'Cotação não encontrada' };
  if (!quote.clientEmail?.trim()) return { success: false, error: 'Cotação já vinculada' };

  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.organizationId, clientOrganizationId),
      eq(memberships.profileId, userId)
    ),
  });

  if (!membership) return { success: false, error: 'Acesso negado à organização' };

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
    columns: { email: true },
  });

  const userEmail = profile?.email?.toLowerCase().trim();
  const clientEmail = quote.clientEmail.toLowerCase().trim();
  if (!userEmail || userEmail !== clientEmail) {
    return { success: false, error: 'O e-mail da sua conta não corresponde ao e-mail da proposta' };
  }

  if (quote.clientOrganizationId) {
    return { success: false, error: 'Cotação já vinculada a outra organização' };
  }

  await db
    .update(quotes)
    .set({
      clientOrganizationId,
      clientEmail: null,
      publicToken: null,
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, quoteId));

  const { notifyOrganizationMembers } = await import('@/services/notification.service');
  await notifyOrganizationMembers(
    clientOrganizationId,
    'Proposta vinculada',
    'Uma proposta de importação foi vinculada à sua organização. Revise e aceite quando estiver de acordo.',
    `/dashboard/simulations/${quoteId}`,
    'INFO'
  );

  return { success: true };
}
