import { storage } from "./storage";
import { fromZonedHHMMToUtc } from "./utils/timezone";

export async function seedData() {
  console.log("Starting seed data creation...");

  // Create stops
  const jakartaStop = await storage.createStop({
    code: "JKT",
    name: "Jakarta Terminal",
    city: "Jakarta",
    isOutlet: true,
  });

  const purwakartaStop = await storage.createStop({
    code: "PWK",
    name: "Purwakarta",
    city: "Purwakarta",
    isOutlet: true, // Make it an outlet for pickup-only testing
  });

  const bandungStop = await storage.createStop({
    code: "BDG",
    name: "Bandung Terminal",
    city: "Bandung",
    isOutlet: true,
  });

  const bandungStop1 = await storage.createStop({
    code: "BDP",
    name: "Bandung Pasteur",
    city: "Bandung",
    isOutlet: true,
  });

  const semarangStop = await storage.createStop({
    code: "SMR",
    name: "Semarang",
    city: "Semarang",
    isOutlet: true,
  });

  console.log("✅ Stops created");

  // Create outlets (only for stops with isOutlet=true: Jakarta & Bandung)
  await storage.createOutlet({
    stopId: jakartaStop.id,
    name: "Jakarta Terminal Outlet",
    address: "Jl. Terminal Jakarta",
    phone: "+62-21-1234567",
  });

  await storage.createOutlet({
    stopId: bandungStop.id,
    name: "Bandung Terminal Outlet",
    address: "Jl. Terminal Bandung",
    phone: "+62-22-1234567",
  });

  await storage.createOutlet({
    stopId: bandungStop1.id,
    name: "Bandung Pasteur Outlet",
    address: "Jl. Pasteur Bandung",
    phone: "+62-22-7654321",
  });

  await storage.createOutlet({
    stopId: purwakartaStop.id,
    name: "Purwakarta Outlet",
    address: "Jl. Veteran Purwakarta",
    phone: "+62-264-1234567",
  });

  await storage.createOutlet({
    stopId: semarangStop.id,
    name: "Semarang Outlet",
    address: "Jl. Kh Dewantara Semarang",
    phone: "+62-24-1234567",
  });

  console.log("✅ Outlets created");

  // Create layouts (12-seat and 8-seat)
  const layout12 = await storage.createLayout({
    name: "Standard 12-seat",
    rows: 3,
    cols: 4,
    seatMap: [
      { seat_no: "1A", row: 1, col: 1, class: "standard" },
      { seat_no: "1B", row: 1, col: 2, class: "standard" },
      { seat_no: "1C", row: 1, col: 3, class: "standard" },
      { seat_no: "1D", row: 1, col: 4, class: "standard" },
      { seat_no: "2A", row: 2, col: 1, class: "standard" },
      { seat_no: "2B", row: 2, col: 2, class: "standard" },
      { seat_no: "2C", row: 2, col: 3, class: "standard" },
      { seat_no: "2D", row: 2, col: 4, class: "standard" },
      { seat_no: "3A", row: 3, col: 1, class: "standard" },
      { seat_no: "3B", row: 3, col: 2, class: "standard" },
      { seat_no: "3C", row: 3, col: 3, class: "standard" },
      { seat_no: "3D", row: 3, col: 4, class: "standard" },
    ],
  });

  const layout8 = await storage.createLayout({
    name: "Standard 8-seat",
    rows: 2,
    cols: 4,
    seatMap: [
      { seat_no: "1A", row: 1, col: 1, class: "standard" },
      { seat_no: "1B", row: 1, col: 2, class: "standard" },
      { seat_no: "1C", row: 1, col: 3, class: "standard" },
      { seat_no: "1D", row: 1, col: 4, class: "standard" },
      { seat_no: "2A", row: 2, col: 1, class: "standard" },
      { seat_no: "2B", row: 2, col: 2, class: "standard" },
      { seat_no: "2C", row: 2, col: 3, class: "standard" },
      { seat_no: "2D", row: 2, col: 4, class: "standard" },
    ],
  });

  console.log("✅ Layouts created");

  // Create vehicles (BUS-A with 12-seat, BUS-B with 8-seat)
  const vehicleA = await storage.createVehicle({
    code: "BUS-A",
    plate: "B 1234 ABC",
    layoutId: layout12.id,
    capacity: 12,
    notes: "12-seat vehicle for Slot-1",
  });

  const vehicleB = await storage.createVehicle({
    code: "BUS-B",
    plate: "B 5678 DEF",
    layoutId: layout8.id,
    capacity: 8,
    notes: "8-seat vehicle for Slot-2",
  });

  console.log("✅ Vehicles created");

  // Create trip pattern
  const patternA = await storage.createTripPattern({
    code: "AB_via_C",
    name: "Jakarta to Bandung via Purwakarta",
    vehicleClass: "standard",
    defaultLayoutId: layout12.id,
    active: true,
    tags: ["intercity", "demo"],
  });

  const patternB = await storage.createTripPattern({
    code: "JKT-SMR",
    name: "Jakarta to Semarang via Bandung",
    vehicleClass: "standard",
    defaultLayoutId: layout8.id,
    active: true,
    tags: ["intercity", "demo"],
  });

  console.log("✅ Trip pattern created");

  // Create pattern stops with pickup-only setup
  // Pattern A: Jakarta -> Purwakarta -> Bandung
  await storage.createPatternStop({
    patternId: patternA.id,
    stopId: jakartaStop.id,
    stopSequence: 1,
    dwellSeconds: 0,
    boardingAllowed: true,
    alightingAllowed: true,
  });

  await storage.createPatternStop({
    patternId: patternA.id,
    stopId: purwakartaStop.id,
    stopSequence: 2,
    dwellSeconds: 300, // 5 minutes
    boardingAllowed: true,
    alightingAllowed: false, // PICKUP-ONLY stop
  });

  await storage.createPatternStop({
    patternId: patternA.id,
    stopId: bandungStop.id,
    stopSequence: 3,
    dwellSeconds: 0,
    boardingAllowed: true,
    alightingAllowed: true,
  });

  // Pattern B: Jakarta -> Bandung -> Semarang 
  await storage.createPatternStop({
    patternId: patternB.id,
    stopId: jakartaStop.id,
    stopSequence: 1,
    dwellSeconds: 0,
    boardingAllowed: true,
    alightingAllowed: true,
  });

  await storage.createPatternStop({
    patternId: patternB.id,
    stopId: bandungStop.id,
    stopSequence: 2,
    dwellSeconds: 600, // 5 minutes
    boardingAllowed: true,
    alightingAllowed: false, // PICKUP-ONLY stop
  });

  await storage.createPatternStop({
    patternId: patternB.id,
    stopId: semarangStop.id,
    stopSequence: 3,
    dwellSeconds: 0,
    boardingAllowed: true,
    alightingAllowed: true,
  });

  console.log("✅ Pattern stops created");

  // Create trip for today (using vehicleA for demo)
  const today = new Date().toISOString().split("T")[0];
  const trip = await storage.createTrip({
    patternId: patternA.id,
    serviceDate: today,
    vehicleId: vehicleA.id,
    layoutId: layout12.id,
    capacity: 12,
    status: "scheduled",
    channelFlags: { CSO: true, WEB: false, APP: false, OTA: false },
  });

  console.log("✅ Trip created");

  // Create trip stop times with schedule: A08:30 C09:30 B10:00
  // Using Asia/Jakarta timezone with proper timezone utilities
  
  // Jakarta departure at 08:30 in Asia/Jakarta timezone
  const jakartaDepartAt = fromZonedHHMMToUtc(today, "08:30", "Asia/Jakarta");
  
  await storage.createTripStopTime({
    tripId: trip.id,
    stopId: jakartaStop.id,
    stopSequence: 1,
    arriveAt: null,
    departAt: jakartaDepartAt,
    dwellSeconds: 0,
  });

  // Purwakarta arrival and departure at 09:30 in Asia/Jakarta timezone
  const purwakartaArriveAt = fromZonedHHMMToUtc(today, "09:30", "Asia/Jakarta");
  const purwakartaDepartAt = fromZonedHHMMToUtc(today, "09:30", "Asia/Jakarta");

  await storage.createTripStopTime({
    tripId: trip.id,
    stopId: purwakartaStop.id,
    stopSequence: 2,
    arriveAt: purwakartaArriveAt,
    departAt: purwakartaDepartAt,
    dwellSeconds: 0,
  });

  // Bandung arrival at 10:00 in Asia/Jakarta timezone
  const bandungArriveAt = fromZonedHHMMToUtc(today, "10:00", "Asia/Jakarta");

  await storage.createTripStopTime({
    tripId: trip.id,
    stopId: bandungStop.id,
    stopSequence: 3,
    arriveAt: bandungArriveAt,
    departAt: null,
    dwellSeconds: 0,
  });

  console.log("✅ Trip stop times created");

  // Derive legs
  const { TripLegsService } = await import(
    "./modules/tripLegs/tripLegs.service"
  );
  const tripLegsService = new TripLegsService(storage);
  await tripLegsService.deriveLegsFromTrip(trip);

  console.log("✅ Trip legs derived");

  // Precompute seat inventory
  const { SeatInventoryService } = await import(
    "./modules/seatInventory/seatInventory.service"
  );
  const seatInventoryService = new SeatInventoryService(storage);
  await seatInventoryService.precomputeInventory(trip);

  console.log("✅ Seat inventory precomputed");

  // Create basic price rule
  await storage.createPriceRule({
    scope: "pattern",
    patternId: patternA.id,
    tripId: null,
    legIndex: null,
    rule: {
      basePricePerLeg: 25000,
      currency: "IDR",
      multiplier: 1.0,
    },
    validFrom: null,
    validTo: null,
    priority: 1,
  });

  console.log("✅ Price rule created");

  // Create Trip Bases for Virtual Scheduling
  const tripBase1 = await storage.createTripBase({
    patternId: patternA.id,
    code: "10:00-SLOT-1",
    name: "Jakarta-Bandung 10:00 Slot-1",
    active: true,
    timezone: "Asia/Jakarta",
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: true,
    sun: true,
    validFrom: "2025-01-01",
    validTo: "2025-12-31",
    defaultLayoutId: layout12.id,
    defaultVehicleId: vehicleA.id,
    capacity: 12,
    channelFlags: { CSO: true, WEB: true, APP: true, OTA: false },
    defaultStopTimes: [
      { stopSequence: 1, arriveAt: null, departAt: "10:00" },
      { stopSequence: 2, arriveAt: "10:55", departAt: "11:00" },
      { stopSequence: 3, arriveAt: "12:00", departAt: null },
    ],
  });

  const tripBase2 = await storage.createTripBase({
    patternId: patternA.id,
    code: "10:00-SLOT-2",
    name: "Jakarta-Bandung 10:00 Slot-2",
    active: true,
    timezone: "Asia/Jakarta",
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: true,
    sun: true,
    validFrom: "2025-01-01",
    validTo: "2025-12-31",
    defaultLayoutId: layout8.id,
    defaultVehicleId: vehicleB.id,
    capacity: 8,
    channelFlags: { CSO: true, WEB: true, APP: true, OTA: false },
    defaultStopTimes: [
      { stopSequence: 1, arriveAt: null, departAt: "10:00" },
      { stopSequence: 2, arriveAt: "10:55", departAt: "11:00" },
      { stopSequence: 3, arriveAt: "12:00", departAt: null },
    ],
  });

  const tripBase3 = await storage.createTripBase({
    patternId: patternA.id,
    code: "13:00-SLOT-1",
    name: "Jakarta-Bandung 13:00 Slot-1",
    active: true,
    timezone: "Asia/Jakarta",
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: true,
    sun: true,
    validFrom: "2025-01-01",
    validTo: "2025-12-31",
    defaultLayoutId: layout12.id,
    defaultVehicleId: vehicleA.id,
    capacity: 12,
    channelFlags: { CSO: true, WEB: true, APP: true, OTA: false },
    defaultStopTimes: [
      { stopSequence: 1, arriveAt: null, departAt: "13:00" },
      { stopSequence: 2, arriveAt: "13:55", departAt: "14:00" },
      { stopSequence: 3, arriveAt: "15:00", departAt: null },
    ],
  });

  const tripBase4 = await storage.createTripBase({
    patternId: patternB.id,
    code: "07:00-REG",
    name: "Jakarta-Semarang 07:00",
    active: true,
    timezone: "Asia/Jakarta",
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: true,
    sun: true,
    validFrom: "2025-01-01",
    validTo: "2025-12-31",
    defaultLayoutId: layout8.id,
    defaultVehicleId: vehicleB.id,
    capacity: 8,
    channelFlags: { CSO: true, WEB: true, APP: true, OTA: false },
    defaultStopTimes: [
      { stopSequence: 1, arriveAt: null, departAt: "07:00" },
      { stopSequence: 2, arriveAt: "08.20", departAt: "08:40" },
      { stopSequence: 3, arriveAt: "15:00", departAt: null },
    ],
  });

  console.log("✅ Trip Bases created");
  console.log("🎉 Seed data creation completed!");
}

// Run the seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedData().catch(console.error);
}
