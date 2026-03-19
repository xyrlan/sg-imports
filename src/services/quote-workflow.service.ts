/**
 * Quote Workflow Service — Etapas B, C, D do fluxo de cotação
 * sendQuoteToClient, pullQuoteBackToDraft, rejectQuote, initiateContractSigning, convertQuoteToShipment
 */

import Decimal from 'decimal.js';
import { db, type DbTransaction } from '@/db';
import { quotes, quoteItems, organizations, shipments, memberships, profiles } from '@/db/schema';
import { eq, and, ne, or, inArray, isNull, isNotNull, sql } from 'drizzle-orm';
import { getOrganizationById } from '@/services/organization.service';
import { getSimulationById } from '@/services/simulation.service';
import { calculateAndPersistLandedCost } from '@/domain/simulation/services/simulation-domain.service';
import { randomBytes } from 'crypto';
import { sendQuoteLinkEmail } from '@/services/email.service';

// ==========================================
// QUOTE SENDING
// ==========================================

export interface SendQuoteToClientInput {
  quoteId: string;
  organizationId: string;
  userId: string;
  clientOrganizationId?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
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
  const { quoteId, organizationId, userId, clientOrganizationId, clientEmail, clientPhone } = input;

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
        clientPhone: null,
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
      `/dashboard/proposals/${quoteId}`,
      'INFO'
    );
    return { success: true };
  }

  if (clientEmail?.trim() || clientPhone?.trim()) {
    const publicToken = randomBytes(24).toString('base64url');
    const [updated] = await db
      .update(quotes)
      .set({
        clientEmail: clientEmail?.trim() || null,
        clientPhone: clientPhone?.trim() || null,
        publicToken,
        status: 'SENT',
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, quoteId))
      .returning();
    if (!updated) return { success: false, error: 'Falha ao atualizar' };

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const quoteLink = `${baseUrl}/quote/${publicToken}`;

    // Send email if provided
    if (clientEmail?.trim()) {
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
    }

    // Send WhatsApp if phone provided — fire-and-forget when email also sent, blocking when phone-only
    if (clientPhone?.trim()) {
      const sendWhatsApp = async () => {
        const { sendQuoteLinkWhatsApp } = await import('@/services/whatsapp.service');
        return sendQuoteLinkWhatsApp(
          clientPhone.trim(),
          quote.name,
          quoteLink,
          quote.sellerOrganization?.name ?? 'SoulGlobal',
          quoteId
        );
      };

      if (clientEmail?.trim()) {
        // Fire-and-forget when email was already sent
        sendWhatsApp().catch((err) => console.warn('WhatsApp failed for quote', quoteId, err));
      } else {
        // Phone-only: WhatsApp is the primary delivery channel
        try {
          await sendWhatsApp();
        } catch (err) {
          console.warn('WhatsApp failed for quote', quoteId, err);
          return {
            success: false,
            error:
              'Cotação enviada, mas o WhatsApp não pôde ser enviado. Tente novamente ou compartilhe o link manualmente.',
          };
        }
      }
    }

    return { success: true };
  }

  return { success: false, error: 'Informe a organização, o e-mail ou o telefone do cliente' };
}

// ==========================================
// QUOTE STATUS MANAGEMENT
// ==========================================

export interface PullQuoteBackToDraftResult {
  success: boolean;
  error?: string;
}

/**
 * Puxar cotação de volta para DRAFT (apenas Seller, status SENT ou REJECTED).
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
      inArray(quotes.status, ['SENT', 'REJECTED', 'PENDING_SIGNATURE'])
    ),
  });

  if (!quote) return { success: false, error: 'Cotação não encontrada ou não pode ser puxada de volta' };

  await db
    .update(quotes)
    .set({
      status: 'DRAFT',
      clientOrganizationId: null,
      clientEmail: null,
      clientPhone: null,
      publicToken: null,
      rejectionReason: null,
      zapSignDocToken: null,
      zapSignSignerToken: null,
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, quoteId));

  return { success: true };
}

export interface RejectQuoteResult {
  success: boolean;
  error?: string;
}

/**
 * Etapa C1: Cliente rejeita a cotação.
 */
export async function rejectQuote(
  quoteId: string,
  organizationId: string,
  userId: string,
  reason: string
): Promise<RejectQuoteResult> {
  const orgData = await getOrganizationById(organizationId, userId);
  if (!orgData) return { success: false, error: 'Acesso negado' };

  const quote = await db.query.quotes.findFirst({
    where: and(
      eq(quotes.id, quoteId),
      eq(quotes.clientOrganizationId, organizationId),
      eq(quotes.status, 'SENT')
    ),
  });

  if (!quote) return { success: false, error: 'Cotação não encontrada ou não está em SENT' };

  await db
    .update(quotes)
    .set({ status: 'REJECTED', rejectionReason: reason, updatedAt: new Date() })
    .where(eq(quotes.id, quoteId));

  const { notifyOrganizationMembers } = await import('@/services/notification.service');
  await notifyOrganizationMembers(
    quote.sellerOrganizationId,
    'Proposta rejeitada',
    `O cliente rejeitou a proposta "${quote.name}". Motivo: ${reason}`,
    `/dashboard/simulations/${quoteId}`,
    'WARNING'
  );

  return { success: true };
}

// ==========================================
// CONTRACT & CONVERSION
// ==========================================

export interface InitiateContractSigningResult {
  success: boolean;
  signUrl?: string;
  error?: string;
}

/**
 * Etapa C2: Cliente inicia assinatura do contrato.
 * - Calcula landed cost final
 * - Cria documento no ZapSign
 * - Atualiza status para PENDING_SIGNATURE
 */
export async function initiateContractSigning(
  quoteId: string,
  organizationId: string,
  userId: string
): Promise<InitiateContractSigningResult> {
  const data = await getSimulationById(quoteId, organizationId, userId);
  if (!data) return { success: false, error: 'Cotação não encontrada' };

  const { simulation } = data;
  if (simulation.status !== 'SENT') return { success: false, error: 'Cotação não está aguardando aceite' };
  if (simulation.clientOrganizationId !== organizationId) {
    return { success: false, error: 'Apenas o cliente pode assinar esta cotação' };
  }
  if (simulation.isRecalculationNeeded) {
    return { success: false, error: 'Esta cotação está desatualizada. Solicite uma atualização ao Seller.' };
  }

  const calcResult = await calculateAndPersistLandedCost(quoteId, organizationId, userId);
  if (!calcResult.success) {
    return { success: false, error: calcResult.errors?.[0] ?? 'Falha ao calcular custo' };
  }

  // Fetch signer info and orderType from client organization
  const clientOrg = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { name: true, orderType: true },
  });
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
    columns: { fullName: true, email: true },
  });

  const signerName = profile?.fullName || clientOrg?.name || 'Cliente';
  const signerEmail = profile?.email || '';

  if (!signerEmail) {
    return { success: false, error: 'E-mail do assinante não encontrado' };
  }

  const { createDocumentFromTemplate } = await import('@/services/zapsign.service');
  const orderType = clientOrg?.orderType ?? 'ORDER';
  const docResult = await createDocumentFromTemplate(signerName, signerEmail, orderType);

  if (!docResult.success) {
    return { success: false, error: docResult.error };
  }

  await db
    .update(quotes)
    .set({
      status: 'PENDING_SIGNATURE',
      zapSignDocToken: docResult.docToken,
      zapSignSignerToken: docResult.signerToken,
      isRecalculationNeeded: false,
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, quoteId));

  return { success: true, signUrl: docResult.signUrl };
}

export interface ConvertQuoteToShipmentResult {
  success: boolean;
  shipmentId?: string;
  error?: string;
}

/**
 * Shared conversion logic: compute totals, insert shipment, mark quote as CONVERTED.
 * Works with both `db` (direct) and `tx` (inside transaction).
 */
async function executeQuoteConversion(
  executor: typeof db | DbTransaction,
  params: {
    quoteId: string;
    sellerOrganizationId: string;
    clientOrganizationId: string | null;
    shippingModality: string | null;
    items: Array<{ priceUsd: string | null; quantity: number; landedCostTotalSnapshot: string | null }>;
  },
): Promise<ConvertQuoteToShipmentResult> {
  const clientOrgId = params.clientOrganizationId ?? params.sellerOrganizationId;
  const totalProductsUsd = params.items.reduce(
    (sum, i) => sum.plus(new Decimal(i.priceUsd ?? 0).times(i.quantity)),
    new Decimal(0),
  );
  const totalCostsBrl = params.items.reduce(
    (sum, i) => sum.plus(new Decimal(i.landedCostTotalSnapshot ?? 0)),
    new Decimal(0),
  );

  const [shipment] = await executor
    .insert(shipments)
    .values({
      quoteId: params.quoteId,
      sellerOrganizationId: params.sellerOrganizationId,
      clientOrganizationId: clientOrgId,
      shipmentType: (params.shippingModality as 'SEA_FCL' | 'SEA_LCL' | 'AIR' | 'EXPRESS') ?? 'SEA_FCL',
      totalProductsUsd: totalProductsUsd.toFixed(2),
      totalCostsBrl: totalCostsBrl.toFixed(2),
    })
    .returning();

  if (!shipment) return { success: false, error: 'Falha ao criar pedido' };

  await executor
    .update(quotes)
    .set({ generatedShipmentId: shipment.id, status: 'CONVERTED', updatedAt: new Date() })
    .where(eq(quotes.id, params.quoteId));

  return { success: true, shipmentId: shipment.id };
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

  return executeQuoteConversion(db, {
    quoteId,
    sellerOrganizationId: simulation.sellerOrganizationId,
    clientOrganizationId: simulation.clientOrganizationId,
    shippingModality: simulation.shippingModality,
    items,
  });
}

/**
 * System-level conversion: called by Inngest webhook handler (no auth required).
 * Converts a PENDING_SIGNATURE quote into a Shipment after contract is signed.
 * Idempotent: wrapped in a transaction to prevent duplicate shipments on retry.
 */
export async function convertQuoteToShipmentSystem(
  quoteId: string
): Promise<ConvertQuoteToShipmentResult> {
  return db.transaction(async (tx) => {
    const quote = await tx.query.quotes.findFirst({
      where: and(eq(quotes.id, quoteId), eq(quotes.status, 'PENDING_SIGNATURE')),
      with: { items: true },
    });

    if (!quote) {
      const existing = await tx.query.quotes.findFirst({
        where: and(eq(quotes.id, quoteId), eq(quotes.status, 'CONVERTED')),
        columns: { generatedShipmentId: true },
      });
      if (existing?.generatedShipmentId) {
        return { success: true, shipmentId: existing.generatedShipmentId };
      }
      return { success: false, error: 'Cotação não encontrada ou status inválido' };
    }

    if (quote.generatedShipmentId) {
      return { success: true, shipmentId: quote.generatedShipmentId };
    }

    return executeQuoteConversion(tx, {
      quoteId,
      sellerOrganizationId: quote.sellerOrganizationId,
      clientOrganizationId: quote.clientOrganizationId,
      shippingModality: quote.shippingModality,
      items: quote.items ?? [],
    });
  });
}

// ==========================================
// QUERY HELPERS
// ==========================================

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
// PUBLIC QUOTE ACCESS
// ==========================================

export interface PublicQuoteData {
  quote: {
    id: string;
    name: string;
    status: string;
    clientEmail: string | null;
    clientPhone: string | null;
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
      clientPhone: quote.clientPhone,
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
  if (!quote.clientEmail?.trim() && !quote.clientPhone?.trim()) {
    return { success: false, error: 'Cotação já vinculada' };
  }

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

  // Match by email
  const userEmail = profile?.email?.toLowerCase().trim();
  const quoteEmail = quote.clientEmail?.toLowerCase().trim();
  const emailMatches = !!userEmail && !!quoteEmail && userEmail === quoteEmail;

  // Match by phone — fetch org phone for comparison
  let phoneMatches = false;
  if (quote.clientPhone?.trim()) {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, clientOrganizationId),
      columns: { phone: true },
    });
    const orgPhone = org?.phone?.replace(/\D/g, '');
    const quotePhone = quote.clientPhone.replace(/\D/g, '');
    phoneMatches = !!orgPhone && !!quotePhone && orgPhone === quotePhone;
  }

  if (!emailMatches && !phoneMatches) {
    return { success: false, error: 'O e-mail ou telefone da sua conta não corresponde ao da proposta' };
  }

  if (quote.clientOrganizationId) {
    return { success: false, error: 'Cotação já vinculada a outra organização' };
  }

  await db
    .update(quotes)
    .set({
      clientOrganizationId,
      clientEmail: null,
      clientPhone: null,
      publicToken: null,
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, quoteId));

  const { notifyOrganizationMembers } = await import('@/services/notification.service');
  await notifyOrganizationMembers(
    clientOrganizationId,
    'Proposta vinculada',
    'Uma proposta de importação foi vinculada à sua organização. Revise e aceite quando estiver de acordo.',
    `/dashboard/proposals/${quoteId}`,
    'INFO'
  );

  return { success: true };
}

// ==========================================
// AUTO-LINK PENDING QUOTES ON ONBOARDING
// ==========================================

/** Normaliza telefone removendo tudo que não é dígito */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Vincula automaticamente cotações pendentes à organização do cliente
 * após o onboarding, usando match por email ou telefone.
 */
export async function linkPendingQuotesToOrganization(input: {
  userEmail?: string | null;
  orgPhone?: string | null;
  organizationId: string;
  userId: string;
}): Promise<{ linkedCount: number }> {
  const { userEmail, orgPhone, organizationId, userId } = input;

  if (!userEmail && !orgPhone) return { linkedCount: 0 };

  // Build match conditions: email OR phone
  const matchConditions: ReturnType<typeof sql>[] = [];
  if (userEmail) {
    matchConditions.push(
      sql`lower(trim(${quotes.clientEmail})) = ${userEmail.toLowerCase().trim()}`
    );
  }
  if (orgPhone) {
    const normalizedPhone = normalizePhone(orgPhone);
    if (normalizedPhone.length >= 8) {
      matchConditions.push(
        sql`regexp_replace(${quotes.clientPhone}, '\\D', '', 'g') = ${normalizedPhone}`
      );
    }
  }

  if (matchConditions.length === 0) return { linkedCount: 0 };

  const pendingQuotes = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(
      and(
        isNull(quotes.clientOrganizationId),
        isNotNull(quotes.publicToken),
        eq(quotes.status, 'SENT'),
        or(...matchConditions)
      )
    );

  if (pendingQuotes.length === 0) return { linkedCount: 0 };

  const quoteIds = pendingQuotes.map((q) => q.id);

  await db
    .update(quotes)
    .set({
      clientOrganizationId: organizationId,
      clientEmail: null,
      clientPhone: null,
      publicToken: null,
      updatedAt: new Date(),
    })
    .where(inArray(quotes.id, quoteIds));

  // Notify organization members about linked quotes
  const { notifyOrganizationMembers } = await import('@/services/notification.service');
  for (const q of pendingQuotes) {
    await notifyOrganizationMembers(
      organizationId,
      'Proposta vinculada',
      'Uma proposta de importação foi vinculada à sua organização. Revise e aceite quando estiver de acordo.',
      `/dashboard/proposals/${q.id}`,
      'INFO'
    );
  }

  return { linkedCount: pendingQuotes.length };
}
