import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tripsApi, stopsApi } from '@/lib/api';
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

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '--:--';
    return new Date(timestamp).toLocaleTimeString('en-US', {
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
      <CardHeader>
        <CardTitle className="flex items-center">
          <i className="fas fa-route mr-2 text-primary"></i>
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
                  <div key={stopTime.id} className="relative flex items-center space-x-4 pb-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center relative z-10 ${getStopColor(stopTime.stopSequence)}`}>
                      <i className="fas fa-circle text-xs"></i>
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div>
                        <p className="font-medium text-foreground">{stop.name}</p>
                        <p className="text-xs text-muted-foreground">{stop.code}</p>
                      </div>
                      <div>
                        {index === 0 ? (
                          <>
                            <p className="text-sm text-muted-foreground">Departure</p>
                            <p className="font-mono text-sm">{formatTime(stopTime.departAt)}</p>
                          </>
                        ) : index === stopTimes.length - 1 ? (
                          <>
                            <p className="text-sm text-muted-foreground">Arrival</p>
                            <p className="font-mono text-sm">{formatTime(stopTime.arriveAt)}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">Arrive / Depart</p>
                            <p className="font-mono text-sm">{formatTime(stopTime.arriveAt)}</p>
                            <p className="font-mono text-sm">{formatTime(stopTime.departAt)}</p>
                          </>
                        )}
                      </div>
                      <div className="space-x-2">
                        {index < stopTimes.length - 1 && (
                          <Button
                            size="sm"
                            variant={isOrigin ? "default" : "outline"}
                            onClick={() => onOriginSelect(stop, stopTime.stopSequence)}
                            data-testid={`origin-${stop.code}`}
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
