import type { ProductSnapshot } from '@/db/types';
import type { CreateProductSubmittedData } from '@/app/(dashboard)/dashboard/products/actions';

/**
 * Converts ProductSnapshot + quantity to form data for ProductForm in simulated mode.
 * Handles comma-to-dot conversion for numeric fields.
 */
function toStr(x: number | string | undefined | null): string {
  if (x == null || x === '') return '';
  const s = String(x).replace(',', '.');
  return s;
}

export function snapshotToFormData(
  snapshot: ProductSnapshot,
  quantity: number
): CreateProductSubmittedData & { variants: Array<CreateProductSubmittedData['variants'][number] & { id?: string }> } {
  const v = snapshot;
  return {
    name: v.name ?? '',
    styleCode: v.styleCode ?? '',
    description: v.description ?? '',
    hsCodeId: '',
    supplierId: '',
    variants: [
      {
        sku: v.sku ?? '',
        name: v.name ?? '',
        priceUsd: toStr(v.priceUsd),
        height: toStr(v.height),
        width: toStr(v.width),
        length: toStr(v.length),
        netWeight: toStr(v.netWeight),
        unitWeight: toStr(v.unitWeight),
        cartonHeight: toStr(v.cartonHeight ?? 0),
        cartonWidth: toStr(v.cartonWidth ?? 0),
        cartonLength: toStr(v.cartonLength ?? 0),
        cartonWeight: toStr(v.cartonWeight ?? 0),
        unitsPerCarton: String(v.unitsPerCarton ?? 1),
        packagingType: v.packagingType ?? '',
      },
    ],
  };
}

export interface InitialSimulatedFormState {
  formData: CreateProductSubmittedData & { variants: Array<CreateProductSubmittedData['variants'][number] & { id?: string }> };
  simulatedQuantity: number;
  simulatedHsCode: string;
  simulatedSupplierName: string;
}

export function snapshotToInitialSimulatedState(
  snapshot: ProductSnapshot,
  quantity: number
): InitialSimulatedFormState {
  return {
    formData: snapshotToFormData(snapshot, quantity),
    simulatedQuantity: quantity,
    simulatedHsCode: snapshot.hsCode ?? '',
    simulatedSupplierName: snapshot.supplierName ?? '',
  };
}
