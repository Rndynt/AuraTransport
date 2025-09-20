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
    passengers: InsertPassenger[],
    payment: InsertPayment,
    idempotencyKey?: string
  ): Promise<{ booking: Booking; printPayload: any }> {
    
    // Validate that all required seats are held
    const legIndexes = [];
    for (let i = bookingData.originSeq; i < bookingData.destinationSeq; i++) {
      legIndexes.push(i);
    }

    // Check seat holds for all passengers
    for (const passenger of passengers) {
      const isHeld = await this.holdsService.isSeatHeld(
        bookingData.tripId,
        passenger.seatNo,
        legIndexes
      );
      
      if (!isHeld) {
        throw new Error(`Seat ${passenger.seatNo} is not held or hold has expired`);
      }
    }

    // Calculate pricing
    const fareQuote = await this.pricingService.quoteFare(
      bookingData.tripId,
      bookingData.originSeq,
      bookingData.destinationSeq
    );

    // Create booking in transaction
    const booking = await this.storage.createBooking({
      ...bookingData,
      totalAmount: fareQuote.total.toString()
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
      ...payment,
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

  async createHold(tripId: string, seatNo: string, originSeq: number, destinationSeq: number, ttlSeconds: number = 120): Promise<string> {
    const legIndexes = [];
    for (let i = originSeq; i < destinationSeq; i++) {
      legIndexes.push(i);
    }

    return await this.holdsService.createSeatHold(tripId, seatNo, legIndexes, ttlSeconds);
  }

  async releaseHold(holdRef: string): Promise<void> {
    await this.holdsService.releaseHoldByRef(holdRef);
  }
}
