'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Accordion,
  Button,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
} from '@heroui/react';
import type { ProductSnapshot } from '@/db/types';
import type { HsCodeOption } from '@/services/simulation.service';

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

  const [name, setName] = useState('');
  const [hsCodeId, setHsCodeId] = useState<string | null>(null);
  const [priceUsd, setPriceUsd] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [totalCbm, setTotalCbm] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [cartonHeight, setCartonHeight] = useState('');
  const [cartonWidth, setCartonWidth] = useState('');
  const [cartonLength, setCartonLength] = useState('');
  const [unitsPerCarton, setUnitsPerCarton] = useState('1');
  const [cartonWeight, setCartonWeight] = useState('');
  const [ncmSearch, setNcmSearch] = useState('');

  useEffect(() => {
    queueMicrotask(() => {
    if (initialSnapshot) {
      setName(initialSnapshot.name ?? '');
      setPriceUsd((initialPriceUsd || initialSnapshot.priceUsd) ?? '');
      setQuantity(initialQuantity);
      // totalCbm/totalWeight no snapshot são por unidade
      setTotalCbm(initialSnapshot.totalCbm != null ? String(initialSnapshot.totalCbm) : '');
      setTotalWeight(initialSnapshot.totalWeight != null ? String(initialSnapshot.totalWeight) : '');
      setUnitsPerCarton(String(initialSnapshot.unitsPerCarton ?? 1));
      const hasCarton =
        (initialSnapshot.cartonHeight ?? 0) > 0 ||
        (initialSnapshot.cartonWidth ?? 0) > 0 ||
        (initialSnapshot.cartonLength ?? 0) > 0;
      setAdvancedOpen(!!hasCarton);
      setCartonHeight(initialSnapshot.cartonHeight != null ? String(initialSnapshot.cartonHeight) : '');
      setCartonWidth(initialSnapshot.cartonWidth != null ? String(initialSnapshot.cartonWidth) : '');
      setCartonLength(initialSnapshot.cartonLength != null ? String(initialSnapshot.cartonLength) : '');
      setCartonWeight(initialSnapshot.cartonWeight != null ? String(initialSnapshot.cartonWeight) : '');
      const code = initialSnapshot.hsCode ?? '';
      setNcmSearch(code);
      const matched = hsCodes.find((hc) => hc.code === code);
      setHsCodeId(matched?.id ?? null);
      }
    });
  }, [initialSnapshot, initialQuantity, initialPriceUsd, hsCodes]);

  const filteredHsCodes = useMemo(() => {
    if (!ncmSearch.trim()) return hsCodes;
    const q = ncmSearch.toLowerCase();
    return hsCodes.filter((hc) => hc.code.toLowerCase().includes(q));
  }, [hsCodes, ncmSearch]);

  const selectedHsCode = hsCodes.find((hc) => hc.id === hsCodeId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const hasCartonDims =
      advancedOpen &&
      (parseFloat(cartonHeight) || parseFloat(cartonWidth) || parseFloat(cartonLength));
    const cbm = parseFloat(totalCbm) || 0;
    const weight = parseFloat(totalWeight) || 0;

    if (!hasCartonDims && cbm <= 0 && weight <= 0) {
      return;
    }

    const snapshot: ProductSnapshot = {
      name: name.trim() || tQuick('defaultName'),
      hsCode: (selectedHsCode?.code ?? ncmSearch.trim()) || '0000.00.00',
      priceUsd: priceUsd.trim() || '0',
      unitsPerCarton: parseInt(unitsPerCarton, 10) || 1,
    };

    if (hasCartonDims) {
      snapshot.cartonHeight = parseFloat(cartonHeight) || undefined;
      snapshot.cartonWidth = parseFloat(cartonWidth) || undefined;
      snapshot.cartonLength = parseFloat(cartonLength) || undefined;
      snapshot.cartonWeight = parseFloat(cartonWeight) || undefined;
    } else {
      snapshot.totalCbm = cbm > 0 ? cbm : undefined;
      snapshot.totalWeight = weight > 0 ? weight : undefined;
    }

    await onSubmit(snapshot, quantity, priceUsd.trim() || '0');
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <TextField variant="primary" isRequired value={name} onChange={setName}>
        <Label>{t('productName')}</Label>
        <Input placeholder={t('productNamePlaceholder')} />
      </TextField>

      <div className="space-y-2">
        <Label>{t('hsCodeLabel')}</Label>
        <div className="flex gap-2">
          <Input
            placeholder="8504.40.10"
            value={hsCodeId ? (selectedHsCode?.code ?? '') : ncmSearch}
            onChange={(v) => {
              setHsCodeId(null);
              setNcmSearch(typeof v === 'string' ? v : '');
            }}
            onFocus={() => setNcmSearch(ncmSearch || (selectedHsCode?.code ?? ''))}
          />
          <Select
            variant="primary"
            placeholder={tQuick('selectNcm')}
            value={hsCodeId}
            onChange={(k) => {
              setHsCodeId(k as string | null);
              if (k) setNcmSearch(hsCodes.find((hc) => hc.id === k)?.code ?? '');
            }}
            className="min-w-40"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {filteredHsCodes.slice(0, 50).map((hc) => (
                  <ListBox.Item key={hc.id} id={hc.id} textValue={hc.code}>
                    {hc.code}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField variant="primary" isRequired value={priceUsd} onChange={setPriceUsd}>
          <Label>{t('priceUsd')}</Label>
          <Input type="text" inputMode="decimal" placeholder="0.00" />
        </TextField>
        <TextField
          variant="primary"
          isRequired
          value={String(quantity)}
          onChange={(v) => setQuantity(Math.max(1, Number(v) || 1))}
        >
          <Label>{tQuick('quantity')}</Label>
          <Input type="number" min={1} />
        </TextField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField variant="primary" value={totalCbm} onChange={setTotalCbm}>
          <Label>{tQuick('totalCbm')}</Label>
          <Input type="text" inputMode="decimal" placeholder="0.000" />
        </TextField>
        <TextField variant="primary" value={totalWeight} onChange={setTotalWeight}>
          <Label>{tQuick('totalWeight')}</Label>
          <Input type="text" inputMode="decimal" placeholder="0.000" />
        </TextField>
      </div>
      <p className="text-xs text-muted">{tQuick('cbmWeightHint')}</p>

      <Accordion
        expandedKeys={advancedOpen ? new Set(['advanced']) : new Set()}
        onExpandedChange={(keys) => setAdvancedOpen((keys as Set<string>).has('advanced'))}
        className="px-0"
      >
        <Accordion.Item key="advanced" id="advanced">
          <Accordion.Heading>
            <Accordion.Trigger className="w-full flex items-center justify-between pr-4 text-sm text-muted hover:text-foreground">
              {tQuick('advancedOptions')}
              <Accordion.Indicator />
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
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
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {!hideSubmitButton && (
        <Button type="submit" variant="primary" isDisabled={isSubmitting} isPending={isSubmitting}>
          {submitLabel ?? tQuick('add')}
        </Button>
      )}
    </form>
  );
}
