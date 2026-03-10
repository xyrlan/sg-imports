'use client';

import { Card } from '@heroui/react';
import { getContainerTypeLabel, getShipmentTypeLabel } from '@/lib/storage-utils';
import type { StorageRuleWithPeriods } from './types';

interface StorageRuleCardHeaderProps {
  rule: StorageRuleWithPeriods;
}

export function StorageRuleCardHeader({ rule }: StorageRuleCardHeaderProps) {
  return (
    <Card.Header className="flex justify-between items-start">
      <div className="flex items-start gap-3 flex-1">
        <div className="flex-1">
          <h4 className="font-semibold">
            {rule.shipmentType === 'SEA_FCL' && rule.containerType
              ? getContainerTypeLabel(rule.containerType)
              : getShipmentTypeLabel(rule.shipmentType)}
          </h4>
        </div>
      </div>
    </Card.Header>
  );
}
