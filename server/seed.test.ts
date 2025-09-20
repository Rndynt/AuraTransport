import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { storage } from './storage';
import { seedData } from './seed';

describe('Seed Data Tests', () => {
  beforeAll(async () => {
    // Clear any existing data and run seed
    await seedData();
  });

  it('should create stops with correct outlet flags', async () => {
    const stops = await storage.getStops();
    
    // Find each stop
    const jakarta = stops.find(s => s.code === 'JKT');
    const purwakarta = stops.find(s => s.code === 'PWK');
    const bandung = stops.find(s => s.code === 'BDG');
    
    expect(jakarta).toBeDefined();
    expect(purwakarta).toBeDefined();
    expect(bandung).toBeDefined();
    
    // Verify outlet flags
    expect(jakarta!.isOutlet).toBe(true);
    expect(purwakarta!.isOutlet).toBe(false);
    expect(bandung!.isOutlet).toBe(true);
  });

  it('should create outlets only for Jakarta and Bandung', async () => {
    const outlets = await storage.getOutlets();
    const stops = await storage.getStops();
    
    const jakarta = stops.find(s => s.code === 'JKT');
    const purwakarta = stops.find(s => s.code === 'PWK');
    const bandung = stops.find(s => s.code === 'BDG');
    
    // Should have exactly 2 outlets
    expect(outlets).toHaveLength(2);
    
    // Should have outlets for Jakarta and Bandung
    const jakartaOutlet = outlets.find(o => o.stopId === jakarta!.id);
    const bandungOutlet = outlets.find(o => o.stopId === bandung!.id);
    const purwakartaOutlet = outlets.find(o => o.stopId === purwakarta!.id);
    
    expect(jakartaOutlet).toBeDefined();
    expect(bandungOutlet).toBeDefined();
    expect(purwakartaOutlet).toBeUndefined(); // Should NOT have Purwakarta outlet
  });

  it('should create pattern AB_via_C with correct stop sequence', async () => {
    const patterns = await storage.getTripPatterns();
    const pattern = patterns.find(p => p.code === 'AB_via_C');
    
    expect(pattern).toBeDefined();
    expect(pattern!.name).toBe('Jakarta to Bandung via Purwakarta');
    
    const patternStops = await storage.getPatternStops(pattern!.id);
    expect(patternStops).toHaveLength(3);
    
    // Verify stop sequence: A(1)→C(2)→B(3)
    const sortedStops = patternStops.sort((a, b) => a.stopSequence - b.stopSequence);
    
    const stops = await storage.getStops();
    const jakarta = stops.find(s => s.code === 'JKT');
    const purwakarta = stops.find(s => s.code === 'PWK');
    const bandung = stops.find(s => s.code === 'BDG');
    
    expect(sortedStops[0].stopId).toBe(jakarta!.id); // A (Jakarta) = sequence 1
    expect(sortedStops[0].stopSequence).toBe(1);
    
    expect(sortedStops[1].stopId).toBe(purwakarta!.id); // C (Purwakarta) = sequence 2
    expect(sortedStops[1].stopSequence).toBe(2);
    
    expect(sortedStops[2].stopId).toBe(bandung!.id); // B (Bandung) = sequence 3
    expect(sortedStops[2].stopSequence).toBe(3);
  });

  it('should create trip with correct stop times', async () => {
    const trips = await storage.getTrips();
    expect(trips).toHaveLength(1);
    
    const trip = trips[0];
    const tripStopTimes = await storage.getTripStopTimes(trip.id);
    
    expect(tripStopTimes).toHaveLength(3);
    
    // Sort by stop sequence
    const sortedTimes = tripStopTimes.sort((a, b) => a.stopSequence - b.stopSequence);
    
    // Verify times: A 10:00 depart, C 10:55/11:00, B 12:00
    const jakartaTime = sortedTimes[0];
    const purwakartaTime = sortedTimes[1];
    const bandungTime = sortedTimes[2];
    
    // Jakarta: 10:00 depart, no arrival
    expect(jakartaTime.stopSequence).toBe(1);
    expect(jakartaTime.arriveAt).toBeNull();
    expect(jakartaTime.departAt).toBeDefined();
    const jakartaDepart = new Date(jakartaTime.departAt!);
    expect(jakartaDepart.getHours()).toBe(10);
    expect(jakartaDepart.getMinutes()).toBe(0);
    
    // Purwakarta: arrive 10:55, depart 11:00
    expect(purwakartaTime.stopSequence).toBe(2);
    expect(purwakartaTime.arriveAt).toBeDefined();
    expect(purwakartaTime.departAt).toBeDefined();
    const purwakartaArrive = new Date(purwakartaTime.arriveAt!);
    const purwakartaDepart = new Date(purwakartaTime.departAt!);
    expect(purwakartaArrive.getHours()).toBe(10);
    expect(purwakartaArrive.getMinutes()).toBe(55);
    expect(purwakartaDepart.getHours()).toBe(11);
    expect(purwakartaDepart.getMinutes()).toBe(0);
    
    // Bandung: arrive 12:00, no departure
    expect(bandungTime.stopSequence).toBe(3);
    expect(bandungTime.arriveAt).toBeDefined();
    expect(bandungTime.departAt).toBeNull();
    const bandungArrive = new Date(bandungTime.arriveAt!);
    expect(bandungArrive.getHours()).toBe(12);
    expect(bandungArrive.getMinutes()).toBe(0);
  });

  it('should have derived trip legs and precomputed seat inventory', async () => {
    const trips = await storage.getTrips();
    const trip = trips[0];
    
    // Check trip legs are derived
    const tripLegs = await storage.getTripLegs(trip.id);
    expect(tripLegs).toHaveLength(2); // A→C, C→B
    
    // Check seat inventory is precomputed
    const seatInventory = await storage.getSeatInventory(trip.id);
    expect(seatInventory.length).toBeGreaterThan(0);
  });
});