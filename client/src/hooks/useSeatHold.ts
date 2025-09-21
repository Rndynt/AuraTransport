import { useState, useCallback, useRef, useEffect } from 'react';
import { holdsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface SeatHold {
  holdRef: string;
  seatNo: string;
  expiresAt: number;
  tripId: string;
  originSeq: number;
  destinationSeq: number;
}

export function useSeatHold() {
  const [holds, setHolds] = useState<Map<string, SeatHold>>(new Map());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout>();

  // Start TTL countdown for all holds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      setHolds(currentHolds => {
        const newHolds = new Map(currentHolds);
        let hasChanges = false;

        const expiredSeats = Array.from(newHolds.entries()).filter(([seatNo, hold]) => hold.expiresAt <= now);
        for (const [seatNo] of expiredSeats) {
          newHolds.delete(seatNo);
          hasChanges = true;
          toast({
            title: "Hold Expired",
            description: `Seat ${seatNo} hold has expired`,
            variant: "destructive"
          });
        }

        return hasChanges ? newHolds : currentHolds;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [toast]);

  const createHold = useCallback(async (
    tripId: string,
    seatNo: string,
    originSeq: number,
    destinationSeq: number,
    ttlSeconds: number = 120
  ) => {
    setLoading(true);
    try {
      const response = await holdsApi.create({
        tripId,
        seatNo,
        originSeq,
        destinationSeq,
        ttlSeconds
      });

      const hold: SeatHold = {
        holdRef: response.holdRef,
        seatNo,
        expiresAt: response.expiresAt,
        tripId,
        originSeq,
        destinationSeq
      };

      setHolds(current => new Map(current.set(seatNo, hold)));

      toast({
        title: "Seat Reserved",
        description: `Seat ${seatNo} reserved for ${Math.floor(ttlSeconds / 60)}m ${ttlSeconds % 60}s`
      });

      return response.holdRef;
    } catch (error) {
      // Check if it's "already held by you" error, which should not be treated as failure
      if (error instanceof Error && error.message.includes('ALREADY_HELD_BY_YOU')) {
        // If already held by the same user, treat as success (no error toast)
        // The existing hold info should already be in our state
        return null; // Don't throw error
      }
      
      console.error('Failed to hold seat:', error);
      toast({
        title: "Failed to Reserve Seat",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const releaseHold = useCallback(async (seatNo: string) => {
    const hold = holds.get(seatNo);
    if (!hold) return;

    try {
      await holdsApi.release(hold.holdRef);
      setHolds(current => {
        const newHolds = new Map(current);
        newHolds.delete(seatNo);
        return newHolds;
      });

      toast({
        title: "Hold Released",
        description: `Seat ${seatNo} is now available`
      });
    } catch (error) {
      toast({
        title: "Failed to Release Hold",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  }, [holds, toast]);

  const releaseAllHolds = useCallback(async () => {
    const releasePromises = Array.from(holds.keys()).map(seatNo => releaseHold(seatNo));
    await Promise.allSettled(releasePromises);
  }, [holds, releaseHold]);

  const getHoldTTL = useCallback((seatNo: string): number => {
    const hold = holds.get(seatNo);
    if (!hold) return 0;
    return Math.max(0, Math.floor((hold.expiresAt - Date.now()) / 1000));
  }, [holds]);

  const isHeld = useCallback((seatNo: string): boolean => {
    const hold = holds.get(seatNo);
    return hold ? hold.expiresAt > Date.now() : false;
  }, [holds]);

  return {
    holds: Array.from(holds.values()),
    loading,
    createHold,
    releaseHold,
    releaseAllHolds,
    getHoldTTL,
    isHeld
  };
}
