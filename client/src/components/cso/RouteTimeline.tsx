import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tripsApi, stopsApi } from '@/lib/api';
import { Route, Circle, Clock } from 'lucide-react';
import type { Trip, Stop, TripStopTime } from '@/types';

interface RouteTimelineProps {
  trip: Trip;
  selectedOrigin?: Stop;
  selectedDestination?: Stop;
  onOriginSelect: (stop: Stop, sequence: number) => void;
  onDestinationSelect: (stop: Stop, sequence: number) => void;
}

export default function RouteTimeline({
  trip,
  selectedOrigin,
  selectedDestination,
  onOriginSelect,
  onDestinationSelect
}: RouteTimelineProps) {
  const { data: stopTimes = [] } = useQuery({
    queryKey: ['/api/trips', trip.id, 'stop-times'],
    queryFn: () => tripsApi.getStopTimes(trip.id),
    enabled: !!trip.id
  });

  const { data: stops = [] } = useQuery({
    queryKey: ['/api/stops'],
    queryFn: stopsApi.getAll
  });

  const getStopById = (stopId: string) => stops.find(s => s.id === stopId);

  const formatTime = (timestamp: string | Date | null) => {
    if (!timestamp) return '--:--';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getStopColor = (sequence: number) => {
    if (sequence === 1) return 'bg-primary text-primary-foreground';
    if (sequence === stopTimes.length) return 'bg-destructive text-destructive-foreground';
    return 'bg-secondary text-secondary-foreground';
  };

  return (
    <Card data-testid="route-timeline">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-base">
          <Route className="w-4 h-4 mr-2 text-primary" />
          Route & Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="relative">
            {/* Timeline connector line */}
            <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-border"></div>
            
            {stopTimes
              .sort((a, b) => a.stopSequence - b.stopSequence)
              .map((stopTime, index) => {
                const stop = getStopById(stopTime.stopId);
                if (!stop) return null;

                const isOrigin = selectedOrigin?.id === stop.id;
                const isDestination = selectedDestination?.id === stop.id;

                return (
                  <div key={stopTime.id} className="relative flex items-center space-x-3 pb-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center relative z-10 ${getStopColor(stopTime.stopSequence)}`}>
                      <Circle className="w-2 h-2 fill-current" />
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{stop.name}</p>
                        <p className="text-xs text-muted-foreground">{stop.code}</p>
                      </div>
                      <div className="flex items-center space-x-1 md:block">
                        {index === 0 ? (
                          <>
                            <Clock className="w-3 h-3 text-muted-foreground md:hidden" />
                            <p className="text-xs text-muted-foreground hidden md:block">Departure</p>
                            <p className="font-mono text-xs md:text-sm">{formatTime(stopTime.departAt)}</p>
                          </>
                        ) : index === stopTimes.length - 1 ? (
                          <>
                            <Clock className="w-3 h-3 text-muted-foreground md:hidden" />
                            <p className="text-xs text-muted-foreground hidden md:block">Arrival</p>
                            <p className="font-mono text-xs md:text-sm">{formatTime(stopTime.arriveAt)}</p>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-muted-foreground md:hidden" />
                            <p className="text-xs text-muted-foreground hidden md:block">Arrive / Depart</p>
                            <p className="font-mono text-xs md:text-sm">{formatTime(stopTime.arriveAt)}</p>
                            <p className="font-mono text-xs md:text-sm">{formatTime(stopTime.departAt)}</p>
                          </>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                        {index < stopTimes.length - 1 && (
                          <Button
                            size="sm"
                            variant={isOrigin ? "default" : "outline"}
                            onClick={() => onOriginSelect(stop, stopTime.stopSequence)}
                            data-testid={`origin-${stop.code}`}
                            className="text-xs px-2 py-1 h-auto"
                          >
                            Origin
                          </Button>
                        )}
                        {index > 0 && (
                          <Button
                            size="sm"
                            variant={isDestination ? "default" : "outline"}
                            onClick={() => onDestinationSelect(stop, stopTime.stopSequence)}
                            data-testid={`destination-${stop.code}`}
                            className="text-xs px-2 py-1 h-auto"
                          >
                            Destination
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Journey Summary */}
        {selectedOrigin && selectedDestination && (
          <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-lg" data-testid="journey-summary">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">From:</span>
                <span className="ml-2">{selectedOrigin.name}</span>
              </div>
              <div>
                <span className="font-medium">To:</span>
                <span className="ml-2">{selectedDestination.name}</span>
              </div>
              <div>
                <span className="font-medium">Duration:</span>
                <span className="ml-2">Est. 2h 0m</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
