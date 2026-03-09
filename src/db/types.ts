// Tipos para Alibaba/1688 e snapshots de produtos
export type VariantAttributes = Record<string, string>;

export type PriceTier = { 
  beginAmount: number; 
  price: string 
};

export type TieredPriceInfo = PriceTier[];

export type TaxSnapshot = {
  ii: number;
  ipi: number;
  pis: number;
  cofins: number;
};

export type ProductSnapshot = {
  styleCode?: string;
  sku?: string;
  name: string;
  nameEnglish?: string;
  description?: string;
  photos?: string[];
  priceUsd: string;
  netWeight?: number;
  unitWeight?: number;
  height?: number;
  width?: number;
  length?: number;
  attributes?: VariantAttributes;
  tieredPriceInfo?: TieredPriceInfo;
  hsCode: string;
  taxSnapshot?: TaxSnapshot;
  supplierName?: string;

  // Carton dimensions for CBM calculation (Landed Cost) — required for freight
  unitsPerCarton: number;
  cartonHeight?: number;
  cartonWidth?: number;
  cartonLength?: number;
  cartonWeight?: number;
  packagingType?: 'BOX' | 'PALLET' | 'BAG';
  /** Para rascunho rápido: CBM total direto (sem dimensões de caixa) */
  totalCbm?: number;
  /** Para rascunho rápido: Peso total direto (sem dimensões de caixa) */
  totalWeight?: number;
};

// Adicional: Regras de Armazenagem
export type StorageRuleAdditionalFee = {
  name: string;
  value: number;
  basis: 'PER_BOX' | 'PER_BL' | 'PER_WM' | 'PER_CONTAINER';
};

/** Tipagem estrita para quotes.metadata (JSONB) */
export interface ShippingMetadata {
  equipmentType?: '20GP' | '40NOR' | '40HC';
  equipmentQuantity?: number;
  totalChargeableWeight?: number;
  isOverride?: boolean;
  totalFreightUsd?: number;
  totalInsuranceUsd?: number;
  /** Capatazia em USD (para rateio AFRMM) */
  capataziaUsd?: number;
  /** UF para ICMS (ex: 'SP') — estado de destino/desembaraço */
  destinationState?: string;
}