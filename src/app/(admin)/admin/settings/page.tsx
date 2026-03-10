import { Suspense } from 'react';
import type { SectionKey } from './constants';
import { SettingsContentShell } from './settings-content-shell';
import {
  SectionContentLoader,
  SettingsSectionSkeleton,
} from './section-loaders';

type SearchParams =
  | Promise<{ activeSection?: string }>
  | { activeSection?: string };

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

  return (
    <SettingsContentShell>
      <Suspense
        key={activeSection}
        fallback={<SettingsSectionSkeleton />}
      >
        <SectionContentLoader sectionKey={activeSection} />
      </Suspense>
    </SettingsContentShell>
  );
}
