'use client';

import { useActionState, useEffect } from 'react';

type ActionResult = { ok?: boolean; error?: string } | null;

type ActionFn<TState extends ActionResult> = (
  state: TState,
  formData: FormData,
) => Promise<TState>;

interface UseActionModalOptions<TState extends ActionResult> {
  action: ActionFn<TState>;
  onSuccess?: () => void;
}

export function useActionModal<TState extends ActionResult = ActionResult>({
  action,
  onSuccess,
}: UseActionModalOptions<TState>) {
  const [state, formAction, isPending] = useActionState(action, null as unknown as Awaited<TState>);

  useEffect(() => {
    if (state?.ok && !isPending) {
      queueMicrotask(() => onSuccess?.());
    }
  }, [state?.ok, isPending, onSuccess]);

  return { state, formAction, isPending };
}
