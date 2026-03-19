'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { startTransition } from 'react';
import { Button, Modal, Label, TextArea, TextField } from '@heroui/react';
import { MessageSquarePlus, FileText, ExternalLink, Trash2 } from 'lucide-react';
import { addObservationAction, deleteObservationAction } from '../../observation-actions';

export interface QuoteObservation {
  id: string;
  quoteId: string;
  description: string;
  documents: { name: string; url: string }[] | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AddObservationModalProps {
  quoteId: string;
  organizationId: string;
  observations?: QuoteObservation[];
  onMutate?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddObservationModal({
  quoteId,
  organizationId,
  observations = [],
  onMutate,
  open,
  onOpenChange,
}: AddObservationModalProps) {
  const t = useTranslations('Simulations.Observations');
  const router = useRouter();
  const didRefreshRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [state, formAction, isPending] = useActionState(addObservationAction, null);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setDescription('');
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
    }
  }, [open]);

  useEffect(() => {
    if (
      !isPending &&
      state &&
      state.success &&
      !state.error &&
      Object.keys(state.fieldErrors ?? {}).length === 0 &&
      !didRefreshRef.current
    ) {
      didRefreshRef.current = true;
      router.refresh();
      onMutate?.();
      queueMicrotask(() => {
        setDescription('');
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
    }
    if (isPending) didRefreshRef.current = false;
  }, [isPending, state, router, onMutate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    const formData = new FormData();
    formData.set('quoteId', quoteId);
    formData.set('organizationId', organizationId);
    formData.set('description', description.trim());
    for (const file of files) {
      formData.append('files', file);
    }
    startTransition(() => {
      formAction(formData);
    });
  }

  function handleDelete(observationId: string) {
    setDeletingId(observationId);
    startDeleteTransition(async () => {
      await deleteObservationAction(observationId, quoteId, organizationId);
      setDeletingId(null);
      router.refresh();
      onMutate?.();
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (selected) {
      setFiles(Array.from(selected));
    }
  }

  function handleRemoveFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const isBusy = isPending || isDeleting;

  return (
    <Modal>
      <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange} isDismissable={!isBusy}>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className="mb-4">
              <Modal.Icon className="bg-surface text-foreground">
                <MessageSquarePlus size={22} />
              </Modal.Icon>
              <Modal.Heading>{t('heading')}</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="p-2">
              <div className="space-y-6">
                {/* Existing observations list */}
                {observations.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <Label className="text-base font-medium">{t('listTitle')}</Label>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {observations.map((obs) => (
                        <div
                          key={obs.id}
                          className="rounded-lg border border-default bg-surface/50 p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-foreground whitespace-pre-wrap flex-1">
                              {obs.description}
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-muted">
                                {formatDate(obs.createdAt)}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onPress={() => handleDelete(obs.id)}
                                isDisabled={isBusy}
                                isPending={deletingId === obs.id}
                                className="text-danger hover:bg-danger/10"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                          {obs.documents && obs.documents.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {obs.documents.map((doc, i) => (
                                <a
                                  key={i}
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline bg-accent/5 rounded-md px-2 py-1"
                                >
                                  <FileText className="size-3" />
                                  <span className="truncate max-w-[150px]">{doc.name}</span>
                                  <ExternalLink className="size-3" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider when there are existing observations */}
                {observations.length > 0 && (
                  <div className="border-t border-default" />
                )}

                {/* Add new observation form */}
                <form onSubmit={handleSubmit} id="add-observation-form">
                  <div className="flex flex-col gap-4">
                    <Label className="text-base font-medium">{t('newObservationTitle')}</Label>
                    <div className="space-y-2">
                      <Label>{t('descriptionLabel')}</Label>
                      <TextField
                        variant="primary"
                        value={description}
                        onChange={(v) => setDescription(v)}
                        isDisabled={isBusy}
                      >
                        <TextArea
                          placeholder={t('descriptionPlaceholder')}
                          rows={3}
                        />
                      </TextField>
                      {state?.fieldErrors?.description && (
                        <p className="text-sm text-danger">{state.fieldErrors.description}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>{t('documentsLabel')}</Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={handleFileChange}
                        disabled={isBusy}
                        className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-surface file:text-foreground hover:file:bg-surface/80 file:cursor-pointer"
                      />
                      {files.length > 0 && (
                        <ul className="space-y-1">
                          {files.map((file, i) => (
                            <li key={i} className="flex items-center justify-between text-sm text-muted">
                              <span className="truncate">{file.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onPress={() => handleRemoveFile(i)}
                                isDisabled={isBusy}
                              >
                                ✕
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {state?.error && (
                      <p className="text-sm text-danger">{state.error}</p>
                    )}
                  </div>
                </form>
              </div>
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="tertiary"
                onPress={() => onOpenChange(false)}
                isDisabled={isBusy}
              >
                {t('close')}
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="add-observation-form"
                isPending={isPending}
                isDisabled={!description.trim() || isBusy}
              >
                {t('save')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
