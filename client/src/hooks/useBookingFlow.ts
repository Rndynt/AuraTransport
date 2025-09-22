import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { bookingsApi, pricingApi } from '@/lib/api';
import type { BookingFlowState, BookingStep, CreateBookingRequest } from '@/types';

const BOOKING_STEPS: BookingStep[] = [
  { id: 1, name: 'Outlet', status: 'pending' },
  { id: 2, name: 'Trip', status: 'pending' },
  { id: 3, name: 'Route', status: 'pending' },
  { id: 4, name: 'Seats', status: 'pending' },
  { id: 5, name: 'Passengers', status: 'pending' },
  { id: 6, name: 'Payment', status: 'pending' }
];

export function useBookingFlow() {
  const [state, setState] = useState<BookingFlowState>({
    selectedSeats: [],
    passengers: [],
    currentStep: 1
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateState = useCallback((updates: Partial<BookingFlowState>) => {
    setState(current => ({ ...current, ...updates }));
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setState(current => ({ ...current, currentStep: step }));
  }, []);

  const nextStep = useCallback(() => {
    setState(current => ({ 
      ...current, 
      currentStep: Math.min(current.currentStep + 1, BOOKING_STEPS.length)
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState(current => ({ 
      ...current, 
      currentStep: Math.max(current.currentStep - 1, 1)
    }));
  }, []);

  const getSteps = useCallback(() => {
    return BOOKING_STEPS.map(step => ({
      ...step,
      status: step.id < state.currentStep ? 'completed' as const :
              step.id === state.currentStep ? 'active' as const : 'pending' as const
    }));
  }, [state.currentStep]);

  const addSeat = useCallback((seatNo: string) => {
    setState(current => ({
      ...current,
      selectedSeats: [...current.selectedSeats, seatNo]
    }));
  }, []);

  const removeSeat = useCallback((seatNo: string) => {
    setState(current => ({
      ...current,
      selectedSeats: current.selectedSeats.filter(seat => seat !== seatNo)
    }));
  }, []);

  const clearSeats = useCallback(() => {
    setState(current => ({
      ...current,
      selectedSeats: []
    }));
  }, []);

  const updatePassengers = useCallback((passengers: any[]) => {
    setState(current => ({ ...current, passengers }));
  }, []);

  const canProceedToNextStep = useCallback(() => {
    switch (state.currentStep) {
      case 1: return !!state.outlet;
      case 2: return !!state.trip;
      case 3: return !!state.originStop && !!state.destinationStop;
      case 4: return state.selectedSeats.length > 0;
      case 5: return state.passengers.length === state.selectedSeats.length && 
                     state.passengers.every(p => (p.fullName ?? '').trim());
      case 6: return !!state.payment;
      default: return false;
    }
  }, [state]);

  const calculateTotalAmount = useCallback(async (): Promise<number> => {
    // If we don't have all required info for pricing, return fallback
    if (!state.trip?.id || state.originSeq === undefined || state.destinationSeq === undefined || state.selectedSeats.length === 0) {
      return state.selectedSeats.length * 25000; // Fallback to old calculation
    }

    try {
      const fareQuote = await pricingApi.quoteFare(
        state.trip.id,
        state.originSeq,
        state.destinationSeq,
        state.selectedSeats.length
      );
      return fareQuote.totalForAllPassengers;
    } catch (error) {
      console.error('Failed to calculate dynamic pricing, using fallback:', error);
      return state.selectedSeats.length * 25000; // Fallback on error
    }
  }, [state.trip?.id, state.originSeq, state.destinationSeq, state.selectedSeats.length]);

  const createBooking = useCallback(async (): Promise<{ booking: any; printPayload: any }> => {
    // Enhanced validation with specific error messages
    const validationErrors = [];
    
    if (!state.trip) validationErrors.push('Trip not selected');
    if (!state.originStop) validationErrors.push('Origin stop not selected');
    if (!state.destinationStop) validationErrors.push('Destination stop not selected');
    if (!state.originSeq && state.originSeq !== 0) validationErrors.push('Origin sequence not set');
    if (!state.destinationSeq && state.destinationSeq !== 0) validationErrors.push('Destination sequence not set');
    if (!state.selectedSeats || state.selectedSeats.length === 0) validationErrors.push('No seats selected');
    if (!state.passengers || state.passengers.length === 0) validationErrors.push('No passengers added');
    if (state.passengers.length !== state.selectedSeats.length) validationErrors.push('Passenger count does not match seat count');
    if (!state.payment) validationErrors.push('Payment information not provided');
    
    // Route order validation
    if (state.originSeq !== undefined && state.destinationSeq !== undefined && state.originSeq >= state.destinationSeq) {
      validationErrors.push('Origin sequence must be less than destination sequence');
    }
    
    // Seat uniqueness validation
    const uniqueSeats = new Set(state.selectedSeats);
    if (uniqueSeats.size !== state.selectedSeats.length) {
      validationErrors.push('Duplicate seats are not allowed');
    }
    
    // Validate seat numbers are not empty
    state.selectedSeats.forEach((seat, index) => {
      if (!seat || !seat.trim()) {
        validationErrors.push(`Seat ${index + 1} number cannot be empty`);
      }
    });
    
    // Payment validation (basic method check - amount validation will be done after async pricing)
    if (state.payment) {
      const validMethods = ['cash', 'qr', 'ewallet', 'bank'];
      if (!validMethods.includes(state.payment.method)) {
        validationErrors.push('Invalid payment method');
      }
    }
    
    // Check if all passengers have required information
    state.passengers.forEach((passenger, index) => {
      if (!passenger.fullName || !passenger.fullName.trim()) {
        validationErrors.push(`Passenger ${index + 1} name is required`);
      }
    });

    if (validationErrors.length > 0) {
      const errorMessage = `Booking validation failed: ${validationErrors.join(', ')}`;
      // Log only validation errors without exposing PII
      console.error('Booking validation errors:', validationErrors);
      console.error('Validation context:', {
        hasTrip: !!state.trip,
        hasOriginStop: !!state.originStop,
        hasDestinationStop: !!state.destinationStop,
        originSeq: state.originSeq,
        destinationSeq: state.destinationSeq,
        seatCount: state.selectedSeats?.length || 0,
        passengerCount: state.passengers?.length || 0,
        hasPayment: !!state.payment,
        paymentMethod: state.payment?.method,
        currentStep: state.currentStep
      });
      throw new Error(errorMessage);
    }

    setLoading(true);
    try {
      // Calculate total amount dynamically
      const totalAmount = await calculateTotalAmount();
      
      // Now validate payment amount against calculated total
      if (state.payment && state.payment.amount < totalAmount) {
        throw new Error(`Payment amount (${state.payment.amount}) is less than total amount (${totalAmount})`);
      }
      
      // Type assertions are safe here because we've already validated these fields above
      const bookingData: CreateBookingRequest = {
        tripId: state.trip!.id,
        outletId: state.outlet?.id,
        originStopId: state.originStop!.id,
        destinationStopId: state.destinationStop!.id,
        originSeq: state.originSeq!,
        destinationSeq: state.destinationSeq!,
        totalAmount: totalAmount,
        channel: 'CSO',
        createdBy: 'CSO User',
        passengers: state.passengers.map((passenger, index) => ({
          fullName: passenger.fullName,
          phone: passenger.phone || undefined,
          idNumber: passenger.idNumber || undefined,
          seatNo: state.selectedSeats[index]
        })),
        payment: state.payment!
      };

      const idempotencyKey = `booking-${Date.now()}-${Math.random()}`;
      // Log booking attempt without exposing PII
      console.log('Creating booking with idempotency key:', idempotencyKey);
      const result = await bookingsApi.create(bookingData, idempotencyKey);

      toast({
        title: "Booking Created",
        description: `Booking ${result.booking.id.slice(-8)} created successfully`
      });

      return result;
    } catch (error) {
      console.error('Booking failed:', error);
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state, toast, calculateTotalAmount]);

  const resetFlow = useCallback(() => {
    setState({
      selectedSeats: [],
      passengers: [],
      currentStep: 1
    });
  }, []);

  return {
    state,
    loading,
    steps: getSteps(),
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
    calculateTotalAmount
  };
}
