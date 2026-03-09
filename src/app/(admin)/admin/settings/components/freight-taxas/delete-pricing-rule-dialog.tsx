'use client';

import { AlertDialog, Button } from '@heroui/react';
import type { PricingRuleWithRelations } from './types';

interface DeletePricingRuleDialogProps {
  rule: PricingRuleWithRelations | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeletePricingRuleDialog({
  rule,
  isDeleting,
  onConfirm,
  onClose,
}: DeletePricingRuleDialogProps) {
  return (
    <AlertDialog>
      <AlertDialog.Backdrop isOpen={!!rule} onOpenChange={(open) => !open && onClose()}>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Excluir regra de preço?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                Deseja realmente excluir esta regra de preço? Esta ação não pode ser desfeita.
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" onPress={onClose}>
                Cancelar
              </Button>
              <Button variant="danger" isPending={isDeleting} onPress={onConfirm}>
                Excluir
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
