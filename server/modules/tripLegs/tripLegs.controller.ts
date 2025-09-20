import { Request, Response } from "express";
import { TripLegsService } from "./tripLegs.service";
import { IStorage } from "../../routes";

export class TripLegsController {
  private tripLegsService: TripLegsService;

  constructor(storage: IStorage) {
    this.tripLegsService = new TripLegsService(storage);
  }

  async getByTrip(req: Request, res: Response) {
    const { tripId } = req.params;
    const legs = await this.tripLegsService.getTripLegs(tripId);
    res.json(legs);
  }
}
