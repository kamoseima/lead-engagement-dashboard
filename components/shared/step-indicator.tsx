'use client';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;

        return (
          <div key={i} className="flex items-center">
            {/* Circle */}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isDone ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`hidden text-xs font-medium sm:inline ${
                  isActive
                    ? 'text-foreground'
                    : isDone
                      ? 'text-green-400'
                      : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={`mx-3 h-px w-8 sm:w-12 ${
                  isDone ? 'bg-green-500' : 'bg-border'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
