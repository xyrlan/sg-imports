'use client';

import { memo } from 'react';
import { Accordion, Chip } from '@heroui/react';
import { Ship } from 'lucide-react';
import { PricingRuleCard } from './PricingRuleCard';
import type { PricingRuleWithRelations } from './types';

interface CarrierSummary {
  id: string;
  name: string;
  scacCode?: string | null;
}

interface CarrierRulesGroupProps {
  carrier: CarrierSummary;
  carrierRules: PricingRuleWithRelations[];
  portRules: PricingRuleWithRelations[];
  specificRules: PricingRuleWithRelations[];
  onEdit: (rule: PricingRuleWithRelations) => void;
  onDelete: (rule: PricingRuleWithRelations) => void;
  onDuplicate: (rule: PricingRuleWithRelations) => void;
}

export const CarrierRulesGroup = memo(function CarrierRulesGroup({
  carrier,
  carrierRules,
  portRules,
  specificRules,
  onEdit,
  onDelete,
  onDuplicate,
}: CarrierRulesGroupProps) {
  const totalRules = carrierRules.length + portRules.length + specificRules.length;

  return (
    <Accordion.Item key={carrier.id} id={carrier.id}>
        <Accordion.Heading>
          <Accordion.Trigger className="w-full flex items-center justify-between pr-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-3">
                <Ship className="size-6 text-primary" />
              </div>
              <div>
                <span className="font-bold text-default-900">{carrier.name}</span>
                {carrier.scacCode && (
                  <p className="text-xs text-muted">SCAC: {carrier.scacCode}</p>
                )}
                <span className="text-muted text-xs">
                {totalRules} {totalRules === 1 ? 'regra' : 'regras'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Chip color="warning" variant="soft" size="sm">
                Armador
              </Chip>
              <Accordion.Indicator />
            </div>
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>
            <div className="space-y-6 pt-2">
              {carrierRules.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-success-500" />
                    <h4 className="text-sm font-semibold text-default-800">Taxas Gerais</h4>
                    <Chip size="sm" color="success" variant="soft">
                      Aplica a todos portos/containers
                    </Chip>
                  </div>
                  <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-1">
                    {carrierRules.map((rule) => (
                      <PricingRuleCard
                        key={rule.id}
                        rule={rule}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onDuplicate={onDuplicate}
                        showDuplicate={false}
                      />
                    ))}
                  </div>
                </div>
              )}

              {portRules.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary-500" />
                    <h4 className="text-sm font-semibold text-default-800">Taxas por Porto</h4>
                    <Chip size="sm" color="accent" variant="soft">
                      Aplica a todos containers do porto
                    </Chip>
                  </div>
                  <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-2">
                    {[...portRules]
                      .sort((a, b) => (a.port?.name ?? '').localeCompare(b.port?.name ?? ''))
                      .map((rule) => (
                        <PricingRuleCard
                          key={rule.id}
                          rule={rule}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onDuplicate={onDuplicate}
                        />
                      ))}
                  </div>
                </div>
              )}

              {specificRules.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-default-500" />
                    <h4 className="text-sm font-semibold text-default-800">Taxas Específicas</h4>
                    <Chip size="sm" color="default" variant="soft">
                      Porto + Container
                    </Chip>
                  </div>
                  <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-2">
                    {[...specificRules]
                      .sort((a, b) => (a.port?.name ?? '').localeCompare(b.port?.name ?? ''))
                      .map((rule) => (
                        <PricingRuleCard
                          key={rule.id}
                          rule={rule}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onDuplicate={onDuplicate}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </Accordion.Body>
        </Accordion.Panel>
    </Accordion.Item>
  );
});
