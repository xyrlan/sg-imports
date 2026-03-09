'use client';

interface SettingsSectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  responsive?: boolean;
}

export function SettingsSectionHeader({
  title,
  description,
  actions,
  className,
  responsive = false,
}: SettingsSectionHeaderProps) {
  const content = (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {actions}
    </>
  );

  if (actions) {
    const layoutClasses = responsive
      ? 'flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center'
      : 'flex justify-between items-center';
    return (
      <div className={className ? `${layoutClasses} ${className}` : layoutClasses}>
        {content}
      </div>
    );
  }

  return <div className={className}>{content}</div>;
}
