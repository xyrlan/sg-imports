'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  FieldError,
  Input,
  Label,
  Tabs,
  TextField,
} from '@heroui/react';
import { HsCodeAutocomplete } from '@/components/ui/hs-code-autocomplete';
import type { ProductSnapshot } from '@/db/types';
import type { HsCodeOption } from '@/services/simulation.service';

type FormMode = 'direct' | 'carton';

interface SimulatedProductQuickFormProps {
  hsCodes: HsCodeOption[];
  onSubmit: (snapshot: ProductSnapshot, quantity: number, priceUsd: string) => Promise<void>;
  isSubmitting?: boolean;
  formId?: string;
  /** For edit mode: pre-populate form with existing snapshot */
  initialSnapshot?: ProductSnapshot | null;
  /** For edit mode: initial quantity (default 1 for add) */
  initialQuantity?: number;
  /** For edit mode: initial price (e.g. item.priceUsd) */
  initialPriceUsd?: string;
  /** Submit button label (default: "Add") */
  submitLabel?: string;
  /** When true, hide the submit button (parent provides it via form={formId}) */
  hideSubmitButton?: boolean;
}

export function SimulatedProductQuickForm({
  hsCodes,
  onSubmit,
  isSubmitting = false,
  formId,
  initialSnapshot,
  initialQuantity = 1,
  initialPriceUsd = '',
  submitLabel,
  hideSubmitButton = false,
}: SimulatedProductQuickFormProps) {
  const t = useTranslations('Products.Form');
  const tQuick = useTranslations('Simulations.QuickForm');

  const [mode, setMode] = useState<FormMode>('direct');
  const [name, setName] = useState('');
  const [hsCodeId, setHsCodeId] = useState<string | null>(null);
  const [hsCodeCode, setHsCodeCode] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [totalCbm, setTotalCbm] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [cartonHeight, setCartonHeight] = useState('');
  const [cartonWidth, setCartonWidth] = useState('');
  const [cartonLength, setCartonLength] = useState('');
  const [unitsPerCarton, setUnitsPerCarton] = useState('1');
  const [cartonWeight, setCartonWeight] = useState('');
  const [quantityError, setQuantityError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      if (initialSnapshot) {
        setName(initialSnapshot.name ?? '');
        setPriceUsd((initialPriceUsd || initialSnapshot.priceUsd) ?? '');
        setQuantity(String(initialQuantity));
        setTotalCbm(initialSnapshot.totalCbm != null ? String(initialSnapshot.totalCbm) : '');
        setTotalWeight(initialSnapshot.totalWeight != null ? String(initialSnapshot.totalWeight) : '');
        setUnitsPerCarton(String(initialSnapshot.unitsPerCarton ?? 1));
        setCartonHeight(initialSnapshot.cartonHeight != null ? String(initialSnapshot.cartonHeight) : '');
        setCartonWidth(initialSnapshot.cartonWidth != null ? String(initialSnapshot.cartonWidth) : '');
        setCartonLength(initialSnapshot.cartonLength != null ? String(initialSnapshot.cartonLength) : '');
        setCartonWeight(initialSnapshot.cartonWeight != null ? String(initialSnapshot.cartonWeight) : '');
        const code = initialSnapshot.hsCode ?? '';
        setHsCodeCode(code);
        const matched = hsCodes.find((hc) => hc.code === code);
        setHsCodeId(matched ? matched.id : (code ? '__custom__' : null));

        const hasDirectCbmWeight =
          (initialSnapshot.totalCbm != null && initialSnapshot.totalCbm > 0) ||
          (initialSnapshot.totalWeight != null && initialSnapshot.totalWeight > 0);
        const hasCarton =
          (initialSnapshot.cartonHeight ?? 0) > 0 ||
          (initialSnapshot.cartonWidth ?? 0) > 0 ||
          (initialSnapshot.cartonLength ?? 0) > 0;
        setMode(hasDirectCbmWeight ? 'direct' : hasCarton ? 'carton' : 'direct');
      }
    });
  }, [initialSnapshot, initialQuantity, initialPriceUsd, hsCodes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const snapshot: ProductSnapshot = {
      name: name.trim() || tQuick('defaultName'),
      hsCode: hsCodeCode.trim() || '0000.00.00',
      priceUsd: priceUsd.trim() || '0',
      unitsPerCarton: mode === 'direct' ? 1 : parseInt(unitsPerCarton, 10) || 1,
    };

    if (mode === 'direct') {
      const cbm = parseFloat(totalCbm) || 0;
      const weight = parseFloat(totalWeight) || 0;
      if (cbm <= 0 && weight <= 0) return;
      snapshot.totalCbm = cbm > 0 ? cbm : undefined;
      snapshot.totalWeight = weight > 0 ? weight : undefined;
    } else {
      const hasCartonDims =
        parseFloat(cartonHeight) || parseFloat(cartonWidth) || parseFloat(cartonLength);
      if (!hasCartonDims) return;
      snapshot.cartonHeight = parseFloat(cartonHeight) || undefined;
      snapshot.cartonWidth = parseFloat(cartonWidth) || undefined;
      snapshot.cartonLength = parseFloat(cartonLength) || undefined;
      snapshot.cartonWeight = parseFloat(cartonWeight) || undefined;

      const quantityNum = Math.max(1, parseInt(quantity, 10) || 1);
      const upc = snapshot.unitsPerCarton ?? 1;
      if (quantityNum % upc !== 0) {
        setQuantityError(tQuick('quantityMustBeMultipleOf', { unitsPerCarton: upc }));
        return;
      }
    }

    setQuantityError(null);
    const quantityNum = Math.max(1, parseInt(quantity, 10) || 1);
    await onSubmit(snapshot, quantityNum, priceUsd.trim() || '0');
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <TextField variant="primary" isRequired value={name} onChange={setName}>
        <Label>{t('productName')}</Label>
        <Input placeholder={t('productNamePlaceholder')} />
      </TextField>

      <HsCodeAutocomplete
        hsCodes={hsCodes}
        value={hsCodeId}
        onChange={(id, code) => {
          setHsCodeId(id);
          setHsCodeCode(code);
        }}
        allowCustomCode
        customCodeWhenSelected={hsCodeId === '__custom__' ? hsCodeCode : undefined}
        label={t('hsCodeLabel')}
        placeholder={tQuick('selectNcm')}
        isRequired
        fullWidth
      />

      <div className="grid grid-cols-2 gap-4">
        <TextField variant="primary" isRequired value={priceUsd} onChange={setPriceUsd}>
          <Label>{t('priceUsd')}</Label>
          <Input type="text" inputMode="decimal" placeholder="0.00" />
        </TextField>
        <TextField
          variant="primary"
          isRequired
          value={quantity}
          onChange={(v) => {
            if (v === '' || /^\d+$/.test(v)) {
              setQuantity(v);
              setQuantityError(null);
            }
          }}
          isInvalid={!!quantityError}
        >
          <Label>{tQuick('quantity')}</Label>
          <Input type="text" inputMode="numeric" placeholder="1" />
          {quantityError ? <FieldError>{quantityError}</FieldError> : null}
        </TextField>
      </div>

      <Tabs selectedKey={mode} onSelectionChange={(k) => setMode(k as FormMode)}>
        <Tabs.ListContainer>
          <Tabs.List aria-label={tQuick('modeTabsLabel')}>
            <Tabs.Tab id="direct">
              {tQuick('modeDirect')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="carton">
              {tQuick('modeCarton')}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="direct" className="pt-4">
          <p className="text-xs text-muted mb-3">{tQuick('modeDirectHint')}</p>
          <div className="grid grid-cols-2 gap-4">
            <TextField variant="primary" value={totalCbm} onChange={setTotalCbm} isRequired>
              <Label>{tQuick('totalCbm')}</Label>
              <Input type="text" inputMode="decimal" placeholder="0.000" />
            </TextField>
            <TextField variant="primary" value={totalWeight} onChange={setTotalWeight} isRequired>
              <Label>{tQuick('totalWeight')}</Label>
              <Input type="text" inputMode="decimal" placeholder="0.000" />
            </TextField>
          </div>
          <p className="text-xs text-muted mt-2">{tQuick('cbmWeightHint')}</p>
        </Tabs.Panel>
        <Tabs.Panel id="carton" className="pt-4">
          <p className="text-xs text-muted mb-3">{tQuick('modeCartonHint')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <TextField variant="primary" value={cartonHeight} onChange={setCartonHeight}>
              <Label>{t('height')}</Label>
              <Input type="text" inputMode="decimal" placeholder="0" />
            </TextField>
            <TextField variant="primary" value={cartonWidth} onChange={setCartonWidth}>
              <Label>{t('width')}</Label>
              <Input type="text" inputMode="decimal" placeholder="0" />
            </TextField>
            <TextField variant="primary" value={cartonLength} onChange={setCartonLength}>
              <Label>{t('length')}</Label>
              <Input type="text" inputMode="decimal" placeholder="0" />
            </TextField>
            <TextField variant="primary" value={unitsPerCarton} onChange={setUnitsPerCarton}>
              <Label>{tQuick('unitsPerCarton')}</Label>
              <Input type="number" min={1} />
            </TextField>
            <TextField variant="primary" value={cartonWeight} onChange={setCartonWeight}>
              <Label>{tQuick('cartonWeight')}</Label>
              <Input type="text" inputMode="decimal" placeholder="0" />
            </TextField>
          </div>
        </Tabs.Panel>
      </Tabs>

      {!hideSubmitButton && (
        <Button type="submit" variant="primary" isDisabled={isSubmitting} isPending={isSubmitting}>
          {submitLabel ?? tQuick('add')}
        </Button>
      )}
    </form>
  );
}
