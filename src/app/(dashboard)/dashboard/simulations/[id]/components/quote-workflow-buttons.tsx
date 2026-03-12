'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button, Modal, Input, Label, Select, ListBox, TextField } from '@heroui/react';
import { Send, RotateCcw, Check, Package, ExternalLink } from 'lucide-react';
import {
  sendQuoteToClientAction,
  pullQuoteBackToDraftAction,
  acceptQuoteAction,
  convertQuoteToShipmentAction,
  getOrganizationsForQuoteTargetAction,
} from '../../actions';
import type { Simulation } from '@/services/simulation.service';

interface QuoteWorkflowButtonsProps {
  simulation: Simulation;
  organizationId: string;
  onMutate?: () => void;
}

export function QuoteWorkflowButtons({
  simulation,
  organizationId,
  onMutate,
}: QuoteWorkflowButtonsProps) {
  const t = useTranslations('Simulations.Workflow');
  const router = useRouter();
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [clientOrgId, setClientOrgId] = useState<string>('');
  const [clientEmail, setClientEmail] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSeller = simulation.sellerOrganizationId === organizationId;
  const isClient = simulation.clientOrganizationId === organizationId;
  const canAccept = isClient && !simulation.isRecalculationNeeded;
  const isStale = Boolean(simulation.isRecalculationNeeded);

  const handleSend = () => {
    setSendError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('quoteId', simulation.id);
      formData.set('organizationId', organizationId);
      if (clientOrgId) formData.set('clientOrganizationId', clientOrgId);
      if (clientEmail?.trim()) formData.set('clientEmail', clientEmail.trim());
      const result = await sendQuoteToClientAction(null, formData);
      if (result.success) {
        setSendModalOpen(false);
        setClientOrgId('');
        setClientEmail('');
        router.refresh();
        onMutate?.();
      } else {
        setSendError(result.error ?? 'Falha ao enviar');
      }
    });
  };

  const handlePullBack = () => {
    startTransition(async () => {
      const result = await pullQuoteBackToDraftAction(simulation.id, organizationId);
      if (result.success) {
        router.refresh();
        onMutate?.();
      }
    });
  };

  const handleAccept = () => {
    startTransition(async () => {
      const result = await acceptQuoteAction(simulation.id, organizationId);
      if (result.success) {
        router.refresh();
        onMutate?.();
      }
    });
  };

  const handleConvert = () => {
    startTransition(async () => {
      const result = await convertQuoteToShipmentAction(simulation.id, organizationId);
      if (result.success && result.shipmentId) {
        router.push(`/dashboard?shipment=${result.shipmentId}`);
        onMutate?.();
      }
    });
  };

  if (simulation.status === 'CONVERTED' && simulation.generatedShipmentId) {
    return (
      <Link href={`/dashboard?shipment=${simulation.generatedShipmentId}`}>
        <Button variant="outline" size="sm" className="inline-flex gap-2">
          <ExternalLink className="size-4" />
          {t('viewShipment')}
        </Button>
      </Link>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {simulation.status === 'DRAFT' && isSeller && (
          <Button
            variant="outline"
            size="sm"
            onPress={() => setSendModalOpen(true)}
            className="inline-flex gap-2"
          >
            <Send className="size-4" />
            {t('sendToClient')}
          </Button>
        )}
        {simulation.status === 'SENT' && isSeller && (
          <Button
            variant="outline"
            size="sm"
            isPending={isPending}
            onPress={handlePullBack}
            className="inline-flex gap-2"
          >
            <RotateCcw className="size-4" />
            {t('pullBack')}
          </Button>
        )}
        {simulation.status === 'SENT' && isClient && (
          <Button
            variant="primary"
            size="sm"
            isDisabled={isStale}
            isPending={isPending}
            onPress={handleAccept}
            className="inline-flex gap-2"
            aria-label={isStale ? t('staleCannotAccept') : t('accept')}
          >
            <Check className="size-4" />
            {t('accept')}
          </Button>
        )}
        {simulation.status === 'APPROVED' && (isSeller || isClient) && (
          <Button
            variant="primary"
            size="sm"
            isPending={isPending}
            onPress={handleConvert}
            className="inline-flex gap-2"
          >
            <Package className="size-4" />
            {t('generateOrder')}
          </Button>
        )}
      </div>

      <SendQuoteModal
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
        clientOrgId={clientOrgId}
        setClientOrgId={setClientOrgId}
        clientEmail={clientEmail}
        setClientEmail={setClientEmail}
        sellerOrgId={simulation.sellerOrganizationId}
        onSend={handleSend}
        isPending={isPending}
        error={sendError}
      />
    </>
  );
}

interface SendQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientOrgId: string;
  setClientOrgId: (v: string) => void;
  clientEmail: string;
  setClientEmail: (v: string) => void;
  sellerOrgId: string;
  onSend: () => void;
  isPending: boolean;
  error: string | null;
}

function SendQuoteModal({
  open,
  onOpenChange,
  clientOrgId,
  setClientOrgId,
  clientEmail,
  setClientEmail,
  sellerOrgId,
  onSend,
  isPending,
  error,
}: SendQuoteModalProps) {
  const t = useTranslations('Simulations.Workflow');
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);

  const loadOrgs = async () => {
    const list = await getOrganizationsForQuoteTargetAction(sellerOrgId);
    setOrgs(list);
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange} isDismissable={!isPending}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('sendModalTitle')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              <p className="text-sm text-default-500">{t('sendModalDescription')}</p>
              <div>
                <Label>{t('clientOrganization')}</Label>
                <Select
                  placeholder={t('selectOrganization')}
                  value={clientOrgId || null}
                  onChange={(k) => setClientOrgId((k as string) ?? '')}
                  onOpenChange={(isOpen) => isOpen && loadOrgs()}
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {orgs.map((o) => (
                        <ListBox.Item key={o.id} id={o.id} textValue={o.name}>
                          {o.name}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
              <TextField variant="primary" value={clientEmail} onChange={setClientEmail}>
                <Label>{t('orClientEmail')}</Label>
                <Input type="email" placeholder="cliente@empresa.com" />
              </TextField>
              {error && (
                <p className="text-sm text-danger" role="alert">
                  {error}
                </p>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button
                variant="primary"
                isPending={isPending}
                isDisabled={!clientOrgId && !clientEmail?.trim()}
                onPress={onSend}
              >
                {t('send')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
