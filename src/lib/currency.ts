/** Round to 2 decimal places using banker's rounding (HALF_EVEN) */
export function roundMoney(value: number): number {
  const factor = 100;
  const shifted = value * factor;
  const floored = Math.floor(shifted);
  const decimal = shifted - floored;
  if (decimal > 0.5) return (floored + 1) / factor;
  if (decimal < 0.5) return floored / factor;
  return (floored % 2 === 0 ? floored : floored + 1) / factor;
}
