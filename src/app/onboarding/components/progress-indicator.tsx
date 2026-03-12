interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-3 mb-4">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        return (
          <div
            key={index}
            className={`h-2.5 w-14 rounded-full transition-all duration-300 ${
              isActive
                ? 'bg-accent shadow-lg shadow-accent/40 ring-2 ring-accent/50 ring-offset-2 ring-offset-background'
                : isCompleted
                  ? 'bg-accent'
                  : 'bg-foreground/25 dark:bg-foreground/30'
            }`}
          />
        );
      })}
    </div>
  );
}
