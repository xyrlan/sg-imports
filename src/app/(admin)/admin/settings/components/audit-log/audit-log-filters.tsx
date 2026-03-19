'use client';

import { useTranslations } from 'next-intl';
import {
  Button,
  DateField,
  Label,
  ListBox,
  Select,
} from '@heroui/react';
import { parseDate } from '@internationalized/date';
import { AUDIT_TABLE_KEYS } from './audit-log-constants';

export type AuditActionFilter = 'CREATE' | 'UPDATE' | 'DELETE' | '';

export interface AuditLogFiltersProps {
  tableName: string;
  onTableNameChange: (value: string) => void;
  actionFilter: AuditActionFilter;
  onActionFilterChange: (value: AuditActionFilter) => void;
  fromDate: string;
  onFromDateChange: (value: string) => void;
  toDate: string;
  onToDateChange: (value: string) => void;
  onApply: () => void;
  onClear: () => void;
}

export function AuditLogFilters({
  tableName,
  onTableNameChange,
  actionFilter,
  onActionFilterChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  onApply,
  onClear,
}: AuditLogFiltersProps) {
  const t = useTranslations('Admin.Settings.AuditLog');

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <Select
        className="min-w-[180px]"
        placeholder={t('filterTablePlaceholder')}
        value={tableName || null}
        onChange={(k) => onTableNameChange((k as string) ?? '')}
        variant="primary"
      >
        <Label>{t('filterTable')}</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item key="" id="" textValue={t('filterTablePlaceholder')}>
              {t('filterTablePlaceholder')}
              <ListBox.ItemIndicator />
            </ListBox.Item>
            {AUDIT_TABLE_KEYS.map((key) => (
              <ListBox.Item key={key} id={key} textValue={t(`tables.${key}`)}>
                {t(`tables.${key}`)}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      <Select
        className="min-w-[120px]"
        placeholder={t('filterActionPlaceholder')}
        value={actionFilter || null}
        onChange={(k) => onActionFilterChange((k as AuditActionFilter) ?? '')}
        variant="primary"
      >
        <Label>{t('filterAction')}</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item key="" id="" textValue={t('filterActionPlaceholder')}>
              {t('filterActionPlaceholder')}
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item key="CREATE" id="CREATE" textValue={t('actionCreate')}>
              {t('actionCreate')}
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item key="UPDATE" id="UPDATE" textValue={t('actionUpdate')}>
              {t('actionUpdate')}
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item key="DELETE" id="DELETE" textValue={t('actionDelete')}>
              {t('actionDelete')}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
      <DateField
        value={fromDate ? parseDate(fromDate) : null}
        onChange={(v) => onFromDateChange(v?.toString() ?? '')}
      >
        <Label>{t('filterFrom')}</Label>
        <DateField.Group variant="primary">
          <DateField.Input>
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
        </DateField.Group>
      </DateField>
      <DateField
        value={toDate ? parseDate(toDate) : null}
        onChange={(v) => onToDateChange(v?.toString() ?? '')}
      >
        <Label>{t('filterTo')}</Label>
        <DateField.Group variant="primary">
          <DateField.Input>
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
        </DateField.Group>
      </DateField>
      <Button variant="primary" onPress={onApply} size="md">
        {t('applyFilters')}
      </Button>
      <Button variant="outline" onPress={onClear} size="md">
        {t('clearFilters')}
      </Button>
    </div>
  );
}
