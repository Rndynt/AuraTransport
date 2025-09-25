import { Request, Response } from "express";
import { TripBasesService } from "./tripBases.service";
import { z } from "zod";
import { insertTripBaseSchema } from "@shared/schema";

export class TripBasesController {
  constructor(private tripBasesService: TripBasesService) {}

  async getAllTripBases(req: Request, res: Response): Promise<void> {
    try {
      const tripBases = await this.tripBasesService.getAllTripBases();
      res.json(tripBases);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getTripBaseById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tripBase = await this.tripBasesService.getTripBaseById(id);
      res.json(tripBase);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  }

  async createTripBase(req: Request, res: Response): Promise<void> {
    try {
      const data = insertTripBaseSchema.parse(req.body);
      const tripBase = await this.tripBasesService.createTripBase(data);
      res.status(201).json(tripBase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  }

  async updateTripBase(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = insertTripBaseSchema.partial().parse(req.body);
      const tripBase = await this.tripBasesService.updateTripBase(id, data);
      res.json(tripBase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  }

  async deleteTripBase(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.tripBasesService.deleteTripBase(id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  }

  async materializeTrip(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        baseId: z.string().uuid(),
        serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
      });
      
      const { baseId, serviceDate } = schema.parse(req.body);
      const tripId = await this.tripBasesService.ensureMaterializedTrip(baseId, serviceDate);
      
      res.json({ tripId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else if (error instanceof Error && error.message === 'base-not-eligible') {
        res.status(400).json({ code: 'base-not-eligible', message: 'Trip base is not eligible for the specified date' });
      } else {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  }

  async closeTrip(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const trip = await this.tripBasesService.closeTrip(id);
      res.json({ ok: true, tripId: trip.id, status: trip.status });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  }
}