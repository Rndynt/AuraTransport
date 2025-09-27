import { IStorage } from "../../routes";
import { InsertTrip, Trip } from "@shared/schema";
import { TripLegsService } from "../tripLegs/tripLegs.service";
import { SeatInventoryService } from "../seatInventory/seatInventory.service";

export class TripsService {
  private tripLegsService: TripLegsService;
  private seatInventoryService: SeatInventoryService;

  constructor(private storage: IStorage) {
    this.tripLegsService = new TripLegsService(storage);
    this.seatInventoryService = new SeatInventoryService(storage);
  }

  async getAllTrips(serviceDate?: string): Promise<Trip[]> {
    return await this.storage.getTrips(serviceDate);
  }

  async getCsoAvailableTrips(serviceDate: string, outletId: string) {
    return await this.storage.getCsoAvailableTrips(serviceDate, outletId);
  }

  async getTripById(id: string): Promise<Trip> {
    const trip = await this.storage.getTripById(id);
    if (!trip) {
      throw new Error(`Trip with id ${id} not found`);
    }
    return trip;
  }

  async createTrip(data: InsertTrip): Promise<Trip> {
    // Create the trip first
    const trip = await this.storage.createTrip(data);
    
    // Auto-initialize trip_stop_times from the pattern's stops
    await this.initializeTripStopTimes(trip.id, trip.patternId);
    
    return trip;
  }

  private async initializeTripStopTimes(tripId: string, patternId: string): Promise<void> {
    // Get pattern stops ordered by sequence
    const patternStops = await this.storage.getPatternStops(patternId);
    
    // Create trip stop times with null times initially
    const tripStopTimesData = patternStops.map(ps => ({
      tripId,
      stopId: ps.stopId,
      stopSequence: ps.stopSequence,
      arriveAt: null,
      departAt: null,
      dwellSeconds: ps.dwellSeconds || 0,
      boardingAllowed: null, // inherit from pattern
      alightingAllowed: null // inherit from pattern
    }));
    
    // Use bulk upsert to create the stop times
    if (tripStopTimesData.length > 0) {
      await this.storage.bulkUpsertTripStopTimes(tripId, tripStopTimesData);
    }
  }

  async updateTrip(id: string, data: Partial<InsertTrip>): Promise<Trip> {
    await this.getTripById(id);
    
    // Check if trip has bookings before allowing stop sequence changes
    const hasBookings = await this.storage.tripHasBookings(id);
    if (hasBookings) {
      throw new Error("Cannot modify trip that has existing bookings");
    }
    
    return await this.storage.updateTrip(id, data);
  }

  async deleteTrip(id: string): Promise<void> {
    await this.getTripById(id);
    await this.storage.deleteTrip(id);
  }

  async deriveLegs(tripId: string): Promise<void> {
    const trip = await this.getTripById(tripId);
    await this.tripLegsService.deriveLegsFromTrip(trip);
  }

  async precomputeSeatInventory(tripId: string): Promise<void> {
    const trip = await this.getTripById(tripId);
    await this.seatInventoryService.precomputeInventory(trip);
  }

  async validateTripStopTimes(tripId: string): Promise<{ valid: boolean; errors: Array<{ stopSequence: number; field: string; message: string }> }> {
    const stopTimes = await this.storage.getTripStopTimes(tripId);
    const errors: Array<{ stopSequence: number; field: string; message: string }> = [];

    if (stopTimes.length < 2) {
      errors.push({ stopSequence: 0, field: 'general', message: 'Trip must have at least 2 stops' });
      return { valid: false, errors };
    }

    // Sort by sequence for validation
    const sortedStopTimes = stopTimes.sort((a, b) => a.stopSequence - b.stopSequence);
    
    for (let i = 0; i < sortedStopTimes.length; i++) {
      const stopTime = sortedStopTimes[i];
      const sequence = stopTime.stopSequence;
      const isFirst = i === 0;
      const isLast = i === sortedStopTimes.length - 1;
      
      // First stop: departure time required
      if (isFirst) {
        if (!stopTime.departAt) {
          errors.push({ 
            stopSequence: sequence, 
            field: 'departAt', 
            message: 'First stop must have departure time' 
          });
        }
      }
      
      // Last stop: arrival time required
      if (isLast) {
        if (!stopTime.arriveAt) {
          errors.push({ 
            stopSequence: sequence, 
            field: 'arriveAt', 
            message: 'Last stop must have arrival time' 
          });
        }
      }
      
      // Middle stops: if either time is provided, both must be provided
      if (!isFirst && !isLast) {
        const hasArrival = stopTime.arriveAt !== null;
        const hasDeparture = stopTime.departAt !== null;
        
        if (hasArrival && !hasDeparture) {
          errors.push({ 
            stopSequence: sequence, 
            field: 'departAt', 
            message: 'Departure time required when arrival time is set' 
          });
        }
        
        if (hasDeparture && !hasArrival) {
          errors.push({ 
            stopSequence: sequence, 
            field: 'arriveAt', 
            message: 'Arrival time required when departure time is set' 
          });
        }
      }
      
      // Validate departure >= arrival at same stop
      if (stopTime.arriveAt && stopTime.departAt) {
        if (new Date(stopTime.departAt) < new Date(stopTime.arriveAt)) {
          errors.push({ 
            stopSequence: sequence, 
            field: 'departAt', 
            message: 'Departure time must be after arrival time' 
          });
        }
      }
      
      // Validate chronological order with previous stop
      if (i > 0) {
        const prevStopTime = sortedStopTimes[i - 1];
        const prevDepartTime = prevStopTime.departAt;
        const currentArriveTime = stopTime.arriveAt;
        
        if (prevDepartTime && currentArriveTime) {
          if (new Date(currentArriveTime) < new Date(prevDepartTime)) {
            errors.push({ 
              stopSequence: sequence, 
              field: 'arriveAt', 
              message: 'Arrival time must be after previous stop departure time' 
            });
          }
        }
        
        // Also check dwell time compliance
        if (prevStopTime.departAt && prevStopTime.arriveAt && stopTime.arriveAt) {
          const prevDwell = prevStopTime.dwellSeconds || 0;
          const expectedMinDepart = new Date(new Date(prevStopTime.arriveAt).getTime() + prevDwell * 1000);
          
          if (new Date(prevStopTime.departAt) < expectedMinDepart) {
            errors.push({ 
              stopSequence: prevStopTime.stopSequence, 
              field: 'departAt', 
              message: `Departure time must account for ${prevDwell} second dwell time` 
            });
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async getSeatmap(tripId: string, originSeq: number, destinationSeq: number) {
    const trip = await this.getTripById(tripId);
    const layout = await this.storage.getLayoutById(trip.layoutId || trip.layoutId!);
    
    if (!layout) {
      throw new Error("Trip layout not found");
    }

    // Get required leg indexes for this O-D pair
    const legIndexes = [];
    for (let i = originSeq; i < destinationSeq; i++) {
      legIndexes.push(i);
    }

    // Get seat inventory for required legs
    const inventory = await this.storage.getSeatInventory(tripId, legIndexes);
    
    // Get all bookings for this trip to determine booking types
    const allBookings = await this.storage.getBookings(tripId);
    const activeBookings = allBookings.filter(booking => 
      booking.status === 'paid' || booking.status === 'pending'
    );
    
    // Get all trip stop times to understand the full trip coverage
    const tripStopTimes = await this.storage.getTripStopTimes(tripId);
    const totalStops = tripStopTimes.length;
    
    // Group by seat number and check availability
    const seatAvailability: Record<string, { 
      available: boolean; 
      held: boolean; 
      holdRef?: string; 
      bookedType?: 'main' | 'transit' | null;
    }> = {};
    
    // Initialize all seats as available
    const seatMap = layout.seatMap as any[];
    seatMap.forEach(seat => {
      seatAvailability[seat.seat_no] = { available: true, held: false, bookedType: null };
    });

    // Create a map of seat bookings for efficiency
    const seatBookingMap = new Map<string, 'main' | 'transit'>();
    
    for (const booking of activeBookings) {
      // Check if this booking overlaps with the requested journey
      if (booking.originSeq < destinationSeq && booking.destinationSeq > originSeq) {
        const passengers = await this.storage.getPassengers(booking.id);
        const bookingStopCoverage = booking.destinationSeq - booking.originSeq;
        const totalTripCoverage = totalStops - 1; // Total legs
        
        // If booking covers more than 70% of the trip, consider it "main"
        // Otherwise, consider it "transit"
        const bookingType: 'main' | 'transit' = (bookingStopCoverage / totalTripCoverage) > 0.7 ? 'main' : 'transit';
        
        passengers.forEach(passenger => {
          seatBookingMap.set(passenger.seatNo, bookingType);
        });
      }
    }

    // Check each required leg for seat availability and determine booking type
    inventory.forEach(inv => {
      if (inv.booked) {
        const bookedType = seatBookingMap.get(inv.seatNo) || null;
        seatAvailability[inv.seatNo] = { 
          available: false, 
          held: false, 
          bookedType 
        };
      } else if (inv.holdRef) {
        seatAvailability[inv.seatNo] = { 
          available: false, 
          held: true, 
          holdRef: inv.holdRef,
          bookedType: null
        };
      }
    });

    return {
      trip,
      layout,
      seatAvailability,
      legIndexes
    };
  }

  async getSeatPassengerDetails(tripId: string, seatNo: string, originSeq: number, destinationSeq: number) {
    // Get required leg indexes for this O-D pair
    const legIndexes = [];
    for (let i = originSeq; i < destinationSeq; i++) {
      legIndexes.push(i);
    }

    // Check if seat is booked for these legs
    const inventory = await this.storage.getSeatInventory(tripId, legIndexes);
    const seatInventory = inventory.filter(inv => inv.seatNo === seatNo && inv.booked);
    
    if (seatInventory.length === 0) {
      return { 
        error: 'Seat not booked or available for this journey',
        available: true 
      };
    }

    // Find bookings for this trip and seat
    const allBookings = await this.storage.getBookings(tripId);
    const seatBookings = [];
    
    // Get all trip stop times to understand the full trip coverage for booking type determination
    const tripStopTimes = await this.storage.getTripStopTimes(tripId);
    const totalStops = tripStopTimes.length;
    
    for (const booking of allBookings) {
      if (booking.status === 'paid' || booking.status === 'pending') {
        const passengers = await this.storage.getPassengers(booking.id);
        const seatPassenger = passengers.find(p => p.seatNo === seatNo);
        
        // Include both overlapping bookings and those that completely cover the journey
        if (seatPassenger && 
            booking.originSeq < destinationSeq && 
            booking.destinationSeq > originSeq) {
          const payments = await this.storage.getPayments(booking.id);
          const originStop = await this.storage.getStopById(booking.originStopId);
          const destinationStop = await this.storage.getStopById(booking.destinationStopId);
          
          // Determine booking type based on trip coverage
          const bookingStopCoverage = booking.destinationSeq - booking.originSeq;
          const totalTripCoverage = totalStops - 1; // Total legs
          const bookingType: 'main' | 'transit' = (bookingStopCoverage / totalTripCoverage) > 0.7 ? 'main' : 'transit';
          
          // Determine overlap type with requested journey
          const overlapType = 
            (booking.originSeq <= originSeq && booking.destinationSeq >= destinationSeq) ? 'covers' :
            (booking.originSeq >= originSeq && booking.destinationSeq <= destinationSeq) ? 'within' :
            (booking.originSeq < originSeq && booking.destinationSeq > originSeq && booking.destinationSeq < destinationSeq) ? 'starts_before' :
            (booking.originSeq > originSeq && booking.originSeq < destinationSeq && booking.destinationSeq > destinationSeq) ? 'ends_after' :
            'partial_overlap';
          
          seatBookings.push({
            booking: {
              ...booking,
              originStop,
              destinationStop,
              bookingType,
              overlapType
            },
            passenger: seatPassenger,
            payments
          });
        }
      }
    }

    if (seatBookings.length === 0) {
      return { 
        error: 'No passenger details found for this seat',
        available: false 
      };
    }

    // Sort bookings by relevance: covers -> within -> partial overlaps
    seatBookings.sort((a, b) => {
      const relevanceOrder = { covers: 0, within: 1, starts_before: 2, ends_after: 3, partial_overlap: 4 };
      const aRelevance = relevanceOrder[a.booking.overlapType as keyof typeof relevanceOrder] || 99;
      const bRelevance = relevanceOrder[b.booking.overlapType as keyof typeof relevanceOrder] || 99;
      return aRelevance - bRelevance;
    });

    return {
      seatNo,
      bookings: seatBookings,
      available: false
    };
  }
}
