interface BookingStepperProps {
  steps: Array<{
    id: number;
    name: string;
    status: 'pending' | 'active' | 'completed';
    onClick?: () => void;
  }>;
}

// Create mobile-optimized 3-step grouping
function getMobileSteps(steps: BookingStepperProps['steps']) {
  return [
    {
      id: 1,
      name: 'Setup',
      status: steps.slice(0, 3).some(s => s.status === 'active') ? 'active' :
             steps.slice(0, 3).every(s => s.status === 'completed') ? 'completed' : 'pending',
      substeps: steps.slice(0, 3)
    },
    {
      id: 2,
      name: 'Seats',
      status: steps[3]?.status || 'pending',
      substeps: [steps[3]].filter(Boolean)
    },
    {
      id: 3,
      name: 'Booking',
      status: steps.slice(4).some(s => s.status === 'active') ? 'active' :
             steps.slice(4).every(s => s.status === 'completed') ? 'completed' : 'pending',
      substeps: steps.slice(4)
    }
  ].filter(group => group.substeps.length > 0);
}

export default function BookingStepper({ steps }: BookingStepperProps) {
  const mobileSteps = getMobileSteps(steps);
  
  return (
    <div className="bg-card p-2 lg:p-2 rounded border border-border" data-testid="booking-stepper">
      {/* Mobile: Horizontal 3-step */}
      <div className="block lg:hidden">
        <div className="flex items-center justify-between">
          {mobileSteps.map((group, index) => (
            <div key={group.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                  ${group.status === 'completed' ? 'bg-green-500 text-white' : 
                    group.status === 'active' ? 'bg-primary text-primary-foreground' : 
                    'bg-muted text-muted-foreground'}
                `} data-testid={`mobile-step-${group.id}`}>
                  {group.status === 'completed' ? '✓' : group.id}
                </div>
                <span className={`text-xs font-medium mt-1 text-center ${
                  group.status === 'active' ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {group.name}
                </span>
              </div>
              {index < mobileSteps.length - 1 && (
                <div className={`
                  flex-1 h-px mx-2 min-w-[20px]
                  ${mobileSteps[index + 1].status === 'completed' || mobileSteps[index + 1].status === 'active' 
                    ? 'bg-primary' : 'bg-muted'}
                `}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Horizontal stepper */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <div className="flex items-center justify-between min-w-full">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div 
                className="flex flex-col items-center cursor-pointer" 
                onClick={step.onClick}
              >
                <div className={`
                  flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors
                  ${step.status === 'completed' ? 'bg-green-500 text-white' : 
                    step.status === 'active' ? 'bg-primary text-primary-foreground' : 
                    'bg-muted text-muted-foreground hover:bg-muted/80'}
                `} data-testid={`step-${step.id}`}>
                  {step.status === 'completed' ? '✓' : step.id}
                </div>
                <span className={`text-xs font-medium mt-0.5 text-center leading-tight ${
                  step.status === 'active' ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  flex-1 h-px mx-2 
                  ${steps[index + 1].status === 'completed' || steps[index + 1].status === 'active' 
                    ? 'bg-primary' : 'bg-muted'}
                `}></div>
              )}
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}
