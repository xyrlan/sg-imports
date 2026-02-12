export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const;

export const RATE_TYPES = [
  'AFRMM',
  'PIS_DEFAULT',
  'COFINS_DEFAULT',
  'INTL_INSURANCE',
  'CUSTOMS_BROKER_SDA',
  'CONTAINER_UNSTUFFING',
  'CONTAINER_WASHING',
] as const;

export const SECTION_KEYS = [
  'honorarios',
  'impostos-taxas',
  'terminals',
  'ports',
  'carriers',
  'currency-exchange-brokers',
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const TAX_TAB_KEYS = ['icms', 'siscomex', 'platform'] as const;

export type TaxTabKey = (typeof TAX_TAB_KEYS)[number];

export type TranslateFn = (key: string) => string;
