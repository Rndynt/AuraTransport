interface BookingStepperProps {
  steps: Array<{
    id: number;
    name: string;
    status: 'pending' | 'active' | 'completed';
  }>;
}

export default function BookingStepper({ steps }: BookingStepperProps) {
  return (
    <div className="bg-card p-6 rounded-lg border border-border" data-testid="booking-stepper">
      <div className="stepper">
        {steps.map((step, index) => (
          <div key={step.id} className={`step ${step.status}`}>
            <div className="step-number" data-testid={`step-${step.id}`}>
              {step.id}
            </div>
            <span className="text-sm font-medium">{step.name}</span>
            {index < steps.length - 1 && <div className="step-connector"></div>}
          </div>
        ))}
      </div>
    </div>
  );
}
