'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
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

  const [isOpen, setIsOpen] = useState(false);
  const [amountUsd, setAmountUsd] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmountUsd('');
      setPaymentDate('');
      setProofFile(null);
      setError(null);
    }
  }, [isOpen]);

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
        setIsOpen(false);
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
    <Modal>
      <span onClick={() => setIsOpen(true)}>{trigger}</span>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
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
                    <TextField variant="primary" isRequired>
                      <Label>{t('paymentDate')}</Label>
                      <Input
                        name="paymentDate"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                      />
                    </TextField>
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
                    onPress={() => setIsOpen(false)}
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
