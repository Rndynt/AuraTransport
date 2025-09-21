import { Request, Response } from "express";
import { TripsService } from "./trips.service";
import { IStorage } from "../../routes";
import { insertTripSchema } from "@shared/schema";
import { z } from "zod";

export class TripsController {
  private tripsService: TripsService;

  constructor(storage: IStorage) {
    this.tripsService = new TripsService(storage);
  }

  async getAll(req: Request, res: Response) {
    const { date } = req.query;
    const trips = await this.tripsService.getAllTrips(date as string);
    res.json(trips);
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const trip = await this.tripsService.getTripById(id);
    res.json(trip);
  }

  async create(req: Request, res: Response) {
    const validatedData = insertTripSchema.parse(req.body);
    const trip = await this.tripsService.createTrip(validatedData);
    res.status(201).json(trip);
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = insertTripSchema.partial().parse(req.body);
    const trip = await this.tripsService.updateTrip(id, validatedData);
    res.json(trip);
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    await this.tripsService.deleteTrip(id);
    res.status(204).send();
  }

  async deriveLegs(req: Request, res: Response) {
    const { id } = req.params;
    await this.tripsService.deriveLegs(id);
    res.json({ message: "Trip legs derived successfully" });
  }

  async precomputeSeatInventory(req: Request, res: Response) {
    const { id } = req.params;
    await this.tripsService.precomputeSeatInventory(id);
    res.json({ message: "Seat inventory precomputed successfully" });
  }

  async getSeatmap(req: Request, res: Response) {
    const { id } = req.params;
    const schema = z.object({
      originSeq: z.coerce.number(),
      destinationSeq: z.coerce.number()
    });
    
    const { originSeq, destinationSeq } = schema.parse(req.query);
    const seatmap = await this.tripsService.getSeatmap(id, originSeq, destinationSeq);
    res.json(seatmap);
  }

  async getSeatPassengerDetails(req: Request, res: Response) {
    const { tripId, seatNo } = req.params;
    const schema = z.object({
      originSeq: z.coerce.number(),
      destinationSeq: z.coerce.number()
    });
    
    const { originSeq, destinationSeq } = schema.parse(req.query);
    const passengerDetails = await this.tripsService.getSeatPassengerDetails(tripId, seatNo, originSeq, destinationSeq);
    res.json(passengerDetails);
  }
}
