import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { tripsApi, tripPatternsApi, vehiclesApi, layoutsApi } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { Trip, TripPattern, Vehicle, Layout } from '@/types';
import TripScheduleEditor from './TripScheduleEditor';

interface TripFormData {
  patternId: string;
  serviceDate: string;
  vehicleId: string;
  layoutId: string;
  capacity: string;
  status: 'scheduled' | 'canceled' | 'closed';
}

export default function TripsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSchedulingDialogOpen, setIsSchedulingDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [schedulingTrip, setSchedulingTrip] = useState<Trip | null>(null);
  const [formData, setFormData] = useState<TripFormData>({
    patternId: '',
    serviceDate: new Date().toISOString().split('T')[0],
    vehicleId: '',
    layoutId: '',
    capacity: '',
    status: 'scheduled'
  });
  const { toast } = useToast();

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['/api/trips'],
    queryFn: () => tripsApi.getAll()
  });

  const { data: patterns = [] } = useQuery({
    queryKey: ['/api/trip-patterns'],
    queryFn: tripPatternsApi.getAll
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['/api/vehicles'],
    queryFn: vehiclesApi.getAll
  });

  const { data: layouts = [] } = useQuery({
    queryKey: ['/api/layouts'],
    queryFn: layoutsApi.getAll
  });

  const createMutation = useMutation({
    mutationFn: tripsApi.create,
    onSuccess: (createdTrip) => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Trip created successfully. Now set up the schedule."
      });
      
      // Immediately open the scheduling dialog for the new trip
      setSchedulingTrip(createdTrip);
      setIsSchedulingDialogOpen(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create trip",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tripsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      setIsDialogOpen(false);
      resetForm();
      setEditingTrip(null);
      toast({
        title: "Success",
        description: "Trip updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update trip",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: tripsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      toast({
        title: "Success",
        description: "Trip deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete trip",
        variant: "destructive"
      });
    }
  });

  const deriveLegsMutation = useMutation({
    mutationFn: tripsApi.deriveLegs,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Trip legs derived successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to derive trip legs",
        variant: "destructive"
      });
    }
  });

  const precomputeSeatInventoryMutation = useMutation({
    mutationFn: tripsApi.precomputeSeatInventory,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Seat inventory precomputed successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to precompute seat inventory",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      patternId: '',
      serviceDate: new Date().toISOString().split('T')[0],
      vehicleId: '',
      layoutId: '',
      capacity: '',
      status: 'scheduled'
    });
  };

  const handleCreate = () => {
    setEditingTrip(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setFormData({
      patternId: trip.patternId,
      serviceDate: trip.serviceDate,
      vehicleId: trip.vehicleId,
      layoutId: trip.layoutId || '',
      capacity: trip.capacity.toString(),
      status: trip.status || 'scheduled'
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      capacity: parseInt(formData.capacity, 10),
      channelFlags: { CSO: true, WEB: false, APP: false, OTA: false }
    };

    if (editingTrip) {
      updateMutation.mutate({ id: editingTrip.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this trip?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeriveLegs = (tripId: string) => {
    deriveLegsMutation.mutate(tripId);
  };

  const handlePrecomputeInventory = (tripId: string) => {
    precomputeSeatInventoryMutation.mutate(tripId);
  };

  const handleScheduling = (trip: Trip) => {
    setSchedulingTrip(trip);
    setIsSchedulingDialogOpen(true);
  };

  const getPatternName = (patternId: string) => {
    const pattern = patterns.find(p => p.id === patternId);
    return pattern ? `${pattern.name} (${pattern.code})` : 'Unknown Pattern';
  };

  const getScheduleDisplay = (trip: any) => {
    // For now, we'll extract schedule info from the existing scheduleTime field
    // In a real implementation, this would come from the TripWithDetails type
    if (trip.scheduleTime) {
      const departTime = new Date(trip.scheduleTime).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return `Departs: ${departTime}`;
    }
    return 'Schedule not set';
  };

  const getPatternPath = (patternId: string) => {
    // This would ideally come from pattern stops data
    // For now, we'll show pattern name as a placeholder
    const pattern = patterns.find(p => p.id === patternId);
    return pattern ? pattern.name : 'Unknown Route';
  };

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.code} (${vehicle.plate})` : 'Unknown Vehicle';
  };

  const getLayoutName = (layoutId: string) => {
    const layout = layouts.find(l => l.id === layoutId);
    return layout ? layout.name : 'Default';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Canceled</Badge>;
      case 'closed':
        return <Badge variant="outline">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6" data-testid="trips-manager">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Trips Management</h3>
          <p className="text-sm text-muted-foreground">Manage scheduled trips and their configurations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate} data-testid="add-trip-button">
              <i className="fas fa-plus mr-2"></i>
              Add Trip
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="trip-dialog">
            <DialogHeader>
              <DialogTitle>
                {editingTrip ? 'Edit Trip' : 'Add New Trip'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patternId">Trip Pattern *</Label>
                <Select 
                  value={formData.patternId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, patternId: value }))}
                  required
                >
                  <SelectTrigger data-testid="select-pattern">
                    <SelectValue placeholder="Select trip pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    {patterns.filter(p => p.active).map(pattern => (
                      <SelectItem key={pattern.id} value={pattern.id}>
                        {pattern.name} ({pattern.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceDate">Service Date *</Label>
                <Input
                  id="serviceDate"
                  type="date"
                  value={formData.serviceDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, serviceDate: e.target.value }))}
                  required
                  data-testid="input-service-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleId">Vehicle *</Label>
                <Select 
                  value={formData.vehicleId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, vehicleId: value }))}
                  required
                >
                  <SelectTrigger data-testid="select-vehicle">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.code} ({vehicle.plate}) - {vehicle.capacity} seats
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="layoutId">Layout Override</Label>
                <Select 
                  value={formData.layoutId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, layoutId: value }))}
                >
                  <SelectTrigger data-testid="select-layout">
                    <SelectValue placeholder="Use vehicle default layout" />
                  </SelectTrigger>
                  <SelectContent>
                    {layouts.map(layout => (
                      <SelectItem key={layout.id} value={layout.id}>
                        {layout.name} ({layout.rows}x{layout.cols})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                    placeholder="e.g., 40"
                    min="1"
                    required
                    data-testid="input-capacity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                    required
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="cancel-button"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="submit-button"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table data-testid="trips-table">
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Route & Schedule</TableHead>
                  <TableHead>Service Date</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No trips found. Create your first trip to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  trips.map(trip => (
                    <TableRow key={trip.id} data-testid={`trip-row-${trip.id}`}>
                      <TableCell className="font-mono text-xs">{trip.id.slice(-8)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{getPatternPath(trip.patternId)}</div>
                          <div className="text-sm text-muted-foreground">
                            {getScheduleDisplay(trip)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{trip.serviceDate}</TableCell>
                      <TableCell>{getVehicleName(trip.vehicleId)}</TableCell>
                      <TableCell>{trip.capacity} seats</TableCell>
                      <TableCell>{getStatusBadge(trip.status || 'scheduled')}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleScheduling(trip)}
                            title="Manage Schedule"
                            data-testid={`scheduling-${trip.id}`}
                          >
                            <i className="fas fa-clock text-primary"></i>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeriveLegs(trip.id)}
                            disabled={deriveLegsMutation.isPending}
                            title="Derive Legs"
                            data-testid={`derive-legs-${trip.id}`}
                          >
                            <i className="fas fa-route text-secondary"></i>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePrecomputeInventory(trip.id)}
                            disabled={precomputeSeatInventoryMutation.isPending}
                            title="Precompute Inventory"
                            data-testid={`precompute-inventory-${trip.id}`}
                          >
                            <i className="fas fa-th-large text-accent"></i>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(trip)}
                            title="Edit Trip"
                            data-testid={`edit-trip-${trip.id}`}
                          >
                            <i className="fas fa-edit text-primary"></i>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(trip.id)}
                            disabled={deleteMutation.isPending}
                            title="Delete Trip"
                            data-testid={`delete-trip-${trip.id}`}
                          >
                            <i className="fas fa-trash text-destructive"></i>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Scheduling Dialog */}
      <Dialog open={isSchedulingDialogOpen} onOpenChange={setIsSchedulingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="scheduling-dialog">
          <DialogHeader>
            <DialogTitle>
              Manage Schedule - {schedulingTrip && getPatternName(schedulingTrip.patternId)}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {schedulingTrip && (
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Service Date:</span>
                    <span className="ml-2">{schedulingTrip.serviceDate}</span>
                  </div>
                  <div>
                    <span className="font-medium">Vehicle:</span>
                    <span className="ml-2">{getVehicleName(schedulingTrip.vehicleId)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Capacity:</span>
                    <span className="ml-2">{schedulingTrip.capacity} seats</span>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className="ml-2">{getStatusBadge(schedulingTrip.status || 'scheduled')}</span>
                  </div>
                </div>
              </div>
            )}

            {schedulingTrip && (
              <TripScheduleEditor 
                trip={schedulingTrip} 
                onClose={() => setIsSchedulingDialogOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
