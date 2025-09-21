import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { 
  insertStopSchema, insertOutletSchema, insertVehicleSchema, insertLayoutSchema,
  insertTripPatternSchema, insertPatternStopSchema, insertTripSchema,
  insertTripStopTimeSchema, insertPriceRuleSchema, insertBookingSchema,
  insertPassengerSchema, insertPaymentSchema,
  type Stop, type Outlet, type Vehicle, type Layout, type TripPattern, 
  type PatternStop, type Trip, type TripWithDetails, type TripStopTime, type TripLeg, 
  type SeatInventory, type PriceRule, type Booking, type Passenger, 
  type Payment, type PrintJob,
  type InsertStop, type InsertOutlet, type InsertVehicle, type InsertLayout,
  type InsertTripPattern, type InsertPatternStop, type InsertTrip,
  type InsertTripStopTime, type InsertPriceRule, type InsertBooking,
  type InsertPassenger, type InsertPayment, type InsertPrintJob
} from "@shared/schema";

export interface IStorage {
  // Stops
  getStops(): Promise<Stop[]>;
  getStopById(id: string): Promise<Stop | undefined>;
  createStop(data: InsertStop): Promise<Stop>;
  updateStop(id: string, data: Partial<InsertStop>): Promise<Stop>;
  deleteStop(id: string): Promise<void>;

  // Outlets
  getOutlets(): Promise<Outlet[]>;
  getOutletById(id: string): Promise<Outlet | undefined>;
  createOutlet(data: InsertOutlet): Promise<Outlet>;
  updateOutlet(id: string, data: Partial<InsertOutlet>): Promise<Outlet>;
  deleteOutlet(id: string): Promise<void>;

  // Vehicles
  getVehicles(): Promise<Vehicle[]>;
  getVehicleById(id: string): Promise<Vehicle | undefined>;
  createVehicle(data: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, data: Partial<InsertVehicle>): Promise<Vehicle>;
  deleteVehicle(id: string): Promise<void>;

  // Layouts
  getLayouts(): Promise<Layout[]>;
  getLayoutById(id: string): Promise<Layout | undefined>;
  createLayout(data: InsertLayout): Promise<Layout>;
  updateLayout(id: string, data: Partial<InsertLayout>): Promise<Layout>;
  deleteLayout(id: string): Promise<void>;

  // Trip Patterns
  getTripPatterns(): Promise<TripPattern[]>;
  getTripPatternById(id: string): Promise<TripPattern | undefined>;
  createTripPattern(data: InsertTripPattern): Promise<TripPattern>;
  updateTripPattern(id: string, data: Partial<InsertTripPattern>): Promise<TripPattern>;
  deleteTripPattern(id: string): Promise<void>;

  // Pattern Stops
  getPatternStops(patternId: string): Promise<PatternStop[]>;
  createPatternStop(data: InsertPatternStop): Promise<PatternStop>;
  updatePatternStop(id: string, data: Partial<InsertPatternStop>): Promise<PatternStop>;
  deletePatternStop(id: string): Promise<void>;

  // Trips
  getTrips(serviceDate?: string): Promise<TripWithDetails[]>;
  getTripById(id: string): Promise<Trip | undefined>;
  createTrip(data: InsertTrip): Promise<Trip>;
  updateTrip(id: string, data: Partial<InsertTrip>): Promise<Trip>;
  deleteTrip(id: string): Promise<void>;

  // Trip Stop Times
  getTripStopTimes(tripId: string): Promise<TripStopTime[]>;
  createTripStopTime(data: InsertTripStopTime): Promise<TripStopTime>;
  updateTripStopTime(id: string, data: Partial<InsertTripStopTime>): Promise<TripStopTime>;
  deleteTripStopTime(id: string): Promise<void>;

  // Trip Legs
  getTripLegs(tripId: string): Promise<TripLeg[]>;
  createTripLeg(data: any): Promise<TripLeg>;
  deleteTripLegs(tripId: string): Promise<void>;

  // Seat Inventory
  getSeatInventory(tripId: string, legIndexes?: number[]): Promise<SeatInventory[]>;
  createSeatInventory(data: any[]): Promise<SeatInventory[]>;
  updateSeatInventory(tripId: string, seatNo: string, legIndexes: number[], updates: any): Promise<void>;
  deleteSeatInventory(tripId: string): Promise<void>;

  // Price Rules
  getPriceRules(): Promise<PriceRule[]>;
  createPriceRule(data: InsertPriceRule): Promise<PriceRule>;
  updatePriceRule(id: string, data: Partial<InsertPriceRule>): Promise<PriceRule>;
  deletePriceRule(id: string): Promise<void>;

  // Bookings
  getBookings(tripId?: string): Promise<Booking[]>;
  getBookingById(id: string): Promise<Booking | undefined>;
  createBooking(data: InsertBooking): Promise<Booking>;
  updateBooking(id: string, data: Partial<InsertBooking>): Promise<Booking>;

  // Passengers
  getPassengers(bookingId: string): Promise<Passenger[]>;
  createPassenger(data: InsertPassenger): Promise<Passenger>;

  // Payments
  getPayments(bookingId: string): Promise<Payment[]>;
  createPayment(data: InsertPayment): Promise<Payment>;

  // Print Jobs
  createPrintJob(data: InsertPrintJob): Promise<PrintJob>;

  // Utility
  tripHasBookings(tripId: string): Promise<boolean>;
}

import { storage } from "./storage";
import { StopsController } from "./modules/stops/stops.controller";
import { OutletsController } from "./modules/outlets/outlets.controller";
import { VehiclesController } from "./modules/vehicles/vehicles.controller";
import { LayoutsController } from "./modules/layouts/layouts.controller";
import { TripPatternsController } from "./modules/tripPatterns/tripPatterns.controller";
import { PatternStopsController } from "./modules/patternStops/patternStops.controller";
import { TripsController } from "./modules/trips/trips.controller";
import { TripStopTimesController } from "./modules/tripStopTimes/tripStopTimes.controller";
import { TripLegsController } from "./modules/tripLegs/tripLegs.controller";
import { PriceRulesController } from "./modules/priceRules/priceRules.controller";
import { BookingsController } from "./modules/bookings/bookings.controller";
import { PaymentsController } from "./modules/payments/payments.controller";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize controllers
  const stopsController = new StopsController(storage);
  const outletsController = new OutletsController(storage);
  const vehiclesController = new VehiclesController(storage);
  const layoutsController = new LayoutsController(storage);
  const tripPatternsController = new TripPatternsController(storage);
  const patternStopsController = new PatternStopsController(storage);
  const tripsController = new TripsController(storage);
  const tripStopTimesController = new TripStopTimesController(storage);
  const tripLegsController = new TripLegsController(storage);
  const priceRulesController = new PriceRulesController(storage);
  const bookingsController = new BookingsController(storage);
  const paymentsController = new PaymentsController(storage);

  // Error handler middleware
  const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  // Stops routes
  app.get('/api/stops', asyncHandler(stopsController.getAll.bind(stopsController)));
  app.get('/api/stops/:id', asyncHandler(stopsController.getById.bind(stopsController)));
  app.post('/api/stops', asyncHandler(stopsController.create.bind(stopsController)));
  app.put('/api/stops/:id', asyncHandler(stopsController.update.bind(stopsController)));
  app.delete('/api/stops/:id', asyncHandler(stopsController.delete.bind(stopsController)));

  // Outlets routes
  app.get('/api/outlets', asyncHandler(outletsController.getAll.bind(outletsController)));
  app.get('/api/outlets/:id', asyncHandler(outletsController.getById.bind(outletsController)));
  app.post('/api/outlets', asyncHandler(outletsController.create.bind(outletsController)));
  app.put('/api/outlets/:id', asyncHandler(outletsController.update.bind(outletsController)));
  app.delete('/api/outlets/:id', asyncHandler(outletsController.delete.bind(outletsController)));

  // Vehicles routes
  app.get('/api/vehicles', asyncHandler(vehiclesController.getAll.bind(vehiclesController)));
  app.get('/api/vehicles/:id', asyncHandler(vehiclesController.getById.bind(vehiclesController)));
  app.post('/api/vehicles', asyncHandler(vehiclesController.create.bind(vehiclesController)));
  app.put('/api/vehicles/:id', asyncHandler(vehiclesController.update.bind(vehiclesController)));
  app.delete('/api/vehicles/:id', asyncHandler(vehiclesController.delete.bind(vehiclesController)));

  // Layouts routes
  app.get('/api/layouts', asyncHandler(layoutsController.getAll.bind(layoutsController)));
  app.get('/api/layouts/:id', asyncHandler(layoutsController.getById.bind(layoutsController)));
  app.post('/api/layouts', asyncHandler(layoutsController.create.bind(layoutsController)));
  app.put('/api/layouts/:id', asyncHandler(layoutsController.update.bind(layoutsController)));
  app.delete('/api/layouts/:id', asyncHandler(layoutsController.delete.bind(layoutsController)));

  // Trip Patterns routes
  app.get('/api/trip-patterns', asyncHandler(tripPatternsController.getAll.bind(tripPatternsController)));
  app.get('/api/trip-patterns/:id', asyncHandler(tripPatternsController.getById.bind(tripPatternsController)));
  app.post('/api/trip-patterns', asyncHandler(tripPatternsController.create.bind(tripPatternsController)));
  app.put('/api/trip-patterns/:id', asyncHandler(tripPatternsController.update.bind(tripPatternsController)));
  app.delete('/api/trip-patterns/:id', asyncHandler(tripPatternsController.delete.bind(tripPatternsController)));

  // Pattern Stops routes
  app.get('/api/trip-patterns/:patternId/stops', asyncHandler(patternStopsController.getByPattern.bind(patternStopsController)));
  app.post('/api/pattern-stops', asyncHandler(patternStopsController.create.bind(patternStopsController)));
  app.put('/api/pattern-stops/:id', asyncHandler(patternStopsController.update.bind(patternStopsController)));
  app.delete('/api/pattern-stops/:id', asyncHandler(patternStopsController.delete.bind(patternStopsController)));

  // Trips routes
  app.get('/api/trips', asyncHandler(tripsController.getAll.bind(tripsController)));
  app.get('/api/trips/:id', asyncHandler(tripsController.getById.bind(tripsController)));
  app.post('/api/trips', asyncHandler(tripsController.create.bind(tripsController)));
  app.put('/api/trips/:id', asyncHandler(tripsController.update.bind(tripsController)));
  app.delete('/api/trips/:id', asyncHandler(tripsController.delete.bind(tripsController)));
  app.post('/api/trips/:id/derive-legs', asyncHandler(tripsController.deriveLegs.bind(tripsController)));
  app.post('/api/trips/:id/precompute-seat-inventory', asyncHandler(tripsController.precomputeSeatInventory.bind(tripsController)));

  // Trip Stop Times routes
  app.get('/api/trips/:tripId/stop-times', asyncHandler(tripStopTimesController.getByTrip.bind(tripStopTimesController)));
  app.post('/api/trip-stop-times', asyncHandler(tripStopTimesController.create.bind(tripStopTimesController)));
  app.put('/api/trip-stop-times/:id', asyncHandler(tripStopTimesController.update.bind(tripStopTimesController)));
  app.delete('/api/trip-stop-times/:id', asyncHandler(tripStopTimesController.delete.bind(tripStopTimesController)));

  // Seat map and availability
  app.get('/api/trips/:id/seatmap', asyncHandler(tripsController.getSeatmap.bind(tripsController)));

  // Seat holds
  app.post('/api/holds', asyncHandler(bookingsController.createHold.bind(bookingsController)));
  app.delete('/api/holds/:holdRef', asyncHandler(bookingsController.releaseHold.bind(bookingsController)));

  // Price Rules routes
  app.get('/api/price-rules', asyncHandler(priceRulesController.getAll.bind(priceRulesController)));
  app.post('/api/price-rules', asyncHandler(priceRulesController.create.bind(priceRulesController)));
  app.put('/api/price-rules/:id', asyncHandler(priceRulesController.update.bind(priceRulesController)));
  app.delete('/api/price-rules/:id', asyncHandler(priceRulesController.delete.bind(priceRulesController)));

  // Bookings routes
  app.get('/api/bookings', asyncHandler(bookingsController.getAll.bind(bookingsController)));
  app.get('/api/bookings/:id', asyncHandler(bookingsController.getById.bind(bookingsController)));
  app.post('/api/bookings', asyncHandler(bookingsController.create.bind(bookingsController)));

  // Payments routes
  app.get('/api/bookings/:bookingId/payments', asyncHandler(paymentsController.getByBooking.bind(paymentsController)));
  app.post('/api/payments', asyncHandler(paymentsController.create.bind(paymentsController)));

  // Seed data
  app.post('/api/seed', asyncHandler(async (req: any, res: any) => {
    const { seedData } = await import('./seed');
    await seedData();
    res.json({ message: 'Seed data created successfully' });
  }));

  const httpServer = createServer(app);
  return httpServer;
}
