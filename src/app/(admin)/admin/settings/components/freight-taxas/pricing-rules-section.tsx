'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Accordion, Button, Card } from '@heroui/react';
import { DollarSign, Plus } from 'lucide-react';
import { PricingRuleFormModal } from './PricingRuleFormModal';
import { CarrierRulesGroup } from './CarrierRulesGroup';
import { DeletePricingRuleDialog } from './delete-pricing-rule-dialog';
import { deletePricingRuleAction } from '../../actions';
import type { PricingRuleWithRelations, Port, Carrier } from './types';

interface FreightTaxasSectionProps {
  pricingRules: PricingRuleWithRelations[];
  ports: Port[];
  carriers: Carrier[];
}

export function FreightTaxasSection({
  pricingRules,
  ports,
  carriers,
}: FreightTaxasSectionProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRuleWithRelations | null>(null);
  const [duplicatingFrom, setDuplicatingFrom] = useState<PricingRuleWithRelations | null>(null);
  const [deletingRule, setDeletingRule] = useState<PricingRuleWithRelations | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const groupedByCarrier = useMemo(() => {
    const groups: Record<
      string,
      {
        carrier: { id: string; name: string; scacCode: string | null };
        carrierRules: PricingRuleWithRelations[];
        portRules: PricingRuleWithRelations[];
        specificRules: PricingRuleWithRelations[];
      }
    > = {};

    for (const rule of pricingRules) {
      const cid = rule.carrierId;
      if (!groups[cid]) {
        groups[cid] = {
          carrier: {
            id: rule.carrier?.id ?? cid,
            name: rule.carrier?.name ?? 'Desconhecido',
            scacCode: rule.carrier?.scacCode ?? null,
          },
          carrierRules: [],
          portRules: [],
          specificRules: [],
        };
      }

      if (rule.scope === 'CARRIER') {
        groups[cid].carrierRules.push(rule);
      } else if (rule.scope === 'PORT') {
        groups[cid].portRules.push(rule);
      } else if (rule.scope === 'SPECIFIC') {
        groups[cid].specificRules.push(rule);
      }
    }

    return Object.values(groups).sort((a, b) => a.carrier.name.localeCompare(b.carrier.name));
  }, [pricingRules]);

  const handleSave = () => {
    setIsModalOpen(false);
    setEditingRule(null);
    setDuplicatingFrom(null);
    router.refresh();
  };

  const openCreate = () => {
    setEditingRule(null);
    setDuplicatingFrom(null);
    setIsModalOpen(true);
  };

  const openEdit = (rule: PricingRuleWithRelations) => {
    setEditingRule(rule);
    setDuplicatingFrom(null);
    setIsModalOpen(true);
  };

  const openDuplicate = (rule: PricingRuleWithRelations) => {
    setEditingRule(null);
    setDuplicatingFrom(rule);
    setIsModalOpen(true);
  };

  const handleDelete = (rule: PricingRuleWithRelations) => {
    setDeletingRule(rule);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRule) return;
    setIsDeleting(true);
    try {
      const result = await deletePricingRuleAction(deletingRule.id);
      if (result.ok) {
        setDeletingRule(null);
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-default-800">Gerenciar Taxas de Frete</h3>
          <p className="mt-1 text-sm text-default-600">
            Configure as taxas de frete por transportadora, porto e container
          </p>
        </div>
        <Button variant="primary" onPress={openCreate}>
          <Plus size={16} className="mr-1" />
          Adicionar Regra
        </Button>
      </div>

      {ports.length === 0 && (
        <Card className="border border-warning-200 bg-warning-50">
          <div className="p-4">
            <p className="text-warning-800 text-sm">
              Para criar regras de preço, é necessário ter pelo menos um porto cadastrado.
            </p>
          </div>
        </Card>
      )}

      {pricingRules.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <DollarSign className="mx-auto mb-4 text-default-400" size={48} />
            <p className="text-default-600">Nenhuma regra de preço cadastrada</p>
            <p className="mt-1 text-sm text-default-500">
              Clique em &quot;Adicionar Regra&quot; para começar
            </p>
          </div>
        </Card>
      ) : (
        <Accordion variant="default" className="px-0">
          {groupedByCarrier.map((group) => (
            <CarrierRulesGroup
              key={group.carrier.id}
              carrier={group.carrier}
              carrierRules={group.carrierRules}
              portRules={group.portRules}
              specificRules={group.specificRules}
              onEdit={openEdit}
              onDelete={handleDelete}
              onDuplicate={openDuplicate}
            />
          ))}
        </Accordion>
      )}

      <PricingRuleFormModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSave={handleSave}
        editingRule={editingRule}
        duplicatingFrom={duplicatingFrom}
        ports={ports}
      />

      <DeletePricingRuleDialog
        rule={deletingRule}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingRule(null)}
      />
    </div>
  );
}
