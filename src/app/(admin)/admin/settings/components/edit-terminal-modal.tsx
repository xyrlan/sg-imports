'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import { Building2 } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { useActionState } from 'react';
import { updateTerminalAction } from '../actions';
import type { Terminal } from '@/services/admin';

interface EditTerminalModalProps {
  terminal: Terminal;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trigger: React.ReactNode;
}

export function EditTerminalModal({
  terminal,
  isOpen,
  onOpenChange,
  trigger,
}: EditTerminalModalProps) {
  const t = useTranslations('Admin.Settings');
  const [name, setName] = useState(terminal.name);
  const [code, setCode] = useState(terminal.code ?? '');
  const [state, formAction, isPending] = useActionState(
    updateTerminalAction.bind(null, terminal.id),
    null,
  );

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setName(terminal.name);
        setCode(terminal.code ?? '');
      });
    }
  }, [isOpen, terminal.name, terminal.code]);

  useEffect(() => {
    if (state?.ok && !isPending) {
      queueMicrotask(() => onOpenChange(false));
    }
  }, [state?.ok, isPending, onOpenChange]);

  return (
    <Modal>
      {trigger}
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className="mb-6">
              <Modal.Heading>
                <div className="flex items-center gap-2">
                  <Building2 className="size-5" />
                  {t('Terminals.edit')} - {terminal.name}
                </div>
              </Modal.Heading>
            </Modal.Header>
            <form action={formAction}>
              <Modal.Body className="p-2">
                <div className="space-y-4">
                  <TextField variant="primary" isRequired>
                    <Label>{t('Terminals.name')}</Label>
                    <Input
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('Terminals.namePlaceholder')}
                    />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{t('Terminals.code')}</Label>
                    <Input
                      name="code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder={t('Terminals.codePlaceholder')}
                    />
                  </TextField>
                  {state?.error && <FormError message={state.error} />}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="outline" slot="close">
                  {t('Terminals.cancel')}
                </Button>
                <Button type="submit" variant="primary" isPending={isPending}>
                  {isPending ? t('Terminals.saving') : t('Terminals.save')}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
