import { IStorage } from "../../routes";
import { Trip, SeatInventory } from "@shared/schema";

export class SeatInventoryService {
  constructor(private storage: IStorage) {}

  async getSeatInventory(tripId: string, legIndexes?: number[]): Promise<SeatInventory[]> {
    return await this.storage.getSeatInventory(tripId, legIndexes);
  }

  async precomputeInventory(trip: Trip): Promise<void> {
    // Get the vehicle layout
    const vehicle = await this.storage.getVehicleById(trip.vehicleId);
    const layout = await this.storage.getLayoutById(vehicle.layoutId);
    
    if (!layout) {
      throw new Error("Vehicle layout not found");
    }

    // Get trip legs
    const legs = await this.storage.getTripLegs(trip.id);
    
    if (legs.length === 0) {
      throw new Error("Trip has no legs. Run derive-legs first.");
    }

    // Clear existing inventory
    await this.storage.deleteSeatInventory(trip.id);

    // Create inventory entries for each seat-leg combination
    const seatMap = layout.seatMap as any[];
    const inventoryEntries = [];

    for (const seat of seatMap) {
      if (seat.disabled) continue; // Skip disabled seats

      for (const leg of legs) {
        inventoryEntries.push({
          tripId: trip.id,
          seatNo: seat.seat_no,
          legIndex: leg.legIndex,
          booked: false,
          holdRef: null
        });
      }
    }

    // Insert all inventory entries
    await this.storage.createSeatInventory(inventoryEntries);
  }
}
