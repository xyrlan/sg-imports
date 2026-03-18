'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import {
  advanceStep,
  cancelShipment as cancelShipmentService,
  finalizeShipment as finalizeShipmentService,
} from '@/services/shipment-workflow.service';
import { getSuperAdminUser } from '@/services/auth.service';
import { z } from 'zod';

// ============================================
// Schemas
// ============================================

const cancelShipmentSchema = z.object({
  shipmentId: z.string().uuid(),
  reason: z.string().min(1),
});

// ============================================
// State Types
// ============================================

export interface AdvanceShipmentStepState {
  success?: boolean;
  data?: { currentStep: string; status?: string };
  error?: string;
}

export interface CancelShipmentState {
  success?: boolean;
  error?: string;
}

export interface FinalizeShipmentState {
  success?: boolean;
  error?: string;
}

// ============================================
// Actions
// ============================================

/**
 * Advance shipment to the next step.
 * Requires SUPER_ADMIN role.
 */
export async function advanceShipmentStepAction(
  shipmentId: string,
  currentStep: string,
): Promise<AdvanceShipmentStepState> {
  const t = await getTranslations('Admin.Shipments.Errors');

  try {
    const { profile } = await getSuperAdminUser();

    const result = await advanceStep(
      shipmentId,
      currentStep as Parameters<typeof advanceStep>[1],
      profile.id,
    );

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error advancing shipment step:', error);
    return { success: false, error: t('advanceFailed') };
  }
}

/**
 * Cancel a shipment with a reason.
 * Validates shipmentId (UUID) and reason (required) via Zod.
 * Requires SUPER_ADMIN role.
 */
export async function cancelShipmentAction(
  formData: FormData,
): Promise<CancelShipmentState> {
  const t = await getTranslations('Admin.Shipments.Errors');

  try {
    const { profile } = await getSuperAdminUser();

    const rawData = {
      shipmentId: formData.get('shipmentId') as string,
      reason: formData.get('reason') as string,
    };

    const validated = cancelShipmentSchema.safeParse(rawData);
    if (!validated.success) {
      const firstIssue = validated.error.issues[0];
      const isReasonError = firstIssue?.path.includes('reason');
      return { success: false, error: isReasonError ? t('reasonRequired') : t('invalidData') };
    }

    await cancelShipmentService(
      validated.data.shipmentId,
      validated.data.reason,
      profile.id,
    );

    revalidatePath(`/admin/shipments/${validated.data.shipmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error canceling shipment:', error);
    return { success: false, error: t('cancelFailed') };
  }
}

/**
 * Finalize a shipment (sets status to FINISHED).
 * Shipment must be in COMPLETION step.
 * Requires SUPER_ADMIN role.
 */
export async function finalizeShipmentAction(
  shipmentId: string,
): Promise<FinalizeShipmentState> {
  const t = await getTranslations('Admin.Shipments.Errors');

  try {
    const { profile } = await getSuperAdminUser();

    await finalizeShipmentService(shipmentId, profile.id);

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error finalizing shipment:', error);
    return { success: false, error: t('finalizeFailed') };
  }
}
