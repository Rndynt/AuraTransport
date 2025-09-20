import { Request, Response } from "express";
import { PatternStopsService } from "./patternStops.service";
import { IStorage } from "../../routes";
import { insertPatternStopSchema } from "@shared/schema";

export class PatternStopsController {
  private patternStopsService: PatternStopsService;

  constructor(storage: IStorage) {
    this.patternStopsService = new PatternStopsService(storage);
  }

  async getByPattern(req: Request, res: Response) {
    const { patternId } = req.params;
    const patternStops = await this.patternStopsService.getPatternStops(patternId);
    res.json(patternStops);
  }

  async create(req: Request, res: Response) {
    const validatedData = insertPatternStopSchema.parse(req.body);
    const patternStop = await this.patternStopsService.createPatternStop(validatedData);
    res.status(201).json(patternStop);
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = insertPatternStopSchema.partial().parse(req.body);
    const patternStop = await this.patternStopsService.updatePatternStop(id, validatedData);
    res.json(patternStop);
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    await this.patternStopsService.deletePatternStop(id);
    res.status(204).send();
  }
}
