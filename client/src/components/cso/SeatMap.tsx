import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tripsApi } from '@/lib/api';
import { useSeatHold } from '@/hooks/useSeatHold';
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
    
    // If seat is booked, do nothing
    if (!seatAvailability.available && !seatAvailability.held) {
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
      return;
    }

    // If seat is available, select it and create hold
    try {
      await createHold(trip.id, seatNo, originSeq, destinationSeq, 120);
      setLocalSelectedSeats(prev => new Set(prev).add(seatNo));
      onSeatSelect(seatNo);
      // Refresh seatmap to get updated hold status
      refetch();
    } catch (error) {
      console.error('Failed to hold seat:', error);
    }
  };

  const getSeatClass = (seatNo: string) => {
    if (!seatmap) return 'seat available';
    
    const seatAvailability = seatmap.seatAvailability[seatNo];
    
    if (localSelectedSeats.has(seatNo)) {
      return 'seat selected';
    }
    
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
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading seat map...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!seatmap) {
    return (
      <Card data-testid="seat-map-error">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <i className="fas fa-exclamation-triangle text-destructive text-2xl mb-2"></i>
            <p className="text-muted-foreground">Failed to load seat map</p>
            <Button onClick={() => refetch()} className="mt-2" size="sm">
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <i className="fas fa-th-large mr-2 text-primary"></i>
            Seat Selection
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            <span data-testid="available-count">{getAvailableCount()}</span> of{' '}
            <span data-testid="total-capacity">{seatMapLayout.length}</span> available
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Seat Legend */}
        <div className="flex items-center space-x-4 mb-4 text-xs" data-testid="seat-legend">
          <div className="flex items-center space-x-1">
            <div className="seat available w-4 h-4"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="seat selected w-4 h-4"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="seat booked w-4 h-4"></div>
            <span>Booked</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="seat held w-4 h-4"></div>
            <span>On Hold</span>
          </div>
        </div>

        {/* Driver Area */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center space-x-2 text-sm text-muted-foreground">
            <i className="fas fa-steering-wheel"></i>
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
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4" data-testid="selected-seats-info">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Selected Seats</span>
              <span className="font-mono text-lg font-bold text-primary">
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
        <div className="mt-4 text-center">
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm"
            data-testid="refresh-availability"
          >
            <i className="fas fa-sync-alt mr-2"></i>
            Refresh Availability
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
