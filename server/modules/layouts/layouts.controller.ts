import { Request, Response } from "express";
import { LayoutsService } from "./layouts.service";
import { IStorage } from "../../routes";
import { insertLayoutSchema } from "@shared/schema";

export class LayoutsController {
  private layoutsService: LayoutsService;

  constructor(storage: IStorage) {
    this.layoutsService = new LayoutsService(storage);
  }

  async getAll(req: Request, res: Response) {
    const layouts = await this.layoutsService.getAllLayouts();
    res.json(layouts);
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const layout = await this.layoutsService.getLayoutById(id);
    res.json(layout);
  }

  async create(req: Request, res: Response) {
    const validatedData = insertLayoutSchema.parse(req.body);
    const layout = await this.layoutsService.createLayout(validatedData);
    res.status(201).json(layout);
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = insertLayoutSchema.partial().parse(req.body);
    const layout = await this.layoutsService.updateLayout(id, validatedData);
    res.json(layout);
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    await this.layoutsService.deleteLayout(id);
    res.status(204).send();
  }
}
