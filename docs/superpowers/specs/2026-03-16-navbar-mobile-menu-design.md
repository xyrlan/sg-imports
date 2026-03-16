# Navbar Mobile Menu — Design Spec

## Problem

Navigation links, organization select, and notifications are hidden on mobile/tablet viewports (`< lg`). There is no way for mobile users to access these features.

## Solution

A new `NavbarMobileMenu` component: a HeroUI `Dropdown` triggered by a hamburger icon with an unread-notification badge. Visible only on `< lg` screens.

## Component Details

### File

`src/components/layout/navbar-mobile-menu.tsx`

### Visibility

- Wrapper: `flex lg:hidden` (appears when desktop nav links disappear)
- Replaces the need for the `hidden sm:flex` on `NavbarOrganizationSelect` — on mobile, orgs are inside this menu instead

### Trigger

- `Dropdown.Trigger` with a `Menu` icon (lucide-react)
- When `unreadCount > 0`, render a small badge (dot or number) on the trigger icon using absolute positioning

### Unread Count

- Uses `useNotifications(profile?.id)` from `@/hooks/use-notifications`
- `profile` obtained from `useOrganizationState()`

### Dropdown Content (Dropdown.Menu)

Sections top to bottom:

1. **Navigation Section**
   - Header: hidden (not needed, links are self-explanatory with icons)
   - Items: `filteredLinks` (same role-based filtering as `navbar.tsx`)
   - Each `Dropdown.Item` has icon + label text
   - `onAction` navigates via `router.push(link.href)`

2. **Separator** (conditional: only if `canSelectOrganization`)

3. **Organizations Section** (conditional: `canSelectOrganization`)
   - Header: `t('Organization.myOrganizations')` (hidden if only 1 org)
   - Items: `availableOrganizations` as `Dropdown.Item` with `Building2` icon
   - Current org is hidden (same pattern as `NavbarOrganizationSelect`)
   - Switching calls `switchOrganization(orgId)` + `router.refresh()`
   - "Create new" item with `Plus` icon, navigates to `/dashboard/organizations/new`

4. **Separator**

5. **Notifications Section**
   - Single `Dropdown.Item` with `Bell` icon + label + unread count badge
   - Navigates to `/dashboard/notifications` (or appropriate route)

### Dependencies

| Dependency | Purpose |
|---|---|
| `useOrganization` | `availableOrganizations`, `switchOrganization`, `currentOrganization` |
| `useOrganizationState` | `membership.role`, `profile` for permissions |
| `useNotifications` | `unreadCount` for badge |
| `useTranslations('Navbar')` | i18n labels |
| `useRouter` | Navigation |

### i18n Keys

New key needed in `messages/pt.json` under `Navbar`:
- `"menu"`: `"Menu"` (aria-label for trigger)
- `"notifications"`: `"Notificações"` (label for notification item)

### Integration in `navbar.tsx`

- Import and render `<NavbarMobileMenu />` in the right side of the nav, wrapped in `div.flex.lg:hidden`
- Pass `filteredLinks` and `canSelectOrganization` as props to avoid duplicating role logic
- The existing `hidden lg:flex` div for desktop links remains unchanged

### Props Interface

```typescript
interface NavbarMobileMenuProps {
  links: NavbarLink[];
  canSelectOrganization: boolean;
}
```

## Out of Scope

- ProformaQuoteSelect — not included per user decision
- Drawer/sheet pattern — using Dropdown instead
- Dark mode considerations — follows existing theme automatically
