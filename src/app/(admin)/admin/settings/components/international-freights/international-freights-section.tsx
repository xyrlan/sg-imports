'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Accordion, Button, Card } from '@heroui/react';
import { Plus } from 'lucide-react';
import { SettingsSectionHeader } from '../_shared/settings-section-header';
import { FreightFormModal } from './freight-form-modal';
import { FreightFilters, type StatusFilter } from './freight-filters';
import { FreightsEmptyState } from './freights-empty-state';
import { CarrierAccordionItem } from './carrier-accordion-item';
import { DeleteFreightDialog } from './delete-freight-dialog';
import { getValidityStatus } from './constants';
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

  return (
    <Card className="space-y-6">
      <SettingsSectionHeader
        title={t('title')}
        description={t('description')}
        actions={
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
        }
        responsive
      />

      <FreightFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        carrierFilter={carrierFilter}
        onCarrierChange={setCarrierFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {filteredFreights.length === 0 ? (
        <FreightsEmptyState />
      ) : (
        <Accordion variant="default" className="px-0">
          {groupedByCarrier.map(({ carrier, freights: carrierFreights }) => (
            <CarrierAccordionItem
              key={carrier.id}
              carrier={carrier}
              freights={carrierFreights}
              onEdit={(freight) => {
                setEditingFreight(freight);
                setModalOpen(true);
              }}
              onDelete={setDeletingFreight}
            />
          ))}
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

      <DeleteFreightDialog
        freight={deletingFreight}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingFreight(null)}
      />
    </Card>
  );
}
