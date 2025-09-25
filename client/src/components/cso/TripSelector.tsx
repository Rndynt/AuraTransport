import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  const { toast } = useToast();

  const { data: outlets = [] } = useQuery({
    queryKey: ['/api/outlets'],
    queryFn: outletsApi.getAll
  });

  const { data: trips = [], isLoading: tripsLoading, refetch: refetchTrips } = useQuery<CsoAvailableTrip[]>({
    queryKey: ['/api/cso/available-trips', selectedDate, selectedOutlet?.id],
    queryFn: () => tripsApi.getCsoAvailableTrips(selectedDate, selectedOutlet!.id),
    enabled: !!selectedDate && !!selectedOutlet?.id
  });

  // Materialize trip mutation
  const materializeMutation = useMutation({
    mutationFn: async (baseId: string) => {
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
    <div className="space-y-4">
      {/* Outlet Selection */}
      <Card data-testid="outlet-selector">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <Store className="w-4 h-4 mr-2 text-primary" />
            Select Outlet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedOutlet?.id} 
            onValueChange={(value) => {
              const outlet = outlets.find(o => o.id === value);
              if (outlet) onOutletSelect(outlet);
            }}
            data-testid="outlet-select"
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose outlet..." />
            </SelectTrigger>
            <SelectContent>
              {outlets.map(outlet => (
                <SelectItem key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Date Selection */}
      <Card data-testid="date-selector">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <Calendar className="w-4 h-4 mr-2 text-primary" />
            Select Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="trip-date">Service Date</Label>
            <Input
              id="trip-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              data-testid="trip-date-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Trip Selection */}
      <Card data-testid="trip-selector">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <Bus className="w-4 h-4 mr-2 text-primary" />
            Available Trips
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedOutlet ? (
            <div className="text-center py-6">
              <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Select an outlet to see available trips for this date</p>
            </div>
          ) : tripsLoading ? (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Loading trips...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-6">
              <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No trips available for this outlet on {selectedDate}</p>
              <p className="text-sm text-muted-foreground mt-1">Try another date or outlet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trips.map(trip => {
                const disabled = isTripDisabled(trip);
                const isSelected = selectedTrip?.tripId === trip.tripId || 
                                 (trip.isVirtual && selectedTrip?.baseId === trip.baseId);
                
                return (
                  <div
                    key={trip.tripId || trip.baseId}
                    className={`p-3 border rounded-lg transition-colors ${
                      disabled 
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                        : isSelected
                          ? 'border-primary bg-primary/5 cursor-pointer'
                          : 'border-border hover:border-primary/50 cursor-pointer'
                    }`}
                    onClick={() => !disabled && handleTripSelect(trip)}
                    data-testid={`trip-${trip.tripId || trip.baseId}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium text-sm">
                            {trip.patternPath || `Route ${trip.patternCode || 'Unknown'}`}
                          </p>
                          <div className="flex gap-1 flex-wrap">
                            {getTripBadges(trip)}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {trip.departAtAtOutlet ? new Date(trip.departAtAtOutlet).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }) : 'Time not set'} • 
                          {trip.capacity} seats
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Vehicle: {trip.vehicle?.code || 'Unknown'} ({trip.vehicle?.plate || 'Unknown'})
                        </p>
                      </div>
                      <Button 
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className="ml-2 shrink-0"
                        disabled={disabled || materializeMutation.isPending}
                        data-testid={`select-trip-${trip.tripId || trip.baseId}`}
                      >
                        {materializeMutation.isPending && trip.isVirtual ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Materializing...
                          </>
                        ) : disabled ? (
                          'Unavailable'
                        ) : trip.isVirtual ? (
                          <>
                            <Play className="w-3 h-3 mr-1" />
                            Materialize
                          </>
                        ) : isSelected ? (
                          'Selected'
                        ) : (
                          'Select'
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
