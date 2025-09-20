import { Request, Response } from "express";
import { BookingsService } from "./bookings.service";
import { IStorage } from "../../routes";
import { insertBookingSchema, insertPassengerSchema, insertPaymentSchema } from "@shared/schema";
import { z } from "zod";

const createBookingSchema = z.object({
  tripId: z.string().uuid(),
  outletId: z.string().uuid().optional(),
  originStopId: z.string().uuid(),
  destinationStopId: z.string().uuid(),
  originSeq: z.number(),
  destinationSeq: z.number(),
  channel: z.enum(['CSO', 'WEB', 'APP', 'OTA']).default('CSO'),
  createdBy: z.string().optional(),
  passengers: z.array(z.object({
    fullName: z.string(),
    phone: z.string().optional(),
    idNumber: z.string().optional(),
    seatNo: z.string()
  })),
  payment: z.object({
    method: z.enum(['cash', 'qr', 'ewallet', 'bank']),
    amount: z.number()
  })
});

const createHoldSchema = z.object({
  tripId: z.string().uuid(),
  seatNo: z.string(),
  originSeq: z.number(),
  destinationSeq: z.number(),
  ttlSeconds: z.number().default(120)
});

export class BookingsController {
  private bookingsService: BookingsService;

  constructor(storage: IStorage) {
    this.bookingsService = new BookingsService(storage);
  }

  async getAll(req: Request, res: Response) {
    const { tripId } = req.query;
    const bookings = await this.bookingsService.getAllBookings(tripId as string);
    res.json(bookings);
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const booking = await this.bookingsService.getBookingById(id);
    res.json(booking);
  }

  async create(req: Request, res: Response) {
    const idempotencyKey = req.headers['idempotency-key'] as string;
    const validatedData = createBookingSchema.parse(req.body);
    
    const { passengers, payment, ...bookingData } = validatedData;
    
    const result = await this.bookingsService.createBooking(
      bookingData,
      passengers,
      payment,
      idempotencyKey
    );
    
    res.status(201).json(result);
  }

  async createHold(req: Request, res: Response) {
    const validatedData = createHoldSchema.parse(req.body);
    const holdRef = await this.bookingsService.createHold(
      validatedData.tripId,
      validatedData.seatNo,
      validatedData.originSeq,
      validatedData.destinationSeq,
      validatedData.ttlSeconds
    );
    
    res.status(201).json({ holdRef, expiresAt: Date.now() + (validatedData.ttlSeconds * 1000) });
  }

  async releaseHold(req: Request, res: Response) {
    const { holdRef } = req.params;
    await this.bookingsService.releaseHold(holdRef);
    res.status(204).send();
  }
}
