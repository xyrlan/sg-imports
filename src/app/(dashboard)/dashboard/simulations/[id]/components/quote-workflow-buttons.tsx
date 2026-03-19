'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Autocomplete,
  Button,
  Chip,
  EmptyState,
  Input,
  Label,
  ListBox,
  Modal,
  SearchField,
  TextArea,
  TextField,
  useFilter,
} from '@heroui/react';
import { Send, RotateCcw, ExternalLink, FileSignature, XCircle } from 'lucide-react';
import {
  sendQuoteToClientAction,
  pullQuoteBackToDraftAction,
  rejectQuoteAction,
  initiateContractSigningAction,
  getOrganizationsForQuoteTargetAction,
} from './quote-actions';
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
  const [clientPhone, setClientPhone] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  const isSeller = simulation.sellerOrganizationId === organizationId;
  const isClient = simulation.clientOrganizationId === organizationId;
  const isStale = Boolean(simulation.isRecalculationNeeded);

  const handleSend = async () => {
    setSendError(null);
    setIsPending(true);
    try {
      const formData = new FormData();
      formData.set('quoteId', simulation.id);
      formData.set('organizationId', organizationId);
      if (clientOrgId) formData.set('clientOrganizationId', clientOrgId);
      if (clientEmail?.trim()) formData.set('clientEmail', clientEmail.trim());
      if (clientPhone?.trim()) formData.set('clientPhone', clientPhone.trim());
      const result = await sendQuoteToClientAction(null, formData);
      if (result.success) {
        setSendModalOpen(false);
        setClientOrgId('');
        setClientEmail('');
        setClientPhone('');
        router.refresh();
        onMutate?.();
      } else {
        setSendError(result.error ?? 'Falha ao enviar');
      }
    } finally {
      setIsPending(false);
    }
  };

  const handlePullBack = async () => {
    setIsPending(true);
    try {
      const result = await pullQuoteBackToDraftAction(simulation.id, organizationId);
      if (result.success) {
        router.refresh();
        onMutate?.();
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleReject = async (reason: string) => {
    setRejectError(null);
    setIsPending(true);
    try {
      const result = await rejectQuoteAction(simulation.id, organizationId, reason);
      if (result.success) {
        setRejectModalOpen(false);
        router.refresh();
        onMutate?.();
      } else {
        setRejectError(result.error ?? 'Falha ao rejeitar');
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleSignContract = async () => {
    setSignError(null);
    setIsPending(true);
    try {
      const result = await initiateContractSigningAction(simulation.id, organizationId);
      if (result.success && result.signUrl) {
        window.location.href = result.signUrl;
      } else {
        setSignError(result.error ?? 'Falha ao iniciar assinatura');
      }
    } finally {
      setIsPending(false);
    }
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
      <div className="flex flex-col gap-2">
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
            <>
              <Button
                variant="outline"
                size="sm"
                isPending={isPending}
                onPress={() => setRejectModalOpen(true)}
                className="inline-flex gap-2 border-danger text-danger"
              >
                <XCircle className="size-4" />
                {t('rejectQuote')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                isDisabled={isStale}
                isPending={isPending}
                onPress={handleSignContract}
                className="inline-flex gap-2"
                aria-label={isStale ? t('staleCannotAccept') : t('signContract')}
              >
                <FileSignature className="size-4" />
                {t('signContract')}
              </Button>
            </>
          )}

          {simulation.status === 'REJECTED' && isSeller && (
            <Button
              variant="outline"
              size="sm"
              isPending={isPending}
              onPress={handlePullBack}
              className="inline-flex gap-2"
            >
              <RotateCcw className="size-4" />
              {t('pullBackFromRejected')}
            </Button>
          )}

          {simulation.status === 'PENDING_SIGNATURE' && (isSeller || isClient) && (
            <Chip size="sm" variant="secondary" color="warning">
              {t('awaitingSignature')}
            </Chip>
          )}
        </div>

        {simulation.status === 'REJECTED' && isSeller && simulation.rejectionReason && (
          <div className="rounded-lg border border-warning bg-warning/10 px-3 py-2 text-sm text-warning-600">
            <p className="font-medium">{t('rejectedBy')}</p>
            <p className="text-foreground/90">
              {t('rejectionReasonLabel', { reason: simulation.rejectionReason })}
            </p>
          </div>
        )}

        {signError && (
          <p className="text-sm text-danger" role="alert">
            {signError}
          </p>
        )}
      </div>

      <SendQuoteModal
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
        clientOrgId={clientOrgId}
        setClientOrgId={setClientOrgId}
        clientEmail={clientEmail}
        setClientEmail={setClientEmail}
        clientPhone={clientPhone}
        setClientPhone={setClientPhone}
        sellerOrgId={simulation.sellerOrganizationId}
        onSend={handleSend}
        isPending={isPending}
        error={sendError}
      />

      <RejectQuoteModal
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        onReject={handleReject}
        isPending={isPending}
        error={rejectError}
      />
    </>
  );
}

interface RejectQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReject: (reason: string) => void;
  isPending: boolean;
  error: string | null;
}

function RejectQuoteModal({ open, onOpenChange, onReject, isPending, error }: RejectQuoteModalProps) {
  const t = useTranslations('Simulations.Workflow');
  const [reason, setReason] = useState('');

  return (
    <Modal>
      <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange} isDismissable={!isPending}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-danger/10 text-danger">
                <XCircle size={20} />
              </Modal.Icon>
              <Modal.Heading>{t('rejectModalTitle')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-4 p-0.5">
              <p className="text-sm text-muted">{t('rejectModalDescription')}</p>
              <TextField variant="primary" value={reason} onChange={setReason}>
                <Label>{t('rejectionReason')}</Label>
                <TextArea placeholder={t('rejectionReasonPlaceholder')} rows={3} />
              </TextField>
              {error && (
                <p className="text-sm text-danger" role="alert">{error}</p>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button
                variant="primary"
                className="bg-danger text-white"
                isPending={isPending}
                isDisabled={!reason.trim()}
                onPress={() => onReject(reason.trim())}
              >
                {t('confirmReject')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

interface SendQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientOrgId: string;
  setClientOrgId: (v: string) => void;
  clientEmail: string;
  setClientEmail: (v: string) => void;
  clientPhone: string;
  setClientPhone: (v: string) => void;
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
  clientPhone,
  setClientPhone,
  sellerOrgId,
  onSend,
  isPending,
  error,
}: SendQuoteModalProps) {
  const t = useTranslations('Simulations.Workflow');
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [filterText, setFilterText] = useState('');
  const { contains } = useFilter({ sensitivity: 'base' });
  const [triggerWidth, setTriggerWidth] = useState<number | null>(null);
  const triggerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) setTriggerWidth(node.offsetWidth);
  }, []);

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
              <Modal.Icon className="bg-surface text-foreground">
                <Send size={20} />
              </Modal.Icon>
              <Modal.Heading>{t('sendModalTitle')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-4 p-0.5">
              <p className="text-sm text-muted">{t('sendModalDescription')}</p>
              <div className='flex flex-col gap-2'>
                <Label>{t('clientOrganization')}</Label>
                <Autocomplete
                  placeholder={t('selectOrganization')}
                  value={clientOrgId || null}
                  onChange={(k) => setClientOrgId((k as string) ?? '')}
                  onOpenChange={(isOpen) => isOpen && loadOrgs()}
                  variant="primary"
                  allowsEmptyCollection
                >
                  <Autocomplete.Trigger ref={triggerRef}>
                    <Autocomplete.Value />
                    <Autocomplete.ClearButton />
                    <Autocomplete.Indicator />
                  </Autocomplete.Trigger>
                  <Autocomplete.Popover style={{ width: triggerWidth ? `${triggerWidth}px` : 'auto' }}>
                    <Autocomplete.Filter
                      filter={contains}
                      inputValue={filterText}
                      onInputChange={setFilterText}
                    >
                      <SearchField variant="secondary">
                        <SearchField.Group>
                          <SearchField.SearchIcon />
                          <SearchField.Input placeholder={t('searchOrganization')} />
                          <SearchField.ClearButton />
                        </SearchField.Group>
                      </SearchField>
                      <ListBox
                        items={orgs}
                        renderEmptyState={() => (
                          <EmptyState className="py-6">{t('noOrganizationFound')}</EmptyState>
                        )}
                      >
                        {(o) => (
                          <ListBox.Item key={o.id} id={o.id} textValue={o.name}>
                            {o.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        )}
                      </ListBox>
                    </Autocomplete.Filter>
                  </Autocomplete.Popover>
                </Autocomplete>
              </div>
              <TextField variant="primary" value={clientEmail} onChange={setClientEmail}>
                <Label>{t('orClientEmail')}</Label>
                <Input type="email" placeholder="cliente@empresa.com" />
              </TextField>
              <TextField variant="primary" value={clientPhone} onChange={setClientPhone}>
                <Label>{t('clientPhone')}</Label>
                <Input type="tel" placeholder="+55 (11) 99999-9999" />
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
