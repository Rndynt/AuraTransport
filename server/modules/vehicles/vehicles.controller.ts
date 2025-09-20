import { Request, Response } from "express";
import { VehiclesService } from "./vehicles.service";
import { IStorage } from "../../routes";
import { insertVehicleSchema } from "@shared/schema";

export class VehiclesController {
  private vehiclesService: VehiclesService;

  constructor(storage: IStorage) {
    this.vehiclesService = new VehiclesService(storage);
  }

  async getAll(req: Request, res: Response) {
    const vehicles = await this.vehiclesService.getAllVehicles();
    res.json(vehicles);
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const vehicle = await this.vehiclesService.getVehicleById(id);
    res.json(vehicle);
  }

  async create(req: Request, res: Response) {
    const validatedData = insertVehicleSchema.parse(req.body);
    const vehicle = await this.vehiclesService.createVehicle(validatedData);
    res.status(201).json(vehicle);
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = insertVehicleSchema.partial().parse(req.body);
    const vehicle = await this.vehiclesService.updateVehicle(id, validatedData);
    res.json(vehicle);
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    await this.vehiclesService.deleteVehicle(id);
    res.status(204).send();
  }
}
