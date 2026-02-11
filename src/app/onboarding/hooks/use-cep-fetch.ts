import { useState } from 'react';
import { fetchCEPData } from '../actions';

interface AddressData {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

interface UseCepFetchProps {
  onSuccess?: (data: AddressData) => void;
}

export function useCepFetch({ onSuccess }: UseCepFetchProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCEP = async (cep: string, errorMessages: { notFound: string; fetchError: string }) => {
    setError(null);
    setIsLoading(true);

    try {
      const data = await fetchCEPData(cep);

      if (!data) {
        setError(errorMessages.notFound);
        setIsLoading(false);
        return;
      }

      if (onSuccess) {
        onSuccess(data);
      }

      setIsLoading(false);
    } catch {
      setError(errorMessages.fetchError);
      setIsLoading(false);
    }
  };

  return {
    fetchCEP,
    isLoading,
    error,
  };
}
