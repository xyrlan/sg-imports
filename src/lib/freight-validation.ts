/** Excesso até 2%: soft warning (âmbar), permitir confirmação */
export const SOFT_WARNING_THRESHOLD = 1.02;

/** Excesso > 10%: hard block (vermelho), bloquear confirmação */
export const HARD_BLOCK_THRESHOLD = 1.1;

export type ValidationResult =
  | { ok: true }
  | { ok: false; kind: 'soft'; message: string }
  | { ok: false; kind: 'hard'; message: string };

/**
 * Valida se a carga está dentro dos limites para SEA_FCL.
 * Retorna ok, soft warning (permitir) ou hard block (bloquear).
 */
export function validateFreightCapacity(
  totalCbm: number,
  totalWeight: number,
  capacity: { maxWeight: number; maxVolume: number },
): ValidationResult {
  const volRatio = capacity.maxVolume > 0 ? totalCbm / capacity.maxVolume : 0;
  const weightRatio = capacity.maxWeight > 0 ? totalWeight / capacity.maxWeight : 0;
  const maxRatio = Math.max(volRatio, weightRatio);

  if (maxRatio <= 1) return { ok: true };

  if (maxRatio > HARD_BLOCK_THRESHOLD) {
    return {
      ok: false,
      kind: 'hard',
      message: 'validateHardBlock',
    };
  }

  return {
    ok: false,
    kind: 'soft',
    message: 'validateSoftWarning',
  };
}

/** Verifica se deve bloquear o botão de confirmação (apenas hard block) */
export function shouldBlockConfirm(result: ValidationResult): boolean {
  return result.ok === false && result.kind === 'hard';
}
