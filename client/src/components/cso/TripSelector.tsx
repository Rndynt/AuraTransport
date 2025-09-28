import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { tripsApi, outletsApi } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Calendar, Bus, Info, Loader2, Play, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Trip, TripWithDetails, Outlet, CsoAvailableTrip } from '@/types';

interface TripSelectorProps {
  selectedOutlet?: Outlet;
  selectedTrip?: CsoAvailableTrip;
  onOutletSelect: (outlet: Outlet) => void;
  onTripSelect: (trip: CsoAvailableTrip) => void;
}

export default function TripSelector({ 
  selectedOutlet, 
  selectedTrip, 
  onOutletSelect, 
  onTripSelect 
}: TripSelectorProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [materializingBaseId, setMaterializingBaseId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // WebSocket integration for real-time updates
  const {
    isConnected,
    subscribeToCso,
    unsubscribeFromCso,
    subscribeToTrip,
    unsubscribeFromTrip,
    addEventListener
  } = useWebSocket();

  const { data: outlets = [] } = useQuery({
    queryKey: ['/api/outlets'],
    queryFn: outletsApi.getAll
  });

  const { data: trips = [], isLoading: tripsLoading, refetch: refetchTrips } = useQuery<CsoAvailableTrip[]>({
    queryKey: ['/api/cso/available-trips', selectedDate, selectedOutlet?.id],
    queryFn: () => tripsApi.getCsoAvailableTrips(selectedDate, selectedOutlet!.id),
    enabled: !!selectedDate && !!selectedOutlet?.id
  });

  // WebSocket subscriptions and event handling
  useEffect(() => {
    if (!isConnected || !selectedOutlet?.id) {
      return;
    }

    // Subscribe to CSO room for this outlet and date
    subscribeToCso(selectedOutlet.id, selectedDate);
    console.log(`[CSO WebSocket] Subscribed to outlet ${selectedOutlet.id} for date ${selectedDate}`);

    return () => {
      if (selectedOutlet?.id) {
        unsubscribeFromCso(selectedOutlet.id, selectedDate);
        console.log(`[CSO WebSocket] Unsubscribed from outlet ${selectedOutlet.id} for date ${selectedDate}`);
      }
    };
  }, [isConnected, selectedOutlet?.id, selectedDate, subscribeToCso, unsubscribeFromCso]);

  // Subscribe to trip-specific WebSocket events for real-time updates
  useEffect(() => {
    if (!isConnected || !trips || trips.length === 0) {
      return;
    }

    // Subscribe to WebSocket events for each available trip
    const currentTripIds = trips
      .filter(trip => !trip.isVirtual && trip.tripId) // Only subscribe to materialized trips with valid tripId
      .map(trip => trip.tripId!)
      .filter(Boolean);

    console.log(`[CSO WebSocket] Subscribing to ${currentTripIds.length} trips for real-time updates`);
    
    currentTripIds.forEach(tripId => {
      subscribeToTrip(tripId);
      console.log(`[CSO WebSocket] Subscribed to trip: ${tripId}`);
    });

    return () => {
      currentTripIds.forEach(tripId => {
        unsubscribeFromTrip(tripId);
        console.log(`[CSO WebSocket] Unsubscribed from trip: ${tripId}`);
      });
    };
  }, [isConnected, trips, subscribeToTrip, unsubscribeFromTrip]);

  // Event listeners for real-time updates
  useEffect(() => {
    if (!isConnected) return;

    // Handle trip materialization events
    const unsubscribeMaterialized = addEventListener('TRIP_MATERIALIZED', (data) => {
      console.log('[CSO WebSocket] Trip materialized:', data);
      
      toast({
        title: "Trip Materialized",
        description: `Virtual trip for ${selectedDate} is now available for booking.`,
        variant: "default"
      });

      // Invalidate and refetch available trips to show the new materialized trip
      queryClient.invalidateQueries({
        queryKey: ['/api/cso/available-trips', selectedDate, selectedOutlet?.id]
      });
      
      // Clear materializing state if this was the trip being materialized
      if (data.baseId && materializingBaseId === data.baseId) {
        setMaterializingBaseId(null);
      }
    });

    // Handle trip status changes
    const unsubscribeStatusChanged = addEventListener('TRIP_STATUS_CHANGED', (data) => {
      console.log('[CSO WebSocket] Trip status changed:', data);
      
      if (data.status === 'closed') {
        toast({
          title: "Trip Closed",
          description: "This trip has been closed by supervisor. No new bookings can be made.",
          variant: "destructive"
        });
      } else if (data.status === 'canceled') {
        toast({
          title: "Trip Canceled",
          description: "This trip has been canceled.",
          variant: "destructive"
        });
      }

      // Check if this status change is for one of our available trips
      const affectsCurrentTrips = trips.some(trip => trip.tripId === data.tripId);
      
      if (affectsCurrentTrips) {
        console.log('[CSO WebSocket] Trip status change affects current trips, refetching...');
        refetchTrips();
      } else {
        // Update the trips list to reflect status changes
        queryClient.setQueryData<CsoAvailableTrip[]>(
          ['/api/cso/available-trips', selectedDate, selectedOutlet?.id],
          (oldTrips = []) => {
            return oldTrips.map(trip => 
              trip.tripId === data.tripId 
                ? { ...trip, status: data.status as any }
                : trip
            );
          }
        );
      }
    });

    // Handle inventory updates (for seat count changes)
    const unsubscribeInventoryUpdated = addEventListener('INVENTORY_UPDATED', (data) => {
      console.log('[CSO WebSocket] Inventory updated:', data);
      
      // Check if this update is for one of our available trips
      const affectsCurrentTrips = trips.some(trip => trip.tripId === data.tripId);
      
      if (affectsCurrentTrips) {
        console.log('[CSO WebSocket] Inventory update affects current trips, refetching...');
        refetchTrips();
      } else {
        // Lightweight update for other trips
        queryClient.invalidateQueries({
          queryKey: ['/api/cso/available-trips', selectedDate, selectedOutlet?.id],
          exact: false
        });
      }
    });

    // Handle holds released events
    const unsubscribeHoldsReleased = addEventListener('HOLDS_RELEASED', (data) => {
      console.log('[CSO WebSocket] Holds released:', data);
      
      // Check if this release is for one of our available trips
      const affectsCurrentTrips = trips.some(trip => trip.tripId === data.tripId);
      
      if (affectsCurrentTrips) {
        console.log('[CSO WebSocket] Holds release affects current trips, refetching...');
        refetchTrips();
      } else {
        // Update inventory to reflect released holds
        queryClient.invalidateQueries({
          queryKey: ['/api/cso/available-trips', selectedDate, selectedOutlet?.id],
          exact: false
        });
      }
    });

    return () => {
      unsubscribeMaterialized();
      unsubscribeStatusChanged();
      unsubscribeInventoryUpdated();
      unsubscribeHoldsReleased();
    };
  }, [isConnected, addEventListener, queryClient, selectedDate, selectedOutlet?.id, materializingBaseId, toast]);

  // Materialize trip mutation
  const materializeMutation = useMutation({
    mutationFn: async (baseId: string) => {
      setMaterializingBaseId(baseId);
      const response = await fetch('/api/cso/materialize-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseId, serviceDate: selectedDate })
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to materialize trip';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.code || errorMessage;
        } catch (e) {
          // Handle non-JSON error response
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      // Fetch the materialized trip details
      if (result.tripId) {
        const tripResponse = await fetch(`/api/trips/${result.tripId}`);
        if (tripResponse.ok) {
          const tripData = await tripResponse.json();
          return { ...result, materializedTrip: tripData };
        }
      }
      
      return result;
    },
    onSuccess: (data) => {
      setMaterializingBaseId(null);
      toast({
        title: "Trip Materialized",
        description: `Virtual trip has been made available for booking.`
      });
      
      // Refetch trips to get the updated list
      refetchTrips().then((result) => {
        // Find and auto-select the materialized trip from the fresh data
        if (data.tripId && result.data) {
          const materializedTrip = result.data.find(t => t.tripId === data.tripId);
          if (materializedTrip) {
            onTripSelect(materializedTrip);
          }
        }
      });
    },
    onError: (error: Error) => {
      setMaterializingBaseId(null);
      toast({
        title: "Materialize Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleTripSelect = async (trip: CsoAvailableTrip) => {
    // If trip is closed, prevent selection
    if (trip.status === 'closed') {
      toast({
        title: "Trip Closed",
        description: "This trip is closed and cannot be selected for booking.",
        variant: "destructive"
      });
      return;
    }

    // If virtual trip, materialize it first
    if (trip.isVirtual && trip.baseId) {
      try {
        await materializeMutation.mutateAsync(trip.baseId);
        // After materialization, the onSuccess callback will auto-select the materialized trip
      } catch (error) {
        // Error already handled in mutation onError
      }
    } else {
      // Real trip, select it directly
      onTripSelect(trip);
    }
  };

  const getTripBadges = (trip: CsoAvailableTrip) => {
    const badges = [];
    
    // Virtual/Real badge
    if (trip.isVirtual) {
      badges.push(
        <Badge key="virtual" variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Virtual
        </Badge>
      );
    } else {
      badges.push(
        <Badge key="real" variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Real
        </Badge>
      );
    }

    // Status badges
    if (trip.status === 'closed') {
      badges.push(
        <Badge key="closed" variant="destructive" className="bg-red-50 text-red-700 border-red-200">
          <Ban className="w-3 h-3 mr-1" />
          Closed
        </Badge>
      );
    } else if (trip.status === 'canceled') {
      badges.push(
        <Badge key="canceled" variant="secondary">
          Canceled
        </Badge>
      );
    } else if (trip.status === 'draft') {
      badges.push(
        <Badge key="draft" variant="outline">
          Draft
        </Badge>
      );
    }

    return badges;
  };

  const isTripDisabled = (trip: CsoAvailableTrip) => {
    return trip.status === 'closed' || trip.status === 'canceled';
  };

  return (
    <div className="space-y-6">
      {/* Outlet & Date Selection - Compact Layout */}
      <div className="space-y-4">
        {/* Select Outlet */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Select Outlet</Label>
          </div>
          <Select 
            value={selectedOutlet?.id} 
            onValueChange={(value) => {
              const outlet = outlets.find(o => o.id === value);
              if (outlet) onOutletSelect(outlet);
            }}
            data-testid="outlet-select"
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Jakarta Terminal Outlet →" />
            </SelectTrigger>
            <SelectContent>
              {outlets.map(outlet => (
                <SelectItem key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Select Date */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Select Date</Label>
          </div>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-10"
            data-testid="trip-date-input"
          />
        </div>
      </div>

      {/* Available Trips */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bus className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Available Trips</h3>
        </div>
        
        <div className="border rounded-lg">
          {!selectedOutlet ? (
            <div className="text-center py-8 p-4">
              <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">Select an outlet to see available trips for this date</p>
            </div>
          ) : tripsLoading ? (
            <div className="text-center py-8 p-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading trips...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-8 p-4">
              <Bus className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm">No trips available for this outlet on {selectedDate}</p>
              <p className="text-xs text-muted-foreground mt-1">Try another date or outlet</p>
            </div>
          ) : (
            <div className="p-4">
              {/* Group trips by route */}
              {Object.entries(
                (trips || []).reduce((groups: Record<string, CsoAvailableTrip[]>, trip) => {
                  const routeName = trip.patternPath;
                  if (!groups[routeName]) {
                    groups[routeName] = [];
                  }
                  groups[routeName].push(trip);
                  return groups;
                }, {})
              ).map(([routeName, routeTrips]) => (
                <div key={routeName} className="mb-6 last:mb-0">
                  {/* Route Header */}
                  <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    <h3 className="font-medium text-sm text-foreground">{routeName}</h3>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">({routeTrips.length} trips)</span>
                  </div>
                  
                  {/* Route Trips - Clean List */}
                  <div className="space-y-2">
                    {routeTrips
                      .sort((a, b) => {
                        if (!a.departAtAtOutlet && !b.departAtAtOutlet) return 0;
                        if (!a.departAtAtOutlet) return 1;
                        if (!b.departAtAtOutlet) return -1;
                        return new Date(a.departAtAtOutlet).getTime() - new Date(b.departAtAtOutlet).getTime();
                      })
                      .map(trip => {
                        const disabled = isTripDisabled(trip);
                        const isCurrentlyMaterializing = materializingBaseId === trip.baseId;
                        // Fix selection logic: For virtual trips, use baseId + departure time for unique identification
                        // For real trips, use tripId. This prevents all virtual trips from showing as "Selected"
                        const isSelected = selectedTrip ? 
                          (trip.isVirtual 
                            ? (selectedTrip.isVirtual && 
                               selectedTrip.baseId === trip.baseId && 
                               selectedTrip.departAtAtOutlet === trip.departAtAtOutlet)
                            : selectedTrip.tripId === trip.tripId
                          ) : false;
                        
                        return (
                          <div
                            key={trip.tripId || `${trip.baseId}-${trip.departAtAtOutlet}`}
                            className={`p-3 border rounded-lg transition-all duration-200 ${
                              disabled 
                                ? 'border-gray-200 bg-gray-50/50 cursor-not-allowed opacity-60'
                                : isSelected
                                  ? 'border-blue-500 bg-blue-50/50 shadow-sm cursor-pointer'
                                  : 'border-border hover:border-blue-300 hover:shadow-sm cursor-pointer'
                            }`}
                            onClick={() => !disabled && handleTripSelect(trip)}
                            data-testid={`trip-${trip.tripId || `${trip.baseId}-${new Date(trip.departAtAtOutlet || '').getTime()}`}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              {/* Time */}
                              <div className="text-center min-w-0">
                                <div className="font-bold text-lg leading-none text-foreground">
                                  {trip.departAtAtOutlet ? 
                                    new Date(trip.departAtAtOutlet).toLocaleTimeString('id-ID', { 
                                      hour: '2-digit', 
                                      minute: '2-digit', 
                                      hour12: false, 
                                      timeZone: 'Asia/Jakarta' 
                                    }) : '--:--'
                                  }
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {trip.isVirtual ? (
                                    <span className="text-blue-600">
                                      Seats: est. {trip.availableSeats || trip.capacity || '?'}
                                    </span>
                                  ) : (
                                    <span className="text-green-600 font-medium">
                                      Seats: {trip.availableSeats || '?'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Trip Details */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  {getTripBadges(trip)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {trip.vehicle ? 
                                    `${trip.vehicle.code} (${trip.vehicle.plate})` : 
                                    'Vehicle TBD'
                                  }
                                </div>
                              </div>
                              
                              {/* Select Button */}
                              <Button 
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                className={`shrink-0 h-8 px-4 font-medium hidden ${
                                  isSelected ? 'bg-blue-600 hover:bg-blue-700' : ''
                                }`}
                                disabled={disabled || isCurrentlyMaterializing}
                                data-testid={`select-trip-${trip.tripId || `${trip.baseId}-${new Date(trip.departAtAtOutlet || '').getTime()}`}`}
                              >
                                {isCurrentlyMaterializing ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : disabled ? (
                                  'N/A'
                                ) : isSelected ? (
                                  '' //selected
                                ) : (
                                  '' //select 
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
