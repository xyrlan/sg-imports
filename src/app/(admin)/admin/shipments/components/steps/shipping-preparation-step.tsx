'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Checkbox, Surface } from '@heroui/react';
import { Ship, ExternalLink } from 'lucide-react';
import type { ShipmentDetail } from '../shipment-utils';
import { formatDateBR } from '../shipment-utils';
import { ShipmentDocumentField } from '../shipment-document-field';
import {
  updateBookingNumberAction,
  registerMblAction,
  togglePartLotAction,
  updateFreightSellPriceAction,
} from '../../[id]/actions';

// ============================================
// Props
// ============================================

interface ShippingPreparationStepProps {
  shipment: ShipmentDetail;
  readOnly?: boolean;
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
    <Surface variant="secondary" className="p-4 space-y-4 ">
      <p className="text-sm font-semibold text-foreground">{t('bookingTracking')}</p>

      {/* Booking Number */}
      <div className="space-y-1">
        <label className="block text-xs text-muted">{t('bookingNumber')}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={bookingNumber}
            onChange={(e) => setBookingNumber(e.target.value)}
            disabled={readOnly}
            className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
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
        <label className="block text-xs text-muted">{t('mbl')}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={mbl}
            onChange={(e) => setMbl(e.target.value)}
            disabled={readOnly}
            className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
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
        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground/90">{t('shipsGoData')}</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-foreground/90">
            <div>
              <span className="text-muted">{t('carrier')}: </span>
              <span>{shipment.freightReceipt?.carrierId ?? '—'}</span>
            </div>
            <div>
              <span className="text-muted">ETD: </span>
              <span>{formatDateBR(shipment.etd)}</span>
            </div>
            <div>
              <span className="text-muted">ETA: </span>
              <span>{formatDateBR(shipment.eta)}</span>
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
            <span className="text-sm text-foreground">{t('partLot')}</span>
          </Checkbox.Content>
        </Checkbox>
      </div>

      {/* Containers */}
      {(shipment.containers ?? []).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted">{t('containers')}</p>
          <ul className="space-y-1">
            {shipment.containers!.map((c) => (
              <li key={c.id} className="text-sm text-foreground">
                {c.containerNumber ?? '—'} <span className="text-muted">({c.type})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Surface>
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
    <Surface variant="secondary" className="p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">{t('freight')}</p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">{t('freightCost')}:</span>
        <span className="text-sm text-foreground">
          {shipment.freightReceipt?.freightValue
            ? `$${shipment.freightReceipt.freightValue}`
            : '—'}
        </span>
      </div>
      <div className="space-y-1">
        <label className="block text-xs text-muted">{t('freightSellPrice')}</label>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            value={freightSellPrice}
            onChange={(e) => setFreightSellPrice(e.target.value)}
            disabled={readOnly}
            className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
          />
          {!readOnly && (
            <Button size="sm" variant="primary" onPress={handleSaveFreight} isPending={isPending}>
              {t('save')}
            </Button>
          )}
        </div>
      </div>
    </Surface>
  );
}

interface DocumentsCardProps {
  shipment: ShipmentDetail;
  readOnly: boolean;
}

function DocumentsCard({ shipment, readOnly }: DocumentsCardProps) {
  const t = useTranslations('Admin.Shipments.Steps.ShippingPreparation');

  const mblDocument = (shipment.documents ?? []).find((d) => d.type === 'MBL_DOCUMENT');
  const hblDocument = (shipment.documents ?? []).find((d) => d.type === 'HBL_DOCUMENT');

  return (
    <Surface variant="secondary" className="p-4 space-y-4">
      <p className="text-sm font-semibold text-foreground">{t('documents')}</p>

      <ShipmentDocumentField
        shipmentId={shipment.id}
        documentType="MBL_DOCUMENT"
        label="MBL"
        existingDocument={mblDocument ? { url: mblDocument.url, name: mblDocument.name } : null}
        readOnly={readOnly}
        acceptedFormats="PDF (máx. 10MB)"
      />

      <ShipmentDocumentField
        shipmentId={shipment.id}
        documentType="HBL_DOCUMENT"
        label="HBL"
        existingDocument={hblDocument ? { url: hblDocument.url, name: hblDocument.name } : null}
        readOnly={readOnly}
        acceptedFormats="PDF (máx. 10MB)"
      />
    </Surface>
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
        <Ship className="h-5 w-5 text-muted" />
        <h3 className="text-base font-semibold text-foreground">{t('title')}</h3>
      </div>

      <BookingTrackingCard shipment={shipment} readOnly={readOnly} />
      <FreightCard shipment={shipment} readOnly={readOnly} />
      <DocumentsCard shipment={shipment} readOnly={readOnly} />
    </div>
  );
}
