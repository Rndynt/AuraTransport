import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tripsApi } from '@/lib/api';
import { useSeatHold } from '@/hooks/useSeatHold';
import { Grid3X3, AlertTriangle, RotateCcw, Loader2, Car } from 'lucide-react';
import type { Trip, SeatmapResponse } from '@/types';

interface SeatMapProps {
  trip: Trip;
  originSeq: number;
  destinationSeq: number;
  selectedSeats: string[];
  onSeatSelect: (seatNo: string) => void;
  onSeatDeselect: (seatNo: string) => void;
}

export default function SeatMap({
  trip,
  originSeq,
  destinationSeq,
  selectedSeats,
  onSeatSelect,
  onSeatDeselect
}: SeatMapProps) {
  const [localSelectedSeats, setLocalSelectedSeats] = useState<Set<string>>(new Set());
  const { createHold, releaseHold, getHoldTTL, isHeld } = useSeatHold();

  const { data: seatmap, isLoading, refetch } = useQuery({
    queryKey: ['/api/trips', trip.id, 'seatmap', originSeq, destinationSeq],
    queryFn: () => tripsApi.getSeatmap(trip.id, originSeq, destinationSeq),
    enabled: !!trip.id && originSeq > 0 && destinationSeq > 0,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  useEffect(() => {
    setLocalSelectedSeats(new Set(selectedSeats));
  }, [selectedSeats]);

  const handleSeatClick = async (seatNo: string) => {
    if (!seatmap) return;

    const seatAvailability = seatmap.seatAvailability[seatNo];
    const isHeldByMe = isHeld(seatNo);
    
    // Block only if seat is booked or held by someone else (not by me)
    if (!seatAvailability.available && !isHeldByMe) {
      return;
    }

    // If seat is already selected, deselect it
    if (localSelectedSeats.has(seatNo)) {
      setLocalSelectedSeats(prev => {
        const newSet = new Set(prev);
        newSet.delete(seatNo);
        return newSet;
      });
      await releaseHold(seatNo);
      onSeatDeselect(seatNo);
      refetch(); // Refresh after releasing hold
      return;
    }

    // If seat is held by me but not selected, just select it without creating new hold
    if (isHeldByMe) {
      setLocalSelectedSeats(prev => new Set(prev).add(seatNo));
      onSeatSelect(seatNo);
      return;
    }

    // If seat is available, select it and create hold
    try {
      await createHold(trip.id, seatNo, originSeq, destinationSeq, 1200); // 20 minutes = 1200 seconds
      setLocalSelectedSeats(prev => new Set(prev).add(seatNo));
      onSeatSelect(seatNo);
      refetch(); // Refresh after creating hold
    } catch (error) {
      console.error('Failed to hold seat:', error);
    }
  };

  const getSeatClass = (seatNo: string) => {
    if (!seatmap) return 'seat available';
    
    const seatAvailability = seatmap.seatAvailability[seatNo];
    
    // Check if seat is selected by current user
    if (localSelectedSeats.has(seatNo)) {
      return 'seat selected';
    }
    
    // Check if seat is held by current user (from local holds)
    if (isHeld(seatNo)) {
      return 'seat held';
    }
    
    // Check server-side availability
    if (!seatAvailability.available) {
      if (seatAvailability.held) {
        return 'seat held';
      }
      return 'seat booked';
    }
    
    return 'seat available';
  };

  const getAvailableCount = () => {
    if (!seatmap) return 0;
    return Object.values(seatmap.seatAvailability).filter(seat => seat.available).length;
  };

  const formatTTL = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading) {
    return (
      <Card data-testid="seat-map-loading">
        <CardContent className="flex items-center justify-center h-40">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Loading seat map...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!seatmap) {
    return (
      <Card data-testid="seat-map-error">
        <CardContent className="flex items-center justify-center h-40">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Failed to load seat map</p>
            <Button onClick={() => refetch()} className="mt-2" size="sm">
              <RotateCcw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const seatMapLayout = seatmap.layout.seatMap as any[];

  return (
    <Card data-testid="seat-map">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-base">
            <Grid3X3 className="w-4 h-4 mr-2 text-primary" />
            Seat Selection
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            <span data-testid="available-count">{getAvailableCount()}</span> of{' '}
            <span data-testid="total-capacity">{seatMapLayout.length}</span> available
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Seat Legend */}
        <div className="bg-card p-4 rounded-lg border border-border mb-4">
          <h4 className="text-sm font-semibold mb-3">Seat Legend</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <div className="seat available w-6 h-6 flex-shrink-0 text-[10px]">A</div>
              <span className="truncate">Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="seat selected w-6 h-6 flex-shrink-0 text-[10px]">S</div>
              <span className="truncate">Selected</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="seat booked w-6 h-6 flex-shrink-0 text-[10px]">B</div>
              <span className="truncate">Booked</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="seat held w-6 h-6 flex-shrink-0 text-[10px]">H</div>
              <span className="truncate">On Hold</span>
            </div>
          </div>
        </div>

        {/* Driver Area */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center space-x-1 text-xs text-muted-foreground">
            <Car className="w-3 h-3" />
            <span>Driver</span>
          </div>
        </div>

        {/* Seat Grid */}
        <div className="seat-grid mx-auto mb-4" data-testid="seat-grid">
          {seatMapLayout.map(seat => {
            const seatClass = getSeatClass(seat.seat_no);
            const holdTTL = getHoldTTL(seat.seat_no);
            
            return (
              <div
                key={seat.seat_no}
                className={seatClass}
                onClick={() => handleSeatClick(seat.seat_no)}
                data-testid={`seat-${seat.seat_no}`}
                title={
                  holdTTL > 0 
                    ? `Held - expires in ${formatTTL(holdTTL)}`
                    : seat.disabled 
                    ? 'Disabled' 
                    : seat.seat_no
                }
              >
                {seat.seat_no}
              </div>
            );
          })}
        </div>

        {/* Selected Seats Info */}
        {localSelectedSeats.size > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3" data-testid="selected-seats-info">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Selected Seats</span>
              <span className="font-mono text-sm font-bold text-primary">
                {Array.from(localSelectedSeats).join(', ')}
              </span>
            </div>
            {Array.from(localSelectedSeats).map(seatNo => {
              const ttl = getHoldTTL(seatNo);
              return ttl > 0 ? (
                <div key={seatNo} className="text-xs text-muted-foreground">
                  Seat {seatNo} expires in: <span className="font-mono text-accent">{formatTTL(ttl)}</span>
                </div>
              ) : null;
            })}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-3 text-center">
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm"
            data-testid="refresh-availability"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Refresh Availability
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
