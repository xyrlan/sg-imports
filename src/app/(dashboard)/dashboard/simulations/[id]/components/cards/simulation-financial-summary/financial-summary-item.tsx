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
  const hasExpandable = Boolean(children);

  return (
    <div
      className={
        hasExpandable
          ? 'rounded-lg border p-3 space-y-2'
          : 'rounded-lg border p-3 flex items-center gap-3'
      }
    >
      <div className="flex items-center gap-3">
        <span className="size-5 shrink-0 [&>svg]:size-5">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs">{label}</p>
          <p className="font-medium">{value}</p>
        </div>
        {actionSlot}
      </div>
      {children}
    </div>
  );
}
