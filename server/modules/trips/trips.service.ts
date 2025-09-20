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

  async getTripById(id: string): Promise<Trip> {
    const trip = await this.storage.getTripById(id);
    if (!trip) {
      throw new Error(`Trip with id ${id} not found`);
    }
    return trip;
  }

  async createTrip(data: InsertTrip): Promise<Trip> {
    return await this.storage.createTrip(data);
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
    
    // Group by seat number and check availability
    const seatAvailability: Record<string, { available: boolean; held: boolean; holdRef?: string }> = {};
    
    // Initialize all seats as available
    const seatMap = layout.seatMap as any[];
    seatMap.forEach(seat => {
      seatAvailability[seat.seat_no] = { available: true, held: false };
    });

    // Check each required leg for seat availability
    inventory.forEach(inv => {
      if (inv.booked) {
        seatAvailability[inv.seatNo] = { available: false, held: false };
      } else if (inv.holdRef) {
        seatAvailability[inv.seatNo] = { 
          available: false, 
          held: true, 
          holdRef: inv.holdRef 
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
}
