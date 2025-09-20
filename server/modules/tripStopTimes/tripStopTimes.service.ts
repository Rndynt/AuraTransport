import { IStorage } from "../../routes";
import { InsertTripStopTime, TripStopTime } from "@shared/schema";

export class TripStopTimesService {
  constructor(private storage: IStorage) {}

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
}
