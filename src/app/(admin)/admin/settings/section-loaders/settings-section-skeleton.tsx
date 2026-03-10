import { Card, Skeleton } from '@heroui/react';

export function SettingsSectionSkeleton() {
  return (
    <Card className="space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48 rounded" />
        <Skeleton className="h-4 w-full max-w-md rounded" />
      </div>
      <div className="space-y-4 pt-4">
        <Skeleton className="h-10 w-full rounded" />
        <Skeleton className="h-10 w-full rounded" />
        <Skeleton className="h-10 w-3/4 rounded" />
        <Skeleton className="h-10 w-1/2 rounded" />
      </div>
      <div className="pt-4">
        <Skeleton className="h-10 w-24 rounded" />
      </div>
    </Card>
  );
}
