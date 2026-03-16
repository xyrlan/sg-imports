'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAuthOrRedirect } from '@/services/auth.service';
import { getOrganizationById } from '@/services/organization.service';
import {
  sendQuoteToClient,
  pullQuoteBackToDraft,
  rejectQuote,
  initiateContractSigning,
  getOrganizationsForQuoteTarget,
} from '@/services/quote-workflow.service';

export async function getOrganizationsForQuoteTargetAction(
  sellerOrganizationId: string
): Promise<{ id: string; name: string }[]> {
  const user = await requireAuthOrRedirect();
  const access = await getOrganizationById(sellerOrganizationId, user.id);
  if (!access) return [];
  return getOrganizationsForQuoteTarget(sellerOrganizationId);
}


const sendQuoteToClientSchema = z
  .object({
    quoteId: z.string().uuid(),
    organizationId: z.string().uuid(),
    clientOrganizationId: z
      .string()
      .uuid()
      .optional()
      .nullable()
      .transform((s) => (s && s.trim() ? s : null)),
    clientEmail: z
      .string()
      .optional()
      .nullable()
      .transform((s) => (s && s.trim() ? s : null)),
    clientPhone: z
      .string()
      .optional()
      .nullable()
      .transform((s) => (s && s.trim() ? s : null)),
  })
  .refine((d) => d.clientOrganizationId || d.clientEmail || d.clientPhone, {
    message: 'Informe a organização, o e-mail ou o telefone do cliente',
  })
  .refine((d) => !d.clientEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.clientEmail), {
    message: 'E-mail inválido',
    path: ['clientEmail'],
  })
  .refine((d) => !d.clientPhone || /^\+?\d[\d\s()-]{7,}$/.test(d.clientPhone), {
    message: 'Telefone inválido',
    path: ['clientPhone'],
  });

export interface SendQuoteToClientResult {
  success?: boolean;
  error?: string;
}

export async function sendQuoteToClientAction(
  _prevState: SendQuoteToClientResult | null,
  formData: FormData
): Promise<SendQuoteToClientResult> {
  try {
    const user = await requireAuthOrRedirect();
    const raw = {
      quoteId: formData.get('quoteId') as string,
      organizationId: formData.get('organizationId') as string,
      clientOrganizationId: (formData.get('clientOrganizationId') as string) || null,
      clientEmail: (formData.get('clientEmail') as string)?.trim() || null,
      clientPhone: (formData.get('clientPhone') as string)?.trim() || null,
    };
    const validated = sendQuoteToClientSchema.safeParse(raw);
    if (!validated.success) return { error: validated.error.issues[0]?.message ?? 'Invalid input' };

    const access = await getOrganizationById(validated.data.organizationId, user.id);
    if (!access) return { error: 'Acesso negado' };

    const result = await sendQuoteToClient({
      quoteId: validated.data.quoteId,
      organizationId: validated.data.organizationId,
      userId: user.id,
      clientOrganizationId: validated.data.clientOrganizationId ?? undefined,
      clientEmail: validated.data.clientEmail ?? undefined,
      clientPhone: validated.data.clientPhone ?? undefined,
    });

    if (!result.success) return { error: result.error };
    revalidatePath(`/dashboard/simulations/${validated.data.quoteId}`);
    revalidatePath(`/dashboard/proposals/${validated.data.quoteId}`);
    return { success: true };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return { error: err instanceof Error ? err.message : 'Falha ao enviar' };
  }
}

export interface PullQuoteBackResult {
  success?: boolean;
  error?: string;
}

export async function pullQuoteBackToDraftAction(
  quoteId: string,
  organizationId: string
): Promise<PullQuoteBackResult> {
  try {
    const user = await requireAuthOrRedirect();
    const access = await getOrganizationById(organizationId, user.id);
    if (!access) return { error: 'Acesso negado' };

    const result = await pullQuoteBackToDraft(quoteId, organizationId, user.id);
    if (!result.success) return { error: result.error };
    revalidatePath(`/dashboard/simulations/${quoteId}`);
    revalidatePath(`/dashboard/proposals/${quoteId}`);
    return { success: true };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return { error: err instanceof Error ? err.message : 'Falha ao puxar de volta' };
  }
}

export interface RejectQuoteActionResult {
  success?: boolean;
  error?: string;
}

export async function rejectQuoteAction(
  quoteId: string,
  organizationId: string,
  reason: string
): Promise<RejectQuoteActionResult> {
  try {
    const user = await requireAuthOrRedirect();
    const access = await getOrganizationById(organizationId, user.id);
    if (!access) return { error: 'Acesso negado' };

    const result = await rejectQuote(quoteId, organizationId, user.id, reason);
    if (!result.success) return { error: result.error };
    revalidatePath(`/dashboard/simulations/${quoteId}`);
    revalidatePath(`/dashboard/proposals/${quoteId}`);
    return { success: true };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return { error: err instanceof Error ? err.message : 'Falha ao rejeitar' };
  }
}

export interface InitiateContractSigningActionResult {
  success?: boolean;
  signUrl?: string;
  error?: string;
}

export async function initiateContractSigningAction(
  quoteId: string,
  organizationId: string
): Promise<InitiateContractSigningActionResult> {
  try {
    const user = await requireAuthOrRedirect();
    const access = await getOrganizationById(organizationId, user.id);
    if (!access) return { error: 'Acesso negado' };

    const result = await initiateContractSigning(quoteId, organizationId, user.id);
    if (!result.success) return { error: result.error };
    revalidatePath(`/dashboard/simulations/${quoteId}`);
    revalidatePath(`/dashboard/proposals/${quoteId}`);
    return { success: true, signUrl: result.signUrl };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return { error: err instanceof Error ? err.message : 'Falha ao iniciar assinatura' };
  }
}
