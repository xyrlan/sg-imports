'use client';

import { useTranslations } from 'next-intl';
import { AlertDialog, Button } from '@heroui/react';
import { Copy, Edit, Pencil, Trash2 } from 'lucide-react';
import type { StorageRuleWithPeriods } from './types';

interface StorageRuleCardActionsProps {
  rule: StorageRuleWithPeriods;
  onEdit: (rule: StorageRuleWithPeriods) => void;
  onDelete: (rule: StorageRuleWithPeriods) => void;
  onDuplicate: (rule: StorageRuleWithPeriods) => void;
}

export function StorageRuleCardActions({
  rule,
  onEdit,
  onDelete,
  onDuplicate,
}: StorageRuleCardActionsProps) {
  const t = useTranslations('Admin.Settings.Terminals');

  return (
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
        <Edit size={16} />
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
  );
}
