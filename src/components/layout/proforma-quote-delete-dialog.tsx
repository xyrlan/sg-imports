'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertDialog, Button } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { useOrganization } from '@/contexts/organization-context';
import { deleteProformaQuoteAction } from '@/app/(dashboard)/actions';
import type { InferSelectModel } from 'drizzle-orm';
import type { quotes } from '@/db/schema';

type Quote = InferSelectModel<typeof quotes>;

interface ProformaQuoteDeleteDialogProps {
  deletingQuote: Quote | null;
  onClose: () => void;
}

export function ProformaQuoteDeleteDialog({
  deletingQuote,
  onClose,
}: ProformaQuoteDeleteDialogProps) {
  const t = useTranslations('ProformaQuote');
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [isDeleting, setIsDeleting] = useState(false);
  const [, startTransition] = useTransition();

  const handleConfirmDelete = async () => {
    if (!deletingQuote || !currentOrganization?.id) return;
    try {
      setIsDeleting(true);
      const result = await deleteProformaQuoteAction(
        deletingQuote.id,
        currentOrganization.id,
      );
      if (result.ok) {
        onClose();
        startTransition(() => router.refresh());
      }
    } catch (error) {
      console.error('Failed to delete proforma:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialog.Backdrop
        isOpen={!!deletingQuote}
        onOpenChange={(open) => !open && onClose()}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{t('deleteConfirmTitle')}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                {deletingQuote &&
                  t('deleteConfirm', { name: deletingQuote.name })}
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                slot="close"
                variant="tertiary"
                onPress={onClose}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="danger"
                isPending={isDeleting}
                onPress={handleConfirmDelete}
              >
                {t('delete')}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
