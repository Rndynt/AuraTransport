import { Request, Response } from "express";
import { PaymentsService } from "./payments.service";
import { IStorage } from "../../routes";
import { insertPaymentSchema } from "@shared/schema";

export class PaymentsController {
  private paymentsService: PaymentsService;

  constructor(storage: IStorage) {
    this.paymentsService = new PaymentsService(storage);
  }

  async getByBooking(req: Request, res: Response) {
    const { bookingId } = req.params;
    const payments = await this.paymentsService.getPaymentsByBooking(bookingId);
    res.json(payments);
  }

  async create(req: Request, res: Response) {
    const validatedData = insertPaymentSchema.parse(req.body);
    const payment = await this.paymentsService.createPayment(validatedData);
    res.status(201).json(payment);
  }
}
