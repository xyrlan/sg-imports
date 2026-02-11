'use client';

import { Tabs, Chip, Button, Dropdown, Label } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Eye, UserCog, Pencil } from 'lucide-react';
import { DataTable, facetedFilterFn, type FacetedFilterDef } from '@/components/ui/data-table';
import { createColumnHelper } from '@tanstack/react-table';

import type { Profile } from '@/services/admin/profiles.service';
import type { OrganizationWithMemberCount } from '@/services/admin';
import { formatCNPJ, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { parseAsString, useQueryState } from 'nuqs';

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
      filterFn: facetedFilterFn,
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
    profileColumnHelper.accessor('documentPhotoUrl', {
      header: t('columns.documentPhoto'),
      enableSorting: false,
      cell: (info) => (
        <span className="text-sm text-muted">
          {info.getValue() ? <Link href={info.getValue() ?? ''} target="_blank">
            <Eye className="size-4" />
            <Label>{t('actions.view')}</Label>
          </Link> : '—'}
        </span>
      ),
    }),
    profileColumnHelper.accessor('addressProofUrl', {
      header: t('columns.addressProof'),
      enableSorting: false,
      cell: (info) => (
        <span className="text-sm text-muted">
          {info.getValue() ? <Link href={info.getValue() ?? ''} target="_blank">
            <Eye className="size-4" />
            <Label>{t('actions.view')}</Label>
          </Link> : '—'}
        </span>
      ),
    }),
    profileColumnHelper.accessor('createdAt', {
      header: t('columns.createdAt'),
      cell: (info) => {
        const date = info.getValue();
        return (
          <span className="text-sm text-muted">
            {date
              ? formatDate(new Date(date ?? ''))
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
  const router = useRouter();

  function handleAction() {
    router.push(`/admin/users/${profile.id}`);
  }

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
        <Dropdown.Menu onAction={() => handleAction()}>
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
        return (
          <span className="text-sm font-mono">{formatCNPJ(doc ?? '')}</span>
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
    orgColumnHelper.accessor('orderType', {
      header: t('columns.orderType'),
      enableSorting: false,
      filterFn: facetedFilterFn,
      cell: (info) => (
        <Chip size="sm" color={info.getValue() === 'ORDER' ? 'warning' : 'default'} variant="secondary">
          {info.getValue() === 'ORDER' ? t('orderType.order') : t('orderType.directOrder')}
        </Chip>
      ),
    }),
    orgColumnHelper.accessor('socialContractUrl', {
      header: t('columns.socialContract'),
      enableSorting: false,
      cell: (info) => (
        <span className="text-sm text-muted">
          {info.getValue() ? <Link href={info.getValue() ?? ''} target="_blank">
            <Eye className="size-4" />
            <Label>{t('actions.view')}</Label>
          </Link> : '—'}
        </span>
      ),
    }),
    orgColumnHelper.accessor('createdAt', {
      header: t('columns.createdAt'),
      cell: (info) => {
        const date = info.getValue();
        return (
          <span className="text-sm text-muted">
            {date
              ? formatDate(new Date(date ?? ''))
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
  const router = useRouter();

  function handleAction() {
    router.push(`/admin/organizations/${organization.id}`);
  }

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
        <Dropdown.Menu onAction={() => handleAction()}>
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

// ============================================
// Main Component
// ============================================

interface UsersOrganizationsContentProps {
  initialProfiles: Profile[];
  initialOrganizations: OrganizationWithMemberCount[];
}

// ============================================
// Faceted filter definitions
// ============================================

function useProfileFilters(): FacetedFilterDef[] {
  const t = useTranslations('Admin.Management');

  return [
    {
      columnId: 'systemRole',
      title: t('columns.systemRole'),
      options: [
        { label: t('roles.superAdmin'), value: 'SUPER_ADMIN' },
        { label: t('roles.user'), value: 'USER' },
      ],
    },
  ];
}

function useOrganizationFilters(): FacetedFilterDef[] {
  const t = useTranslations('Admin.Management');

  return [
    {
      columnId: 'orderType',
      title: t('columns.orderType'),
      options: [
        { label: t('orderType.order'), value: 'ORDER' },
        { label: t('orderType.directOrder'), value: 'DIRECT_ORDER' },
      ],
    },
  ];
}

// ============================================
// Main Component
// ============================================

export function UsersOrganizationsContent({
  initialProfiles,
  initialOrganizations,
}: UsersOrganizationsContentProps) {
  const [selectedTab, setSelectedTab] = useQueryState('selectedTab', {
    defaultValue: 'users',
  });
  const t = useTranslations('Admin.Management');
  const profileColumns = useProfileColumns();
  const organizationColumns = useOrganizationColumns();
  const profileFilters = useProfileFilters();
  const organizationFilters = useOrganizationFilters();

  return (
    <div className="space-y-6"> 
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted mt-1">{t('description')}</p>
      </div>

      {/* Tabs */}
      <Tabs selectedKey={selectedTab} onSelectionChange={(key) => setSelectedTab(key as string)}>
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
            facetedFilters={profileFilters}
          />
        </Tabs.Panel>

        <Tabs.Panel id="organizations" className="pt-4">
          <DataTable
            columns={organizationColumns}
            data={initialOrganizations}
            searchPlaceholder={t('searchOrganizations')}
            enableRowSelection
            facetedFilters={organizationFilters}
          />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
