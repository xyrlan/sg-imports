'use client';

import { Button } from '@heroui/react';
import { FileDownIcon } from 'lucide-react';
import { toast } from '@heroui/react';

async function handleExportCSV(organizationId: string) {
  try {
    const response = await fetch(`/api/organizations/${organizationId}/products/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryCriteria: {} }),
    });

    if (!response.ok) {
      throw new Error('Failed to export CSV');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'produtos.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    toast.success('Export completed');
  } catch {
    toast.danger('Failed to export CSV');
  }
}

interface ExportCSVButtonProps {
  organizationId: string;
}

export function ExportCSVButton({ organizationId }: ExportCSVButtonProps) {
  return (
    <Button
      className="ml-2 inline-flex items-center gap-2"
      variant="secondary"
      size="sm"
      onPress={() => handleExportCSV(organizationId)}
    >
      <FileDownIcon size={18} />
      Export CSV
    </Button>
  );
}
