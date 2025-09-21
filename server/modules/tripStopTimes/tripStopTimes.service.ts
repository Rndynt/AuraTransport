import { IStorage } from "../../routes";
import { InsertTripStopTime, TripStopTime, Trip } from "@shared/schema";
import { TripLegsService } from "../tripLegs/tripLegs.service";
import { SeatInventoryService } from "../seatInventory/seatInventory.service";

export class TripStopTimesService {
  public storage: IStorage; // Make public so controller can access it
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async getTripStopTimes(tripId: string): Promise<TripStopTime[]> {
    return await this.storage.getTripStopTimes(tripId);
  }

  async createTripStopTime(data: InsertTripStopTime): Promise<TripStopTime> {
    return await this.storage.createTripStopTime(data);
  }

  async updateTripStopTime(id: string, data: Partial<InsertTripStopTime>): Promise<TripStopTime> {
    return await this.storage.updateTripStopTime(id, data);
  }

  async deleteTripStopTime(id: string): Promise<void> {
    await this.storage.deleteTripStopTime(id);
  }

  async getTripStopTimesWithEffectiveFlags(tripId: string): Promise<any[]> {
    return await this.storage.getTripStopTimesWithEffectiveFlags(tripId);
  }

  async bulkUpsertTripStopTimes(tripId: string, stopTimes: any[]): Promise<void> {
    await this.storage.bulkUpsertTripStopTimes(tripId, stopTimes);
  }

  async deriveLegs(tripId: string): Promise<void> {
    const tripLegsService = new TripLegsService(this.storage);
    const trip = await this.storage.getTripById(tripId);
    if (!trip) {
      throw new Error(`Trip with id ${tripId} not found`);
    }
    await tripLegsService.deriveLegsFromTrip(trip);
  }

  async precomputeSeatInventory(tripId: string): Promise<void> {
    const seatInventoryService = new SeatInventoryService(this.storage);
    const trip = await this.storage.getTripById(tripId);
    if (!trip) {
      throw new Error(`Trip with id ${tripId} not found`);
    }
    await seatInventoryService.precomputeInventory(trip);
  }
}
