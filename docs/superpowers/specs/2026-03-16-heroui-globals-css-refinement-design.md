# HeroUI v3 globals.css Refinement

**Date:** 2026-03-16
**Approach:** Incremental refinement of existing color variables + targeted `@layer components` overrides

## Goal

Improve the HeroUI v3 styling configuration in `globals.css` by:
1. Refining oklch color values for better contrast and legibility
2. Adding targeted `@layer components` overrides for HeroUI components + new utility classes
3. Improving dark mode layer separation and text contrast

## Scope

- **Only file changed:** `src/app/globals.css`
- **No changes to:** React components, tailwind config, or component files in `src/components/ui/`
- **No new CSS variables** — only refine existing values

## Important Constraint: HeroUI CSS Architecture

HeroUI v3 already ships full component CSS in `@layer components` with class names like `.button`, `.card`, `.modal`, etc. (via `@import "@heroui/styles"`). To avoid cascade collisions:

- **DO NOT** redefine full component styles that HeroUI already provides
- **DO** use targeted overrides for specific properties that need adjustment
- **DO** add new utility classes that don't conflict with HeroUI's class names
- **DO** use the existing accordion override pattern (already in globals.css) as the model

---

## 1. Color Variable Refinements

### Light Mode

| Variable | Current | Proposed | Reason |
|---|---|---|---|
| `--background` | 97.02% L | 98.00% L | More headroom for layer separation |
| `--default` | 94.00% L | 92.00% L | Better separation from background |
| `--muted` | 55.17% L | 50.00% L | Better contrast against light backgrounds |
| `--field-placeholder` | 55.17% L | 52.00% L | Better contrast for placeholder text |
| `--field-background` | 95.24% L | 94.00% L | Stronger field affordance against background |

### Dark Mode

| Variable | Current | Proposed | Reason |
|---|---|---|---|
| `--background` | 12.00% L | 10.00% L | Darker base for more layer headroom |
| `--surface` | 21.03% L | 18.00% L | Better separation from secondary |
| `--surface-secondary` | 25.70% L | 24.00% L | Fine-tuned |
| `--surface-tertiary` | 27.21% L | 29.00% L | Better separation from secondary |
| `--default` | 27.40% L | 33.00% L | Stands out from surfaces for interactive elements |
| `--border` | 28.00% L | 35.00% L | More visible borders |
| `--separator` | 25.00% L | 28.00% L | More visible but distinct from borders (7% gap) |
| `--muted` | 70.50% L | 65.00% L | Slightly subtler but still legible |

**Dark mode hierarchy (proposed):**
- background (10%) < surface (18%) < surface-secondary (24%) < separator (28%) < surface-tertiary (29%) < default (33%) < border (35%)

All changes maintain the same hue (257.28) and chroma values — only lightness is adjusted.

---

## 2. `@layer components` — Targeted Overrides + Utilities

### Strategy

Since HeroUI already defines base component styles, we only override **specific properties** that need customization. We do NOT redefine full component styles.

### Targeted Component Overrides

#### Accordion (existing, refine)
- `.accordion`: keep `bg-background-secondary`
- `.accordion__trigger`: add hover state with surface-tertiary bg, transition
- `.accordion__item`: border-bottom using separator
- `.accordion__content`: consistent padding

#### Card
- `.card`: subtle border with border color, refined shadow

#### Modal / AlertDialog
- `.modal__header`: consistent spacing
- `.modal__icon`: themed bg/text colors

#### Chip (color variant refinements)
- Ensure soft variants use proper opacity backgrounds (e.g., success/15, danger/15)

#### Button
- Focus ring consistency using `--focus` variable
- Disabled state opacity refinement

#### TextField / Input
- Focus ring using `--focus` for consistency across all form fields

#### Tabs
- Active tab border using accent color
- Inactive tab muted text contrast improvement

#### Toast
- Status-colored left border for success/danger/warning variants

### New Utility Classes (4)

These are **new classes** that don't collide with HeroUI:

#### `.page-header`
- `@apply flex items-center justify-between pb-4 mb-6 border-b border-separator`

#### `.form-grid`
- `@apply grid grid-cols-1 sm:grid-cols-2 gap-4`

#### `.status-badge`
- `@apply inline-flex items-center gap-1.5 text-xs font-medium`
- `.status-badge__dot`: `@apply size-2 rounded-full bg-current`

#### `.content-empty`
- `@apply flex flex-col items-center justify-center py-12 text-muted text-center`
- (Named `.content-empty` to avoid collision with HeroUI's `EmptyState` / `.empty-state`)

---

## 3. Design Principles

- All colors via `var(--xxx)` — no hardcoded values
- Smooth transitions: `transition-colors duration-150`
- Consistent focus ring: `ring-2 ring-offset-2` using `--focus`
- WCAG AA minimum contrast between text and background
- Component hierarchy through lightness separation:
  - Light: background (98%) > field-background (94%) > default (92%)
  - Dark: background (10%) < surface (18%) < surface-secondary (24%) < surface-tertiary (29%) < default (33%)
- Borders (35%) always more visible than separators (28%) in dark mode
