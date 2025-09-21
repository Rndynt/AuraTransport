import { Request, Response } from "express";
import { TripStopTimesService } from "./tripStopTimes.service";
import { IStorage } from "../../routes";
import { insertTripStopTimeSchema, bulkUpsertTripStopTimeSchema } from "@shared/schema";
import { z } from "zod";

export class TripStopTimesController {
  private tripStopTimesService: TripStopTimesService;

  constructor(storage: IStorage) {
    this.tripStopTimesService = new TripStopTimesService(storage);
  }

  async getByTrip(req: Request, res: Response) {
    const { tripId } = req.params;
    const stopTimes = await this.tripStopTimesService.getTripStopTimes(tripId);
    res.json(stopTimes);
  }

  async create(req: Request, res: Response) {
    const validatedData = insertTripStopTimeSchema.parse(req.body);
    const stopTime = await this.tripStopTimesService.createTripStopTime(validatedData);
    res.status(201).json(stopTime);
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = insertTripStopTimeSchema.partial().parse(req.body);
    const stopTime = await this.tripStopTimesService.updateTripStopTime(id, validatedData);
    res.json(stopTime);
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    await this.tripStopTimesService.deleteTripStopTime(id);
    res.status(204).send();
  }

  async getByTripWithEffectiveFlags(req: Request, res: Response) {
    const { tripId } = req.params;
    const stopTimes = await this.tripStopTimesService.getTripStopTimesWithEffectiveFlags(tripId);
    res.json(stopTimes);
  }

  async bulkUpsert(req: Request, res: Response) {
    const { tripId } = req.params;
    
    // Validate request body
    const validatedData = z.array(bulkUpsertTripStopTimeSchema).parse(req.body);
    
    // Check if trip has bookings - if so, only allow time edits, not reordering
    const hasBookings = await this.tripStopTimesService.storage.tripHasBookings(tripId);
    if (hasBookings) {
      // Verify that stop sequences are not being changed
      const existingStopTimes = await this.tripStopTimesService.getTripStopTimes(tripId);
      const existingSequences = existingStopTimes
        .sort((a, b) => a.stopSequence - b.stopSequence)
        .map(st => ({ stopId: st.stopId, stopSequence: st.stopSequence }));
      
      const newSequences = validatedData
        .sort((a, b) => a.stopSequence - b.stopSequence)
        .map(st => ({ stopId: st.stopId, stopSequence: st.stopSequence }));
      
      // Check if sequences match
      const sequencesMatch = existingSequences.length === newSequences.length &&
        existingSequences.every((existing, index) => 
          existing.stopId === newSequences[index].stopId && 
          existing.stopSequence === newSequences[index].stopSequence
        );
      
      if (!sequencesMatch) {
        return res.status(400).json({
          error: 'Cannot reorder stops when trip has bookings. Only time edits are allowed.',
          code: 'trip-has-bookings'
        });
      }
    }
    
    // Validate chronological order
    const sortedStopTimes = validatedData.sort((a, b) => a.stopSequence - b.stopSequence);
    let previousDepartTime: Date | null = null;
    
    for (const stopTime of sortedStopTimes) {
      const arriveTime = stopTime.arriveAt;
      const departTime = stopTime.departAt;
      
      // Check chronological order
      if (previousDepartTime && arriveTime && arriveTime < previousDepartTime) {
        return res.status(400).json({
          error: `Arrival time at stop sequence ${stopTime.stopSequence} must be after previous departure time`,
          code: 'invalid-chronological-order'
        });
      }
      
      // Check that departure is after arrival at same stop
      if (arriveTime && departTime && departTime < arriveTime) {
        return res.status(400).json({
          error: `Departure time must be after arrival time at stop sequence ${stopTime.stopSequence}`,
          code: 'invalid-stop-times'
        });
      }
      
      previousDepartTime = departTime || arriveTime || null;
    }
    
    await this.tripStopTimesService.bulkUpsertTripStopTimes(tripId, validatedData);
    res.json({ success: true, message: 'Trip stop times updated successfully' });
  }

  async deriveLegs(req: Request, res: Response) {
    const { tripId } = req.params;
    await this.tripStopTimesService.deriveLegs(tripId);
    res.json({ success: true, message: 'Trip legs derived successfully' });
  }

  async precomputeSeatInventory(req: Request, res: Response) {
    const { tripId } = req.params;
    await this.tripStopTimesService.precomputeSeatInventory(tripId);
    res.json({ success: true, message: 'Seat inventory precomputed successfully' });
  }
}
