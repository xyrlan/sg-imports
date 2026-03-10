'use client';

import { useTranslations } from 'next-intl';
import { Accordion, Chip } from '@heroui/react';
import { Ship } from 'lucide-react';
import { FreightCard } from './freight-card';
import { getValidityStatus } from './constants';
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
            <div className="flex items-center gap-2">
              <span className="font-semibold">{carrier.name}</span>
              <Chip size="sm" color="accent" variant="soft">
                {validCount} {validCount === 1 ? t('tariffActive') : t('tariffsActive', { count: validCount })}
              </Chip>
            </div>
          </div>
          <Accordion.Indicator />
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel>
        <Accordion.Body>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {freights.map((freight) => (
                  <FreightCard
                    key={freight.id}
                    freight={freight}
                    onEdit={() => onEdit(freight)}
                    onDelete={() => onDelete(freight)}
                  />
            ))}
          </div>
        </Accordion.Body>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
