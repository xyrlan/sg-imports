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
