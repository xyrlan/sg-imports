'use client';

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Autocomplete,
  EmptyState,
  FieldError,
  Label,
  ListBox,
  SearchField,
  useFilter,
} from '@heroui/react';

export interface HsCodeOption {
  id: string;
  code: string;
}

const CUSTOM_CODE_ID = '__custom__';

interface HsCodeAutocompleteProps {
  hsCodes: HsCodeOption[];
  value: string | null;
  onChange: (id: string | null, code: string) => void;
  allowCustomCode?: boolean;
  /** When value is CUSTOM_CODE_ID, pass the custom code so it can be displayed */
  customCodeWhenSelected?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
  fullWidth?: boolean;
}

export function HsCodeAutocomplete({
  hsCodes,
  value,
  onChange,
  allowCustomCode = false,
  customCodeWhenSelected,
  name,
  label,
  placeholder,
  isRequired,
  isDisabled,
  isInvalid,
  errorMessage,
  variant = 'primary',
  className,
  fullWidth,
}: HsCodeAutocompleteProps) {
  const t = useTranslations('Products.Form');
  const { contains } = useFilter({ sensitivity: 'base' });
  const [filterText, setFilterText] = useState('');
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

  const handleChange = useCallback(
    (key: string | null) => {
      if (key === CUSTOM_CODE_ID) {
        onChange(CUSTOM_CODE_ID, filterText.trim());
        return;
      }
      const selected = hsCodes.find((hc) => hc.id === key);
      onChange(key, selected?.code ?? '');
    },
    [hsCodes, onChange, filterText]
  );

  const listItems = useMemo(() => {
    const base = [...hsCodes];
    const showCustomFromFilter =
      allowCustomCode &&
      filterText.trim() &&
      !hsCodes.some((hc) =>
        hc.code.toLowerCase().includes(filterText.trim().toLowerCase())
      );
    const showCustomFromSelection =
      allowCustomCode && value === CUSTOM_CODE_ID && customCodeWhenSelected;
    if (showCustomFromFilter || showCustomFromSelection) {
      base.push({
        id: CUSTOM_CODE_ID,
        code: showCustomFromSelection
          ? customCodeWhenSelected!
          : t('useCustomCode', { code: filterText.trim() }),
      });
    }
    return base;
  }, [allowCustomCode, hsCodes, filterText, t, value, customCodeWhenSelected]);

  return (
    <Autocomplete
      name={name}
      placeholder={placeholder}
      value={value === CUSTOM_CODE_ID ? CUSTOM_CODE_ID : value || null}
      onChange={(k) => handleChange(k as string | null)}
      variant={variant}
      className={className}
      fullWidth={fullWidth}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      allowsEmptyCollection
    >
      {label && <Label>{label}</Label>}
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
          filter={contains}
          inputValue={filterText}
          onInputChange={setFilterText}
        >
          <SearchField variant="secondary">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={t('searchNcm')} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox
            items={listItems}
            renderEmptyState={() => (
              <EmptyState className="py-6">{t('noNcmFound')}</EmptyState>
            )}
          >
            {(item) => (
              <ListBox.Item key={item.id} id={item.id} textValue={item.code}>
                {item.code}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
      {errorMessage && <FieldError>{errorMessage}</FieldError>}
    </Autocomplete>
  );
}
