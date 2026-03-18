'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Checkbox } from '@heroui/react';
import { Ship, ExternalLink } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import type { ShipmentDetail } from '../shipment-utils';
import {
  updateBookingNumberAction,
  registerMblAction,
  togglePartLotAction,
  updateFreightSellPriceAction,
  uploadShipmentDocumentAction,
} from '../../[id]/actions';

// ============================================
// Props
// ============================================

interface ShippingPreparationStepProps {
  shipment: ShipmentDetail;
  readOnly?: boolean;
}

// ============================================
// Helpers
// ============================================

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ============================================
// Sub-components
// ============================================

interface BookingTrackingCardProps {
  shipment: ShipmentDetail;
  readOnly: boolean;
}

function BookingTrackingCard({ shipment, readOnly }: BookingTrackingCardProps) {
  const t = useTranslations('Admin.Shipments.Steps.ShippingPreparation');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [bookingNumber, setBookingNumber] = useState(shipment.bookingNumber ?? '');
  const [mbl, setMbl] = useState(shipment.masterBl ?? '');

  const handleSaveBooking = () => {
    startTransition(async () => {
      await updateBookingNumberAction(shipment.id, bookingNumber);
      router.refresh();
    });
  };

  const handleRegisterMbl = () => {
    startTransition(async () => {
      await registerMblAction(shipment.id, mbl);
      router.refresh();
    });
  };

  const handleTogglePartLot = (checked: boolean) => {
    startTransition(async () => {
      await togglePartLotAction(shipment.id, checked);
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-default-200 bg-default-50 p-4 space-y-4">
      <p className="text-sm font-semibold text-default-700">{t('bookingTracking')}</p>

      {/* Booking Number */}
      <div className="space-y-1">
        <label className="block text-xs text-default-500">{t('bookingNumber')}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={bookingNumber}
            onChange={(e) => setBookingNumber(e.target.value)}
            disabled={readOnly}
            className="flex-1 rounded-md border border-default-300 px-3 py-1.5 text-sm disabled:opacity-50"
          />
          {!readOnly && (
            <Button size="sm" variant="primary" onPress={handleSaveBooking} isPending={isPending}>
              {t('save')}
            </Button>
          )}
        </div>
      </div>

      {/* MBL */}
      <div className="space-y-1">
        <label className="block text-xs text-default-500">{t('mbl')}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={mbl}
            onChange={(e) => setMbl(e.target.value)}
            disabled={readOnly}
            className="flex-1 rounded-md border border-default-300 px-3 py-1.5 text-sm disabled:opacity-50"
          />
          {!readOnly && (
            <Button size="sm" variant="outline" onPress={handleRegisterMbl} isPending={isPending}>
              {t('registerShipsGo')}
            </Button>
          )}
        </div>
      </div>

      {/* ShipsGo data card */}
      {shipment.shipsGoId && (
        <div className="rounded-md border border-default-200 bg-white p-3 space-y-2">
          <p className="text-xs font-semibold text-default-600">{t('shipsGoData')}</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-default-600">
            <div>
              <span className="text-default-400">{t('carrier')}: </span>
              <span>{shipment.freightReceipt?.carrierId ?? '—'}</span>
            </div>
            <div>
              <span className="text-default-400">ETD: </span>
              <span>{formatDate(shipment.etd)}</span>
            </div>
            <div>
              <span className="text-default-400">ETA: </span>
              <span>{formatDate(shipment.eta)}</span>
            </div>
          </div>
          {shipment.shipsGoTrackingUrl && (
            <a
              href={shipment.shipsGoTrackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:underline text-xs"
            >
              <ExternalLink className="h-3 w-3" />
              {t('trackingLink')}
            </a>
          )}
        </div>
      )}

      {/* Part Lot */}
      <div className="flex items-center gap-2">
        <Checkbox
          isSelected={shipment.isPartLot}
          onChange={handleTogglePartLot}
          isDisabled={readOnly || isPending}
        >
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Content>
            <span className="text-sm text-default-700">{t('partLot')}</span>
          </Checkbox.Content>
        </Checkbox>
      </div>

      {/* Containers */}
      {(shipment.containers ?? []).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-default-500">{t('containers')}</p>
          <ul className="space-y-1">
            {shipment.containers!.map((c) => (
              <li key={c.id} className="text-sm text-default-700">
                {c.containerNumber ?? '—'} <span className="text-default-400">({c.type})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface FreightCardProps {
  shipment: ShipmentDetail;
  readOnly: boolean;
}

function FreightCard({ shipment, readOnly }: FreightCardProps) {
  const t = useTranslations('Admin.Shipments.Steps.ShippingPreparation');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [freightSellPrice, setFreightSellPrice] = useState(
    shipment.freightReceipt?.freightSellValue ?? '',
  );

  const handleSaveFreight = () => {
    startTransition(async () => {
      await updateFreightSellPriceAction(shipment.id, freightSellPrice);
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-default-200 bg-default-50 p-4 space-y-3">
      <p className="text-sm font-semibold text-default-700">{t('freight')}</p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-default-500">{t('freightCost')}:</span>
        <span className="text-sm text-default-700">
          {shipment.freightReceipt?.freightValue
            ? `$${shipment.freightReceipt.freightValue}`
            : '—'}
        </span>
      </div>
      <div className="space-y-1">
        <label className="block text-xs text-default-500">{t('freightSellPrice')}</label>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            value={freightSellPrice}
            onChange={(e) => setFreightSellPrice(e.target.value)}
            disabled={readOnly}
            className="flex-1 rounded-md border border-default-300 px-3 py-1.5 text-sm disabled:opacity-50"
          />
          {!readOnly && (
            <Button size="sm" variant="primary" onPress={handleSaveFreight} isPending={isPending}>
              {t('save')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface DocumentsCardProps {
  shipment: ShipmentDetail;
  readOnly: boolean;
}

function DocumentsCard({ shipment, readOnly }: DocumentsCardProps) {
  const t = useTranslations('Admin.Shipments.Steps.ShippingPreparation');
  const router = useRouter();
  const [mblFile, setMblFile] = useState<File | null>(null);
  const [hblFile, setHblFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  const mblDocument = (shipment.documents ?? []).find((d) => d.type === 'MBL_DOCUMENT');
  const hblDocument = (shipment.documents ?? []).find((d) => d.type === 'HBL_DOCUMENT');

  const uploadDocument = (type: string, file: File | null) => {
    if (!file) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set('shipmentId', shipment.id);
      formData.set('type', type);
      formData.set('name', file.name);
      formData.set('file', file);
      await uploadShipmentDocumentAction(formData);
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-default-200 bg-default-50 p-4 space-y-4">
      <p className="text-sm font-semibold text-default-700">{t('documents')}</p>

      {/* MBL Document */}
      <div className="space-y-1">
        <p className="text-xs text-default-500">MBL</p>
        {mblDocument ? (
          <a
            href={mblDocument.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline text-sm"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {mblDocument.name}
          </a>
        ) : !readOnly ? (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <FileUpload
                label=""
                name="mblFile"
                onFileSelect={setMblFile}
                acceptedFormats="PDF (máx. 10MB)"
              />
            </div>
            {mblFile && (
              <Button
                size="sm"
                variant="primary"
                onPress={() => uploadDocument('MBL_DOCUMENT', mblFile)}
                isPending={isPending}
              >
                {t('save')}
              </Button>
            )}
          </div>
        ) : (
          <span className="text-sm text-default-400">—</span>
        )}
      </div>

      {/* HBL Document */}
      <div className="space-y-1">
        <p className="text-xs text-default-500">HBL</p>
        {hblDocument ? (
          <a
            href={hblDocument.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline text-sm"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {hblDocument.name}
          </a>
        ) : !readOnly ? (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <FileUpload
                label=""
                name="hblFile"
                onFileSelect={setHblFile}
                acceptedFormats="PDF (máx. 10MB)"
              />
            </div>
            {hblFile && (
              <Button
                size="sm"
                variant="primary"
                onPress={() => uploadDocument('HBL_DOCUMENT', hblFile)}
                isPending={isPending}
              >
                {t('save')}
              </Button>
            )}
          </div>
        ) : (
          <span className="text-sm text-default-400">—</span>
        )}
      </div>
    </div>
  );
}

// ============================================
// Component
// ============================================

export function ShippingPreparationStep({
  shipment,
  readOnly = false,
}: ShippingPreparationStepProps) {
  const t = useTranslations('Admin.Shipments.Steps.ShippingPreparation');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Ship className="h-5 w-5 text-default-400" />
        <h3 className="text-base font-semibold text-default-700">{t('title')}</h3>
      </div>

      <BookingTrackingCard shipment={shipment} readOnly={readOnly} />
      <FreightCard shipment={shipment} readOnly={readOnly} />
      <DocumentsCard shipment={shipment} readOnly={readOnly} />
    </div>
  );
}
