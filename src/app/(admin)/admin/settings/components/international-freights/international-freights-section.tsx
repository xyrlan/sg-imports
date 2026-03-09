'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Accordion,
  AlertDialog,
  Button,
  Card,
  Chip,
  Input,
  ListBox,
  Select,
} from '@heroui/react';
import { Plus, Pencil, Trash2, Ship, ArrowRight, Package } from 'lucide-react';
import { CarrierAutocomplete } from './carrier-autocomplete';
import { FreightFormModal } from './freight-form-modal';
import {
  CONTAINER_TYPE_LABELS,
  getValidityStatus,
  getDaysRemaining,
} from './constants';
import {
  createInternationalFreightAction,
  updateInternationalFreightAction,
  deleteInternationalFreightAction,
} from '../../actions';
import type {
  InternationalFreightWithPorts,
  Port,
} from '@/services/admin';

interface InternationalFreightsSectionProps {
  freights: InternationalFreightWithPorts[];
  ports: Port[];
}

type StatusFilter = 'all' | 'valid' | 'expired';

export function InternationalFreightsSection({
  freights,
  ports,
}: InternationalFreightsSectionProps) {
  const t = useTranslations('Admin.Settings.InternationalFreights');
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [carrierFilter, setCarrierFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFreight, setEditingFreight] =
    useState<InternationalFreightWithPorts | null>(null);
  const [deletingFreight, setDeletingFreight] =
    useState<InternationalFreightWithPorts | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredFreights = useMemo(() => {
    let result = freights;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((f) => {
        const loadingNames = f.portsOfLoading.map((p) =>
          `${p.name} ${p.code ?? ''}`.toLowerCase()
        ).join(' ');
        const dischargeNames = f.portsOfDischarge.map((p) =>
          `${p.name} ${p.code ?? ''}`.toLowerCase()
        ).join(' ');
        return loadingNames.includes(q) || dischargeNames.includes(q);
      });
    }

    if (carrierFilter) {
      result = result.filter((f) => f.carrierId === carrierFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((f) => {
        const status = getValidityStatus(f.validTo);
        if (statusFilter === 'valid') return status === 'valid';
        if (statusFilter === 'expired') return status === 'expired';
        return true;
      });
    }

    return result;
  }, [freights, searchQuery, carrierFilter, statusFilter]);

  const groupedByCarrier = useMemo(() => {
    const map = new Map<string, { carrier: { id: string; name: string }; freights: InternationalFreightWithPorts[] }>();
    for (const f of filteredFreights) {
      const carrierId = f.carrierId ?? '__no_carrier__';
      const carrierName = f.carrier?.name ?? t('noCarrier');
      if (!map.has(carrierId)) {
        map.set(carrierId, { carrier: { id: carrierId, name: carrierName }, freights: [] });
      }
      map.get(carrierId)!.freights.push(f);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.carrier.name.localeCompare(b.carrier.name)
    );
  }, [filteredFreights, t]);

  const groupedByContainer = (freights: InternationalFreightWithPorts[]) => {
    const map = new Map<string, InternationalFreightWithPorts[]>();
    for (const f of freights) {
      const list = map.get(f.containerType) ?? [];
      list.push(f);
      map.set(f.containerType, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const handleCreateSuccess = () => {
    setModalOpen(false);
    setEditingFreight(null);
    router.refresh();
  };

  const handleSubmit = async (data: {
    carrierId: string;
    containerType: string;
    value: string;
    currency: string;
    freeTimeDays: number;
    expectedProfit: string | null;
    validTo: string | null;
    portOfLoadingIds: string[];
    portOfDischargeIds: string[];
  }) => {
    if (editingFreight) {
      return updateInternationalFreightAction(editingFreight.id, data);
    }
    return createInternationalFreightAction(data);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingFreight) return;
    setIsDeleting(true);
    try {
      const result = await deleteInternationalFreightAction(deletingFreight.id);
      if (result.ok) {
        setDeletingFreight(null);
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const ValidityChip = ({ freight }: { freight: InternationalFreightWithPorts }) => {
    const status = getValidityStatus(freight.validTo);
    const days = getDaysRemaining(freight.validTo);

    if (status === 'valid' && days === null) {
      return (
        <Chip size="sm" color="success" variant="soft">
          {t('validity.valid')}
        </Chip>
      );
    }
    if (status === 'valid' && days !== null) {
      return (
        <Chip size="sm" color="success" variant="soft">
          {t('validity.validDaysRemaining', { count: days })}
        </Chip>
      );
    }
    if (status === 'expiring' && days !== null) {
      return (
        <Chip size="sm" color="warning" variant="soft">
          {t('validity.expiringInDays', { count: days })}
        </Chip>
      );
    }
    return (
      <Chip size="sm" color="danger" variant="soft">
        {t('validity.expired')}
      </Chip>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted">{t('description')}</p>
        </div>
        <Button
          variant="primary"
          onPress={() => {
            setEditingFreight(null);
            setModalOpen(true);
          }}
        >
          <Plus className="size-4" />
          {t('addFreight')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder={t('filters.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="primary"
          />
        </div>
        <CarrierAutocomplete
          placeholder={t('filters.filterByCarrier')}
          value={carrierFilter}
          onChange={setCarrierFilter}
          className="min-w-[300px] w-[300px]"
          variant="primary"
          includeAllOption
        />
        <Select
          placeholder={t('filters.filterByStatus')}
          value={statusFilter}
          onChange={(k) => setStatusFilter((k as StatusFilter) ?? 'all')}
          className="min-w-[140px]"
          variant="primary"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item key="all" id="all" textValue={t('filters.statusAll')}>
                {t('filters.statusAll')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item key="valid" id="valid" textValue={t('filters.statusValid')}>
                {t('filters.statusValid')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item key="expired" id="expired" textValue={t('filters.statusExpired')}>
                {t('filters.statusExpired')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {filteredFreights.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Ship className="mx-auto mb-4 size-12 text-muted" />
            <p className="text-muted">{t('noFreights')}</p>
            <p className="text-sm text-muted mt-1">{t('noFreightsHint')}</p>
          </div>
        </Card>
      ) : (
        <Accordion variant="default" className="px-0">
          {groupedByCarrier.map(({ carrier, freights: carrierFreights }) => {
            const validCount = carrierFreights.filter(
              (f) => getValidityStatus(f.validTo) !== 'expired'
            ).length;
            return (
              <Accordion.Item key={carrier.id} id={carrier.id}>
                <Accordion.Heading>
                  <Accordion.Trigger className="w-full flex items-center justify-between pr-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Ship className="size-5 text-primary" />
                      </div>
                      <div>
                        <span className="font-semibold">{carrier.name}</span>
                        <span className="text-muted text-sm ml-2">
                          — {validCount} {t('tariffsActive', { count: validCount })}
                        </span>
                      </div>
                    </div>
                    <Accordion.Indicator />
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body>
                    <div className="space-y-6 pt-2">
                      {groupedByContainer(carrierFreights).map(
                        ([containerType, typeFreights]) => (
                          <div key={containerType} className="space-y-3">
                            <h4 className="text-sm font-medium text-muted flex items-center gap-2">
                              <Package className="size-4" />
                              {CONTAINER_TYPE_LABELS[containerType] ?? containerType}
                            </h4>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                              {typeFreights.map((freight) => (
                                <Card key={freight.id} className="p-4">
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-xl font-bold">
                                        {Number(freight.value).toLocaleString('pt-BR', {
                                          style: 'currency',
                                          currency: freight.currency ?? 'USD',
                                        })}
                                      </span>
                                      <ValidityChip freight={freight} />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1 text-sm text-muted">
                                      {freight.portsOfLoading.length <= 2
                                        ? freight.portsOfLoading.map((p) => (
                                            <Chip key={p.id} size="sm" variant="soft">
                                              {p.name}
                                            </Chip>
                                          ))
                                        : (
                                            <Chip size="sm" variant="soft">
                                              {freight.portsOfLoading.length} {t('ports')}
                                            </Chip>
                                          )}
                                      <ArrowRight className="size-4 shrink-0" />
                                      {freight.portsOfDischarge.length <= 2
                                        ? freight.portsOfDischarge.map((p) => (
                                            <Chip key={p.id} size="sm" variant="soft">
                                              {p.name}
                                            </Chip>
                                          ))
                                        : (
                                            <Chip size="sm" variant="soft">
                                              {freight.portsOfDischarge.length} {t('ports')}
                                            </Chip>
                                          )}
                                    </div>
                                    {(freight.freeTimeDays ?? 0) > 0 && (
                                      <p className="text-xs text-muted">
                                        {t('freeTimeDaysCount', { count: freight.freeTimeDays ?? 0 })}
                                      </p>
                                    )}
                                    <div className="flex justify-end gap-1 pt-2">
                                      <Button
                                        size="sm"
                                        variant="tertiary"
                                        onPress={() => {
                                          setEditingFreight(freight);
                                          setModalOpen(true);
                                        }}
                                      >
                                        <Pencil className="size-4" />
                                        {t('edit')}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="danger-soft"
                                        onPress={() => setDeletingFreight(freight)}
                                      >
                                        <Trash2 className="size-4" />
                                        {t('delete')}
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}

      <FreightFormModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        editingFreight={editingFreight}
        ports={ports}
        onSubmit={handleSubmit}
        onSuccess={handleCreateSuccess}
      />

      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={!!deletingFreight}
          onOpenChange={(open) => !open && setDeletingFreight(null)}
        >
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>{t('deleteConfirmTitle')}</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  {deletingFreight &&
                    t('deleteConfirm', {
                      carrier: deletingFreight.carrier?.name ?? t('noCarrier'),
                      container: CONTAINER_TYPE_LABELS[deletingFreight.containerType],
                    })}
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button
                  slot="close"
                  variant="tertiary"
                  onPress={() => setDeletingFreight(null)}
                >
                  {t('cancel')}
                </Button>
                <Button
                  variant="danger"
                  isPending={isDeleting}
                  onPress={handleDeleteConfirm}
                >
                  {t('delete')}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
