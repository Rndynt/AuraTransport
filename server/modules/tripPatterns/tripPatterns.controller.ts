import { Request, Response } from "express";
import { TripPatternsService } from "./tripPatterns.service";
import { IStorage } from "../../routes";
import { insertTripPatternSchema } from "@shared/schema";

export class TripPatternsController {
  private tripPatternsService: TripPatternsService;

  constructor(storage: IStorage) {
    this.tripPatternsService = new TripPatternsService(storage);
  }

  async getAll(req: Request, res: Response) {
    const patterns = await this.tripPatternsService.getAllTripPatterns();
    res.json(patterns);
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const pattern = await this.tripPatternsService.getTripPatternById(id);
    res.json(pattern);
  }

  async create(req: Request, res: Response) {
    const validatedData = insertTripPatternSchema.parse(req.body);
    const pattern = await this.tripPatternsService.createTripPattern(validatedData);
    res.status(201).json(pattern);
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = insertTripPatternSchema.partial().parse(req.body);
    const pattern = await this.tripPatternsService.updateTripPattern(id, validatedData);
    res.json(pattern);
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    await this.tripPatternsService.deleteTripPattern(id);
    res.status(204).send();
  }
}
