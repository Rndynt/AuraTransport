import { Request, Response } from "express";
import { OutletsService } from "./outlets.service";
import { IStorage } from "../../routes";
import { insertOutletSchema } from "@shared/schema";

export class OutletsController {
  private outletsService: OutletsService;

  constructor(storage: IStorage) {
    this.outletsService = new OutletsService(storage);
  }

  async getAll(req: Request, res: Response) {
    const outlets = await this.outletsService.getAllOutlets();
    res.json(outlets);
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const outlet = await this.outletsService.getOutletById(id);
    res.json(outlet);
  }

  async create(req: Request, res: Response) {
    const validatedData = insertOutletSchema.parse(req.body);
    const outlet = await this.outletsService.createOutlet(validatedData);
    res.status(201).json(outlet);
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = insertOutletSchema.partial().parse(req.body);
    const outlet = await this.outletsService.updateOutlet(id, validatedData);
    res.json(outlet);
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    await this.outletsService.deleteOutlet(id);
    res.status(204).send();
  }
}
