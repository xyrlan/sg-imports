'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Modal, toast } from '@heroui/react';
import { FileUpIcon, DownloadIcon, AlertTriangleIcon, XIcon, Box } from 'lucide-react';

interface ImportProductsDrawerProps {
  organizationId: string;
  onMutate?: () => void;
}

interface ImportResult {
  criados: number;
  atualizados: number;
  ignorados: number;
  erros: number;
  detalhesErros: Array<{ nome: string; reason: string; linha?: number }>;
}

export function ImportProductsDrawer({ organizationId, onMutate }: ImportProductsDrawerProps) {
  const t = useTranslations('Products.Import');
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const fileType = file.name.split('.').pop()?.toLowerCase();
      if (fileType !== 'csv' && fileType !== 'xlsx') {
        toast.danger(t('invalidFileType'));
        return;
      }

      setIsLoading(true);
      setImportResult(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('organizationId', organizationId);

        const response = await fetch('/api/products/import', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || t('importFailed'));
        }

        const result: ImportResult = await response.json();
        setImportResult(result);

        toast.success(
          t('importSuccess', {
            criados: result.criados,
            atualizados: result.atualizados,
            ignorados: result.ignorados,
            erros: result.erros,
          })
        );

        if (result.erros > 0) {
          setShowErrorDetails(true);
        }

        onMutate?.();
      } catch (err) {
        toast.danger(err instanceof Error ? err.message : t('importFailed'));
      } finally {
        setIsLoading(false);
        const input = document.getElementById('products-file-upload') as HTMLInputElement;
        if (input) input.value = '';
      }
    },
    [organizationId, onMutate, t]
  );

  const downloadTemplate = useCallback(() => {
    const link = document.createElement('a');
    link.href = '/templates/product-import-template.csv';
    link.download = 'product-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('templateDownloaded'));
  }, [t]);

  return (
    <>
      <Button
        className="ml-2 inline-flex items-center gap-2"
        variant="secondary"
        size="sm"
        onPress={() => setOpen(true)}
      >
        <FileUpIcon size={18} />
        {t('button')}
      </Button>

      <Modal>
        <Modal.Backdrop isOpen={open} onOpenChange={setOpen} isDismissable={false}>
          <Modal.Container>
            <Modal.Dialog className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <Modal.CloseTrigger />
              <Modal.Header >
                <Modal.Icon className="bg-surface text-foreground">
                  <Box size={22} />
                </Modal.Icon>
                <Modal.Heading>
                  {t('heading')}
                  </Modal.Heading>
              </Modal.Header>

              <Modal.Body>
          <div className="space-y-6 p-4">
            <div className="bg-border dark:bg-zinc-800 p-4 rounded-lg">
              <h3 className="text-base font-medium mb-2">{t('downloadTemplate')}</h3>
              <p className="text-sm text-muted mb-3">
                {t('templateDescription')}
              </p>
              <ul className="text-sm text-muted mb-3 list-disc pl-5 space-y-1">
                <li><code>sku</code> — {t('templateColumns.sku')}</li>
                <li><code>name</code> — {t('templateColumns.name')}</li>
                <li><code>variantName</code> — {t('templateColumns.variantName')}</li>
                <li><code>priceUsd</code> — {t('templateColumns.priceUsd')}</li>
                <li><code>unitsPerCarton</code> — {t('templateColumns.unitsPerCarton')}</li>
                <li><code>cartonHeight</code>, <code>cartonWidth</code>, <code>cartonLength</code>, <code>cartonWeight</code> — {t('templateColumns.cartonDimensions')}</li>
              </ul>
              <p className="text-xs text-warning mb-3">
                {t('csvDelimiter')}
              </p>
              <Button
                variant="primary"
                onPress={downloadTemplate}
                className="inline-flex items-center gap-2"
              >
                <DownloadIcon size={16} />
                {t('downloadTemplate')}
              </Button>
            </div>

            <div className="bg-border dark:bg-zinc-800 p-4 rounded-lg">
              <h3 className="text-base font-medium mb-2">{t('uploadFile')}</h3>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  id="products-file-upload"
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  disabled={isLoading}
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="products-file-upload"
                  className="cursor-pointer inline-flex flex-col items-center"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-border" />
                      <span className="text-sm text-muted mt-2">{t('importing')}</span>
                    </>
                  ) : (
                    <>
                      <FileUpIcon className="mb-2 text-muted" size={24} />
                      <span className="text-sm text-muted">{t('clickToUpload')}</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {importResult && (
              <div className="bg-border dark:bg-zinc-800 p-4 rounded-lg">
                <h3 className="text-base font-medium mb-2">{t('importResults')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{t('created')}:</span>
                    <span className="font-medium">{importResult.criados}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('updated')}:</span>
                    <span className="font-medium">{importResult.atualizados}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('skipped')}:</span>
                    <span className="font-medium">{importResult.ignorados}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('errors')}:</span>
                    <span className="font-medium">{importResult.erros}</span>
                  </div>
                </div>
                {importResult.erros > 0 && (
                  <Button
                    className="mt-3 w-full inline-flex items-center gap-2"
                    variant="danger-soft"
                    size="sm"
                    onPress={() => setShowErrorDetails(true)}
                  >
                    <AlertTriangleIcon size={16} />
                    {t('viewErrors')}
                  </Button>
                )}
              </div>
            )}
          </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {showErrorDetails && importResult && importResult.detalhesErros?.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden border border-border">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold">{t('errorsTitle')}</h3>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => setShowErrorDetails(false)}
              >
                <XIcon size={20} />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
              {importResult.detalhesErros.map((error, index) => (
                <div
                  key={index}
                  className="bg-danger-50 dark:bg-danger-900/20 p-3 rounded-lg border border-danger-200 dark:border-danger-800"
                >
                  <div className="font-medium text-danger-800 dark:text-danger-200">
                    {error.nome || 'N/A'}
                  </div>
                  <div className="text-sm text-danger-700 dark:text-danger-300 mt-1">
                    {error.reason}
                  </div>
                  {error.linha && (
                    <div className="text-xs text-danger-600 dark:text-danger-400 mt-1">
                      Line: {error.linha}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <Button
                className="w-full"
                variant="primary"
                onPress={() => setShowErrorDetails(false)}
              >
                {t('close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
