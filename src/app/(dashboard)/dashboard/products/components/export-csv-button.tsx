'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button, toast } from '@heroui/react';
import { FileDownIcon } from 'lucide-react';

interface ExportCSVButtonProps {
  organizationId: string;
}

export function ExportCSVButton({ organizationId }: ExportCSVButtonProps) {
  const t = useTranslations('Products.Export');

  const handleExportCSV = useCallback(async () => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/products/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryCriteria: {} }),
      });

      if (!response.ok) {
        throw new Error(t('error'));
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

      toast.success(t('success'));
    } catch {
      toast.danger(t('error'));
    }
  }, [organizationId, t]);

  return (
    <Button
      className="ml-2 inline-flex items-center gap-2"
      variant="secondary"
      size="sm"
      onPress={() => handleExportCSV()}
    >
      <FileDownIcon size={18} />
      {t('button')}
    </Button>
  );
}
