import { storage } from "./storage";

export async function seedData() {
  console.log("Starting seed data creation...");

  // Create stops
  const jakartaStop = await storage.createStop({
    code: "JKT",
    name: "Jakarta Terminal",
    city: "Jakarta",
    isOutlet: true
  });

  const purwakartaStop = await storage.createStop({
    code: "PWK", 
    name: "Purwakarta",
    city: "Purwakarta",
    isOutlet: false
  });

  const bandungStop = await storage.createStop({
    code: "BDG",
    name: "Bandung Terminal", 
    city: "Bandung",
    isOutlet: true
  });

  console.log("✅ Stops created");

  // Create outlets (only for stops with isOutlet=true: Jakarta & Bandung)
  await storage.createOutlet({
    stopId: jakartaStop.id,
    name: "Jakarta Terminal Outlet",
    address: "Jl. Terminal Jakarta",
    phone: "+62-21-1234567"
  });

  await storage.createOutlet({
    stopId: bandungStop.id,
    name: "Bandung Terminal Outlet",
    address: "Jl. Terminal Bandung", 
    phone: "+62-22-1234567"
  });

  console.log("✅ Outlets created");

  // Create layout
  const layout = await storage.createLayout({
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
      { seat_no: "3D", row: 3, col: 4, class: "standard" }
    ]
  });

  console.log("✅ Layout created");

  // Create vehicle
  const vehicle = await storage.createVehicle({
    code: "BUS-001",
    plate: "B 1234 ABC",
    layoutId: layout.id,
    capacity: 12,
    notes: "Demo vehicle"
  });

  console.log("✅ Vehicle created");

  // Create trip pattern
  const pattern = await storage.createTripPattern({
    code: "AB_via_C",
    name: "Jakarta to Bandung via Purwakarta",
    vehicleClass: "standard",
    defaultLayoutId: layout.id,
    active: true,
    tags: ["intercity", "demo"]
  });

  console.log("✅ Trip pattern created");

  // Create pattern stops
  await storage.createPatternStop({
    patternId: pattern.id,
    stopId: jakartaStop.id,
    stopSequence: 1,
    dwellSeconds: 0
  });

  await storage.createPatternStop({
    patternId: pattern.id,
    stopId: purwakartaStop.id,
    stopSequence: 2,
    dwellSeconds: 300 // 5 minutes
  });

  await storage.createPatternStop({
    patternId: pattern.id,
    stopId: bandungStop.id,
    stopSequence: 3,
    dwellSeconds: 0
  });

  console.log("✅ Pattern stops created");

  // Create trip for today
  const today = new Date().toISOString().split('T')[0];
  const trip = await storage.createTrip({
    patternId: pattern.id,
    serviceDate: today,
    vehicleId: vehicle.id,
    layoutId: layout.id,
    capacity: 12,
    status: 'scheduled',
    channelFlags: { CSO: true, WEB: false, APP: false, OTA: false }
  });

  console.log("✅ Trip created");

  // Create trip stop times
  const baseTime = new Date();
  baseTime.setHours(10, 0, 0, 0); // 10:00 AM

  await storage.createTripStopTime({
    tripId: trip.id,
    stopId: jakartaStop.id,
    stopSequence: 1,
    arriveAt: null,
    departAt: baseTime,
    dwellSeconds: 0
  });

  const purwakartaArrive = new Date(baseTime.getTime() + 55 * 60 * 1000); // +55 min
  const purwakartaDepart = new Date(baseTime.getTime() + 60 * 60 * 1000); // +60 min

  await storage.createTripStopTime({
    tripId: trip.id,
    stopId: purwakartaStop.id,
    stopSequence: 2,
    arriveAt: purwakartaArrive,
    departAt: purwakartaDepart,
    dwellSeconds: 300
  });

  const bandungArrive = new Date(baseTime.getTime() + 120 * 60 * 1000); // +120 min

  await storage.createTripStopTime({
    tripId: trip.id,
    stopId: bandungStop.id,
    stopSequence: 3,
    arriveAt: bandungArrive,
    departAt: null,
    dwellSeconds: 0
  });

  console.log("✅ Trip stop times created");

  // Derive legs
  const { TripLegsService } = await import("./modules/tripLegs/tripLegs.service");
  const tripLegsService = new TripLegsService(storage);
  await tripLegsService.deriveLegsFromTrip(trip);

  console.log("✅ Trip legs derived");

  // Precompute seat inventory
  const { SeatInventoryService } = await import("./modules/seatInventory/seatInventory.service");
  const seatInventoryService = new SeatInventoryService(storage);
  await seatInventoryService.precomputeInventory(trip);

  console.log("✅ Seat inventory precomputed");

  // Create basic price rule
  await storage.createPriceRule({
    scope: 'pattern',
    patternId: pattern.id,
    tripId: null,
    legIndex: null,
    rule: { 
      basePricePerLeg: 25000,
      currency: "IDR",
      multiplier: 1.0
    },
    validFrom: null,
    validTo: null,
    priority: 1
  });

  console.log("✅ Price rule created");
  console.log("🎉 Seed data creation completed!");
}

// Run the seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedData().catch(console.error);
}
