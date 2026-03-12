'use client';

interface FinancialSummaryItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  actionSlot?: React.ReactNode;
  children?: React.ReactNode;
}

export function FinancialSummaryItem({
  icon,
  label,
  value,
  actionSlot,
  children,
}: FinancialSummaryItemProps) {
  return (
    <div className="rounded-lg border border-default-200 p-3 flex flex-col gap-0 min-w-0">
      <div className="flex items-center gap-3">
        <span className="size-5 shrink-0 [&>svg]:size-5">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-default-500">{label}</p>
          <p className="font-medium">{value}</p>
        </div>
        {actionSlot}
      </div>
      {children && (
        <div className="mt-2 pt-2 border-t border-default-200">{children}</div>
      )}
    </div>
  );
}
