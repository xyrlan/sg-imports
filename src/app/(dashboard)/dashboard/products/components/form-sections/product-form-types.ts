import type { CreateProductSubmittedData } from '../../actions';

export type TieredPriceRow = { beginAmount: number; price: string };
export type AttributePair = { key: string; value: string };

export type FormVariant = CreateProductSubmittedData['variants'][number] & {
  id?: string;
};

export const defaultVariant = (): FormVariant => ({
  sku: '',
  name: '',
  priceUsd: '',
  height: '',
  width: '',
  length: '',
  netWeight: '',
  unitWeight: '',
  cartonHeight: '0',
  cartonWidth: '0',
  cartonLength: '0',
  cartonWeight: '0',
  unitsPerCarton: '1',
  packagingType: '',
});

export const defaultFormData: CreateProductSubmittedData = {
  name: '',
  styleCode: '',
  description: '',
  hsCodeId: '',
  supplierId: '',
  variants: [defaultVariant()],
};
