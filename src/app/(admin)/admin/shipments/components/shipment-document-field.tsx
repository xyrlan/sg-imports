'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FileUpload } from '@/components/ui/file-upload';
import { Button } from '@heroui/react';
import { ExternalLink, Upload } from 'lucide-react';
import { uploadShipmentDocumentAction } from '../[id]/actions';

interface ShipmentDocumentFieldProps {
  shipmentId: string;
  documentType: string;
  label: string;
  existingDocument: { url: string; name: string } | null;
  readOnly?: boolean;
  acceptedFormats?: string;
  extraFormData?: Record<string, string>; // e.g. { supplierId: '...' }
}

export function ShipmentDocumentField({
  shipmentId,
  documentType,
  label,
  existingDocument,
  readOnly,
  acceptedFormats,
  extraFormData,
}: ShipmentDocumentFieldProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (existingDocument) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{label}:</span>
        <a
          href={existingDocument.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent hover:underline flex items-center gap-1"
        >
          {existingDocument.name} <ExternalLink className="size-3" />
        </a>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{label}:</span>
        <span className="text-sm text-muted">—</span>
      </div>
    );
  }

  const handleUpload = () => {
    if (!file) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set('shipmentId', shipmentId);
      formData.set('type', documentType);
      formData.set('name', label);
      formData.set('file', file);
      if (extraFormData) {
        Object.entries(extraFormData).forEach(([key, value]) => formData.set(key, value));
      }
      await uploadShipmentDocumentAction(formData);
      setFile(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <FileUpload
        label={label}
        name={documentType}
        onFileSelect={setFile}
        acceptedFormats={acceptedFormats}
      />
      {file && (
        <Button size="sm" onPress={handleUpload} isDisabled={isPending}>
          <Upload className="size-4" />
          {isPending ? '...' : 'Upload'}
        </Button>
      )}
    </div>
  );
}
