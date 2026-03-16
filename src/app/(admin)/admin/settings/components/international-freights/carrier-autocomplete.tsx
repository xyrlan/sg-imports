'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Autocomplete, EmptyState, ListBox, SearchField, Spinner } from '@heroui/react';
import { getCarrierByIdAction, searchCarriersAction } from '../carriers/actions';
import type { Carrier } from '@/services/admin';

const CARRIERS_PAGE_SIZE = 20;

interface CarrierAutocompleteBaseProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
  fullWidth?: boolean;
  /** When true, includes an "All carriers" option (for filters) */
  includeAllOption?: boolean;
  /** When set, ensures this carrier is in the list (e.g. when editing) */
  selectedCarrierId?: string | null;
}

export function CarrierAutocomplete({
  value,
  onChange,
  placeholder,
  variant = 'primary',
  className,
  fullWidth,
  includeAllOption = false,
  selectedCarrierId,
}: CarrierAutocompleteBaseProps) {
  const t = useTranslations('Admin.Settings.InternationalFreights');
  const [items, setItems] = useState<Carrier[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!triggerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Usamos borderBoxSize para pegar o width total (incluindo padding/border)
        setTriggerWidth(entry.borderBoxSize[0].inlineSize);
      }
    });

    observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, []);

  const loadCarriers = useCallback(async (search: string) => {
    setIsLoading(true);
    try {
      const res = await searchCarriersAction(CARRIERS_PAGE_SIZE, 0, search || undefined);
      setItems(res.ok ? res.items : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadCarriers(filterText);
      debounceRef.current = null;
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filterText, loadCarriers]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && items.length === 0) loadCarriers(filterText);
    },
    [items.length, filterText, loadCarriers]
  );

  useEffect(() => {
    if (selectedCarrierId && !items.some((c) => c.id === selectedCarrierId)) {
      getCarrierByIdAction(selectedCarrierId).then((res) => {
        if (res.ok && res.carrier) setSelectedCarrier(res.carrier);
      });
    } else {
      setSelectedCarrier(null);
    }
  }, [selectedCarrierId, items]);

  const handleChange = useCallback(
    (k: string | null) => {
      if (includeAllOption && (k === '__all__' || !k)) {
        onChange(null);
      } else {
        onChange(k);
      }
    },
    [onChange, includeAllOption]
  );

  const displayValue = includeAllOption && !value ? '__all__' : value;

  const allOption = { id: '__all__', name: t('filters.carrierAll') } as Carrier & { id: string };
  const baseItems = selectedCarrier ? [selectedCarrier, ...items.filter((c) => c.id !== selectedCarrier.id)] : items;
  const listItems = includeAllOption ? [allOption, ...baseItems] : baseItems;

  return (
    <Autocomplete
      placeholder={placeholder}
      value={displayValue}
      onChange={(k) => handleChange(k as string | null)}
      onOpenChange={handleOpenChange}
      variant={variant}
      className={className}
      fullWidth={fullWidth}
      allowsEmptyCollection
    >
      <Autocomplete.Trigger ref={triggerRef} className={fullWidth ? 'w-full' : undefined}>
        <Autocomplete.Value />
        <Autocomplete.ClearButton />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover
       style={{ 
        width: triggerWidth ? `${triggerWidth}px` : 'auto',
        minWidth: triggerWidth ? `${triggerWidth}px` : '300px'
      }}
      className={fullWidth ? undefined : 'shadow-lg'}
      >
        <Autocomplete.Filter
          inputValue={filterText}
          onInputChange={setFilterText}
        >
          <SearchField>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={t('filters.searchCarrier')} />
            </SearchField.Group>
          </SearchField>
          <ListBox
            items={listItems}
            renderEmptyState={() => (
              <EmptyState className="py-6">
                {isLoading ? (
                  <span className="inline-flex shrink-0 size-4 items-center justify-center">
                    <Spinner color="current" size="sm" className="size-4!" />
                  </span>
                ) : (
                  t('noCarriersFound')
                )}
              </EmptyState>
            )}
          >
            {(c) => (
              <ListBox.Item key={c.id} id={c.id} textValue={c.name}>
                {c.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}
