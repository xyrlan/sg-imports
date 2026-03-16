# Navbar Mobile Menu Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hamburger dropdown menu visible on mobile/tablet (`< lg`) that provides access to nav links, organization switching, and notifications.

**Architecture:** New `NavbarMobileMenu` component using HeroUI `Dropdown` (same pattern as `NavbarProfileDropdown`). Receives filtered links and permission flag as props from `Navbar`. Uses `useNotifications` hook for unread badge on trigger.

**Tech Stack:** HeroUI v3 Dropdown, lucide-react icons, next-intl, useNotifications hook

**Spec:** `docs/superpowers/specs/2026-03-16-navbar-mobile-menu-design.md`

---

## Chunk 1: Implementation

### Task 1: Add i18n keys

**Files:**
- Modify: `messages/pt.json:250-284` (Navbar section)

- [ ] **Step 1: Add new keys under `Navbar`**

In `messages/pt.json`, inside the `"Navbar"` object (after `"proposals": "Propostas"` line ~256), add:

```json
"menu": "Menu",
"notifications": "Notificações",
```

Note: `"notifications"` as a nav item label (distinct from the existing `"Navbar.Notifications.title"` which is the bell dropdown header).

- [ ] **Step 2: Verify no key conflicts**

Run: `bun run build` (or just check the file is valid JSON)
Expected: No JSON parse errors.

- [ ] **Step 3: Commit**

```bash
git add messages/pt.json
git commit -m "feat(i18n): add mobile menu translation keys"
```

---

### Task 2: Export `NavbarLink` interface from `navbar.tsx`

**Files:**
- Modify: `src/components/layout/navbar.tsx:22-27`

- [ ] **Step 1: Export the `NavbarLink` interface**

Change line 22 from:

```typescript
interface NavbarLink {
```

to:

```typescript
export interface NavbarLink {
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/navbar.tsx
git commit -m "refactor: export NavbarLink interface"
```

---

### Task 3: Create `NavbarMobileMenu` component

**Files:**
- Create: `src/components/layout/navbar-mobile-menu.tsx`

- [ ] **Step 1: Create the component file**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dropdown, Header, Label, Separator } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { Menu, Bell, Building2, Plus } from 'lucide-react';

import { useOrganization, useOrganizationState } from '@/contexts/organization-context';
import { useNotifications } from '@/hooks/use-notifications';
import type { NavbarLink } from './navbar';

interface NavbarMobileMenuProps {
  links: NavbarLink[];
  canSelectOrganization: boolean;
}

export function NavbarMobileMenu({ links, canSelectOrganization }: NavbarMobileMenuProps) {
  const t = useTranslations('Navbar');
  const tOrg = useTranslations('Organization');
  const router = useRouter();
  const { profile } = useOrganizationState();
  const {
    currentOrganization,
    availableOrganizations,
    switchOrganization,
  } = useOrganization();
  const { unreadCount } = useNotifications(profile?.id);
  const [isSwitching, setIsSwitching] = useState(false);

  const handleOrganizationSwitch = async (orgId: string) => {
    if (orgId === currentOrganization?.id) return;
    try {
      setIsSwitching(true);
      await switchOrganization(orgId);
      router.refresh();
    } catch (error) {
      console.error('Failed to switch organization:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <Dropdown>
      <Dropdown.Trigger
        className="relative flex items-center justify-center p-2 rounded-lg hover:bg-default-100 transition-colors outline-none"
        aria-label={t('menu')}
      >
        <Menu className="w-5 h-5 text-foreground" aria-hidden />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex min-w-4 h-4 items-center justify-center rounded-full bg-danger text-[10px] font-medium text-danger-foreground px-1"
            aria-hidden
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Dropdown.Trigger>

      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          onAction={(key) => {
            const keyStr = key.toString();

            // Navigation links
            const matchedLink = links.find((l) => l.href === keyStr);
            if (matchedLink) {
              router.push(matchedLink.href);
              return;
            }

            // Organization actions
            if (keyStr === 'org-create-new') {
              router.push('/dashboard/organizations/new');
              return;
            }
            if (keyStr.startsWith('org-')) {
              const orgId = keyStr.replace('org-', '');
              handleOrganizationSwitch(orgId);
              return;
            }

            // Notifications
            if (keyStr === 'notifications') {
              router.push('/dashboard/notifications');
              return;
            }
          }}
          disabledKeys={isSwitching ? ['org-create-new'] : []}
        >
          {/* Navigation Section */}
          <Dropdown.Section>
            {links.map((link) => (
              <Dropdown.Item key={link.href} id={link.href} textValue={link.label}>
                <div className="flex items-center gap-2">
                  {link.icon}
                  <Label>{link.label}</Label>
                </div>
              </Dropdown.Item>
            ))}
          </Dropdown.Section>

          {/* Organizations Section */}
          {canSelectOrganization && availableOrganizations.length > 1 && (
            <>
              <Separator />
              <Dropdown.Section>
                <Header>{tOrg('myOrganizations')}</Header>
                {availableOrganizations
                  .filter((org) => org.organization.id !== currentOrganization?.id)
                  .map((org) => (
                    <Dropdown.Item
                      key={`org-${org.organization.id}`}
                      id={`org-${org.organization.id}`}
                      textValue={org.organization.name}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted" />
                        <Label>{org.organization.name}</Label>
                      </div>
                    </Dropdown.Item>
                  ))}
                <Dropdown.Item id="org-create-new" textValue={tOrg('createNew')}>
                  <div className="flex items-center gap-2 text-field-foreground">
                    <Plus className="w-4 h-4" />
                    <Label>{tOrg('createNew')}</Label>
                  </div>
                </Dropdown.Item>
              </Dropdown.Section>
            </>
          )}

          {/* Notifications Section */}
          <Separator />
          <Dropdown.Section>
            <Dropdown.Item id="notifications" textValue={t('notifications')}>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <Label>{t('notifications')}</Label>
                {unreadCount > 0 && (
                  <span className="ml-auto flex min-w-5 h-5 items-center justify-center rounded-full bg-danger text-[10px] font-medium text-danger-foreground px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
            </Dropdown.Item>
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
```

- [ ] **Step 2: Verify file compiles**

Run: `bunx tsc --noEmit src/components/layout/navbar-mobile-menu.tsx` or `bun run build`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/navbar-mobile-menu.tsx
git commit -m "feat: create NavbarMobileMenu component"
```

---

### Task 4: Integrate into `navbar.tsx`

**Files:**
- Modify: `src/components/layout/navbar.tsx`

- [ ] **Step 1: Add import**

After the existing imports (line 19), add:

```typescript
import { NavbarMobileMenu } from './navbar-mobile-menu';
```

- [ ] **Step 2: Add mobile menu to the right side of the nav**

After the closing `</div>` of the desktop links section (line 130), add the mobile menu before the closing `</nav>`:

```tsx
        {/* Mobile Menu */}
        <div className="flex lg:hidden">
          <NavbarMobileMenu links={filteredLinks} canSelectOrganization={canSelectOrganization} />
        </div>
```

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/navbar.tsx
git commit -m "feat: integrate mobile menu into navbar"
```

---

### Task 5: Manual QA verification

- [ ] **Step 1: Run dev server**

Run: `bun run dev`

- [ ] **Step 2: Test mobile viewport**

Open browser at mobile width (`< 1024px`):
- Hamburger icon should appear on the right
- Desktop nav links should be hidden
- Clicking hamburger opens dropdown with nav links, org section, notification item

- [ ] **Step 3: Test notification badge**

If there are unread notifications, a red badge should appear on the hamburger icon and next to the "Notificações" item inside the menu.

- [ ] **Step 4: Test organization switching**

Click a different organization in the dropdown — page should refresh with the new org context.

- [ ] **Step 5: Test desktop viewport**

At `>= 1024px` width:
- Hamburger should be hidden
- Desktop nav links and NotificationBell should be visible as before

- [ ] **Step 6: Final commit (if any adjustments needed)**

```bash
git add -u
git commit -m "fix: mobile menu adjustments from QA"
```
