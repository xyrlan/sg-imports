# HeroUI v3 globals.css Refinement

**Date:** 2026-03-16
**Approach:** Incremental refinement of existing color variables + comprehensive `@layer components`

## Goal

Improve the HeroUI v3 styling configuration in `globals.css` by:
1. Refining oklch color values for better contrast and legibility
2. Adding `@layer components` with styles for all HeroUI components used in the project + utility classes
3. Improving dark mode layer separation and text contrast

## Scope

- **Only file changed:** `src/app/globals.css`
- **No changes to:** React components, tailwind config, or component files in `src/components/ui/`
- **No new CSS variables** — only refine existing values

---

## 1. Color Variable Refinements

### Light Mode

| Variable | Current | Proposed | Reason |
|---|---|---|---|
| `--background` | 97.02% L | 98.00% L | More headroom for layer separation |
| `--default` | 94.00% L | 92.00% L | Better separation from background |
| `--muted` | 55.17% L | 50.00% L | Better contrast against light backgrounds |
| `--field-placeholder` | 55.17% L | 52.00% L | Better contrast for placeholder text |
| `--field-background` | 95.24% L | 96.50% L | Closer to background, less muddy |

### Dark Mode

| Variable | Current | Proposed | Reason |
|---|---|---|---|
| `--background` | 12.00% L | 10.00% L | Darker base for more layer headroom |
| `--surface` | 21.03% L | 18.00% L | Better separation from secondary |
| `--surface-secondary` | 25.70% L | 24.00% L | Fine-tuned |
| `--surface-tertiary` | 27.21% L | 29.00% L | Better separation from secondary |
| `--default` | 27.40% L | 30.00% L | Stands out more from surfaces |
| `--border` | 28.00% L | 32.00% L | More visible borders |
| `--separator` | 25.00% L | 30.00% L | More visible separators |
| `--muted` | 70.50% L | 65.00% L | Slightly subtler but still legible |

All changes maintain the same hue (257.28) and chroma values — only lightness is adjusted.

---

## 2. `@layer components` — Full Component Styles

### HeroUI Components (14)

#### Button (`.button`)
- Base: transition-colors, font-medium, inline-flex, items-center, justify-center
- `--primary`: accent bg, accent-foreground text, hover darken
- `--outline`: transparent bg, border, hover bg-default
- `--ghost`: transparent bg, no border, hover bg-default
- `--secondary`: default bg, foreground text, hover darken
- `--danger`: danger bg, danger-foreground text, hover darken
- `--tertiary`: transparent bg, muted text, hover foreground text
- `--icon-only`: rounded-lg, aspect-square
- Disabled: opacity-50, cursor-not-allowed

#### TextField / Input (`.text-field`, `.input`)
- `.text-field`: flex flex-col gap-1
- `.input`: field-background bg, field-foreground text, field-border border, field-radius rounded, focus ring with --focus
- `.input::placeholder`: field-placeholder color
- `.label`: foreground text, font-medium, text-sm
- `.field-error`: danger text, text-xs

#### Select (`.select`)
- `.select__trigger`: same styling as input (consistent form fields)
- `.select__popover`: overlay bg, border, shadow-lg, rounded
- `.select__item`: hover bg-default, padding, rounded

#### Card (`.card`)
- Base: surface bg, surface-foreground text, border, rounded, overflow-hidden
- `.card__header`: padding, border-bottom separator
- `.card__content`: padding
- `.card__footer`: padding, border-top separator

#### Modal (`.modal`)
- `.modal__backdrop`: overlay with opacity
- `.modal__dialog`: overlay bg, border, shadow-xl, rounded-lg, max-w-lg
- `.modal__header`: padding-bottom, flex gap
- `.modal__body`: padding
- `.modal__footer`: padding-top, flex gap, justify-end

#### AlertDialog (`.alert-dialog`)
- Same structure as modal
- `.alert-dialog__icon--danger`: danger bg/text

#### Chip (`.chip`)
- Base: inline-flex, items-center, rounded-full, text-xs, font-medium, padding
- `--success`: success/10 bg, success text
- `--danger`: danger/10 bg, danger text
- `--warning`: warning/10 bg, warning text
- `--default`: default bg, default-foreground text

#### Dropdown (`.dropdown`)
- `.dropdown__popover`: overlay bg, border, shadow-lg, rounded
- `.dropdown__item`: hover bg-default, padding, rounded, cursor-pointer
- `.dropdown__item--danger`: danger text

#### Tabs (`.tabs`)
- `.tabs__list`: border-bottom separator, flex gap
- `.tabs__trigger`: padding, muted text, border-bottom-2 transparent
- `.tabs__trigger--active`: foreground text, border-bottom accent

#### Accordion (`.accordion`)
- Refine existing: surface-secondary bg
- `.accordion__trigger`: cursor-pointer, padding, hover bg-surface-tertiary
- `.accordion__item`: border-bottom separator
- `.accordion__content`: padding

#### Avatar (`.avatar`)
- Base: rounded-full, overflow-hidden, flex items-center justify-center
- `.avatar__fallback`: default bg, default-foreground text, font-medium

#### Spinner (`.spinner`)
- Uses existing --animate-spin-fast

#### Skeleton (`.skeleton`)
- Base: default bg, rounded, animate-pulse

#### Toast (`.toast`)
- `.toast--success`: success/10 bg, success border-left
- `.toast--danger`: danger/10 bg, danger border-left
- `.toast--warning`: warning/10 bg, warning border-left

### Utility Classes (4)

#### `.page-header`
- flex items-center justify-between, padding-bottom, margin-bottom, border-bottom separator

#### `.form-grid`
- grid, grid-cols-1, sm:grid-cols-2, gap-4

#### `.status-badge`
- inline-flex, items-center, gap-1.5, text-xs
- `.status-badge__dot`: w-2, h-2, rounded-full, current-color bg

#### `.empty-state`
- flex flex-col, items-center, justify-center, padding, muted text, text-center

---

## 3. Design Principles

- All colors via `var(--xxx)` — no hardcoded values
- Smooth transitions: `transition-colors duration-150`
- Consistent focus ring: `ring-2 ring-offset-2` using `--focus`
- WCAG AA minimum contrast between text and background
- Component hierarchy through lightness separation:
  - Light: background (98%) > field-background (96.5%) > default (92%)
  - Dark: background (10%) < surface (18%) < surface-secondary (24%) < surface-tertiary (29%)
