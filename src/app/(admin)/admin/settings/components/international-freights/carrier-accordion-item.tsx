'use client';

import { useTranslations } from 'next-intl';
import { Accordion } from '@heroui/react';
import { Ship, Package } from 'lucide-react';
import { FreightCard } from './freight-card';
import { CONTAINER_TYPE_LABELS, getValidityStatus, groupedByContainer } from './constants';
import type { InternationalFreightWithPorts } from '@/services/admin';

interface CarrierAccordionItemProps {
  carrier: { id: string; name: string };
  freights: InternationalFreightWithPorts[];
  onEdit: (freight: InternationalFreightWithPorts) => void;
  onDelete: (freight: InternationalFreightWithPorts) => void;
}

export function CarrierAccordionItem({
  carrier,
  freights,
  onEdit,
  onDelete,
}: CarrierAccordionItemProps) {
  const t = useTranslations('Admin.Settings.InternationalFreights');
  const validCount = freights.filter(
    (f) => getValidityStatus(f.validTo) !== 'expired'
  ).length;

  return (
    <Accordion.Item key={carrier.id} id={carrier.id}>
      <Accordion.Heading>
        <Accordion.Trigger className="w-full flex items-center justify-between pr-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Ship className="size-5 text-primary" />
            </div>
            <div>
              <span className="font-semibold">{carrier.name}</span>
              <span className="text-muted text-sm ml-2">
                — {validCount} {t('tariffsActive', { count: validCount })}
              </span>
            </div>
          </div>
          <Accordion.Indicator />
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel>
        <Accordion.Body>
          <div className="space-y-6 pt-2">
            {groupedByContainer(freights).map(([containerType, typeFreights]) => (
              <div key={containerType} className="space-y-3">
                <h4 className="text-sm font-medium text-muted flex items-center gap-2">
                  <Package className="size-4" />
                  {CONTAINER_TYPE_LABELS[containerType] ?? containerType}
                </h4>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {typeFreights.map((freight) => (
                    <FreightCard
                      key={freight.id}
                      freight={freight}
                      onEdit={() => onEdit(freight)}
                      onDelete={() => onDelete(freight)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Accordion.Body>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
