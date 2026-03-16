'use client';

import {
  FieldError,
  Input,
  Label,
  TextArea,
  TextField,
} from '@heroui/react';
import { ProductPhotosUpload } from '@/components/ui/product-photos-upload';
import type { CreateProductSubmittedData } from '../../actions';
import type { ProductWithVariants } from '@/services/product.service';

interface BasicFieldsProps {
  formData: CreateProductSubmittedData;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isPending: boolean;
  isSimulated: boolean;
  isEdit: boolean;
  initialProduct?: ProductWithVariants | null;
  t: (key: string) => string;
}

export function BasicFields({
  formData,
  setFormData,
  isPending,
  isSimulated,
  isEdit,
  initialProduct,
  t,
}: BasicFieldsProps) {
  return (
    <>
      <TextField
        variant="primary"
        isDisabled={isPending}
        isRequired
        name="name"
        value={formData.name}
        onChange={(v) => setFormData((prev: any) => ({ ...prev, name: v }))}
        validate={(v) => (!v?.trim() ? t('nameRequired') : null)}
      >
        <Label>{t('productName')}</Label>
        <Input placeholder={t('productNamePlaceholder')} />
        <FieldError />
      </TextField>

      {!isSimulated && (
        <TextField
          variant="primary"
          isDisabled={isPending}
          name="styleCode"
          value={formData.styleCode}
          onChange={(v) => setFormData((prev: any) => ({ ...prev, styleCode: v }))}
        >
          <Label>{t('spu')}</Label>
          <Input placeholder={t('spuPlaceholder')} />
          <FieldError />
        </TextField>
      )}

      <TextField
        variant="primary"
        isDisabled={isPending}
        name="description"
        value={formData.description}
        onChange={(v) => setFormData((prev: any) => ({ ...prev, description: v }))}
      >
        <Label>{t('description')}</Label>
        <TextArea placeholder={t('descriptionPlaceholder')} />
        <FieldError />
      </TextField>

      {!isSimulated && (
        <ProductPhotosUpload
          name="photos"
          label={t('productPhotos')}
          helpText={t('photosHelp')}
          disabled={isPending}
          initialPhotos={isEdit ? initialProduct?.photos ?? undefined : undefined}
        />
      )}
    </>
  );
}
