'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  ListBox,
  Label,
  Button,
  Header,
  Separator,
  AlertDialog,
} from '@heroui/react';
import { useTranslations } from 'next-intl';
import { FileText, Plus, Trash2 } from 'lucide-react';

import { useProformaQuote } from '@/contexts/proforma-quote-context';
import { useOrganization } from '@/contexts/organization-context';
import { CreateProformaQuoteModal } from './create-proforma-quote-modal';
import { deleteProformaQuoteAction } from '@/app/(dashboard)/actions';
import type { InferSelectModel } from 'drizzle-orm';
import type { quotes } from '@/db/schema';

const NONE_KEY = '__none__';
type Quote = InferSelectModel<typeof quotes>;

export function NavbarProformaQuoteSelect() {
  const t = useTranslations('ProformaQuote');
  const {
    currentQuote,
    availableQuotes,
    switchProformaQuote,
    isLoading,
  } = useProformaQuote();
  const { currentOrganization } = useOrganization();

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSwitching, setIsSwitching] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deletingQuote, setDeletingQuote] = useState<Quote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isDeleteClickRef = useRef(false);

  const handleQuoteChange = async (key: string | number | null) => {
    if (key === null || key === 'createNew') return;
    if (isDeleteClickRef.current) {
      isDeleteClickRef.current = false;
      return;
    }

    const selectedKey = key.toString();
    const quoteId = selectedKey === NONE_KEY ? null : selectedKey;

    if (quoteId !== (currentQuote?.id ?? null)) {
      try {
        setIsSwitching(true);
        await switchProformaQuote(quoteId);
        router.refresh();
      } catch (error) {
        console.error('Failed to switch proforma quote:', error);
      } finally {
        setIsSwitching(false);
      }
    }
  };

  const handleDeletePointerDown = (quote: Quote) => {
    isDeleteClickRef.current = true;
    setDeletingQuote(quote);
  };

  const handleConfirmDelete = async () => {
    if (!deletingQuote || !currentOrganization?.id) return;
    try {
      setIsDeleting(true);
      const result = await deleteProformaQuoteAction(
        deletingQuote.id,
        currentOrganization.id
      );
      if (result.ok) {
        setDeletingQuote(null);
        startTransition(() => router.refresh());
      }
    } catch (error) {
      console.error('Failed to delete proforma:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateSuccess = () => {
    startTransition(() => router.refresh());
  };

  return (
    <div className="flex items-center gap-1">
      <Select
        aria-label={t('select')}
        className="max-w-64"
        isDisabled={isLoading || isSwitching || isPending}
        placeholder={t('select')}
        value={currentQuote?.id ?? NONE_KEY}
        onChange={handleQuoteChange}
      >
        <Label className="sr-only">{t('select')}</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Section>
              <Header>{t('proformaQuotes')}</Header>
              {availableQuotes.map((quote) => (
                <ListBox.Item
                  key={quote.id}
                  id={quote.id}
                  textValue={quote.name}
                  className={quote.id === currentQuote?.id ? 'hidden' : undefined}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <FileText className="w-4 h-4 shrink-0 text-muted" />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium">
                          {quote.name}
                        </span>
                        <span className="text-xs text-muted">
                          {t(`quoteStatus.${quote.status}`)}
                        </span>
                      </div>
                    </div>
                    {quote.id !== currentQuote?.id && (
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={t('delete')}
                        className="flex shrink-0 cursor-pointer rounded p-1 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger/30"
                        onPointerDownCapture={() => {
                          isDeleteClickRef.current = true;
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeletePointerDown(quote);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleDeletePointerDown(quote);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </ListBox.Item>
              ))}
            </ListBox.Section>
            <Separator />
            <ListBox.Section>
              <ListBox.Item
                id="createNew"
                textValue={t('createNew')}
                onPress={() => setCreateModalOpen(true)}
              >
                <div className="flex items-center gap-2 text-accent">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('createNew')}</span>
                </div>
              </ListBox.Item>
            </ListBox.Section>
          </ListBox>
        </Select.Popover>
      </Select>
      {currentOrganization?.id && (
        <CreateProformaQuoteModal
          isOpen={createModalOpen}
          onOpenChange={setCreateModalOpen}
          organizationId={currentOrganization.id}
          onSuccess={handleCreateSuccess}
        />
      )}
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={!!deletingQuote}
          onOpenChange={(open) => !open && setDeletingQuote(null)}
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
                  onPress={() => setDeletingQuote(null)}
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
    </div>
  );
}
