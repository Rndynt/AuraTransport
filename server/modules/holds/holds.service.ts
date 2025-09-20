import { randomUUID } from "crypto";

interface SeatHold {
  holdRef: string;
  tripId: string;
  seatNo: string;
  legIndexes: number[];
  expiresAt: number;
}

export class HoldsService {
  private holds: Map<string, SeatHold> = new Map();
  private seatHolds: Map<string, string> = new Map(); // seatKey -> holdRef

  constructor() {
    // Cleanup expired holds every 30 seconds
    setInterval(() => this.cleanupExpiredHolds(), 30000);
  }

  private getSeatKey(tripId: string, seatNo: string, legIndex: number): string {
    return `${tripId}:${seatNo}:${legIndex}`;
  }

  private cleanupExpiredHolds(): void {
    const now = Date.now();
    const expiredHolds = Array.from(this.holds.entries()).filter(([holdRef, hold]) => hold.expiresAt <= now);
    for (const [holdRef] of expiredHolds) {
      this.releaseHoldByRef(holdRef);
    }
  }

  async createSeatHold(tripId: string, seatNo: string, legIndexes: number[], ttlSeconds: number = 120): Promise<string> {
    const now = Date.now();
    const expiresAt = now + (ttlSeconds * 1000);
    const holdRef = randomUUID();

    // Check if any of the required legs are already held or booked
    for (const legIndex of legIndexes) {
      const seatKey = this.getSeatKey(tripId, seatNo, legIndex);
      if (this.seatHolds.has(seatKey)) {
        throw new Error(`Seat ${seatNo} is already held for leg ${legIndex}`);
      }
    }

    // Create hold for all legs atomically
    const hold: SeatHold = {
      holdRef,
      tripId,
      seatNo,
      legIndexes,
      expiresAt
    };

    this.holds.set(holdRef, hold);

    // Mark each leg as held
    for (const legIndex of legIndexes) {
      const seatKey = this.getSeatKey(tripId, seatNo, legIndex);
      this.seatHolds.set(seatKey, holdRef);
    }

    return holdRef;
  }

  async releaseSeatHold(tripId: string, seatNo: string, legIndexes: number[]): Promise<void> {
    // Find hold by checking first leg
    const firstLegKey = this.getSeatKey(tripId, seatNo, legIndexes[0]);
    const holdRef = this.seatHolds.get(firstLegKey);
    
    if (holdRef) {
      this.releaseHoldByRef(holdRef);
    }
  }

  async releaseHoldByRef(holdRef: string): Promise<void> {
    const hold = this.holds.get(holdRef);
    if (!hold) return;

    // Remove from all legs
    for (const legIndex of hold.legIndexes) {
      const seatKey = this.getSeatKey(hold.tripId, hold.seatNo, legIndex);
      this.seatHolds.delete(seatKey);
    }

    this.holds.delete(holdRef);
  }

  async isSeatHeld(tripId: string, seatNo: string, legIndexes: number[]): Promise<boolean> {
    // Check if all required legs are held by the same hold
    let commonHoldRef: string | null = null;

    for (const legIndex of legIndexes) {
      const seatKey = this.getSeatKey(tripId, seatNo, legIndex);
      const holdRef = this.seatHolds.get(seatKey);
      
      if (!holdRef) return false; // Not held
      
      if (commonHoldRef === null) {
        commonHoldRef = holdRef;
      } else if (commonHoldRef !== holdRef) {
        return false; // Held by different holds
      }

      // Check if hold is expired
      const hold = this.holds.get(holdRef);
      if (!hold || hold.expiresAt <= Date.now()) {
        return false;
      }
    }

    return true;
  }

  async getHoldInfo(holdRef: string): Promise<SeatHold | null> {
    const hold = this.holds.get(holdRef);
    if (!hold || hold.expiresAt <= Date.now()) {
      return null;
    }
    return hold;
  }
}
