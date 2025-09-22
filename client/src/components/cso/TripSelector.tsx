import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { tripsApi, outletsApi } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Calendar, Bus, Info, Loader2 } from 'lucide-react';
import type { Trip, TripWithDetails, Outlet } from '@/types';

interface TripSelectorProps {
  selectedOutlet?: Outlet;
  selectedTrip?: TripWithDetails;
  onOutletSelect: (outlet: Outlet) => void;
  onTripSelect: (trip: TripWithDetails) => void;
}

export default function TripSelector({ 
  selectedOutlet, 
  selectedTrip, 
  onOutletSelect, 
  onTripSelect 
}: TripSelectorProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: outlets = [] } = useQuery({
    queryKey: ['/api/outlets'],
    queryFn: outletsApi.getAll
  });

  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ['/api/trips', selectedDate],
    queryFn: () => tripsApi.getAll(selectedDate),
    enabled: !!selectedDate
  });

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
          {tripsLoading ? (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Loading trips...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-6">
              <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No trips available for selected date</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trips.map(trip => (
                <div
                  key={trip.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTrip?.id === trip.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => onTripSelect(trip)}
                  data-testid={`trip-${trip.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">
                        {trip.patternName || `Route ${trip.patternCode || 'Unknown'}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {trip.scheduleTime ? new Date(trip.scheduleTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'No schedule'} • 
                        {trip.capacity} seats • {trip.status}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Vehicle: {trip.vehicleCode || 'Unknown'}
                      </p>
                    </div>
                    <Button 
                      variant={selectedTrip?.id === trip.id ? "default" : "outline"}
                      size="sm"
                      className="ml-2 shrink-0"
                      data-testid={`select-trip-${trip.id}`}
                    >
                      {selectedTrip?.id === trip.id ? 'Selected' : 'Select'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
