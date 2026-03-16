# HeroUI globals.css Refinement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine HeroUI v3 color variables for better contrast and add targeted `@layer components` overrides + utility classes in `globals.css`.

**Architecture:** Single-file edit to `src/app/globals.css`. Adjusts oklch lightness values for better contrast hierarchy, then adds targeted component overrides and new utility classes in `@layer components`.

**Tech Stack:** Tailwind CSS 4, HeroUI v3 beta 6, oklch color space

**Spec:** `docs/superpowers/specs/2026-03-16-heroui-globals-css-refinement-design.md`

---

## File Structure

- Modify: `src/app/globals.css` (the only file)

The file has 3 sections to modify:
1. `:root` / `.light` block (lines 30-72) — light mode variables
2. `.dark` block (lines 74-112) — dark mode variables
3. `@layer components` block (lines 5-13) — expand with overrides + utilities

---

## Chunk 1: Color Variable Refinements

### Task 1: Update Light Mode Color Variables

**Files:**
- Modify: `src/app/globals.css:30-72`

- [ ] **Step 1: Update light mode variables**

In the `:root, .light, .default, [data-theme="light"], [data-theme="default"]` block, change these values:

```css
  --background: oklch(98.00% 0.0165 257.28);       /* was 97.02% */
  --default: oklch(92.00% 0.0165 257.28);           /* was 94.00% */
  --field-background: oklch(94.00% 0.0132 257.28);  /* was 95.24% */
  --field-placeholder: oklch(52.00% 0.0330 257.28); /* was 55.17% */
  --muted: oklch(50.00% 0.0330 257.28);             /* was 55.17% */
```

All other light mode values remain unchanged.

- [ ] **Step 2: Verify the app renders in light mode**

Run: `bun dev`
Open `http://localhost:3000` and visually check:
- Background is slightly lighter
- Form fields have visible affordance against background
- Muted text is readable but clearly secondary
- Chips/default elements are distinct from background

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: refine light mode color variables for better contrast"
```

---

### Task 2: Update Dark Mode Color Variables

**Files:**
- Modify: `src/app/globals.css:74-112`

- [ ] **Step 1: Update dark mode variables**

In the `.dark, [data-theme="dark"]` block, change these values:

```css
  --background: oklch(10.00% 0.0165 257.28);                /* was 12.00% */
  --border: oklch(35.00% 0.0165 257.28);                    /* was 28.00% */
  --default: oklch(33.00% 0.0165 257.28);                   /* was 27.40% */
  --field-background: oklch(20.00% 0.0248 257.28);          /* was 25.70% */
  --muted: oklch(65.00% 0.0330 257.28);                     /* was 70.50% */
  --scrollbar: oklch(65.00% 0.0165 257.28);                 /* was 70.50% — match muted */
  --separator: oklch(28.00% 0.0165 257.28);                 /* was 25.00% */
  --surface: oklch(18.00% 0.0330 257.28);                   /* was 21.03% */
  --surface-secondary: oklch(24.00% 0.0248 257.28);         /* was 25.70% */
  --surface-tertiary: oklch(29.00% 0.0248 257.28);          /* was 27.21% */
```

**Note:** `--field-background` and `--scrollbar` are not in the spec but are adjusted here for consistency — field-background needs to sit between the new background (10%) and surface (18%), and scrollbar should match muted for visual coherence.

All other dark mode values remain unchanged (accent, danger, success, warning, foregrounds, etc.).

- [ ] **Step 2: Verify the app renders in dark mode**

Run: `bun dev`
Toggle to dark mode and visually check:
- Clear layer hierarchy: background → surface → surface-secondary → surface-tertiary
- Borders are clearly visible against surfaces
- Separators are subtler than borders
- Default (buttons/chips) stands out from surface backgrounds
- Muted text is still readable

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: refine dark mode color variables for better contrast and layer separation"
```

---

## Chunk 2: @layer components — Targeted Overrides + Utilities

### Task 3: Expand Accordion Overrides and Add Component Overrides

**Files:**
- Modify: `src/app/globals.css:5-13`

**Note:** The class names below (`.card`, `.button`, `.tabs__trigger`, etc.) match HeroUI v3's rendered DOM class names. Since `globals.css` imports `@heroui/styles` first (line 2), our `@layer components` block comes after in source order and takes precedence for the targeted properties we override.

- [ ] **Step 1: Replace the existing `@layer components` block**

Replace the entire `@layer components { ... }` block (lines 5-13) with:

```css
@layer components {
  /* ===========================
   * Accordion
   * =========================== */
  .accordion {
    @apply bg-background-secondary;
  }

  .accordion__trigger {
    @apply cursor-pointer transition-colors duration-150;
  }

  .accordion__trigger:hover {
    background-color: var(--surface-tertiary);
  }

  .accordion__item + .accordion__item {
    border-top: 1px solid var(--separator);
  }

  .accordion__content {
    @apply px-4 pb-4;
  }

  /* ===========================
   * Card — subtle border + shadow refinement
   * =========================== */
  .card {
    border: 1px solid var(--border);
    box-shadow: 0 1px 3px 0 oklch(0% 0 0 / 0.06), 0 1px 2px -1px oklch(0% 0 0 / 0.06);
  }

  /* ===========================
   * Modal / AlertDialog — consistent spacing
   * =========================== */
  .modal__header {
    @apply mb-4;
  }

  .modal__icon {
    background-color: var(--default);
    color: var(--foreground);
  }

  .alert-dialog__icon--danger {
    background-color: oklch(from var(--danger) l c h / 0.15);
    color: var(--danger);
  }

  /* ===========================
   * Chip — soft color variant refinements
   * =========================== */
  .chip--success.chip--soft {
    background-color: oklch(from var(--success) l c h / 0.15);
    color: var(--success);
  }

  .chip--danger.chip--soft {
    background-color: oklch(from var(--danger) l c h / 0.15);
    color: var(--danger);
  }

  .chip--warning.chip--soft {
    background-color: oklch(from var(--warning) l c h / 0.15);
    color: var(--warning);
  }

  /* ===========================
   * Button — focus ring consistency
   * =========================== */
  .button:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .button:disabled,
  .button[aria-disabled="true"] {
    @apply opacity-50 cursor-not-allowed;
  }

  /* ===========================
   * TextField / Input — focus ring consistency
   * =========================== */
  .input:focus-visible,
  .text-area:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: -1px;
  }

  .select__trigger:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: -1px;
  }

  /* ===========================
   * Tabs — active state refinement
   * =========================== */
  .tabs__trigger {
    @apply transition-colors duration-150;
    color: var(--muted);
  }

  .tabs__trigger:hover {
    color: var(--foreground);
  }

  .tabs__trigger[data-selected] {
    color: var(--foreground);
    border-bottom-color: var(--accent);
  }

  /* ===========================
   * Toast — status-colored left border
   * =========================== */
  .toast--success {
    border-left: 3px solid var(--success);
  }

  .toast--danger {
    border-left: 3px solid var(--danger);
  }

  .toast--warning {
    border-left: 3px solid var(--warning);
  }

  /* ===========================
   * Utility Classes
   * =========================== */
  .page-header {
    @apply flex items-center justify-between pb-4 mb-6 border-b;
    border-color: var(--separator);
  }

  .form-grid {
    @apply grid grid-cols-1 sm:grid-cols-2 gap-4;
  }

  .status-badge {
    @apply inline-flex items-center gap-1.5 text-xs font-medium;
  }

  .status-badge__dot {
    @apply size-2 rounded-full;
    background-color: currentColor;
  }

  .content-empty {
    @apply flex flex-col items-center justify-center py-12 text-center;
    color: var(--muted);
  }
}
```

- [ ] **Step 2: Verify the app builds without CSS errors**

Run: `bun dev`
Check the terminal for any Tailwind/PostCSS compilation errors.

- [ ] **Step 3: Visual verification**

Open `http://localhost:3000` and check:
- Accordion items have separator between them, trigger has hover state
- Cards have visible border
- Modals have consistent header spacing
- Buttons/inputs show focus ring on keyboard navigation (Tab key)
- Tabs show accent underline on active tab

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add targeted HeroUI component overrides and utility classes"
```

---

## Chunk 3: Final Verification

### Task 4: Full Visual QA

- [ ] **Step 1: Check light mode pages**

Navigate through:
- Login page (buttons, inputs, cards)
- Dashboard (tabs, chips, data tables)
- Any modal (open one, check spacing/icon)
- Settings page (accordion, form fields)

- [ ] **Step 2: Check dark mode pages**

Same pages in dark mode. Specifically verify:
- Layer hierarchy is visible (background < surface < surface-secondary)
- Borders are clearly visible
- Text contrast is readable everywhere
- Chips have visible soft background colors

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add src/app/globals.css
git commit -m "style: fix visual QA issues in globals.css refinement"
```
