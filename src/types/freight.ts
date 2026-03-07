/** Retorno da função de otimização de modalidade de frete */
export type FreightProfile = {
  suggestedModality: 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS';
  isContainerized: boolean;
  equipment?: {
    type: '20GP' | '40NOR' | '40HC';
    quantity: number;
  };
  capacity: { maxWeight: number | null; maxVolume: number | null };
};

export type EquipmentType = '20GP' | '40NOR' | '40HC';

export type ShippingModality = 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'SEA_FCL_PARTIAL' | 'EXPRESS';
