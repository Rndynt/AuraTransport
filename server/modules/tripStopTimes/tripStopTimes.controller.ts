import { Request, Response } from "express";
import { TripStopTimesService } from "./tripStopTimes.service";
import { IStorage } from "../../routes";
import { insertTripStopTimeSchema } from "@shared/schema";

export class TripStopTimesController {
  private tripStopTimesService: TripStopTimesService;

  constructor(storage: IStorage) {
    this.tripStopTimesService = new TripStopTimesService(storage);
  }

  async getByTrip(req: Request, res: Response) {
    const { tripId } = req.params;
    const stopTimes = await this.tripStopTimesService.getTripStopTimes(tripId);
    res.json(stopTimes);
  }

  async create(req: Request, res: Response) {
    const validatedData = insertTripStopTimeSchema.parse(req.body);
    const stopTime = await this.tripStopTimesService.createTripStopTime(validatedData);
    res.status(201).json(stopTime);
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = insertTripStopTimeSchema.partial().parse(req.body);
    const stopTime = await this.tripStopTimesService.updateTripStopTime(id, validatedData);
    res.json(stopTime);
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    await this.tripStopTimesService.deleteTripStopTime(id);
    res.status(204).send();
  }
}
