import { Request, Response } from "express";
import { StopsService } from "./stops.service";
import { IStorage } from "../../routes";
import { insertStopSchema } from "@shared/schema";

export class StopsController {
  private stopsService: StopsService;

  constructor(storage: IStorage) {
    this.stopsService = new StopsService(storage);
  }

  async getAll(req: Request, res: Response) {
    const stops = await this.stopsService.getAllStops();
    res.json(stops);
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const stop = await this.stopsService.getStopById(id);
    res.json(stop);
  }

  async create(req: Request, res: Response) {
    const validatedData = insertStopSchema.parse(req.body);
    const stop = await this.stopsService.createStop(validatedData);
    res.status(201).json(stop);
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = insertStopSchema.partial().parse(req.body);
    const stop = await this.stopsService.updateStop(id, validatedData);
    res.json(stop);
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    await this.stopsService.deleteStop(id);
    res.status(204).send();
  }
}
