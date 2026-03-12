'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { quotes } from '@/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

type Quote = InferSelectModel<typeof quotes>;

export interface ProformaQuoteState {
  currentQuote: Quote | null;
  availableQuotes: Quote[];
  isLoading: boolean;
}

export interface ProformaQuoteDispatch {
  switchProformaQuote: (quoteId: string | null) => Promise<void>;
  refreshProformaQuotes: () => Promise<void>;
}

const ProformaQuoteStateContext = createContext<ProformaQuoteState | null>(null);
const ProformaQuoteDispatchContext = createContext<ProformaQuoteDispatch | null>(null);

interface ProformaQuoteProviderProps {
  children: ReactNode;
  initialData: ProformaQuoteState;
}

/**
 * ProformaQuoteProvider - Split Context Pattern
 * Manages the selected PROFORMA quote for SELLER/ADMIN users.
 * Persists selection via cookie (same pattern as organization).
 */
export function ProformaQuoteProvider({ children, initialData }: ProformaQuoteProviderProps) {
  const [state, setState] = useState<ProformaQuoteState>(initialData);

  // Sync state when initialData changes (e.g. after router.refresh() from create/delete)
  useEffect(() => {
    setState(initialData);
  }, [initialData]);

  const switchProformaQuote = useCallback(async (quoteId: string | null) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { setProformaQuoteCookie } = await import('@/app/(dashboard)/actions');
      await setProformaQuoteCookie(quoteId);

      const selectedQuote =
        quoteId === null
          ? null
          : state.availableQuotes.find((q) => q.id === quoteId) ?? null;

      setState({
        currentQuote: selectedQuote,
        availableQuotes: state.availableQuotes,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to switch proforma quote:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [state.availableQuotes]);

  const refreshProformaQuotes = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      window.location.reload();
    } catch (error) {
      console.error('Failed to refresh proforma quotes:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const dispatch: ProformaQuoteDispatch = {
    switchProformaQuote,
    refreshProformaQuotes,
  };

  return (
    <ProformaQuoteStateContext.Provider value={state}>
      <ProformaQuoteDispatchContext.Provider value={dispatch}>
        {children}
      </ProformaQuoteDispatchContext.Provider>
    </ProformaQuoteStateContext.Provider>
  );
}

export function useProformaQuote() {
  const state = useContext(ProformaQuoteStateContext);
  const dispatch = useContext(ProformaQuoteDispatchContext);

  if (state === null || dispatch === null) {
    throw new Error(
      'useProformaQuote must be used within ProformaQuoteProvider. ' +
        'Did you forget to wrap your component tree with <ProformaQuoteProvider>?'
    );
  }

  return { ...state, ...dispatch };
}

export function useProformaQuoteState() {
  const state = useContext(ProformaQuoteStateContext);

  if (state === null) {
    throw new Error(
      'useProformaQuoteState must be used within ProformaQuoteProvider. ' +
        'Did you forget to wrap your component tree with <ProformaQuoteProvider>?'
    );
  }

  return state;
}

export function useProformaQuoteDispatch() {
  const dispatch = useContext(ProformaQuoteDispatchContext);

  if (dispatch === null) {
    throw new Error(
      'useProformaQuoteDispatch must be used within ProformaQuoteProvider. ' +
        'Did you forget to wrap your component tree with <ProformaQuoteProvider>?'
    );
  }

  return dispatch;
}
 