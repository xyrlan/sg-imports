'use client';

import { useTranslations } from 'next-intl';
import { Input, ListBox, Select } from '@heroui/react';
import { CarrierAutocomplete } from './carrier-autocomplete';

export type StatusFilter = 'all' | 'valid' | 'expired';

interface FreightFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  carrierFilter: string | null;
  onCarrierChange: (value: string | null) => void;
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
}

export function FreightFilters({
  searchQuery,
  onSearchChange,
  carrierFilter,
  onCarrierChange,
  statusFilter,
  onStatusChange,
}: FreightFiltersProps) {
  const t = useTranslations('Admin.Settings.InternationalFreights');

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder={t('filters.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          variant="primary"
        />
      </div>
      <CarrierAutocomplete
        placeholder={t('filters.filterByCarrier')}
        value={carrierFilter}
        onChange={onCarrierChange}
        className="min-w-[300px] w-[300px]"
        variant="primary"
        includeAllOption
      />
      <Select
        placeholder={t('filters.filterByStatus')}
        value={statusFilter}
        onChange={(k) => onStatusChange((k as StatusFilter) ?? 'all')}
        className="min-w-[140px]"
        variant="primary"
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item key="all" id="all" textValue={t('filters.statusAll')}>
              {t('filters.statusAll')}
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item key="valid" id="valid" textValue={t('filters.statusValid')}>
              {t('filters.statusValid')}
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item key="expired" id="expired" textValue={t('filters.statusExpired')}>
              {t('filters.statusExpired')}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
