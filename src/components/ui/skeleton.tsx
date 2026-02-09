"use client";

import { Skeleton, type SkeletonProps } from "@heroui/react";

export interface AppSkeletonProps extends SkeletonProps {
  animationType?: "shimmer" | "pulse" | "none";
}

export function AppSkeleton({
  animationType = "shimmer",
  className,
  ...props
}: AppSkeletonProps) {
  return (
    <Skeleton animationType={animationType} className={className} {...props} />
  );
}

// Preset para loading de tabela
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <AppSkeleton className="h-10 w-16 rounded-lg" />
          <AppSkeleton className="h-10 flex-1 rounded-lg" />
          <AppSkeleton className="h-10 w-32 rounded-lg" />
          <AppSkeleton className="h-10 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// Preset para loading de card
export function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
      <AppSkeleton className="h-6 w-3/5 rounded-lg" />
      <div className="space-y-2">
        <AppSkeleton className="h-4 w-4/5 rounded-lg" />
        <AppSkeleton className="h-4 w-2/5 rounded-lg" />
      </div>
    </div>
  );
}

// Preset para loading de formulário
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <AppSkeleton className="h-4 w-24 rounded-lg" />
          <AppSkeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
