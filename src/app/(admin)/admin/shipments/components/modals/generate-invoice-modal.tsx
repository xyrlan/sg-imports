'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, Modal, TextArea, TextField } from '@heroui/react';
import { FileText } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import {
  generateFobInvoiceAction,
  generate90InvoiceAction,
  generateBalanceInvoiceAction,
  generateServiceFeeInvoiceAction,
} from '@/app/(admin)/admin/shipments/[id]/actions';

interface GenerateInvoiceModalProps {
  shipmentId: string;
  type: 'MERCHANDISE' | 'BALANCE' | 'SERVICE_FEE';
  defaultAmount?: string;
  currency: 'USD' | 'BRL';
  readOnlyAmount?: boolean;
  onSuccess?: () => void;
  trigger: React.ReactNode;
}

export function GenerateInvoiceModal({
  shipmentId,
  type,
  defaultAmount = '',
  currency,
  readOnlyAmount = false,
  onSuccess,
  trigger,
}: GenerateInvoiceModalProps) {
  const t = useTranslations('Admin.Shipments.Modals.GenerateInvoice');
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(defaultAmount);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(defaultAmount);
      setDescription('');
      setError(null);
    }
  }, [isOpen, defaultAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      let result: { success: boolean; error?: string };

      if (type === 'MERCHANDISE') {
        result = await generateFobInvoiceAction(shipmentId, amount);
      } else if (type === 'BALANCE') {
        if (readOnlyAmount) {
          result = await generate90InvoiceAction(shipmentId);
        } else {
          result = await generateBalanceInvoiceAction(shipmentId, amount);
        }
      } else {
        result = await generateServiceFeeInvoiceAction(shipmentId);
      }

      if (result.success) {
        setIsOpen(false);
        onSuccess?.();
        router.refresh();
      } else {
        setError(result.error ?? 'Erro desconhecido');
      }
    } catch {
      setError('Erro ao gerar fatura');
    } finally {
      setIsPending(false);
    }
  };

  const showAmountField = type === 'MERCHANDISE' || (type === 'BALANCE' && !readOnlyAmount);

  return (
    <>
      <span onClick={() => setIsOpen(true)}>{trigger}</span>
      <Modal>
        <Modal.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header className="mb-6">
                <Modal.Heading>
                  <div className="flex items-center gap-2">
                    <FileText className="size-5" />
                    {t('title')}
                  </div>
                </Modal.Heading>
              </Modal.Header>
              <form onSubmit={handleSubmit}>
                <Modal.Body className="p-2">
                  <div className="space-y-4">
                    {showAmountField && (
                      <TextField variant="primary" isRequired>
                        <Label>
                          {t('amount')} ({currency})
                        </Label>
                        <Input
                          name="amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          readOnly={readOnlyAmount}
                          autoComplete="off"
                        />
                      </TextField>
                    )}
                    <TextField variant="primary">
                      <Label>{t('description')}</Label>
                      <TextArea
                        name="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('descriptionPlaceholder')}
                        rows={2}
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
                    onPress={() => setIsOpen(false)}
                  >
                    {t('cancel')}
                  </Button>
                  <Button type="submit" variant="primary" isPending={isPending}>
                    {isPending ? t('generating') : t('generate')}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
