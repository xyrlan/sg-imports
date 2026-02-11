import { useState } from 'react';

interface FileValidationError {
  [key: string]: string;
}

interface UseFileUploadReturn {
  files: {
    documentPhoto: File | null;
    addressProof: File | null;
    socialContract: File | null;
  };
  setFile: (key: 'documentPhoto' | 'addressProof' | 'socialContract', file: File | null) => void;
  errors: FileValidationError;
  validateFiles: (role: string, profileHasDocuments?: boolean) => boolean;
  resetFiles: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function useFileUpload(): UseFileUploadReturn {
  const [files, setFiles] = useState<{
    documentPhoto: File | null;
    addressProof: File | null;
    socialContract: File | null;
  }>({
    documentPhoto: null,
    addressProof: null,
    socialContract: null,
  });

  const [errors, setErrors] = useState<FileValidationError>({});

  const validateFile = (file: File | null, fieldName: string, isRequired: boolean): string | null => {
    if (!file && isRequired) {
      return 'Este documento é obrigatório';
    }

    if (!file) {
      return null;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'Arquivo muito grande. Tamanho máximo: 10MB';
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Tipo de arquivo não permitido. Use PDF, JPG, PNG ou WebP';
    }

    return null;
  };

  const setFile = (
    key: 'documentPhoto' | 'addressProof' | 'socialContract',
    file: File | null
  ) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
    
    // Clear error for this field when file is selected
    if (file) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validateFiles = (role: string, profileHasDocuments = false): boolean => {
    const newErrors: FileValidationError = {};

    const requiresProfileDocs = !profileHasDocuments;
    const documentPhotoError = validateFile(
      files.documentPhoto,
      'documentPhoto',
      requiresProfileDocs
    );
    if (documentPhotoError) {
      newErrors.documentPhoto = documentPhotoError;
    }

    const addressProofError = validateFile(
      files.addressProof,
      'addressProof',
      requiresProfileDocs
    );
    if (addressProofError) {
      newErrors.addressProof = addressProofError;
    }

    const socialContractRequired = role !== 'SELLER';
    const socialContractError = validateFile(
      files.socialContract,
      'socialContract',
      socialContractRequired
    );
    if (socialContractError) {
      newErrors.socialContract = socialContractError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetFiles = () => {
    setFiles({
      documentPhoto: null,
      addressProof: null,
      socialContract: null,
    });
    setErrors({});
  };

  return {
    files,
    setFile,
    errors,
    validateFiles,
    resetFiles,
  };
}
