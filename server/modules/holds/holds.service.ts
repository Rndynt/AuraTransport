import { randomUUID } from "crypto";
import { getConfig } from "../../config";
import { db } from "../../db";
import { seatHolds, seatInventory } from "@shared/schema";
import { eq, and, lt, inArray } from "drizzle-orm";

interface SeatHoldOwner {
  operatorId: string;
  bookingId?: string;
}

interface SeatHold {
  holdRef: string;
  tripId: string;
  seatNo: string;
  legIndexes: number[];
  expiresAt: number;
  ttlClass: 'short' | 'long';
  owner: SeatHoldOwner;
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

  async createSeatHold(
    tripId: string, 
    seatNo: string, 
    legIndexes: number[], 
    ttlClass: 'short' | 'long' = 'short',
    owner: SeatHoldOwner
  ): Promise<{ ok: boolean; holdRef?: string; expiresAt?: number; ownedByYou?: boolean; reason?: string }> {
    const config = getConfig();
    const now = Date.now();
    const ttlSeconds = ttlClass === 'short' ? config.holdTtlShortSeconds : config.holdTtlLongSeconds;
    const expiresAt = now + (ttlSeconds * 1000);
    const holdRef = randomUUID();

    // Check if any of the required legs are already held or booked
    for (const legIndex of legIndexes) {
      const seatKey = this.getSeatKey(tripId, seatNo, legIndex);
      const existingHoldRef = this.seatHolds.get(seatKey);
      
      if (existingHoldRef) {
        const existingHold = this.holds.get(existingHoldRef);
        if (existingHold) {
          // Check if it's the same operator
          if (existingHold.owner.operatorId === owner.operatorId) {
            return {
              ok: false,
              reason: 'already-held-by-you',
              ownedByYou: true
            };
          } else {
            return {
              ok: false,
              reason: 'held-by-other',
              ownedByYou: false
            };
          }
        }
      }
    }

    // Create hold for all legs atomically
    const hold: SeatHold = {
      holdRef,
      tripId,
      seatNo,
      legIndexes,
      expiresAt,
      ttlClass,
      owner
    };

    this.holds.set(holdRef, hold);

    // Mark each leg as held
    for (const legIndex of legIndexes) {
      const seatKey = this.getSeatKey(tripId, seatNo, legIndex);
      this.seatHolds.set(seatKey, holdRef);
    }

    return {
      ok: true,
      holdRef,
      expiresAt,
      ownedByYou: true
    };
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

  async getSeatHoldInfo(tripId: string, seatNo: string, legIndex: number): Promise<SeatHold | null> {
    const seatKey = this.getSeatKey(tripId, seatNo, legIndex);
    const holdRef = this.seatHolds.get(seatKey);
    
    if (holdRef) {
      const hold = this.holds.get(holdRef);
      if (hold && hold.expiresAt > Date.now()) {
        return hold;
      }
    }
    return null;
  }

  async extendHold(holdRef: string, ttlClass: 'short' | 'long'): Promise<boolean> {
    const hold = this.holds.get(holdRef);
    if (!hold) return false;

    const config = getConfig();
    const now = Date.now();
    const ttlSeconds = ttlClass === 'short' ? config.holdTtlShortSeconds : config.holdTtlLongSeconds;
    
    hold.expiresAt = now + (ttlSeconds * 1000);
    hold.ttlClass = ttlClass;
    
    return true;
  }

  async convertHoldsToLong(operatorId: string, bookingId: string): Promise<void> {
    // Find all holds owned by this operator and convert them to long holds
    for (const [holdRef, hold] of Array.from(this.holds.entries())) {
      if (hold.owner.operatorId === operatorId && !hold.owner.bookingId) {
        hold.owner.bookingId = bookingId;
        this.extendHold(holdRef, 'long');
      }
    }
  }

  async releaseHoldsByOwner(operatorId: string, bookingId?: string): Promise<void> {
    const holdsToRelease: string[] = [];
    
    for (const [holdRef, hold] of Array.from(this.holds.entries())) {
      if (hold.owner.operatorId === operatorId) {
        if (bookingId && hold.owner.bookingId === bookingId) {
          holdsToRelease.push(holdRef);
        } else if (!bookingId && !hold.owner.bookingId) {
          holdsToRelease.push(holdRef);
        }
      }
    }
    
    for (const holdRef of holdsToRelease) {
      this.releaseHoldByRef(holdRef);
    }
  }
}
