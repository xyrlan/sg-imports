export const CONTAINER_TYPE_LABELS: Record<string, string> = {
  GP_20: "GP 20'",
  GP_40: "GP 40'",
  HC_40: "HC 40'",
  RF_20: "RF 20'",
  RF_40: "RF 40'",
};

export const PORT_DIRECTION_LABELS: Record<string, string> = {
  ORIGIN: 'Origem',
  DESTINATION: 'Destino',
  BOTH: 'Ambos',
};

export type ValidityStatus = 'valid' | 'expiring' | 'expired';

export function getValidityStatus(validTo: Date | string | null): ValidityStatus {
  if (validTo == null) return 'valid';
  const end = typeof validTo === 'string' ? new Date(validTo) : validTo;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 7) return 'expiring';
  return 'valid';
}
