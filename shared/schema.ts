import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  uuid, 
  timestamp, 
  numeric, 
  integer, 
  boolean, 
  date,
  jsonb,
  pgEnum
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const tripStatusEnum = pgEnum('trip_status', ['scheduled', 'canceled', 'closed']);
export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'paid', 'canceled', 'refunded']);
export const channelEnum = pgEnum('channel', ['CSO', 'WEB', 'APP', 'OTA']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'qr', 'ewallet', 'bank']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'success', 'failed']);
export const printStatusEnum = pgEnum('print_status', ['queued', 'sent', 'failed']);
export const priceRuleScopeEnum = pgEnum('price_rule_scope', ['pattern', 'trip', 'leg', 'time']);

// 1. Stops
export const stops = pgTable("stops", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  city: text("city"),
  lat: numeric("lat", { precision: 9, scale: 6 }),
  lng: numeric("lng", { precision: 9, scale: 6 }),
  isOutlet: boolean("is_outlet").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// 2. Outlets
export const outlets = pgTable("outlets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  stopId: uuid("stop_id").notNull().references(() => stops.id).unique(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  printerProfileId: text("printer_profile_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// 3. Layouts
export const layouts = pgTable("layouts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  rows: integer("rows").notNull(),
  cols: integer("cols").notNull(),
  seatMap: jsonb("seat_map").notNull(), // array of {seat_no, row, col, class?, disabled?}
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// 4. Vehicles
export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  plate: text("plate").notNull().unique(),
  layoutId: uuid("layout_id").notNull().references(() => layouts.id),
  capacity: integer("capacity").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// 5. Trip Patterns
export const tripPatterns = pgTable("trip_patterns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  vehicleClass: text("vehicle_class"),
  defaultLayoutId: uuid("default_layout_id").references(() => layouts.id),
  active: boolean("active").default(true),
  tags: text("tags").array().default(sql`'{}'`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// 6. Pattern Stops
export const patternStops = pgTable("pattern_stops", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  patternId: uuid("pattern_id").notNull().references(() => tripPatterns.id),
  stopId: uuid("stop_id").notNull().references(() => stops.id),
  stopSequence: integer("stop_sequence").notNull(),
  dwellSeconds: integer("dwell_seconds").default(0),
  boardingAllowed: boolean("boarding_allowed").notNull().default(true),
  alightingAllowed: boolean("alighting_allowed").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// 7. Trips
export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  patternId: uuid("pattern_id").notNull().references(() => tripPatterns.id),
  serviceDate: date("service_date").notNull(),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
  layoutId: uuid("layout_id").references(() => layouts.id),
  capacity: integer("capacity").notNull(),
  status: tripStatusEnum("status").default('scheduled'),
  channelFlags: jsonb("channel_flags").default(sql`'{"CSO":true,"WEB":false,"APP":false,"OTA":false}'`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// 8. Trip Stop Times
export const tripStopTimes = pgTable("trip_stop_times", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: uuid("trip_id").notNull().references(() => trips.id),
  stopId: uuid("stop_id").notNull().references(() => stops.id),
  stopSequence: integer("stop_sequence").notNull(),
  arriveAt: timestamp("arrive_at", { withTimezone: true }),
  departAt: timestamp("depart_at", { withTimezone: true }),
  dwellSeconds: integer("dwell_seconds").default(0),
  boardingAllowed: boolean("boarding_allowed"), // null = inherit from pattern
  alightingAllowed: boolean("alighting_allowed") // null = inherit from pattern
});

// 9. Trip Legs
export const tripLegs = pgTable("trip_legs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: uuid("trip_id").notNull().references(() => trips.id),
  legIndex: integer("leg_index").notNull(),
  fromStopId: uuid("from_stop_id").notNull().references(() => stops.id),
  toStopId: uuid("to_stop_id").notNull().references(() => stops.id),
  departAt: timestamp("depart_at", { withTimezone: true }).notNull(),
  arriveAt: timestamp("arrive_at", { withTimezone: true }).notNull(),
  durationMin: integer("duration_min").notNull()
});

// 10. Seat Inventory
export const seatInventory = pgTable("seat_inventory", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: uuid("trip_id").notNull().references(() => trips.id),
  seatNo: text("seat_no").notNull(),
  legIndex: integer("leg_index").notNull(),
  booked: boolean("booked").default(false),
  holdRef: text("hold_ref")
});

// 10a. Seat Holds
export const seatHolds = pgTable("seat_holds", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  holdRef: text("hold_ref").notNull().unique(),
  tripId: uuid("trip_id").notNull().references(() => trips.id),
  seatNo: text("seat_no").notNull(),
  legIndexes: integer("leg_indexes").array().notNull(),
  ttlClass: text("ttl_class").notNull(), // 'short' | 'long'
  operatorId: text("operator_id").notNull(),
  bookingId: text("booking_id"), // nullable for non-booking holds
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// 11. Price Rules
export const priceRules = pgTable("price_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  scope: priceRuleScopeEnum("scope").notNull(),
  patternId: uuid("pattern_id").references(() => tripPatterns.id),
  tripId: uuid("trip_id").references(() => trips.id),
  legIndex: integer("leg_index"),
  rule: jsonb("rule").notNull(), // base per leg, caps, discounts, peak %, promo
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validTo: timestamp("valid_to", { withTimezone: true }),
  priority: integer("priority").default(0)
});

// 12. Bookings
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: uuid("trip_id").notNull().references(() => trips.id),
  originStopId: uuid("origin_stop_id").notNull().references(() => stops.id),
  destinationStopId: uuid("destination_stop_id").notNull().references(() => stops.id),
  originSeq: integer("origin_seq").notNull(),
  destinationSeq: integer("destination_seq").notNull(),
  outletId: uuid("outlet_id").references(() => outlets.id),
  channel: channelEnum("channel").default('CSO'),
  status: bookingStatusEnum("status").default('pending'),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default('IDR'),
  createdBy: text("created_by"),
  pendingExpiresAt: timestamp("pending_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// 13. Passengers
export const passengers = pgTable("passengers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  idNumber: text("id_number"),
  seatNo: text("seat_no").notNull(),
  fareAmount: numeric("fare_amount", { precision: 12, scale: 2 }).notNull(),
  fareBreakdown: jsonb("fare_breakdown")
});

// 14. Payments
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id),
  method: paymentMethodEnum("method").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").default('success'),
  providerRef: text("provider_ref"),
  paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow()
});

// 15. Print Jobs
export const printJobs = pgTable("print_jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id),
  status: printStatusEnum("status").default('queued'),
  attempts: integer("attempts").default(0),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// Relations
export const stopsRelations = relations(stops, ({ many, one }) => ({
  outlets: one(outlets),
  patternStops: many(patternStops),
  tripStopTimes: many(tripStopTimes),
  tripLegsFrom: many(tripLegs, { relationName: "fromStop" }),
  tripLegsTo: many(tripLegs, { relationName: "toStop" }),
  bookingsOrigin: many(bookings, { relationName: "originStop" }),
  bookingsDestination: many(bookings, { relationName: "destinationStop" })
}));

export const outletsRelations = relations(outlets, ({ one, many }) => ({
  stop: one(stops, { fields: [outlets.stopId], references: [stops.id] }),
  bookings: many(bookings)
}));

export const layoutsRelations = relations(layouts, ({ many }) => ({
  vehicles: many(vehicles),
  tripPatterns: many(tripPatterns),
  trips: many(trips)
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  layout: one(layouts, { fields: [vehicles.layoutId], references: [layouts.id] }),
  trips: many(trips)
}));

export const tripPatternsRelations = relations(tripPatterns, ({ one, many }) => ({
  defaultLayout: one(layouts, { fields: [tripPatterns.defaultLayoutId], references: [layouts.id] }),
  patternStops: many(patternStops),
  trips: many(trips),
  priceRules: many(priceRules)
}));

export const patternStopsRelations = relations(patternStops, ({ one }) => ({
  pattern: one(tripPatterns, { fields: [patternStops.patternId], references: [tripPatterns.id] }),
  stop: one(stops, { fields: [patternStops.stopId], references: [stops.id] })
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  pattern: one(tripPatterns, { fields: [trips.patternId], references: [tripPatterns.id] }),
  vehicle: one(vehicles, { fields: [trips.vehicleId], references: [vehicles.id] }),
  layout: one(layouts, { fields: [trips.layoutId], references: [layouts.id] }),
  tripStopTimes: many(tripStopTimes),
  tripLegs: many(tripLegs),
  seatInventory: many(seatInventory),
  bookings: many(bookings),
  priceRules: many(priceRules)
}));

export const tripStopTimesRelations = relations(tripStopTimes, ({ one }) => ({
  trip: one(trips, { fields: [tripStopTimes.tripId], references: [trips.id] }),
  stop: one(stops, { fields: [tripStopTimes.stopId], references: [stops.id] })
}));

export const tripLegsRelations = relations(tripLegs, ({ one }) => ({
  trip: one(trips, { fields: [tripLegs.tripId], references: [trips.id] }),
  fromStop: one(stops, { fields: [tripLegs.fromStopId], references: [stops.id], relationName: "fromStop" }),
  toStop: one(stops, { fields: [tripLegs.toStopId], references: [stops.id], relationName: "toStop" })
}));

export const seatInventoryRelations = relations(seatInventory, ({ one }) => ({
  trip: one(trips, { fields: [seatInventory.tripId], references: [trips.id] })
}));

export const priceRulesRelations = relations(priceRules, ({ one }) => ({
  pattern: one(tripPatterns, { fields: [priceRules.patternId], references: [tripPatterns.id] }),
  trip: one(trips, { fields: [priceRules.tripId], references: [trips.id] })
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  trip: one(trips, { fields: [bookings.tripId], references: [trips.id] }),
  originStop: one(stops, { fields: [bookings.originStopId], references: [stops.id], relationName: "originStop" }),
  destinationStop: one(stops, { fields: [bookings.destinationStopId], references: [stops.id], relationName: "destinationStop" }),
  outlet: one(outlets, { fields: [bookings.outletId], references: [outlets.id] }),
  passengers: many(passengers),
  payments: many(payments),
  printJobs: many(printJobs)
}));

export const passengersRelations = relations(passengers, ({ one }) => ({
  booking: one(bookings, { fields: [passengers.bookingId], references: [bookings.id] })
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] })
}));

export const printJobsRelations = relations(printJobs, ({ one }) => ({
  booking: one(bookings, { fields: [printJobs.bookingId], references: [bookings.id] })
}));

// Insert schemas
export const insertStopSchema = createInsertSchema(stops).omit({ id: true, createdAt: true });
export const insertOutletSchema = createInsertSchema(outlets).omit({ id: true, createdAt: true });
export const insertLayoutSchema = createInsertSchema(layouts).omit({ id: true, createdAt: true });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
export const insertTripPatternSchema = createInsertSchema(tripPatterns).omit({ id: true, createdAt: true });
export const insertPatternStopSchema = createInsertSchema(patternStops).omit({ id: true, createdAt: true });
export const insertTripSchema = createInsertSchema(trips).omit({ id: true, createdAt: true });
export const insertTripStopTimeSchema = createInsertSchema(tripStopTimes).omit({ id: true });
export const insertTripLegSchema = createInsertSchema(tripLegs).omit({ id: true });
export const insertSeatInventorySchema = createInsertSchema(seatInventory).omit({ id: true });
export const insertPriceRuleSchema = createInsertSchema(priceRules).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export const insertPassengerSchema = createInsertSchema(passengers).omit({ id: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, paidAt: true });
export const insertPrintJobSchema = createInsertSchema(printJobs).omit({ id: true, createdAt: true });

// Types
export type Stop = typeof stops.$inferSelect;
export type Outlet = typeof outlets.$inferSelect;
export type Layout = typeof layouts.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type TripPattern = typeof tripPatterns.$inferSelect;
export type PatternStop = typeof patternStops.$inferSelect;
export type Trip = typeof trips.$inferSelect;
// Extended Trip type with joined data for display
export type TripWithDetails = Trip & {
  patternName?: string | null;
  patternCode?: string | null;
  vehicleCode?: string | null;
  vehiclePlate?: string | null;
  scheduleTime?: string | null;
};

// CSO Available Trip type for filtered trips by outlet
export type CsoAvailableTrip = {
  tripId: string;
  patternCode: string;
  patternPath: string;
  vehicle: { code: string; plate: string };
  capacity: number;
  status: string;
  departAtAtOutlet: string | null;
  finalArrivalAt: string | null;
  stopCount: number;
};

// Extended TripStopTime with effective flags and stop details
export type TripStopTimeWithEffectiveFlags = TripStopTime & {
  stopName?: string;
  stopCode?: string;
  effectiveBoardingAllowed: boolean;
  effectiveAlightingAllowed: boolean;
  legDurationMinutes?: number | null;
};

// Bulk upsert request for trip stop times
export type BulkUpsertTripStopTime = {
  stopId: string;
  stopSequence: number;
  arriveAt?: Date | null;
  departAt?: Date | null;
  dwellSeconds?: number;
  boardingAllowed?: boolean | null;
  alightingAllowed?: boolean | null;
};

// Validation schema for bulk upsert
export const bulkUpsertTripStopTimeSchema = z.object({
  stopId: z.string().uuid(),
  stopSequence: z.number().int().min(1),
  arriveAt: z.union([
    z.date(),
    z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid date string" }),
    z.null()
  ]).optional().transform(val => {
    if (val === null || val === undefined) return null;
    return val instanceof Date ? val : new Date(val);
  }),
  departAt: z.union([
    z.date(),
    z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid date string" }),
    z.null()
  ]).optional().transform(val => {
    if (val === null || val === undefined) return null;
    return val instanceof Date ? val : new Date(val);
  }),
  dwellSeconds: z.number().int().min(0).optional().default(0),
  boardingAllowed: z.boolean().nullable().optional(),
  alightingAllowed: z.boolean().nullable().optional()
});
export type TripStopTime = typeof tripStopTimes.$inferSelect;
export type TripLeg = typeof tripLegs.$inferSelect;
export type SeatInventory = typeof seatInventory.$inferSelect;
export type PriceRule = typeof priceRules.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Passenger = typeof passengers.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type PrintJob = typeof printJobs.$inferSelect;

export type InsertStop = z.infer<typeof insertStopSchema>;
export type InsertOutlet = z.infer<typeof insertOutletSchema>;
export type InsertLayout = z.infer<typeof insertLayoutSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertTripPattern = z.infer<typeof insertTripPatternSchema>;
export type InsertPatternStop = z.infer<typeof insertPatternStopSchema>;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type InsertTripStopTime = z.infer<typeof insertTripStopTimeSchema>;
export type InsertTripLeg = z.infer<typeof insertTripLegSchema>;
export type InsertSeatInventory = z.infer<typeof insertSeatInventorySchema>;
export type InsertPriceRule = z.infer<typeof insertPriceRuleSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertPassenger = z.infer<typeof insertPassengerSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertPrintJob = z.infer<typeof insertPrintJobSchema>;

// Keep existing user schema for compatibility (can be removed later)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
