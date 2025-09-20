import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import BookingStepper from '@/components/cso/BookingStepper';
import TripSelector from '@/components/cso/TripSelector';
import RouteTimeline from '@/components/cso/RouteTimeline';
import SeatMap from '@/components/cso/SeatMap';
import PassengerForm from '@/components/cso/PassengerForm';
import PaymentPanel from '@/components/cso/PaymentPanel';
import PrintPreview from '@/components/cso/PrintPreview';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { useSeatHold } from '@/hooks/useSeatHold';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Users, CreditCard } from 'lucide-react';
import type { Trip, Stop, Outlet } from '@/types';

export default function CsoPage() {
  const [bookingResult, setBookingResult] = useState<{ booking: any; printPayload: any } | null>(null);
  const { 
    state, 
    steps, 
    updateState, 
    setCurrentStep, 
    nextStep, 
    prevStep,
    addSeat,
    removeSeat,
    clearSeats,
    updatePassengers,
    canProceedToNextStep,
    createBooking,
    resetFlow,
    loading: bookingLoading
  } = useBookingFlow();
  
  const { releaseAllHolds } = useSeatHold();

  const handleOutletSelect = (outlet: Outlet) => {
    updateState({ outlet });
    if (state.currentStep === 1) {
      nextStep();
    }
  };

  const handleTripSelect = (trip: Trip) => {
    updateState({ trip });
    if (state.currentStep === 2) {
      nextStep();
    }
  };

  const handleOriginSelect = (stop: Stop, sequence: number) => {
    updateState({ 
      originStop: stop, 
      originSeq: sequence,
      // Clear destination if it's before origin
      ...(state.destinationSeq && state.destinationSeq <= sequence ? { 
        destinationStop: undefined, 
        destinationSeq: undefined 
      } : {})
    });
  };

  const handleDestinationSelect = (stop: Stop, sequence: number) => {
    updateState({ 
      destinationStop: stop, 
      destinationSeq: sequence 
    });
    // Automatically move to seat selection when both origin and destination are selected
    if (state.originStop && state.currentStep === 3) {
      setTimeout(() => nextStep(), 100); // Small delay to ensure state is updated
    }
  };

  const handleSeatSelect = (seatNo: string) => {
    addSeat(seatNo);
  };

  const handleSeatDeselect = (seatNo: string) => {
    removeSeat(seatNo);
  };

  const handlePassengersUpdate = (passengers: any[]) => {
    updatePassengers(passengers);
  };

  const handlePaymentUpdate = (payment: any) => {
    updateState({ payment });
  };

  const handleCreateBooking = async () => {
    try {
      const result = await createBooking();
      setBookingResult(result);
      setCurrentStep(7); // Move to success/print step
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  const handleNewBooking = () => {
    setBookingResult(null);
    resetFlow();
    releaseAllHolds();
  };

  const handleStepClick = (stepNumber: number) => {
    if (stepNumber <= state.currentStep) {
      setCurrentStep(stepNumber);
    }
  };

  const renderCurrentStep = () => {
    // Success/Print step
    if (state.currentStep === 7 && bookingResult) {
      return (
        <PrintPreview
          booking={bookingResult.booking}
          printPayload={bookingResult.printPayload}
          onNewBooking={handleNewBooking}
          onPrint={() => window.print()}
        />
      );
    }

    switch (state.currentStep) {
      case 1:
      case 2:
        return (
          <TripSelector
            selectedOutlet={state.outlet}
            selectedTrip={state.trip}
            onOutletSelect={handleOutletSelect}
            onTripSelect={handleTripSelect}
          />
        );

      case 3:
        return state.trip ? (
          <RouteTimeline
            trip={state.trip}
            selectedOrigin={state.originStop}
            selectedDestination={state.destinationStop}
            onOriginSelect={handleOriginSelect}
            onDestinationSelect={handleDestinationSelect}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Please select a trip first</p>
            <Button onClick={() => setCurrentStep(2)} className="mt-2">
              Back to Trip Selection
            </Button>
          </div>
        );

      case 4:
        return state.trip && state.originSeq && state.destinationSeq ? (
          <div className="space-y-4">
            <SeatMap
              trip={state.trip}
              originSeq={state.originSeq}
              destinationSeq={state.destinationSeq}
              selectedSeats={state.selectedSeats}
              onSeatSelect={handleSeatSelect}
              onSeatDeselect={handleSeatDeselect}
            />
            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={prevStep}
                data-testid="back-to-route"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Route
              </Button>
              {state.selectedSeats.length > 0 && (
                <Button 
                  onClick={nextStep}
                  data-testid="continue-to-passengers"
                >
                  Continue to Passengers
                  <Users className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Please select origin and destination first</p>
            <Button onClick={() => setCurrentStep(3)} className="mt-2">
              Back to Route Selection
            </Button>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <PassengerForm
              selectedSeats={state.selectedSeats}
              passengers={state.passengers}
              onPassengersUpdate={handlePassengersUpdate}
              onNext={nextStep}
              onBack={prevStep}
            />
            {/* Navigation buttons for mobile */}
            <div className="flex items-center justify-between pt-4 lg:hidden">
              <Button 
                variant="outline" 
                onClick={prevStep}
                data-testid="back-to-seats"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Seats
              </Button>
              {canProceedToNextStep() && (
                <Button 
                  onClick={nextStep}
                  data-testid="continue-to-payment"
                >
                  Continue to Payment
                  <CreditCard className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <PaymentPanel
              totalAmount={75000} // This should come from pricing calculation
              payment={state.payment}
              onPaymentUpdate={handlePaymentUpdate}
              onSubmit={handleCreateBooking}
              onBack={prevStep}
              loading={bookingLoading}
            />
            {/* Navigation buttons for mobile */}
            <div className="flex items-center justify-between pt-4 lg:hidden">
              <Button 
                variant="outline" 
                onClick={prevStep}
                data-testid="back-to-passengers"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Passengers
              </Button>
              {canProceedToNextStep() && (
                <Button 
                  onClick={handleCreateBooking}
                  disabled={bookingLoading}
                  data-testid="complete-booking"
                >
                  {bookingLoading ? 'Processing...' : 'Complete Booking'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Invalid step</p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="cso-page">
      {/* Booking Stepper */}
      <div className="cursor-pointer">
        <BookingStepper steps={steps.map(step => ({
          ...step,
          onClick: () => handleStepClick(step.id)
        }))} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Main Content */}
        <div className="lg:col-span-2">
          {renderCurrentStep()}
        </div>

        {/* Right Column: Summary */}
        <div className="space-y-6">
          {/* Booking Summary */}
          <Card data-testid="booking-summary">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-foreground mb-4">Booking Summary</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outlet:</span>
                  <span>{state.outlet?.name || 'Not selected'}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trip:</span>
                  <span>{state.trip ? `Trip ${state.trip.id.slice(-8)}` : 'Not selected'}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Route:</span>
                  <span>
                    {state.originStop && state.destinationStop 
                      ? `${state.originStop.code} → ${state.destinationStop.code}`
                      : 'Not selected'
                    }
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seats:</span>
                  <span>
                    {state.selectedSeats.length > 0 
                      ? state.selectedSeats.join(', ')
                      : 'None selected'
                    }
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Passengers:</span>
                  <span>{state.passengers.length}</span>
                </div>

                {state.payment && (
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>IDR 75,000</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {state.currentStep >= 4 && state.currentStep < 7 && (
            <Card data-testid="quick-actions">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
                
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => setCurrentStep(4)}
                    data-testid="back-to-seats"
                  >
                    <i className="fas fa-th-large mr-2"></i>
                    Change Seats
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => setCurrentStep(3)}
                    data-testid="change-route"
                  >
                    <i className="fas fa-route mr-2"></i>
                    Change Route
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={handleNewBooking}
                    data-testid="start-over"
                  >
                    <i className="fas fa-refresh mr-2"></i>
                    Start Over
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
