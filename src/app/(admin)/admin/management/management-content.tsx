'use client';

import { Tabs, Chip, Button, Dropdown, Label } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { MoreHorizontal, Eye, UserCog, Pencil } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { createColumnHelper } from '@tanstack/react-table';

import type { InferSelectModel } from 'drizzle-orm';
import type { profiles, organizations } from '@/db/schema';
import type { OrganizationWithMemberCount } from '@/services/admin.service';

// ============================================
// Types
// ============================================

type Profile = InferSelectModel<typeof profiles>;

// ============================================
// Column Definitions: Profiles
// ============================================

const profileColumnHelper = createColumnHelper<Profile>();

function useProfileColumns() {
  const t = useTranslations('Admin.Management');

  return [
    profileColumnHelper.accessor('fullName', {
      header: t('columns.name'),
      cell: (info) => (
        <span className="font-medium">
          {info.getValue() || <span className="text-muted italic">{t('noName')}</span>}
        </span>
      ),
    }),
    profileColumnHelper.accessor('email', {
      header: t('columns.email'),
      cell: (info) => (
        <span className="text-sm">{info.getValue()}</span>
      ),
    }),
    profileColumnHelper.accessor('phone', {
      header: t('columns.phone'),
      enableSorting: false,
      cell: (info) => (
        <span className="text-sm text-muted">
          {info.getValue() || '—'}
        </span>
      ),
    }),
    profileColumnHelper.accessor('systemRole', {
      header: t('columns.systemRole'),
      cell: (info) => {
        const role = info.getValue();
        return (
          <Chip
            size="sm"
            color={role === 'SUPER_ADMIN' ? 'warning' : 'default'}
            variant={role === 'SUPER_ADMIN' ? 'soft' : 'secondary'}
          >
            {role === 'SUPER_ADMIN' ? t('roles.superAdmin') : t('roles.user')}
          </Chip>
        );
      },
    }),
    profileColumnHelper.accessor('createdAt', {
      header: t('columns.createdAt'),
      cell: (info) => {
        const date = info.getValue();
        return (
          <span className="text-sm text-muted">
            {date
              ? new Date(date).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : '—'}
          </span>
        );
      },
    }),
    profileColumnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => <ProfileActions profile={info.row.original} />,
      size: 50,
    }),
  ];
}

function ProfileActions({ profile }: { profile: Profile }) {
  const t = useTranslations('Admin.Management');

  return (
    <Dropdown>
      <Button
        aria-label={t('actions.label')}
        variant="ghost"
        size="sm"
        isIconOnly
      >
        <MoreHorizontal className="size-4" />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={(key) => handleProfileAction(String(key), profile)}>
          <Dropdown.Item id="view" textValue={t('actions.view')}>
            <Eye className="size-4" />
            <Label>{t('actions.view')}</Label>
          </Dropdown.Item>
          <Dropdown.Item id="editRole" textValue={t('actions.editRole')}>
            <UserCog className="size-4" />
            <Label>{t('actions.editRole')}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function handleProfileAction(action: string, profile: Profile) {
  // TODO: Implement actions (view modal, edit role modal)
  console.log(`Action: ${action}`, profile.id);
}

// ============================================
// Column Definitions: Organizations
// ============================================

const orgColumnHelper = createColumnHelper<OrganizationWithMemberCount>();

function useOrganizationColumns() {
  const t = useTranslations('Admin.Management');

  return [
    orgColumnHelper.accessor('name', {
      header: t('columns.orgName'),
      cell: (info) => (
        <span className="font-medium">{info.getValue()}</span>
      ),
    }),
    orgColumnHelper.accessor('tradeName', {
      header: t('columns.tradeName'),
      enableSorting: false,
      cell: (info) => (
        <span className="text-sm text-muted">
          {info.getValue() || '—'}
        </span>
      ),
    }),
    orgColumnHelper.accessor('document', {
      header: t('columns.cnpj'),
      enableSorting: false,
      cell: (info) => {
        const doc = info.getValue();
        // Format CNPJ: 00.000.000/0000-00
        const formatted = doc?.replace(
          /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
          '$1.$2.$3/$4-$5',
        );
        return (
          <span className="text-sm font-mono">{formatted || doc}</span>
        );
      },
    }),
    orgColumnHelper.accessor('email', {
      header: t('columns.email'),
      enableSorting: false,
      cell: (info) => (
        <span className="text-sm text-muted">
          {info.getValue() || '—'}
        </span>
      ),
    }),
    orgColumnHelper.accessor('memberCount', {
      header: t('columns.members'),
      cell: (info) => (
        <Chip size="sm" variant="secondary">
          {info.getValue()}
        </Chip>
      ),
    }),
    orgColumnHelper.accessor('createdAt', {
      header: t('columns.createdAt'),
      cell: (info) => {
        const date = info.getValue();
        return (
          <span className="text-sm text-muted">
            {date
              ? new Date(date).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : '—'}
          </span>
        );
      },
    }),
    orgColumnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => <OrganizationActions organization={info.row.original} />,
      size: 50,
    }),
  ];
}

function OrganizationActions({ organization }: { organization: OrganizationWithMemberCount }) {
  const t = useTranslations('Admin.Management');

  return (
    <Dropdown>
      <Button
        aria-label={t('actions.label')}
        variant="ghost"
        size="sm"
        isIconOnly
      >
        <MoreHorizontal className="size-4" />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={(key) => handleOrgAction(String(key), organization)}>
          <Dropdown.Item id="view" textValue={t('actions.view')}>
            <Eye className="size-4" />
            <Label>{t('actions.view')}</Label>
          </Dropdown.Item>
          <Dropdown.Item id="edit" textValue={t('actions.edit')}>
            <Pencil className="size-4" />
            <Label>{t('actions.edit')}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function handleOrgAction(action: string, organization: OrganizationWithMemberCount) {
  // TODO: Implement actions (view details, edit organization)
  console.log(`Action: ${action}`, organization.id);
}

// ============================================
// Main Component
// ============================================

interface ManagementContentProps {
  initialProfiles: Profile[];
  initialOrganizations: OrganizationWithMemberCount[];
}

export function ManagementContent({
  initialProfiles,
  initialOrganizations,
}: ManagementContentProps) {
  const t = useTranslations('Admin.Management');
  const profileColumns = useProfileColumns();
  const organizationColumns = useOrganizationColumns();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted mt-1">{t('description')}</p>
      </div>

      {/* Tabs */}
      <Tabs>
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('title')}>
            <Tabs.Tab id="users">
              {t('usersTab')} ({initialProfiles.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="organizations">
              {t('organizationsTab')} ({initialOrganizations.length})
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="users" className="pt-4">
          <DataTable
            columns={profileColumns}
            data={initialProfiles}
            searchPlaceholder={t('searchUsers')}
            enableRowSelection
          />
        </Tabs.Panel>

        <Tabs.Panel id="organizations" className="pt-4">
          <DataTable
            columns={organizationColumns}
            data={initialOrganizations}
            searchPlaceholder={t('searchOrganizations')}
            enableRowSelection
          />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
