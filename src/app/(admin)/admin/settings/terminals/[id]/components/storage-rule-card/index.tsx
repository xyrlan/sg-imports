'use client';

import { Card } from '@heroui/react';
import type { StorageRuleAdditionalFee } from '@/db/types';
import type { StorageRuleWithPeriods } from './types';
import { StorageRuleCardHeader } from './storage-rule-card-header';
import { StorageRuleAdditionalFees } from './storage-rule-additional-fees';
import { StorageRuleMinValueSection } from './storage-rule-min-value-section';
import { StorageRulePeriodsCount } from './storage-rule-periods-count';
import { StorageRuleCardActions } from './storage-rule-card-actions';

export type { StorageRuleWithPeriods } from './types';

interface StorageRuleCardProps {
  rule: StorageRuleWithPeriods;
  onEdit: (rule: StorageRuleWithPeriods) => void;
  onDelete: (rule: StorageRuleWithPeriods) => void;
  onDuplicate: (rule: StorageRuleWithPeriods) => void;
}

export function StorageRuleCard({ rule, onEdit, onDelete, onDuplicate }: StorageRuleCardProps) {
  const additionalFees = (rule.additionalFees ?? []) as StorageRuleAdditionalFee[];

  return (
    <Card variant='secondary'>
      <StorageRuleCardHeader rule={rule} />
      <Card.Content className="pt-0 space-y-3">
        <StorageRuleAdditionalFees fees={additionalFees} />
        <StorageRuleMinValueSection rule={rule} />
        <StorageRulePeriodsCount rule={rule} />
        <StorageRuleCardActions
          rule={rule}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      </Card.Content>
    </Card>
  );
}
