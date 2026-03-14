---
name: add-i18n-strings
description: Add translations to messages/pt.json following project conventions. Use when adding new UI text, labels, or messages in the app.
---

# Adding i18n Strings

## Rule

**NO hardcoded user-facing strings.** Use `useTranslations` or `getTranslations`.

## Update ONLY `messages/pt.json`

### Key Structure

Use nested keys like `"Shipments.List.title"`:

```json
{
  "Shipments": {
    "List": {
      "title": "Lista de Envios",
      "empty": "Nenhum envio encontrado"
    },
    "Detail": {
      "status": "Status"
    }
  }
}
```

## Where to Add

1. Add to `messages/pt.json` at the appropriate path
2. Use PascalCase for component names, camelCase for keys
3. Group by feature: `Auth`, `Shipments`, `Products`, etc.

## Usage in Components

### Client Components

```tsx
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('Shipments.List');
  return <h1>{t('title')}</h1>;
}
```

### Server Components

```tsx
import { getTranslations } from 'next-intl/server';

export async function MyServerComponent() {
  const t = await getTranslations('Shipments.List');
  return <h1>{t('title')}</h1>;
}
```

### With Variables

```json
"resendButton": {
  "waiting": "Aguarde {seconds}s",
  "ready": "Reenviar email"
}
```

```tsx
t('resendButton.waiting', { seconds: 30 })
```

## Checklist

- [ ] String added to `messages/pt.json`
- [ ] Key follows `Feature.Section.key` pattern
- [ ] Component uses `useTranslations` or `getTranslations`
- [ ] No hardcoded Portuguese/English text in JSX
