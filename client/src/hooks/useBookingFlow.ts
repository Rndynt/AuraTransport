import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { bookingsApi } from '@/lib/api';
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
                     state.passengers.every(p => p.fullName.trim());
      case 6: return !!state.payment;
      default: return false;
    }
  }, [state]);

  const createBooking = useCallback(async (): Promise<{ booking: any; printPayload: any }> => {
    if (!canProceedToNextStep() || !state.trip || !state.originStop || !state.destinationStop || !state.payment) {
      throw new Error('Booking flow is incomplete');
    }

    setLoading(true);
    try {
      const bookingData: CreateBookingRequest = {
        tripId: state.trip.id,
        outletId: state.outlet?.id,
        originStopId: state.originStop.id,
        destinationStopId: state.destinationStop.id,
        originSeq: state.originSeq!,
        destinationSeq: state.destinationSeq!,
        channel: 'CSO',
        createdBy: 'CSO User',
        passengers: state.passengers.map((passenger, index) => ({
          fullName: passenger.fullName,
          phone: passenger.phone || undefined,
          idNumber: passenger.idNumber || undefined,
          seatNo: state.selectedSeats[index]
        })),
        payment: state.payment
      };

      const idempotencyKey = `booking-${Date.now()}-${Math.random()}`;
      const result = await bookingsApi.create(bookingData, idempotencyKey);

      toast({
        title: "Booking Created",
        description: `Booking ${result.booking.id.slice(-8)} created successfully`
      });

      return result;
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state, canProceedToNextStep, toast]);

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
    resetFlow
  };
}
