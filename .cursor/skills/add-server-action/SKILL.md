---
name: add-server-action
description: Advanced Server Actions with Zod, useActionState, ownership-based security (IDOR prevention), and redirect/UX patterns. Use when adding forms, mutations, or server-side logic.
---

# Adding Server Actions (Best Practices)

## Safety First

- **Auth:** Use `requireAuthOrRedirect()` or `requireAuth()` first.
- **Authorization (IDOR prevention):** Authentication is NOT enough. Always verify the user owns or has access to the record being mutated.
  - Multi-tenant: `const access = await getOrganizationById(record.organizationId, user.id); if (!access) return { error: "Forbidden" };`
  - User-owned: `if (record.userId !== user.id) return { error: "Forbidden" };`
- **Try/Catch:** Wrap service calls in `try/catch`. Return `{ error: "Friendly message" }` on failure.

## Redirects & Transitions (CRITICAL)

- **ALWAYS call `redirect()` OUTSIDE of `try/catch` blocks.** Next.js throws internally to perform redirects; if caught, the redirect fails.
- For better UX, suggest `useOptimistic` in the component when relevant.

## Location

- Global: `src/app/actions/*.ts`
- Route-specific: `(dashboard)/.../actions.ts` or `(admin)/.../actions.ts`

## Implementation Pattern

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAuthOrRedirect } from '@/services/auth.service';
import { getOrganizationById } from '@/services/organization.service';

const mySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(1),
});

export interface MyActionResult {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function myAction(
  prevState: MyActionResult | null,
  formData: FormData
): Promise<MyActionResult> {
  const user = await requireAuthOrRedirect();

  const validated = mySchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validated.success) {
    const { fieldErrors } = validated.error.flatten();
    return { fieldErrors };
  }

  let targetPath = '';

  try {
    const access = await getOrganizationById(
      validated.data.organizationId,
      user.id
    );
    if (!access) return { error: 'Acesso negado à organização' };

    const record = await service.getById(validated.data.id);
    if (record.organizationId !== validated.data.organizationId) {
      return { error: 'Forbidden' };
    }

    await service.update(validated.data);
    targetPath = `/dashboard/${record.id}`;
  } catch {
    return { error: 'Operação falhou. Tente novamente.' };
  }

  revalidatePath(targetPath);
  redirect(targetPath);
}
```

## Error Formatting (Zod)

Use `validated.error.flatten().fieldErrors` instead of manual loops:

```ts
if (!validated.success) {
  const { fieldErrors } = validated.error.flatten();
  return { fieldErrors };
}
```

`fieldErrors` is `Record<string, string[]>`. For display, use `state.fieldErrors?.fieldName?.[0]`.

## Form Integration (useActionState)

```tsx
import { useActionState } from 'react';

const [state, formAction, isPending] = useActionState(myAction, null);

<form action={formAction}>
  <input name="name" aria-describedby={state?.fieldErrors?.name ? 'name-error' : undefined} />
  {state?.fieldErrors?.name?.[0] && (
    <p id="name-error" role="alert">{state.fieldErrors.name[0]}</p>
  )}
  {state?.error && <p role="alert">{state.error}</p>}
  <button type="submit" disabled={isPending}>Submit</button>
</form>
```

## Form Patterns

- **SubmitButton:** Use a dedicated component with `useFormStatus` to show loading states/spinners automatically.
- **Feedback:** Use `state.fieldErrors` with `aria-describedby` to link errors to inputs for accessibility.
- **Optimistic updates:** Use `useOptimistic` when the action updates a list (e.g., add/remove items) for instant UI feedback.

## Revalidation

- `revalidatePath('/path')` for specific routes
- Prefer `revalidateTag('tag')` over `revalidatePath` when using heavy data-fetching with `fetch(..., { next: { tags: ['tag'] } })`

## Conventions

- Action names: verbs — `createProduct`, `updateSettings`, `deleteInvoice`
- Keep actions thin — delegate to services in `src/services/*.ts`
- Use `lucide-react` icons
