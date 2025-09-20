interface BookingStepperProps {
  steps: Array<{
    id: number;
    name: string;
    status: 'pending' | 'active' | 'completed';
  }>;
}

export default function BookingStepper({ steps }: BookingStepperProps) {
  return (
    <div className="bg-card p-3 lg:p-6 rounded-lg border border-border" data-testid="booking-stepper">
      {/* Mobile: Vertical stepper */}
      <div className="block lg:hidden">
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center space-x-3">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${step.status === 'completed' ? 'bg-green-500 text-white' : 
                  step.status === 'active' ? 'bg-primary text-primary-foreground' : 
                  'bg-muted text-muted-foreground'}
              `} data-testid={`step-${step.id}`}>
                {step.status === 'completed' ? '✓' : step.id}
              </div>
              <span className={`text-sm font-medium ${
                step.status === 'active' ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Horizontal stepper */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium
                  ${step.status === 'completed' ? 'bg-green-500 text-white' : 
                    step.status === 'active' ? 'bg-primary text-primary-foreground' : 
                    'bg-muted text-muted-foreground'}
                `} data-testid={`step-${step.id}`}>
                  {step.status === 'completed' ? '✓' : step.id}
                </div>
                <span className={`text-sm font-medium mt-2 text-center ${
                  step.status === 'active' ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  flex-1 h-px mx-4 
                  ${steps[index + 1].status === 'completed' || steps[index + 1].status === 'active' 
                    ? 'bg-primary' : 'bg-muted'}
                `}></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
