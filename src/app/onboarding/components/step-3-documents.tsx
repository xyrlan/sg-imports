'use client';

import { Button } from '@heroui/react';
import { FormError } from '@/components/ui/form-error';
import { FileUpload } from '@/components/ui/file-upload';
import { useFileUpload } from '../hooks/use-file-upload';

interface Step3DocumentsProps {
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  error?: string;
  onBack: () => void;
  translations: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  role: string;
  isPendingTransition?: boolean;
  profileHasDocuments?: boolean;
}

export function Step3Documents({
  onSubmit,
  isPending,
  error,
  onBack,
  translations: t,
  role,
  isPendingTransition = false,
  profileHasDocuments = false,
}: Step3DocumentsProps) {
  const { files, setFile, errors, validateFiles } = useFileUpload();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateFiles(role, profileHasDocuments)) {
      return;
    }

    const formData = new FormData();

    if (files.documentPhoto) {
      formData.append('documentPhoto', files.documentPhoto);
    }
    if (files.addressProof) {
      formData.append('addressProof', files.addressProof);
    }
    if (files.socialContract && role !== 'SELLER') {
      formData.append('socialContract', files.socialContract);
    }

    onSubmit(formData);
  };

  const isSeller = role === 'SELLER';
  const showOnlySocialContract = profileHasDocuments && !isSeller;

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{t('Step4.title')}</h2>
        <p className="text-sm text-muted">{t('Step4.description')}</p>
      </div>

      <FormError message={error} variant="danger" />

      <div className="space-y-6">
        {!showOnlySocialContract && (
          <>
            <FileUpload
              label={t('Step4.documentPhoto')}
              name="documentPhoto"
              helpText={t('Step4.documentPhotoHelp')}
              acceptedFormats={t('Step4.acceptedFormats')}
              onFileSelect={(file) => setFile('documentPhoto', file)}
              error={errors.documentPhoto}
              disabled={isPending}
              required
            />
            <FileUpload
              label={t('Step4.addressProof')}
              name="addressProof"
              helpText={t('Step4.addressProofHelp')}
              acceptedFormats={t('Step4.acceptedFormats')}
              onFileSelect={(file) => setFile('addressProof', file)}
              error={errors.addressProof}
              disabled={isPending}
              required
            />
          </>
        )}

        {!isSeller && (
          <FileUpload
            label={t('Step4.socialContract')}
            name="socialContract"
            helpText={t('Step4.socialContractHelp')}
            acceptedFormats={t('Step4.acceptedFormats')}
            onFileSelect={(file) => setFile('socialContract', file)}
            error={errors.socialContract}
            disabled={isPending}
            required
          />
        )}

        <div className="p-4 bg-accent/10 rounded-lg">
          <p className="text-sm text-foreground">
            {t('Step4.uploadInfo') || 'Todos os documentos serão armazenados de forma segura e criptografada.'}
          </p>
        </div>
      </div>

      <div className="flex justify-between gap-3 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          isDisabled={isPending || isPendingTransition}
          size="lg"
        >
          {t('back')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          isDisabled={isPending || isPendingTransition}
          size="lg"
        >
          {isPending || isPendingTransition ? t('loading') : t('finish')}
        </Button>
      </div>
    </form>
  );
}
