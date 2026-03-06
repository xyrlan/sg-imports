'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import { FileText } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { createProformaQuoteAction } from '@/app/(dashboard)/actions';

interface CreateProformaQuoteModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
}

export function CreateProformaQuoteModal({
  isOpen,
  onOpenChange,
  organizationId,
  onSuccess,
}: CreateProformaQuoteModalProps) {
  const t = useTranslations('ProformaQuote');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    try {
      setIsPending(true);
      const formData = new FormData();
      formData.set('name', name.trim());
      formData.set('organizationId', organizationId);
      const result = await createProformaQuoteAction(null, formData);
      if (result.ok) {
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Create proforma error:', err);
      setError('Erro ao criar proforma');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className="mb-6">
              <Modal.Heading>
                <div className="flex items-center gap-2">
                  <FileText className="size-5" />
                  {t('createModalTitle')}
                </div>
              </Modal.Heading>
            </Modal.Header>
            <form onSubmit={handleSubmit}>
              <Modal.Body className="p-2">
                <div className="space-y-4">
                  <TextField variant="primary" isRequired>
                    <Label>{t('nameLabel')}</Label>
                    <Input
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('namePlaceholder')}
                      autoComplete="off"
                    />
                  </TextField>
                  {error && <FormError message={error} />}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  type="button"
                  variant="outline"
                  slot="close"
                  onPress={() => onOpenChange(false)}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" variant="primary" isPending={isPending}>
                  {isPending ? t('creating') : t('create')}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
