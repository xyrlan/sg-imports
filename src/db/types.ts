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
  boxQuantity: number;
  boxWeight: number;
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
};

// Adicional: Regras de Armazenagem
export type StorageRuleAdditionalFee = {
  name: string;
  value: number;
  basis: 'PER_BOX' | 'PER_BL' | 'PER_WM' | 'PER_CONTAINER';
};