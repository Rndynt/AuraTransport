import { IStorage } from "../../routes";
import { InsertBooking, Booking, InsertPassenger, InsertPayment, InsertPrintJob } from "@shared/schema";
import { HoldsService } from "../holds/holds.service";
import { PricingService } from "../pricing/pricing.service";
import { PrintService } from "../printing/print.service";

export class BookingsService {
  private holdsService: HoldsService;
  private pricingService: PricingService;
  private printService: PrintService;

  constructor(private storage: IStorage) {
    this.holdsService = new HoldsService();
    this.pricingService = new PricingService(storage);
    this.printService = new PrintService();
  }

  async getAllBookings(tripId?: string): Promise<Booking[]> {
    return await this.storage.getBookings(tripId);
  }

  async getBookingById(id: string): Promise<Booking> {
    const booking = await this.storage.getBookingById(id);
    if (!booking) {
      throw new Error(`Booking with id ${id} not found`);
    }
    return booking;
  }

  async createBooking(
    bookingData: InsertBooking,
    passengers: { fullName: string; phone?: string; idNumber?: string; seatNo: string }[],
    payment: { method: 'cash' | 'qr' | 'ewallet' | 'bank'; amount: number },
    idempotencyKey?: string
  ): Promise<{ booking: Booking; printPayload: any }> {
    
    // Validate boarding and alighting rules
    await this.validateBoardingAlightingRules(
      bookingData.tripId,
      bookingData.originSeq,
      bookingData.destinationSeq
    );
    
    // Validate that all required seats are held
    const legIndexes = [];
    for (let i = bookingData.originSeq; i < bookingData.destinationSeq; i++) {
      legIndexes.push(i);
    }

    // Check seat holds for all passengers and verify ownership
    for (const passenger of passengers) {
      const isHeld = await this.holdsService.isSeatHeld(
        bookingData.tripId,
        passenger.seatNo,
        legIndexes
      );
      
      if (!isHeld) {
        throw new Error(`Seat ${passenger.seatNo} is not held or hold has expired`);
      }

      // Verify hold ownership by checking the first leg
      const holdInfo = await this.holdsService.getSeatHoldInfo(
        bookingData.tripId,
        passenger.seatNo,
        legIndexes[0]
      );
      
      if (!holdInfo || holdInfo.owner.operatorId !== (bookingData.createdBy || 'default-operator')) {
        throw new Error(`Seat ${passenger.seatNo} is not held by your operator`);
      }
    }

    // Calculate pricing
    const fareQuote = await this.pricingService.quoteFare(
      bookingData.tripId,
      bookingData.originSeq,
      bookingData.destinationSeq
    );

    // Validate payment amount matches fare quote (multiply by number of passengers)
    const expectedTotal = Number(fareQuote.total) * passengers.length;
    const paymentAmount = Number(payment.amount);
    if (Math.abs(paymentAmount - expectedTotal) > 0.01) {
      throw new Error(`Payment amount ${paymentAmount} does not match expected total ${expectedTotal}`);
    }

    // Create booking in transaction
    const booking = await this.storage.createBooking({
      ...bookingData,
      totalAmount: expectedTotal.toString()
    });

    // Create passengers
    for (const passengerData of passengers) {
      await this.storage.createPassenger({
        ...passengerData,
        bookingId: booking.id,
        fareAmount: fareQuote.perPassenger.toString(),
        fareBreakdown: fareQuote.breakdown
      });

      // Mark seats as booked and release holds
      await this.storage.updateSeatInventory(
        bookingData.tripId,
        passengerData.seatNo,
        legIndexes,
        { booked: true, holdRef: null }
      );

      // Release the hold
      await this.holdsService.releaseSeatHold(
        bookingData.tripId,
        passengerData.seatNo,
        legIndexes
      );
    }

    // Create payment
    await this.storage.createPayment({
      method: payment.method,
      amount: payment.amount.toString(),
      bookingId: booking.id
    });

    // Create print job
    await this.storage.createPrintJob({
      bookingId: booking.id,
      status: 'queued'
    });

    // Generate print payload
    const printPayload = await this.printService.generatePrintPayload(booking.id);

    return { booking, printPayload };
  }

  private async validateBoardingAlightingRules(
    tripId: string,
    originSeq: number,
    destinationSeq: number
  ): Promise<void> {
    // Get trip stop times with effective flags
    const stopTimes = await this.storage.getTripStopTimesWithEffectiveFlags(tripId);
    
    // Find origin and destination stops
    const originStop = stopTimes.find(st => st.stopSequence === originSeq);
    const destinationStop = stopTimes.find(st => st.stopSequence === destinationSeq);
    
    if (!originStop) {
      throw new Error(`Origin stop at sequence ${originSeq} not found`);
    }
    
    if (!destinationStop) {
      throw new Error(`Destination stop at sequence ${destinationSeq} not found`);
    }
    
    // Check boarding allowed at origin
    if (!originStop.effectiveBoardingAllowed) {
      const error = new Error('Boarding not allowed at this stop');
      (error as any).code = 'boarding-not-allowed';
      throw error;
    }
    
    // Check alighting allowed at destination
    if (!destinationStop.effectiveAlightingAllowed) {
      const error = new Error('Alighting not allowed at this stop');
      (error as any).code = 'alighting-not-allowed';
      throw error;
    }
  }

  async createHold(
    tripId: string, 
    seatNo: string, 
    originSeq: number, 
    destinationSeq: number, 
    ttlSeconds: number = 120,
    operatorId: string = 'default-operator'
  ): Promise<{ ok: boolean; holdRef?: string; expiresAt?: number; ownedByYou?: boolean; reason?: string }> {
    const legIndexes = [];
    for (let i = originSeq; i < destinationSeq; i++) {
      legIndexes.push(i);
    }

    const ttlClass = ttlSeconds <= 120 ? 'short' : 'long';
    return await this.holdsService.createSeatHold(
      tripId, 
      seatNo, 
      legIndexes, 
      ttlClass,
      { operatorId }
    );
  }

  async releaseHold(holdRef: string): Promise<void> {
    await this.holdsService.releaseHoldByRef(holdRef);
  }

  async createPendingBooking(
    bookingData: InsertBooking,
    passengers: { fullName: string; phone?: string; idNumber?: string; seatNo: string }[],
    operatorId: string
  ): Promise<{ booking: Booking; pendingExpiresAt: Date }> {
    const { getConfig } = await import("../../config");
    const config = getConfig();
    
    // Validate that all required seats are held by this operator
    const legIndexes = [];
    for (let i = bookingData.originSeq; i < bookingData.destinationSeq; i++) {
      legIndexes.push(i);
    }

    // Check seat holds for all passengers and verify ownership
    for (const passenger of passengers) {
      const isHeld = await this.holdsService.isSeatHeld(
        bookingData.tripId,
        passenger.seatNo,
        legIndexes
      );
      
      if (!isHeld) {
        throw new Error(`Seat ${passenger.seatNo} is not held or hold has expired`);
      }

      // Verify hold ownership by checking the first leg
      const holdInfo = await this.holdsService.getSeatHoldInfo(
        bookingData.tripId,
        passenger.seatNo,
        legIndexes[0]
      );
      
      if (!holdInfo || holdInfo.owner.operatorId !== operatorId) {
        throw new Error(`Seat ${passenger.seatNo} is not held by your operator`);
      }
    }

    // Calculate pricing
    const fareQuote = await this.pricingService.quoteFare(
      bookingData.tripId,
      bookingData.originSeq,
      bookingData.destinationSeq
    );

    // Set pending expiration
    const now = new Date();
    const pendingExpiresAt = new Date(now.getTime() + (config.holdTtlLongSeconds * 1000));

    // Create pending booking
    const expectedTotal = Number(fareQuote.total) * passengers.length;
    const booking = await this.storage.createBooking({
      ...bookingData,
      status: 'pending',
      totalAmount: expectedTotal.toString(),
      pendingExpiresAt
    });

    // Create passengers
    for (const passengerData of passengers) {
      await this.storage.createPassenger({
        ...passengerData,
        bookingId: booking.id,
        fareAmount: fareQuote.perPassenger.toString(),
        fareBreakdown: fareQuote.breakdown
      });
    }

    // Convert short holds to long holds and tie them to this booking
    await this.holdsService.convertHoldsToLong(operatorId, booking.id);

    return { booking, pendingExpiresAt };
  }

  async getPendingBookings(outletId?: string, operatorId?: string): Promise<Booking[]> {
    // Get all pending bookings
    const allBookings = await this.storage.getBookings();
    
    let pendingBookings = allBookings.filter(b => 
      b.status === 'pending' && 
      b.pendingExpiresAt && 
      new Date(b.pendingExpiresAt) > new Date()
    );

    // Filter by outlet if provided
    if (outletId) {
      pendingBookings = pendingBookings.filter(b => b.outletId === outletId);
    }

    // TODO: Add operator filtering once we have operator tracking in bookings
    // For now, we'll use the createdBy field as a proxy
    if (operatorId) {
      pendingBookings = pendingBookings.filter(b => b.createdBy === operatorId);
    }

    return pendingBookings;
  }

  async releasePendingBooking(bookingId: string, operatorId: string): Promise<void> {
    const booking = await this.storage.getBookingById(bookingId);
    if (!booking) {
      throw new Error(`Booking with id ${bookingId} not found`);
    }

    if (booking.status !== 'pending') {
      throw new Error(`Booking ${bookingId} is not in pending status`);
    }

    // Release holds associated with this booking
    await this.holdsService.releaseHoldsByOwner(operatorId, bookingId);

    // Cancel the booking
    await this.storage.updateBooking(bookingId, { status: 'canceled' });
  }

  // Auto-cleanup method for expired pending bookings
  async cleanupExpiredPendingBookings(): Promise<void> {
    const now = new Date();
    const allBookings = await this.storage.getBookings();
    
    const expiredPendingBookings = allBookings.filter(b => 
      b.status === 'pending' && 
      b.pendingExpiresAt && 
      new Date(b.pendingExpiresAt) <= now
    );

    for (const booking of expiredPendingBookings) {
      try {
        // Release holds associated with this booking
        // We don't have operatorId here, so we'll release by booking ID
        const passengers = await this.storage.getPassengers(booking.id);
        for (const passenger of passengers) {
          const legIndexes = [];
          for (let i = booking.originSeq; i < booking.destinationSeq; i++) {
            legIndexes.push(i);
          }
          await this.holdsService.releaseSeatHold(booking.tripId, passenger.seatNo, legIndexes);
        }

        // Cancel the booking
        await this.storage.updateBooking(booking.id, { status: 'canceled' });
      } catch (error) {
        console.error(`Failed to cleanup expired booking ${booking.id}:`, error);
      }
    }
  }
}
