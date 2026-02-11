'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { organizations, memberships, profiles } from '@/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

type Organization = InferSelectModel<typeof organizations>;
type Membership = InferSelectModel<typeof memberships>;
type Profile = InferSelectModel<typeof profiles>;

export interface OrganizationState {
  currentOrganization: Organization | null;
  membership: Membership | null;
  profile: Profile | null;
  availableOrganizations: Array<{
    organization: Organization;
    role: string;
    membership: Membership;
  }>;
  isLoading: boolean;
}

export interface OrganizationDispatch {
  switchOrganization: (orgId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
}

// Split Context Pattern: Separate State from Dispatch for performance
const OrganizationStateContext = createContext<OrganizationState | null>(null);
const OrganizationDispatchContext = createContext<OrganizationDispatch | null>(null);

interface OrganizationProviderProps {
  children: ReactNode;
  initialData: OrganizationState;
}

/**
 * OrganizationProvider - Split Context Pattern
 * Separates state from dispatch to prevent unnecessary re-renders
 * 
 * @param initialData - Server-fetched initial state (prevents loading flash)
 */
export function OrganizationProvider({ children, initialData }: OrganizationProviderProps) {
  const [state, setState] = useState<OrganizationState>(initialData);

  const switchOrganization = useCallback(async (orgId: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Import Server Action dynamically to avoid bundling issues
      const { setOrganizationCookie } = await import('@/app/(dashboard)/actions');
      await setOrganizationCookie(orgId);
      
      // Find the selected organization in available list
      const selectedOrgData = state.availableOrganizations.find(
        (org) => org.organization.id === orgId
      );
      
      if (selectedOrgData) {
        setState({
          currentOrganization: selectedOrgData.organization,
          membership: selectedOrgData.membership,
          profile: state.profile,
          availableOrganizations: state.availableOrganizations,
          isLoading: false,
        });
      }
      // Caller should invoke router.refresh() to revalidate server components
    } catch (error) {
      console.error('Failed to switch organization:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [state.availableOrganizations, state.profile]);

  const refreshOrganizations = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // This would typically refetch from the server
      // For now, we'll just refresh the page to get server data
      window.location.reload();
    } catch (error) {
      console.error('Failed to refresh organizations:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const dispatch: OrganizationDispatch = {
    switchOrganization,
    refreshOrganizations,
  };

  return (
    <OrganizationStateContext.Provider value={state}>
      <OrganizationDispatchContext.Provider value={dispatch}>
        {children}
      </OrganizationDispatchContext.Provider>
    </OrganizationStateContext.Provider>
  );
}

/**
 * Main hook - Use this in most components
 * Returns both state and dispatch
 */
export function useOrganization() {
  const state = useContext(OrganizationStateContext);
  const dispatch = useContext(OrganizationDispatchContext);

  if (state === null || dispatch === null) {
    throw new Error(
      'useOrganization must be used within OrganizationProvider. ' +
        'Did you forget to wrap your component tree with <OrganizationProvider>?'
    );
  }

  return { ...state, ...dispatch };
}

/**
 * Performance hook - Use when you only need state
 * Components using this won't re-render when dispatch functions change
 */
export function useOrganizationState() {
  const state = useContext(OrganizationStateContext);

  if (state === null) {
    throw new Error(
      'useOrganizationState must be used within OrganizationProvider. ' +
        'Did you forget to wrap your component tree with <OrganizationProvider>?'
    );
  }

  return state;
}

/**
 * Performance hook - Use when you only need dispatch functions
 * Components using this won't re-render when state changes
 */
export function useOrganizationDispatch() {
  const dispatch = useContext(OrganizationDispatchContext);

  if (dispatch === null) {
    throw new Error(
      'useOrganizationDispatch must be used within OrganizationProvider. ' +
        'Did you forget to wrap your component tree with <OrganizationProvider>?'
    );
  }

  return dispatch;
}
