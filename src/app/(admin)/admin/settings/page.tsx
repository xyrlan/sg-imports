import { Suspense } from 'react';
import type { SectionKey } from './constants';
import { SettingsContentShell } from './settings-content-shell';
import {
  SectionContentLoader,
  SettingsSectionSkeleton,
} from './section-loaders';

type SearchParams =
  | Promise<{ activeSection?: string; organizationId?: string; supplierId?: string }>
  | { activeSection?: string; organizationId?: string; supplierId?: string };

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params =
    typeof searchParams === 'object' && 'then' in searchParams
      ? await searchParams
      : searchParams;
  const activeSection = (params?.activeSection ?? 'honorarios') as SectionKey;
  const organizationId = params?.organizationId ?? '';
  const supplierId = params?.supplierId ?? '';

  return (
    <SettingsContentShell>
      <Suspense
        key={`${activeSection}-${organizationId}-${supplierId}`}
        fallback={<SettingsSectionSkeleton />}
      >
        <SectionContentLoader
          sectionKey={activeSection}
          organizationId={organizationId}
          supplierId={supplierId}
        />
      </Suspense>
    </SettingsContentShell>
  );
}
