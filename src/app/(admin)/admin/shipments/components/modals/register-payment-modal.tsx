'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, DateField, Input, Label, Modal, TextField, useOverlayState } from '@heroui/react';
import { parseDate } from '@internationalized/date';
import { CreditCard } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { FileUpload } from '@/components/ui/file-upload';
import { registerManualPaymentAction } from '@/app/(admin)/admin/shipments/[id]/actions';

interface RegisterPaymentModalProps {
  shipmentId: string;
  onSuccess?: () => void;
  trigger: React.ReactNode;
}

export function RegisterPaymentModal({
  shipmentId,
  onSuccess,
  trigger,
}: RegisterPaymentModalProps) {
  const t = useTranslations('Admin.Shipments.Modals.RegisterPayment');
  const router = useRouter();

  const [amountUsd, setAmountUsd] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const state = useOverlayState({
    onOpenChange: (isOpen) => {
      if (isOpen) {
        setAmountUsd('');
        setPaymentDate('');
        setProofFile(null);
        setError(null);
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const formData = new FormData();
      formData.set('shipmentId', shipmentId);
      formData.set('amountUsd', amountUsd);
      formData.set('paymentDate', paymentDate);
      if (proofFile) {
        formData.set('proofFile', proofFile);
      }

      const result = await registerManualPaymentAction(formData);

      if (result.success) {
        state.close();
        onSuccess?.();
        router.refresh();
      } else {
        setError(result.error ?? 'Erro desconhecido');
      }
    } catch {
      setError('Erro ao registrar pagamento');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal state={state}>
      {trigger}
      <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header className="mb-6">
                <Modal.Heading>
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-5" />
                    {t('title')}
                  </div>
                </Modal.Heading>
              </Modal.Header>
              <form onSubmit={handleSubmit}>
                <Modal.Body className="p-2">
                  <div className="space-y-4">
                    <TextField variant="primary" isRequired>
                      <Label>{t('amountUsd')}</Label>
                      <Input
                        name="amountUsd"
                        type="number"
                        step="0.01"
                        min="0"
                        value={amountUsd}
                        onChange={(e) => setAmountUsd(e.target.value)}
                        placeholder={t('amountUsdPlaceholder')}
                        autoComplete="off"
                      />
                    </TextField>
                    <DateField
                      value={paymentDate ? parseDate(paymentDate) : null}
                      onChange={(v) => setPaymentDate(v?.toString() ?? '')}
                      isRequired
                    >
                      <Label>{t('paymentDate')}</Label>
                      <DateField.Group variant="primary">
                        <DateField.Input>
                          {(segment) => <DateField.Segment segment={segment} />}
                        </DateField.Input>
                      </DateField.Group>
                    </DateField>
                    <FileUpload
                      label={t('proof')}
                      name="proofFile"
                      onFileSelect={setProofFile}
                    />
                    {error && <FormError message={error} />}
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    type="button"
                    variant="outline"
                    slot="close"
                  >
                    {t('cancel')}
                  </Button>
                  <Button type="submit" variant="primary" isPending={isPending}>
                    {isPending ? t('registering') : t('register')}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
    </Modal>
  );
}
