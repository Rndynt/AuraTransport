import { Request, Response } from "express";
import { PriceRulesService } from "./priceRules.service";
import { IStorage } from "../../routes";
import { insertPriceRuleSchema } from "@shared/schema";

export class PriceRulesController {
  private priceRulesService: PriceRulesService;

  constructor(storage: IStorage) {
    this.priceRulesService = new PriceRulesService(storage);
  }

  async getAll(req: Request, res: Response) {
    const rules = await this.priceRulesService.getAllPriceRules();
    res.json(rules);
  }

  async create(req: Request, res: Response) {
    const validatedData = insertPriceRuleSchema.parse(req.body);
    const rule = await this.priceRulesService.createPriceRule(validatedData);
    res.status(201).json(rule);
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = insertPriceRuleSchema.partial().parse(req.body);
    const rule = await this.priceRulesService.updatePriceRule(id, validatedData);
    res.json(rule);
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    await this.priceRulesService.deletePriceRule(id);
    res.status(204).send();
  }
}
