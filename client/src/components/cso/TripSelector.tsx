import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { tripsApi, outletsApi } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Trip, Outlet } from '@/types';

interface TripSelectorProps {
  selectedOutlet?: Outlet;
  selectedTrip?: Trip;
  onOutletSelect: (outlet: Outlet) => void;
  onTripSelect: (trip: Trip) => void;
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
    <div className="space-y-6">
      {/* Outlet Selection */}
      <Card data-testid="outlet-selector">
        <CardHeader>
          <CardTitle className="flex items-center">
            <i className="fas fa-store mr-2 text-primary"></i>
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
        <CardHeader>
          <CardTitle className="flex items-center">
            <i className="fas fa-calendar mr-2 text-primary"></i>
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
        <CardHeader>
          <CardTitle className="flex items-center">
            <i className="fas fa-bus mr-2 text-primary"></i>
            Available Trips
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tripsLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading trips...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-info-circle text-muted-foreground text-2xl mb-2"></i>
              <p className="text-muted-foreground">No trips available for selected date</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map(trip => (
                <div
                  key={trip.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTrip?.id === trip.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => onTripSelect(trip)}
                  data-testid={`trip-${trip.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Trip {trip.id.slice(-8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {trip.capacity} seats • {trip.status}
                      </p>
                    </div>
                    <Button 
                      variant={selectedTrip?.id === trip.id ? "default" : "outline"}
                      size="sm"
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
