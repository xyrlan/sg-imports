'use client';

import { useTranslations } from 'next-intl';
import { Chip } from '@heroui/react';
import { getValidityStatus, getDaysRemaining } from './constants';
import type { InternationalFreightWithPorts } from '@/services/admin';

interface ValidityChipProps {
  freight: InternationalFreightWithPorts;
}

export function ValidityChip({ freight }: ValidityChipProps) {
  const t = useTranslations('Admin.Settings.InternationalFreights');
  const status = getValidityStatus(freight.validTo);
  const days = getDaysRemaining(freight.validTo);

  if (status === 'valid' && days === null) {
    return (
      <Chip size="sm" color="success" variant="soft">
        {t('validity.valid')}
      </Chip>
    );
  }
  if (status === 'valid' && days !== null) {
    return (
      <Chip size="sm" color="success" variant="soft">
        {t('validity.validDaysRemaining', { count: days })}
      </Chip>
    );
  }
  if (status === 'expiring' && days !== null) {
    return (
      <Chip size="sm" color="warning" variant="soft">
        {t('validity.expiringInDays', { count: days })}
      </Chip>
    );
  }
  return (
    <Chip size="sm" color="danger" variant="soft">
      {t('validity.expired')}
    </Chip>
  );
}
