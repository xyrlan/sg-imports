interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`h-2 w-12 rounded-full transition-colors ${
            index + 1 === currentStep
              ? 'bg-accent'
              : index + 1 < currentStep
              ? 'bg-accent-soft'
              : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );
}
