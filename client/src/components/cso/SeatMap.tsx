import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tripsApi } from '@/lib/api';
import { useSeatHold } from '@/hooks/useSeatHold';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Grid3X3, AlertTriangle, RotateCcw, Loader2, Car, Info } from 'lucide-react';
import type { Trip, SeatmapResponse } from '@/types';
import PassengerDetailModal from './PassengerDetailModal';

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
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [selectedSeatForDetails, setSelectedSeatForDetails] = useState<string | null>(null);
  const { createHold, releaseHold, getHoldTTL, isHeld } = useSeatHold();
  
  // WebSocket integration for real-time seat updates
  const {
    isConnected,
    subscribeToTrip,
    unsubscribeFromTrip,
    addEventListener
  } = useWebSocket();

  const { data: seatmap, isLoading, refetch } = useQuery({
    queryKey: ['/api/trips', trip.id, 'seatmap', originSeq, destinationSeq],
    queryFn: () => tripsApi.getSeatmap(trip.id, originSeq, destinationSeq),
    enabled: !!trip.id && originSeq > 0 && destinationSeq > 0,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const passengerDetailsMutation = useMutation({
    mutationFn: ({ tripId, seatNo, originSeq, destinationSeq }: {
      tripId: string;
      seatNo: string;
      originSeq: number;
      destinationSeq: number;
    }) => tripsApi.getSeatPassengerDetails(tripId, seatNo, originSeq, destinationSeq),
    onSuccess: (data) => {
      // Modal will display the data automatically since it's controlled by state
    },
    onError: (error) => {
      console.error('Failed to fetch passenger details:', error);
    }
  });

  useEffect(() => {
    setLocalSelectedSeats(new Set(selectedSeats));
  }, [selectedSeats]);

  // WebSocket subscription for real-time trip updates
  useEffect(() => {
    if (!isConnected || !trip.id) {
      return;
    }

    // Subscribe to trip-specific WebSocket room
    subscribeToTrip(trip.id);
    console.log(`[SeatMap WebSocket] Subscribed to trip: ${trip.id}`);

    return () => {
      unsubscribeFromTrip(trip.id);
      console.log(`[SeatMap WebSocket] Unsubscribed from trip: ${trip.id}`);
    };
  }, [isConnected, trip.id, subscribeToTrip, unsubscribeFromTrip]);

  // Event listeners for real-time seat inventory updates
  useEffect(() => {
    if (!isConnected) return;

    // Handle inventory updates (seat holds/releases/bookings)
    const unsubscribeInventory = addEventListener('INVENTORY_UPDATED', (data) => {
      console.log('[SeatMap WebSocket] Inventory updated:', data);
      
      // Only refetch if this update is for our current trip
      if (data.tripId === trip.id) {
        refetch();
      }
    });

    // Handle trip status changes
    const unsubscribeStatus = addEventListener('TRIP_STATUS_CHANGED', (data) => {
      console.log('[SeatMap WebSocket] Trip status changed:', data);
      
      // Refetch seat map when trip status changes (e.g., closed)
      if (data.tripId === trip.id) {
        refetch();
      }
    });

    // Handle holds released events
    const unsubscribeHolds = addEventListener('HOLDS_RELEASED', (data) => {
      console.log('[SeatMap WebSocket] Holds released:', data);
      
      // Refetch seat map when holds are released
      if (data.tripId === trip.id) {
        refetch();
      }
    });

    return () => {
      unsubscribeInventory();
      unsubscribeStatus();
      unsubscribeHolds();
    };
  }, [isConnected, trip.id, addEventListener, refetch]);

  const handleSeatClick = async (seatNo: string) => {
    if (!seatmap) return;

    const seatAvailability = seatmap.seatAvailability[seatNo];
    const isHeldByMe = isHeld(seatNo);
    
    // If seat is booked, show passenger details modal
    if (!seatAvailability.available && !seatAvailability.held) {
      setSelectedSeatForDetails(seatNo);
      setShowPassengerModal(true);
      passengerDetailsMutation.mutate({
        tripId: trip.id,
        seatNo,
        originSeq,
        destinationSeq
      });
      return;
    }
    
    // Block if seat is held by someone else (not by me)
    if (!seatAvailability.available && seatAvailability.held && !isHeldByMe) {
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
      
      // Use bookedType to determine specific booked class
      if (seatAvailability.bookedType === 'main') {
        return 'seat booked-main';
      } else if (seatAvailability.bookedType === 'transit') {
        return 'seat booked-transit';
      }
      
      // Fallback to generic booked class
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
        <div className="bg-card p-3 rounded-lg border border-border mb-4" data-testid="seat-legend">
          <h4 className="text-sm font-semibold mb-2">Seat Legend</h4>
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0" data-testid="legend-available">
              <div className="seat available w-5 h-5 flex-shrink-0 text-[9px] flex items-center justify-center">A</div>
              <span className="truncate">Available</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0" data-testid="legend-selected">
              <div className="seat selected w-5 h-5 flex-shrink-0 text-[9px] flex items-center justify-center">S</div>
              <span className="truncate">Selected</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0" data-testid="legend-booked-main">
              <div className="seat booked-main w-5 h-5 flex-shrink-0 text-[9px] flex items-center justify-center">M</div>
              <span className="truncate">Main Schedule</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0" data-testid="legend-booked-transit">
              <div className="seat booked-transit w-5 h-5 flex-shrink-0 text-[9px] flex items-center justify-center">T</div>
              <span className="truncate">Transit</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0" data-testid="legend-booked-generic">
              <div className="seat booked w-5 h-5 flex-shrink-0 text-[9px] flex items-center justify-center">B</div>
              <span className="truncate">Booked</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0" data-testid="legend-held">
              <div className="seat held w-5 h-5 flex-shrink-0 text-[9px] flex items-center justify-center">H</div>
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

        {/* Seat Interaction Info */}
        <div className="bg-muted/50 border border-border rounded-lg p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 mb-1">
            <Info className="w-3 h-3" />
            <span className="font-medium">Tip:</span>
          </div>
          <p>Klik kursi yang sudah terbooked untuk melihat detail penumpang</p>
        </div>

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

      {/* Passenger Detail Modal */}
      <PassengerDetailModal
        isOpen={showPassengerModal}
        onClose={() => {
          setShowPassengerModal(false);
          setSelectedSeatForDetails(null);
          passengerDetailsMutation.reset();
        }}
        passengerDetails={passengerDetailsMutation.data}
        isLoading={passengerDetailsMutation.isPending}
        isError={passengerDetailsMutation.isError}
        selectedSeatNo={selectedSeatForDetails}
      />
    </Card>
  );
}
