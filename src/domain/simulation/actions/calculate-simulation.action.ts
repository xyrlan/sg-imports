'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAuthOrRedirect } from '@/services/auth.service';
import { getOrganizationById } from '@/services/organization.service';
import { calculateAndPersistLandedCost } from '../services/simulation-domain.service';

const calculateSimulationSchema = z.object({
  simulationId: z.string().uuid('ID da simulação inválido'),
  organizationId: z.string().uuid('ID da organização inválido'),
});

export interface CalculateSimulationResult {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  errors?: string[];
}

/**
 * Server Action: Recalcula e persiste o Landed Cost da simulação.
 * Retorna errors[] com mensagens amigáveis para exibir no Frontend (toast ou painel).
 */
export async function calculateSimulationAction(
  simulationId: string,
  organizationId: string,
): Promise<CalculateSimulationResult> {
  try {
    const user = await requireAuthOrRedirect();

    const validated = calculateSimulationSchema.safeParse({
      simulationId,
      organizationId,
    });

    if (!validated.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validated.error.issues) {
        const path = issue.path.map(String).join('.');
        if (path) fieldErrors[path] = issue.message;
      }
      return {
        error: validated.error.issues[0]?.message ?? 'Dados inválidos',
        fieldErrors,
      };
    }

    const access = await getOrganizationById(validated.data.organizationId, user.id);
    if (!access) {
      return { error: 'Acesso negado à organização' };
    }

    const result = await calculateAndPersistLandedCost(
      validated.data.simulationId,
      validated.data.organizationId,
      user.id,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.errors?.[0] ?? 'Falha ao calcular impostos',
        errors: result.errors,
      };
    }

    revalidatePath(`/dashboard/simulations/${validated.data.simulationId}`);
    return {
      success: true,
      ...(result.errors && result.errors.length > 0 && { errors: result.errors }),
    };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : 'Erro ao calcular simulação',
    };
  }
}
