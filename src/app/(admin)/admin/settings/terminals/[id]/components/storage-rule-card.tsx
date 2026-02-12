'use client';

import { useTranslations } from 'next-intl';
import { AlertDialog, Button, Card } from '@heroui/react';
import { Copy, Pencil, Trash2, DollarSign } from 'lucide-react';
import {
  formatStorageFee,
  getFeeBasisLabel,
  getContainerTypeLabel,
  getShipmentTypeLabel,
} from '@/lib/storage-utils';
import type { StorageRule, StoragePeriod } from '@/services/admin';
import type { StorageRuleAdditionalFee } from '@/db/schema';

export interface StorageRuleWithPeriods extends StorageRule {
  periods: StoragePeriod[];
}

interface StorageRuleCardProps {
  rule: StorageRuleWithPeriods;
  onEdit: (rule: StorageRuleWithPeriods) => void;
  onDelete: (rule: StorageRuleWithPeriods) => void;
  onDuplicate: (rule: StorageRuleWithPeriods) => void;
}

export function StorageRuleCard({ rule, onEdit, onDelete, onDuplicate }: StorageRuleCardProps) {
  const t = useTranslations('Admin.Settings.Terminals');
  const isLCL = rule.shipmentType === 'LCL';

  const additionalFees = (rule.additionalFees ?? []) as StorageRuleAdditionalFee[];

  return (
    <Card>
      <Card.Header className="flex justify-between items-start">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-1">
            <h4 className="font-semibold text-default-800">
              {rule.shipmentType === 'FCL' && rule.containerType
                ? `${getContainerTypeLabel(rule.containerType)}`
                : getShipmentTypeLabel(rule.shipmentType)}
            </h4>
          </div>
        </div>
      </Card.Header>
      <Card.Content className="pt-0 space-y-3">
        {additionalFees.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-default-600 mb-1">{t('StorageRuleForm.additionalFees')}:</p>
            {additionalFees.slice(0, 3).map((fee, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-default-500 truncate">{fee.name}:</span>
                <span className="text-default-700 font-medium">
                  {formatStorageFee(Number(fee.value))} ({getFeeBasisLabel(fee.basis)})
                </span>
              </div>
            ))}
            {additionalFees.length > 3 && (
              <p className="text-xs text-default-400 italic">
                +{additionalFees.length - 3} {t('StorageRules.moreFees')}
              </p>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-default-200 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-default-500">{t('StorageRuleForm.minValue')}:</span>
            <span className="text-default-700 font-medium">
              {formatStorageFee(Number(rule.minValue ?? 0), rule.currency ?? 'BRL')}
            </span>
          </div>
          {isLCL && Number(rule.cifInsurance ?? 0) > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-default-500">{t('StorageRuleForm.cifInsurance')}:</span>
              <span className="text-default-700 font-medium">
                {formatStorageFee(Number(rule.cifInsurance ?? 0), rule.currency ?? 'BRL')}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-default-200">
          <DollarSign size={14} className="text-primary-500" />
          <span className="text-xs text-default-600">
            {rule.periods?.length || 0} {t('StorageRules.periodsCount')}
          </span>
        </div>

        <div className="flex items-center justify-end gap-1 pt-2">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            onPress={() => onDuplicate(rule)}
            aria-label={t('StorageRules.duplicate')}
          >
            <Copy size={16} />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            onPress={() => onEdit(rule)}
            aria-label={t('StorageRules.edit')}
          >
            <Pencil size={16} />
          </Button>
          <AlertDialog>
            <Button
              isIconOnly
              size="sm"
              variant="danger-soft"
              aria-label={t('StorageRules.delete')}
            >
              <Trash2 size={16} />
            </Button>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog className="sm:max-w-[400px]">
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger" />
                    <AlertDialog.Heading>{t('StorageRules.deleteConfirmTitle')}</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p>{t('StorageRules.deleteConfirm')}</p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button slot="close" variant="tertiary">
                      {t('StorageRuleForm.cancel')}
                    </Button>
                    <Button
                      slot="close"
                      variant="danger"
                      onPress={() => onDelete(rule)}
                    >
                      {t('StorageRules.delete')}
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </div>
      </Card.Content>
    </Card>
  );
}
