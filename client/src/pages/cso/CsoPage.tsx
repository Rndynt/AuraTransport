import { useState, useEffect } from 'react';
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
import type { Trip, Stop, Outlet, CsoAvailableTrip } from '@/types';

export default function CsoPage() {
  const [bookingResult, setBookingResult] = useState<{ booking: any; printPayload: any } | null>(null);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [selectedCsoTrip, setSelectedCsoTrip] = useState<CsoAvailableTrip | undefined>();
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
    calculateTotalAmount,
    loading: bookingLoading
  } = useBookingFlow();
  
  const { releaseAllHolds } = useSeatHold();

  // Calculate total amount when dependencies change
  useEffect(() => {
    const updateTotal = async () => {
      try {
        const total = await calculateTotalAmount();
        setTotalAmount(total);
      } catch (error) {
        console.error('Failed to calculate total amount:', error);
        setTotalAmount(0);
      }
    };

    if (state.selectedSeats.length > 0) {
      updateTotal();
    } else {
      setTotalAmount(0);
    }
  }, [state.trip?.id, state.originSeq, state.destinationSeq, state.selectedSeats.length, calculateTotalAmount]);

  const handleOutletSelect = (outlet: Outlet) => {
    // Clear trip selection and dependent state when outlet changes
    updateState({ 
      outlet,
      trip: undefined,
      originStop: undefined,
      destinationStop: undefined,
      originSeq: undefined,
      destinationSeq: undefined,
      selectedSeats: [],
      passengers: [],
      payment: undefined
    });
    
    // Clear any held seats
    releaseAllHolds();
    
    if (state.currentStep === 1) {
      nextStep();
    }
  };

  const handleTripSelect = (csoTrip: CsoAvailableTrip) => {
    setSelectedCsoTrip(csoTrip);
    // Convert CsoAvailableTrip to Trip for the booking flow
    const trip: Trip = {
      id: csoTrip.tripId || '', 
      patternId: '', // Will be filled by API call if needed
      vehicleId: '', // Will be filled by API call if needed
      serviceDate: new Date().toISOString().split('T')[0], // Use current date as fallback
      capacity: csoTrip.capacity || 0,
      status: csoTrip.status as 'scheduled' | 'canceled' | 'closed',
      layoutId: null,
      channelFlags: {},
      createdAt: null,
      baseId: csoTrip.baseId || null,
      originDepartHHMM: null
    };
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
    // Clear booking result
    setBookingResult(null);
    
    // Clear selected CSO trip and all trip-related state
    setSelectedCsoTrip(undefined);
    
    // Clear all booking flow state including trip, route, seats, passengers, and payment
    updateState({ 
      trip: undefined,
      originStop: undefined,
      destinationStop: undefined,
      originSeq: undefined,
      destinationSeq: undefined,
      selectedSeats: [],
      passengers: [],
      payment: undefined
    });
    
    // Reset flow to initial state
    resetFlow();
    
    // Clear any held seats
    releaseAllHolds();
  };

  const handleStepClick = (stepNumber: number) => {
    if (stepNumber <= state.currentStep) {
      setCurrentStep(stepNumber);
    }
  };

  const renderMiddleColumn = () => {
    if (state.currentStep <= 2) {
      return (
        <div className="flex items-center justify-center h-full text-center">
          <div>
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚌</span>
            </div>
            <p className="text-muted-foreground">Select a trip to continue</p>
          </div>
        </div>
      );
    }

    if (state.currentStep === 3) {
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
        </div>
      );
    }

    if (state.currentStep === 4) {
      return state.trip && state.originSeq && state.destinationSeq ? (
        <SeatMap
          trip={state.trip}
          originSeq={state.originSeq}
          destinationSeq={state.destinationSeq}
          selectedSeats={state.selectedSeats}
          onSeatSelect={handleSeatSelect}
          onSeatDeselect={handleSeatDeselect}
        />
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Please select origin and destination first</p>
        </div>
      );
    }

    // For steps 5+ show route and seat summary instead of forms
    if (state.currentStep >= 5) {
      return (
        <div className="space-y-6">
          {/* Route Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium text-sm mb-3">Selected Route</h3>
            <div className="space-y-2">
              {state.originStop && state.destinationStop ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{state.originStop.code}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{state.destinationStop.code}</span>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Route not selected</p>
              )}
            </div>
          </div>

          {/* Seat Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium text-sm mb-3">Selected Seats</h3>
            <div className="flex flex-wrap gap-2">
              {state.selectedSeats.length > 0 ? (
                state.selectedSeats.map(seat => (
                  <span key={seat} className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
                    {seat}
                  </span>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No seats selected</p>
              )}
            </div>
          </div>

          {/* Change Options */}
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentStep(3)}
              className="w-full"
            >
              Change Route
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentStep(4)}
              className="w-full"
            >
              Change Seats
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Step completed</p>
      </div>
    );
  };

  const renderRightColumn = () => {
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

    // For steps 5 and 6, show the forms in the right column
    if (state.currentStep === 5) {
      return (
        <PassengerForm
          selectedSeats={state.selectedSeats}
          passengers={state.passengers}
          onPassengersUpdate={handlePassengersUpdate}
          onNext={nextStep}
          onBack={prevStep}
        />
      );
    }

    if (state.currentStep === 6) {
      return (
        <PaymentPanel
          totalAmount={totalAmount}
          payment={state.payment}
          onPaymentUpdate={handlePaymentUpdate}
          onSubmit={handleCreateBooking}
          onBack={prevStep}
          loading={bookingLoading}
        />
      );
    }

    // Default booking summary for steps 1-4
    return (
      <div className="space-y-6">
        {/* Booking Summary */}
        <div>
          <h3 className="font-medium text-sm mb-3">Booking Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Outlet:</span>
              <span className="font-medium">{state.outlet?.name || 'Not selected'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trip:</span>
              <span className="font-medium">
                {selectedCsoTrip ? selectedCsoTrip.patternPath : 'Not selected'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Route:</span>
              <span className="font-medium">
                {state.originStop && state.destinationStop 
                  ? `${state.originStop.code} → ${state.destinationStop.code}`
                  : 'Not selected'
                }
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Seats:</span>
              <span className="font-medium">
                {state.selectedSeats.length > 0 
                  ? state.selectedSeats.join(', ')
                  : 'None selected'
                }
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Passengers:</span>
              <span className="font-medium">{state.passengers.length}</span>
            </div>

            {state.selectedSeats.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span className="text-primary">{new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0
                  }).format(totalAmount)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Actions */}
        <div className="space-y-2">
          {state.currentStep > 2 && state.currentStep < 7 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={prevStep}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          
          {canProceedToNextStep() && state.currentStep < 6 && (
            <Button 
              size="sm" 
              className="w-full"
              onClick={nextStep}
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}

          {state.currentStep >= 5 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-muted-foreground"
              onClick={handleNewBooking}
            >
              Start Over
            </Button>
          )}
        </div>
      </div>
    );
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
            selectedTrip={selectedCsoTrip}
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
          <PassengerForm
            selectedSeats={state.selectedSeats}
            passengers={state.passengers}
            onPassengersUpdate={handlePassengersUpdate}
            onNext={nextStep}
            onBack={prevStep}
          />
        );

      case 6:
        return (
          <div className="space-y-4">
            <PaymentPanel
              totalAmount={totalAmount}
              payment={state.payment}
              onPaymentUpdate={handlePaymentUpdate}
              onSubmit={handleCreateBooking}
              onBack={prevStep}
              loading={bookingLoading}
            />
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
    <div className="w-full max-w-none" data-testid="cso-page">
      {/* Header Section with Stepper */}
      <div className="bg-card border-b border-border px-6 py-4 mb-6">
        
        {/* Responsive Horizontal Stepper */}
        <div className="overflow-x-auto">
          <div className="flex items-center justify-center space-x-2 md:space-x-4 lg:space-x-8 min-w-max px-4">
            {[
              { id: 1, name: 'Outlet', icon: '1' },
              { id: 2, name: 'Trip', icon: '2' },
              { id: 3, name: 'Route', icon: '3' },
              { id: 4, name: 'Seats', icon: '4' },
              { id: 5, name: 'Passengers', icon: '5' },
              { id: 6, name: 'Payment', icon: '6' }
            ].map((step, index) => {
              const isActive = state.currentStep === step.id;
              const isCompleted = state.currentStep > step.id;
              const isClickable = state.currentStep >= step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div 
                    className={`flex flex-col items-center cursor-pointer ${
                      isClickable ? 'hover:opacity-80' : 'opacity-50'
                    }`}
                    onClick={() => isClickable && handleStepClick(step.id)}
                  >
                    <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-medium ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : isCompleted 
                          ? 'bg-green-500 text-white'
                          : 'bg-muted text-muted-foreground border border-border'
                    }`}>
                      {isCompleted ? '✓' : step.icon}
                    </div>
                    <span className={`text-[10px] md:text-xs mt-1 text-center leading-tight ${
                      isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                    }`}>
                      {step.name}
                    </span>
                  </div>
                  {index < 5 && (
                    <div className={`h-px w-4 md:w-8 lg:w-16 mx-1 md:mx-2 lg:mx-4 ${
                      isCompleted ? 'bg-green-500' : 'bg-border'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Layout - Responsive */}
      <div className="px-3 md:px-6 pb-6">
        {/* Desktop: 3-Column Layout */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          {/* Column 1: Available Trips */}
          <div className="col-span-4">
            <Card className="h-full">
              <CardContent className="p-6 h-full flex flex-col">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center mr-2">1</span>
                  Available Trips
                </h2>
                <div className="flex-1 overflow-auto">
                  {(state.currentStep === 1 || state.currentStep === 2) ? (
                    <TripSelector
                      selectedOutlet={state.outlet}
                      selectedTrip={selectedCsoTrip}
                      onOutletSelect={handleOutletSelect}
                      onTripSelect={handleTripSelect}
                    />
                  ) : (
                    <div className="space-y-4">
                      {/* Selected Outlet & Date Display */}
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h3 className="font-medium text-sm mb-2">Selected Details</h3>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-muted-foreground">Outlet:</span> {state.outlet?.name}</div>
                          <div><span className="text-muted-foreground">Date:</span> {new Date().toLocaleDateString('id-ID')}</div>
                          {selectedCsoTrip && (
                            <div><span className="text-muted-foreground">Trip:</span> {selectedCsoTrip.patternPath}</div>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentStep(2)}
                        className="w-full"
                      >
                        Change Trip
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Route & Seat Selection */}
          <div className="col-span-4">
            <Card className="h-full">
              <CardContent className="p-6 h-full flex flex-col">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center mr-2">
                    {state.currentStep === 3 ? '3' : state.currentStep === 4 ? '4' : '2'}
                  </span>
                  {state.currentStep === 3 ? 'Route Selection' : state.currentStep === 4 ? 'Seat Selection' : 'Layout Kendaraan'}
                </h2>
                <div className="flex-1 overflow-auto">
                  {renderMiddleColumn()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Column 3: Booking Summary */}
          <div className="col-span-4">
            <Card className="h-full">
              <CardContent className="p-6 h-full flex flex-col">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center mr-2">📋</span>
                  Booking Summary
                </h2>
                <div className="flex-1 overflow-auto">
                  {renderRightColumn()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile & Tablet: Responsive Single Column Layout */}
        <div className="lg:hidden space-y-4">
          {/* Steps 1-4: Show single main content */}
          {state.currentStep <= 4 && (
            <>
              <Card>
                <CardContent className="p-4 md:p-6">
                  {renderCurrentStep()}
                </CardContent>
              </Card>
              
              {/* Booking Summary for Mobile - Steps 1-4 */}
              <Card>
                <CardContent className="p-4 md:p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center mr-2">📋</span>
                    Booking Summary
                  </h2>
                  {renderRightColumn()}
                </CardContent>
              </Card>
            </>
          )}

          {/* Steps 5-6: Show forms directly */}
          {(state.currentStep === 5 || state.currentStep === 6) && (
            <Card>
              <CardContent className="p-4 md:p-6">
                {renderRightColumn()}
              </CardContent>
            </Card>
          )}

          {/* Step 7: Print preview */}
          {state.currentStep === 7 && bookingResult && (
            <Card>
              <CardContent className="p-4 md:p-6">
                <PrintPreview
                  booking={bookingResult.booking}
                  printPayload={bookingResult.printPayload}
                  onNewBooking={handleNewBooking}
                  onPrint={() => window.print()}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
