'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import { Hash } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { useActionState } from 'react';
import { updateHsCodeAction } from '../actions';
import type { HsCode } from '@/services/admin';

interface EditNcmModalProps {
  hsCode: HsCode | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

function toDecimalString(val: string | null | undefined): string {
  if (val == null || val === '') return '0';
  return String(val);
}

export function EditNcmModal({
  hsCode,
  isOpen,
  onOpenChange,
  trigger,
  onSuccess,
}: EditNcmModalProps) {
  const t = useTranslations('Admin.Products');
  const [code, setCode] = useState(hsCode?.code ?? '');
  const [description, setDescription] = useState(hsCode?.description ?? '');
  const [ii, setIi] = useState(toDecimalString(hsCode?.ii));
  const [ipi, setIpi] = useState(toDecimalString(hsCode?.ipi));
  const [pis, setPis] = useState(toDecimalString(hsCode?.pis));
  const [cofins, setCofins] = useState(toDecimalString(hsCode?.cofins));
  const [antidumping, setAntidumping] = useState(toDecimalString(hsCode?.antidumping));

  const [state, formAction, isPending] = useActionState(
    hsCode ? updateHsCodeAction.bind(null, hsCode.id) : () => Promise.resolve({ ok: false, error: 'No NCM' }),
    null,
  );

  useEffect(() => {
    if (isOpen && hsCode) {
      setCode(hsCode.code);
      setDescription(hsCode.description ?? '');
      setIi(toDecimalString(hsCode.ii));
      setIpi(toDecimalString(hsCode.ipi));
      setPis(toDecimalString(hsCode.pis));
      setCofins(toDecimalString(hsCode.cofins));
      setAntidumping(toDecimalString(hsCode.antidumping));
    }
  }, [isOpen, hsCode]);

  useEffect(() => {
    if (state?.ok && !isPending) {
      queueMicrotask(() => {
        onOpenChange(false);
        onSuccess?.();
      });
    }
  }, [state?.ok, isPending, onOpenChange, onSuccess]);

  if (!hsCode) return null;

  return (
    <Modal>
      {trigger}
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className="mb-6">
              <Modal.Icon className="bg-surface text-foreground">
                <Hash className="size-5" />
              </Modal.Icon>
              <Modal.Heading>{t('editNcm')} - {hsCode.code}</Modal.Heading>
            </Modal.Header>
            <form action={formAction}>
              <Modal.Body className="p-2">
                <div className="space-y-4">
                  <TextField variant="primary" isRequired>
                    <Label>{t('columns.ncmCode')}</Label>
                    <Input
                      name="code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="0000.00.00"
                    />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{t('columns.description')}</Label>
                    <Input
                      name="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('descriptionPlaceholder')}
                    />
                  </TextField>
                  <div className="grid grid-cols-2 gap-4">
                    <TextField variant="primary">
                      <Label>II (%)</Label>
                      <Input
                        name="ii"
                        value={ii}
                        onChange={(e) => setIi(e.target.value)}
                        placeholder="0"
                      />
                    </TextField>
                    <TextField variant="primary">
                      <Label>IPI (%)</Label>
                      <Input
                        name="ipi"
                        value={ipi}
                        onChange={(e) => setIpi(e.target.value)}
                        placeholder="0"
                      />
                    </TextField>
                    <TextField variant="primary">
                      <Label>PIS (%)</Label>
                      <Input
                        name="pis"
                        value={pis}
                        onChange={(e) => setPis(e.target.value)}
                        placeholder="0"
                      />
                    </TextField>
                    <TextField variant="primary">
                      <Label>COFINS (%)</Label>
                      <Input
                        name="cofins"
                        value={cofins}
                        onChange={(e) => setCofins(e.target.value)}
                        placeholder="0"
                      />
                    </TextField>
                    <TextField variant="primary">
                      <Label>{t('antidumping')}</Label>
                      <Input
                        name="antidumping"
                        value={antidumping}
                        onChange={(e) => setAntidumping(e.target.value)}
                        placeholder="0"
                      />
                    </TextField>
                  </div>
                  {state?.error && <FormError message={state.error} />}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="outline" slot="close">
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
