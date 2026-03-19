'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, DateField, Input, Label, ListBox, Modal, Select, TextField, useOverlayState } from '@heroui/react';
import { parseDate } from '@internationalized/date';
import { Landmark } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { FileUpload } from '@/components/ui/file-upload';
import { createExchangeContractAction } from '@/app/(admin)/admin/shipments/[id]/actions';

interface Transaction {
  id: string;
  amountUsd: string | null;
  status: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Broker {
  id: string;
  name: string;
}

interface CreateExchangeContractModalProps {
  shipmentId: string;
  transactions: Transaction[];
  suppliers: Supplier[];
  brokers: Broker[];
  onSuccess?: () => void;
  trigger: React.ReactNode;
}

export function CreateExchangeContractModal({
  shipmentId,
  transactions,
  suppliers,
  brokers,
  onSuccess,
  trigger,
}: CreateExchangeContractModalProps) {
  const t = useTranslations('Admin.Shipments.Modals.ExchangeContract');
  const router = useRouter();

  const [supplierId, setSupplierId] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [contractNumber, setContractNumber] = useState('');
  const [brokerId, setBrokerId] = useState<string>('');
  const [amountUsd, setAmountUsd] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [closedAt, setClosedAt] = useState('');
  const [swiftFile, setSwiftFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const state = useOverlayState({
    onOpenChange: (isOpen) => {
      if (isOpen) {
        setSupplierId('');
        setTransactionId('');
        setContractNumber('');
        setBrokerId('');
        setAmountUsd('');
        setExchangeRate('');
        setClosedAt('');
        setSwiftFile(null);
        setContractFile(null);
        setError(null);
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transactionId) {
      setError('Selecione uma transação');
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      const formData = new FormData();
      formData.set('shipmentId', shipmentId);
      formData.set('transactionId', transactionId);
      formData.set('contractNumber', contractNumber);
      formData.set('amountUsd', amountUsd);
      formData.set('exchangeRate', exchangeRate);
      formData.set('closedAt', closedAt);
      if (supplierId) formData.set('supplierId', supplierId);
      if (brokerId) formData.set('brokerId', brokerId);
      if (swiftFile) formData.set('swiftFile', swiftFile);
      if (contractFile) formData.set('contractFile', contractFile);

      const result = await createExchangeContractAction(formData);

      if (result.success) {
        state.close();
        onSuccess?.();
        router.refresh();
      } else {
        setError(result.error ?? 'Erro desconhecido');
      }
    } catch {
      setError('Erro ao criar contrato de câmbio');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal state={state}>
      {trigger}
      <Modal.Backdrop isDismissable={false}>
          <Modal.Container size='cover' className={"max-w-5xl max-h-[90vh]"}>
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header className="mb-6">
                <Modal.Heading>
                  <div className="flex items-center gap-2">
                    <Landmark className="size-5" />
                    {t('title')}
                  </div>
                </Modal.Heading>
              </Modal.Header>
              <form onSubmit={handleSubmit}>
                <Modal.Body className="p-2">
                  <div className="space-y-4">
                    <Select
                      variant="primary"
                      placeholder={t('selectSupplier')}
                      value={supplierId || null}
                      onChange={(k) => setSupplierId(k ? String(k) : '')}
                    >
                      <Label>{t('supplier')}</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item key="__none__" id="__none__" textValue={t('selectSupplier')}>
                            {t('selectSupplier')}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          {suppliers.map((s) => (
                            <ListBox.Item key={s.id} id={s.id} textValue={s.name}>
                              {s.name}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <Select
                      variant="primary"
                      placeholder={t('selectTransaction')}
                      value={transactionId || null}
                      onChange={(k) => setTransactionId(k ? String(k) : '')}
                    >
                      <Label>
                        {t('transaction')}
                        <span className="text-danger ml-1">*</span>
                      </Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item key="__none__" id="__none__" textValue={t('selectTransaction')}>
                            {t('selectTransaction')}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          {transactions.map((tx) => {
                            const label = tx.amountUsd
                              ? `USD ${tx.amountUsd} — ${tx.status}`
                              : `${tx.id.slice(0, 8)} — ${tx.status}`;
                            return (
                              <ListBox.Item key={tx.id} id={tx.id} textValue={label}>
                                {label}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            );
                          })}
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <TextField variant="primary" isRequired>
                      <Label>{t('contractNumber')}</Label>
                      <Input
                        name="contractNumber"
                        value={contractNumber}
                        onChange={(e) => setContractNumber(e.target.value)}
                        placeholder={t('contractNumberPlaceholder')}
                        autoComplete="off"
                      />
                    </TextField>

                    <Select
                      variant="primary"
                      placeholder={t('selectBroker')}
                      value={brokerId || null}
                      onChange={(k) => setBrokerId(k ? String(k) : '')}
                    >
                      <Label>{t('broker')}</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item key="__none__" id="__none__" textValue={t('selectBroker')}>
                            {t('selectBroker')}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          {brokers.map((b) => (
                            <ListBox.Item key={b.id} id={b.id} textValue={b.name}>
                              {b.name}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <div className="grid grid-cols-2 gap-4">
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
                        <Label>{t('exchangeRate')}</Label>
                        <Input
                          name="exchangeRate"
                          type="number"
                          step="0.0001"
                          min="0"
                          value={exchangeRate}
                          onChange={(e) => setExchangeRate(e.target.value)}
                          placeholder={t('exchangeRatePlaceholder')}
                          autoComplete="off"
                        />
                      </TextField>
                    </div>

                    <DateField
                      value={closedAt ? parseDate(closedAt) : null}
                      onChange={(v) => setClosedAt(v?.toString() ?? '')}
                      isRequired
                    >
                      <Label>{t('closingDate')}</Label>
                      <DateField.Group variant="primary">
                        <DateField.Input>
                          {(segment) => <DateField.Segment segment={segment} />}
                        </DateField.Input>
                      </DateField.Group>
                    </DateField>

                    <FileUpload
                      label={t('swift')}
                      name="swiftFile"
                      onFileSelect={setSwiftFile}
                      acceptedFormats="PDF (máx. 10MB)"
                    />

                    <FileUpload
                      label={t('contract')}
                      name="contractFile"
                      onFileSelect={setContractFile}
                      acceptedFormats="PDF (máx. 10MB)"
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
                    {isPending ? t('saving') : t('save')}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
    </Modal>
  );
}
