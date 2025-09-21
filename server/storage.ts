import { IStorage } from "./routes";
import { 
  stops, outlets, vehicles, layouts, tripPatterns, patternStops, 
  trips, tripStopTimes, tripLegs, seatInventory, priceRules, 
  bookings, passengers, payments, printJobs,
  type Stop, type Outlet, type Vehicle, type Layout, type TripPattern, 
  type PatternStop, type Trip, type TripWithDetails, type TripStopTime, type TripLeg, 
  type SeatInventory, type PriceRule, type Booking, type Passenger, 
  type Payment, type PrintJob,
  type InsertStop, type InsertOutlet, type InsertVehicle, type InsertLayout,
  type InsertTripPattern, type InsertPatternStop, type InsertTrip,
  type InsertTripStopTime, type InsertTripLeg, type InsertSeatInventory,
  type InsertPriceRule, type InsertBooking, type InsertPassenger,
  type InsertPayment, type InsertPrintJob
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // Stops
  async getStops(): Promise<Stop[]> {
    return await db.select().from(stops).orderBy(stops.name);
  }

  async getStopById(id: string): Promise<Stop | undefined> {
    const [stop] = await db.select().from(stops).where(eq(stops.id, id));
    return stop;
  }

  async createStop(data: InsertStop): Promise<Stop> {
    const [stop] = await db.insert(stops).values(data).returning();
    return stop;
  }

  async updateStop(id: string, data: Partial<InsertStop>): Promise<Stop> {
    const [stop] = await db.update(stops).set(data).where(eq(stops.id, id)).returning();
    return stop;
  }

  async deleteStop(id: string): Promise<void> {
    await db.delete(stops).where(eq(stops.id, id));
  }

  // Outlets
  async getOutlets(): Promise<Outlet[]> {
    return await db.select().from(outlets).orderBy(outlets.name);
  }

  async getOutletById(id: string): Promise<Outlet | undefined> {
    const [outlet] = await db.select().from(outlets).where(eq(outlets.id, id));
    return outlet;
  }

  async createOutlet(data: InsertOutlet): Promise<Outlet> {
    const [outlet] = await db.insert(outlets).values(data).returning();
    return outlet;
  }

  async updateOutlet(id: string, data: Partial<InsertOutlet>): Promise<Outlet> {
    const [outlet] = await db.update(outlets).set(data).where(eq(outlets.id, id)).returning();
    return outlet;
  }

  async deleteOutlet(id: string): Promise<void> {
    await db.delete(outlets).where(eq(outlets.id, id));
  }

  // Vehicles
  async getVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles).orderBy(vehicles.code);
  }

  async getVehicleById(id: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }

  async createVehicle(data: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db.insert(vehicles).values(data).returning();
    return vehicle;
  }

  async updateVehicle(id: string, data: Partial<InsertVehicle>): Promise<Vehicle> {
    const [vehicle] = await db.update(vehicles).set(data).where(eq(vehicles.id, id)).returning();
    return vehicle;
  }

  async deleteVehicle(id: string): Promise<void> {
    await db.delete(vehicles).where(eq(vehicles.id, id));
  }

  // Layouts
  async getLayouts(): Promise<Layout[]> {
    return await db.select().from(layouts).orderBy(layouts.name);
  }

  async getLayoutById(id: string): Promise<Layout | undefined> {
    const [layout] = await db.select().from(layouts).where(eq(layouts.id, id));
    return layout;
  }

  async createLayout(data: InsertLayout): Promise<Layout> {
    const [layout] = await db.insert(layouts).values(data).returning();
    return layout;
  }

  async updateLayout(id: string, data: Partial<InsertLayout>): Promise<Layout> {
    const [layout] = await db.update(layouts).set(data).where(eq(layouts.id, id)).returning();
    return layout;
  }

  async deleteLayout(id: string): Promise<void> {
    await db.delete(layouts).where(eq(layouts.id, id));
  }

  // Trip Patterns
  async getTripPatterns(): Promise<TripPattern[]> {
    return await db.select().from(tripPatterns).orderBy(tripPatterns.code);
  }

  async getTripPatternById(id: string): Promise<TripPattern | undefined> {
    const [pattern] = await db.select().from(tripPatterns).where(eq(tripPatterns.id, id));
    return pattern;
  }

  async createTripPattern(data: InsertTripPattern): Promise<TripPattern> {
    const [pattern] = await db.insert(tripPatterns).values(data).returning();
    return pattern;
  }

  async updateTripPattern(id: string, data: Partial<InsertTripPattern>): Promise<TripPattern> {
    const [pattern] = await db.update(tripPatterns).set(data).where(eq(tripPatterns.id, id)).returning();
    return pattern;
  }

  async deleteTripPattern(id: string): Promise<void> {
    await db.delete(tripPatterns).where(eq(tripPatterns.id, id));
  }

  // Pattern Stops
  async getPatternStops(patternId: string): Promise<PatternStop[]> {
    return await db.select().from(patternStops)
      .where(eq(patternStops.patternId, patternId))
      .orderBy(patternStops.stopSequence);
  }

  async createPatternStop(data: InsertPatternStop): Promise<PatternStop> {
    const [patternStop] = await db.insert(patternStops).values(data).returning();
    return patternStop;
  }

  async updatePatternStop(id: string, data: Partial<InsertPatternStop>): Promise<PatternStop> {
    const [patternStop] = await db.update(patternStops).set(data).where(eq(patternStops.id, id)).returning();
    return patternStop;
  }

  async deletePatternStop(id: string): Promise<void> {
    await db.delete(patternStops).where(eq(patternStops.id, id));
  }

  async bulkReplacePatternStops(patternId: string, newPatternStops: InsertPatternStop[]): Promise<PatternStop[]> {
    // Use transaction for atomic operation
    const result = await db.transaction(async (tx) => {
      // Delete existing pattern stops for this pattern
      await tx.delete(patternStops).where(eq(patternStops.patternId, patternId));
      
      // Insert new pattern stops if any
      if (newPatternStops.length > 0) {
        return await tx.insert(patternStops).values(newPatternStops).returning();
      }
      
      return [];
    });
    
    return result;
  }

  // Trips
  async getTrips(serviceDate?: string): Promise<TripWithDetails[]> {
    const query = db.select({
      id: trips.id,
      patternId: trips.patternId,
      serviceDate: trips.serviceDate,
      vehicleId: trips.vehicleId,
      layoutId: trips.layoutId,
      capacity: trips.capacity,
      status: trips.status,
      channelFlags: trips.channelFlags,
      createdAt: trips.createdAt,
      // Joined fields
      patternName: tripPatterns.name,
      patternCode: tripPatterns.code,
      vehicleCode: vehicles.code,
      vehiclePlate: vehicles.plate,
      // Get earliest departure time as schedule time
      scheduleTime: sql<string>`(
        SELECT MIN(depart_at) 
        FROM ${tripStopTimes} 
        WHERE ${tripStopTimes.tripId} = ${trips.id}
      )`.as('scheduleTime')
    })
    .from(trips)
    .leftJoin(tripPatterns, eq(trips.patternId, tripPatterns.id))
    .leftJoin(vehicles, eq(trips.vehicleId, vehicles.id));
    
    if (serviceDate) {
      return await query.where(eq(trips.serviceDate, serviceDate)).orderBy(trips.serviceDate);
    }
    return await query.orderBy(desc(trips.serviceDate));
  }

  async getTripById(id: string): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    return trip;
  }

  async createTrip(data: InsertTrip): Promise<Trip> {
    const [trip] = await db.insert(trips).values(data).returning();
    return trip;
  }

  async updateTrip(id: string, data: Partial<InsertTrip>): Promise<Trip> {
    const [trip] = await db.update(trips).set(data).where(eq(trips.id, id)).returning();
    return trip;
  }

  async deleteTrip(id: string): Promise<void> {
    await db.delete(trips).where(eq(trips.id, id));
  }

  // Trip Stop Times
  async getTripStopTimes(tripId: string): Promise<TripStopTime[]> {
    return await db.select().from(tripStopTimes)
      .where(eq(tripStopTimes.tripId, tripId))
      .orderBy(tripStopTimes.stopSequence);
  }

  async createTripStopTime(data: InsertTripStopTime): Promise<TripStopTime> {
    const [tripStopTime] = await db.insert(tripStopTimes).values(data).returning();
    return tripStopTime;
  }

  async updateTripStopTime(id: string, data: Partial<InsertTripStopTime>): Promise<TripStopTime> {
    const [tripStopTime] = await db.update(tripStopTimes).set(data).where(eq(tripStopTimes.id, id)).returning();
    return tripStopTime;
  }

  async deleteTripStopTime(id: string): Promise<void> {
    await db.delete(tripStopTimes).where(eq(tripStopTimes.id, id));
  }

  async getTripStopTimesWithEffectiveFlags(tripId: string): Promise<any[]> {
    // Get trip stop times with joined stop and pattern stop data to calculate effective flags
    const result = await db
      .select({
        id: tripStopTimes.id,
        tripId: tripStopTimes.tripId,
        stopId: tripStopTimes.stopId,
        stopSequence: tripStopTimes.stopSequence,
        arriveAt: tripStopTimes.arriveAt,
        departAt: tripStopTimes.departAt,
        dwellSeconds: tripStopTimes.dwellSeconds,
        tripBoardingAllowed: tripStopTimes.boardingAllowed,
        tripAlightingAllowed: tripStopTimes.alightingAllowed,
        stopName: stops.name,
        stopCode: stops.code,
        patternBoardingAllowed: patternStops.boardingAllowed,
        patternAlightingAllowed: patternStops.alightingAllowed,
      })
      .from(tripStopTimes)
      .leftJoin(stops, eq(tripStopTimes.stopId, stops.id))
      .leftJoin(trips, eq(tripStopTimes.tripId, trips.id))
      .leftJoin(patternStops, and(
        eq(patternStops.patternId, trips.patternId),
        eq(patternStops.stopId, tripStopTimes.stopId)
      ))
      .where(eq(tripStopTimes.tripId, tripId))
      .orderBy(tripStopTimes.stopSequence);

    // Calculate effective flags using coalesce logic
    return result.map(row => ({
      ...row,
      effectiveBoardingAllowed: row.tripBoardingAllowed ?? row.patternBoardingAllowed ?? true,
      effectiveAlightingAllowed: row.tripAlightingAllowed ?? row.patternAlightingAllowed ?? true,
    }));
  }

  async bulkUpsertTripStopTimes(tripId: string, stopTimes: any[]): Promise<void> {
    // Delete existing trip stop times for this trip
    await db.delete(tripStopTimes).where(eq(tripStopTimes.tripId, tripId));
    
    // Insert new stop times
    if (stopTimes.length > 0) {
      const insertData = stopTimes.map(st => ({
        tripId,
        stopId: st.stopId,
        stopSequence: st.stopSequence,
        arriveAt: st.arriveAt,
        departAt: st.departAt,
        dwellSeconds: st.dwellSeconds ?? 0,
        boardingAllowed: st.boardingAllowed,
        alightingAllowed: st.alightingAllowed,
      }));
      
      await db.insert(tripStopTimes).values(insertData);
    }
  }

  // Trip Legs
  async getTripLegs(tripId: string): Promise<TripLeg[]> {
    return await db.select().from(tripLegs)
      .where(eq(tripLegs.tripId, tripId))
      .orderBy(tripLegs.legIndex);
  }

  async createTripLeg(data: InsertTripLeg): Promise<TripLeg> {
    const [tripLeg] = await db.insert(tripLegs).values(data).returning();
    return tripLeg;
  }

  async deleteTripLegs(tripId: string): Promise<void> {
    await db.delete(tripLegs).where(eq(tripLegs.tripId, tripId));
  }

  // Seat Inventory
  async getSeatInventory(tripId: string, legIndexes?: number[]): Promise<SeatInventory[]> {
    if (legIndexes && legIndexes.length > 0) {
      return await db.select().from(seatInventory).where(and(
        eq(seatInventory.tripId, tripId),
        inArray(seatInventory.legIndex, legIndexes)
      ));
    }
    return await db.select().from(seatInventory).where(eq(seatInventory.tripId, tripId));
  }

  async createSeatInventory(data: InsertSeatInventory[]): Promise<SeatInventory[]> {
    return await db.insert(seatInventory).values(data).returning();
  }

  async updateSeatInventory(tripId: string, seatNo: string, legIndexes: number[], updates: Partial<InsertSeatInventory>): Promise<void> {
    await db.update(seatInventory)
      .set(updates)
      .where(and(
        eq(seatInventory.tripId, tripId),
        eq(seatInventory.seatNo, seatNo),
        inArray(seatInventory.legIndex, legIndexes)
      ));
  }

  async deleteSeatInventory(tripId: string): Promise<void> {
    await db.delete(seatInventory).where(eq(seatInventory.tripId, tripId));
  }

  // Price Rules
  async getPriceRules(): Promise<PriceRule[]> {
    return await db.select().from(priceRules).orderBy(desc(priceRules.priority));
  }

  async createPriceRule(data: InsertPriceRule): Promise<PriceRule> {
    const [priceRule] = await db.insert(priceRules).values(data).returning();
    return priceRule;
  }

  async updatePriceRule(id: string, data: Partial<InsertPriceRule>): Promise<PriceRule> {
    const [priceRule] = await db.update(priceRules).set(data).where(eq(priceRules.id, id)).returning();
    return priceRule;
  }

  async deletePriceRule(id: string): Promise<void> {
    await db.delete(priceRules).where(eq(priceRules.id, id));
  }

  // Bookings
  async getBookings(tripId?: string): Promise<Booking[]> {
    const query = db.select().from(bookings);
    if (tripId) {
      return await query.where(eq(bookings.tripId, tripId)).orderBy(desc(bookings.createdAt));
    }
    return await query.orderBy(desc(bookings.createdAt));
  }

  async getBookingById(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async createBooking(data: InsertBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(data).returning();
    return booking;
  }

  async updateBooking(id: string, data: Partial<InsertBooking>): Promise<Booking> {
    const [booking] = await db.update(bookings).set(data).where(eq(bookings.id, id)).returning();
    return booking;
  }

  // Passengers
  async getPassengers(bookingId: string): Promise<Passenger[]> {
    return await db.select().from(passengers).where(eq(passengers.bookingId, bookingId));
  }

  async createPassenger(data: InsertPassenger): Promise<Passenger> {
    const [passenger] = await db.insert(passengers).values(data).returning();
    return passenger;
  }

  // Payments
  async getPayments(bookingId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.bookingId, bookingId));
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(data).returning();
    return payment;
  }

  // Print Jobs
  async createPrintJob(data: InsertPrintJob): Promise<PrintJob> {
    const [printJob] = await db.insert(printJobs).values(data).returning();
    return printJob;
  }

  // Check if trip has bookings (for immutability guard)
  async tripHasBookings(tripId: string): Promise<boolean> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(eq(bookings.tripId, tripId));
    return result.count > 0;
  }
}

export const storage = new DatabaseStorage();
