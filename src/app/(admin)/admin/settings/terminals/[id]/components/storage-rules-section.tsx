'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Card } from '@heroui/react';
import { Plus, Package, Layers } from 'lucide-react';
import { deleteStorageRuleAction } from '../actions';
import { StorageRuleCard } from './storage-rule-card';
import { StorageRuleFormModal } from './storage-rule-form-modal';
import type { TerminalWithRules } from '@/services/admin';
import type { StorageRuleWithPeriods } from './storage-rule-card';

interface StorageRulesSectionProps {
  terminal: TerminalWithRules;
  onRefresh?: () => void;
}

const SHIPMENT_GROUPS: Array<{ key: 'FCL' | 'FCL_PARTIAL' | 'LCL' }> = [
  { key: 'FCL' },
  { key: 'FCL_PARTIAL' },
  { key: 'LCL' },
];

export function StorageRulesSection({ terminal, onRefresh }: StorageRulesSectionProps) {
  const t = useTranslations('Admin.Settings.Terminals');
  const router = useRouter();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<StorageRuleWithPeriods | null>(null);
  const [duplicatingFrom, setDuplicatingFrom] = useState<StorageRuleWithPeriods | null>(null);

  const handleDeleteClick = async (rule: StorageRuleWithPeriods) => {
    const result = await deleteStorageRuleAction(rule.id, terminal.id);
    if (result?.ok) {
      onRefresh?.();
      router.refresh();
    }
  };

  const openCreateModal = () => {
    setEditingRule(null);
    setDuplicatingFrom(null);
    setAddModalOpen(true);
  };

  const openEditModal = (rule: StorageRuleWithPeriods) => {
    setEditingRule(rule);
    setDuplicatingFrom(null);
    setAddModalOpen(true);
  };

  const openDuplicateModal = (rule: StorageRuleWithPeriods) => {
    setEditingRule(null);
    setDuplicatingFrom(rule);
    setAddModalOpen(true);
  };

  const closeModal = () => {
    setAddModalOpen(false);
    setEditingRule(null);
    setDuplicatingFrom(null);
  };

  const handleSuccess = () => {
    closeModal();
    onRefresh?.();
    router.refresh();
  };

  const rulesByShipment = SHIPMENT_GROUPS.map(({ key }) => ({
    key,
    rules: terminal.storageRules.filter((r) => r.shipmentType === key) as StorageRuleWithPeriods[],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-default-800">
            {t('StorageRules.title')} - {terminal.name}
          </h3>
          <p className="text-sm text-default-600 mt-1">{t('StorageRules.description')}</p>
        </div>
        <Button variant="primary" onPress={openCreateModal}>
          <Plus size={16} />
          {t('StorageRules.newRule')}
        </Button>
      </div>

      {rulesByShipment.map(({ key, rules }) => (
        <div key={key}>
          <h4 className="text-md font-semibold text-default-700 mb-3 flex items-center gap-2">
            {key === 'LCL' ? (
              <Layers size={18} />
            ) : (
              <Package size={18} />
            )}
            {t(key === 'FCL' ? 'StorageRules.fcl' : key === 'FCL_PARTIAL' ? 'StorageRules.fclPartial' : 'StorageRules.lcl')}
          </h4>
          {rules.length === 0 ? (
            <Card>
              <Card.Content className="text-center py-8">
                <p className="text-default-600">
                  {key === 'LCL' ? t('StorageRules.noRulesLCL') : t('StorageRules.noRulesFCL')}
                </p>
              </Card.Content>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rules.map((rule) => (
                <StorageRuleCard
                  key={rule.id}
                  rule={rule}
                  onEdit={openEditModal}
                  onDelete={handleDeleteClick}
                  onDuplicate={openDuplicateModal}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      <StorageRuleFormModal
        isOpen={addModalOpen}
        terminalId={terminal.id}
        editingRule={editingRule}
        duplicatingFrom={duplicatingFrom}
        onClose={closeModal}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
