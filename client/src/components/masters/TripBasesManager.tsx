import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { tripBasesApi, tripPatternsApi, layoutsApi, vehiclesApi, patternStopsApi } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { Edit, Trash2, Calendar, Clock, MapPin, Users } from 'lucide-react';

interface TripBase {
  id: string;
  patternId: string;
  code?: string;
  name: string;
  active: boolean;
  timezone: string;
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
  sun: boolean;
  validFrom?: string;
  validTo?: string;
  defaultLayoutId?: string;
  defaultVehicleId?: string;
  capacity?: number;
  channelFlags: any;
  defaultStopTimes: any[];
  createdAt: string;
  updatedAt: string;
}

interface TripPattern {
  id: string;
  code: string;
  name: string;
}

interface Layout {
  id: string;
  name: string;
}

interface Vehicle {
  id: string;
  code: string;
  plate: string;
}

interface PatternStop {
  id: string;
  stopSequence: number;
  stopId: string;
  patternId: string;
  stop?: { name: string; code: string };
}

interface TripBaseFormData {
  patternId: string;
  code: string;
  name: string;
  active: boolean;
  timezone: string;
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
  sat: boolean;
  sun: boolean;
  validFrom: string;
  validTo: string;
  defaultLayoutId: string;
  defaultVehicleId: string;
  capacity: string;
  channelFlags: any;
  defaultStopTimes: Array<{
    stopSequence: number;
    arriveAt: string;
    departAt: string;
  }>;
}

interface DefaultStopTime {
  stopSequence: number;
  stopName?: string;
  stopCode?: string;
  arriveAt: string;
  departAt: string;
}

export default function TripBasesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBase, setEditingBase] = useState<TripBase | null>(null);
  const [selectedPatternId, setSelectedPatternId] = useState<string>('');
  const [formData, setFormData] = useState<TripBaseFormData>({
    patternId: '',
    code: '',
    name: '',
    active: true,
    timezone: 'Asia/Jakarta',
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: true,
    sun: true,
    validFrom: '',
    validTo: '',
    defaultLayoutId: 'none',
    defaultVehicleId: 'none',
    capacity: '',
    channelFlags: { CSO: true, WEB: false, APP: false, OTA: false },
    defaultStopTimes: []
  });
  const [stopTimes, setStopTimes] = useState<DefaultStopTime[]>([]);
  const { toast } = useToast();

  const { data: tripBases = [], isLoading } = useQuery({
    queryKey: ['/api/trip-bases'],
    queryFn: tripBasesApi.getAll
  });

  const { data: patterns = [] } = useQuery({
    queryKey: ['/api/trip-patterns'],
    queryFn: tripPatternsApi.getAll
  });

  const { data: layouts = [] } = useQuery({
    queryKey: ['/api/layouts'],
    queryFn: layoutsApi.getAll
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['/api/vehicles'],
    queryFn: vehiclesApi.getAll
  });

  const { data: patternStops = [] } = useQuery({
    queryKey: ['/api/pattern-stops', selectedPatternId],
    queryFn: () => selectedPatternId ? tripPatternsApi.getStops(selectedPatternId) : Promise.resolve([]),
    enabled: !!selectedPatternId
  });

  const createMutation = useMutation({
    mutationFn: tripBasesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trip-bases'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Success', description: 'Trip base created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create trip base', variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tripBasesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trip-bases'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Success', description: 'Trip base updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update trip base', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: tripBasesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trip-bases'] });
      toast({ title: 'Success', description: 'Trip base deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete trip base', variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      patternId: '',
      code: '',
      name: '',
      active: true,
      timezone: 'Asia/Jakarta',
      mon: true,
      tue: true,
      wed: true,
      thu: true,
      fri: true,
      sat: true,
      sun: true,
      validFrom: '',
      validTo: '',
      defaultLayoutId: 'none',
      defaultVehicleId: 'none',
      capacity: '',
      channelFlags: { CSO: true, WEB: false, APP: false, OTA: false },
      defaultStopTimes: []
    });
    setStopTimes([]);
    setSelectedPatternId('');
    setEditingBase(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (base: TripBase) => {
    setEditingBase(base);
    setSelectedPatternId(base.patternId);
    setFormData({
      patternId: base.patternId,
      code: base.code || '',
      name: base.name,
      active: base.active,
      timezone: base.timezone || 'Asia/Jakarta',
      mon: base.mon,
      tue: base.tue,
      wed: base.wed,
      thu: base.thu,
      fri: base.fri,
      sat: base.sat,
      sun: base.sun,
      validFrom: base.validFrom || '',
      validTo: base.validTo || '',
      defaultLayoutId: base.defaultLayoutId || 'none',
      defaultVehicleId: base.defaultVehicleId || 'none',
      capacity: base.capacity?.toString() || '',
      channelFlags: base.channelFlags || { CSO: true, WEB: false, APP: false, OTA: false },
      defaultStopTimes: base.defaultStopTimes || []
    });
    setStopTimes(base.defaultStopTimes?.map((st: any) => ({
      stopSequence: st.stopSequence,
      arriveAt: st.arriveAt || '',
      departAt: st.departAt || ''
    })) || []);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.patternId || !formData.name) {
      toast({ title: 'Error', description: 'Pattern and name are required', variant: 'destructive' });
      return;
    }

    // Validate stop times
    if (stopTimes.length === 0) {
      toast({ title: 'Error', description: 'Default stop times are required', variant: 'destructive' });
      return;
    }

    // First stop must have departAt, last stop must have arriveAt
    const firstStop = stopTimes[0];
    const lastStop = stopTimes[stopTimes.length - 1];
    
    if (!firstStop.departAt) {
      toast({ title: 'Error', description: 'First stop must have departure time', variant: 'destructive' });
      return;
    }
    
    if (!lastStop.arriveAt) {
      toast({ title: 'Error', description: 'Last stop must have arrival time', variant: 'destructive' });
      return;
    }

    const data = {
      ...formData,
      capacity: formData.capacity ? parseInt(formData.capacity) : null,
      validFrom: formData.validFrom || null,
      validTo: formData.validTo || null,
      defaultLayoutId: formData.defaultLayoutId === 'none' ? null : formData.defaultLayoutId,
      defaultVehicleId: formData.defaultVehicleId === 'none' ? null : formData.defaultVehicleId,
      defaultStopTimes: stopTimes
    };

    if (editingBase) {
      updateMutation.mutate({ id: editingBase.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this trip base? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  // Update stop times when pattern changes
  useEffect(() => {
    if (patternStops.length > 0) {
      const newStopTimes = patternStops.map((ps) => ({
        stopSequence: ps.stopSequence,
        stopName: 'Stop ' + ps.stopSequence,
        stopCode: '',
        arriveAt: '',
        departAt: ''
      }));
      setStopTimes(newStopTimes);
    }
  }, [patternStops]);

  const getDowBadges = (base: TripBase) => {
    const days = [
      { key: 'sun', label: 'S', active: base.sun },
      { key: 'mon', label: 'M', active: base.mon },
      { key: 'tue', label: 'T', active: base.tue },
      { key: 'wed', label: 'W', active: base.wed },
      { key: 'thu', label: 'T', active: base.thu },
      { key: 'fri', label: 'F', active: base.fri },
      { key: 'sat', label: 'S', active: base.sat }
    ];

    return (
      <div className="flex gap-1">
        {days.map(day => (
          <Badge 
            key={day.key} 
            variant={day.active ? 'default' : 'outline'} 
            className="w-6 h-6 p-0 text-xs font-mono"
          >
            {day.label}
          </Badge>
        ))}
      </div>
    );
  };

  const getOriginDepartTime = (defaultStopTimes: any[]): string => {
    if (!defaultStopTimes || defaultStopTimes.length === 0) return '-';
    const firstStop = defaultStopTimes.find(st => st.stopSequence === 1);
    return firstStop?.departAt || '-';
  };

  const updateStopTime = (sequence: number, field: 'arriveAt' | 'departAt', value: string) => {
    setStopTimes(prev => prev.map(st => 
      st.stopSequence === sequence ? { ...st, [field]: value } : st
    ));
  };

  return (
    <div className="space-y-6" data-testid="trip-bases-manager">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Trip Bases</h2>
          <p className="text-muted-foreground">
            Manage virtual scheduling templates for trips
          </p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-create-trip-base">
          <Calendar className="w-4 h-4 mr-2" />
          Create Trip Base
        </Button>
      </div>

      {/* Trip Bases Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Pattern</TableHead>
                    <TableHead>DOW</TableHead>
                    <TableHead>Valid Period</TableHead>
                    <TableHead>Origin Depart</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tripBases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No trip bases found. Create your first trip base to enable virtual scheduling.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tripBases.map((base: TripBase) => {
                      const pattern = patterns.find(p => p.id === base.patternId);
                      return (
                        <TableRow key={base.id} data-testid={`row-trip-base-${base.id}`}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{base.name}</div>
                              {base.code && <div className="text-sm text-muted-foreground">{base.code}</div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-mono text-sm">{pattern?.code}</div>
                              <div className="text-sm text-muted-foreground">{pattern?.name}</div>
                            </div>
                          </TableCell>
                          <TableCell>{getDowBadges(base)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {base.validFrom && base.validTo 
                                ? `${base.validFrom} – ${base.validTo}`
                                : base.validFrom 
                                  ? `From ${base.validFrom}`
                                  : base.validTo
                                    ? `Until ${base.validTo}`
                                    : 'Always'
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3" />
                              {getOriginDepartTime(base.defaultStopTimes)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={base.active ? 'default' : 'secondary'}>
                              {base.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditDialog(base)}
                                      data-testid={`button-edit-${base.id}`}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit trip base</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(base.id)}
                                      data-testid={`button-delete-${base.id}`}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete trip base</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBase ? 'Edit Trip Base' : 'Create Trip Base'}
            </DialogTitle>
            <DialogDescription>
              Create a virtual scheduling template that will generate real trips on demand.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pattern">Trip Pattern *</Label>
                <Select
                  value={formData.patternId}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, patternId: value }));
                    setSelectedPatternId(value);
                  }}
                >
                  <SelectTrigger data-testid="select-pattern">
                    <SelectValue placeholder="Select pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    {patterns.map((pattern: TripPattern) => (
                      <SelectItem key={pattern.id} value={pattern.id}>
                        {pattern.code} - {pattern.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Morning Express Slot 1"
                  data-testid="input-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Optional unique code"
                  data-testid="input-code"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="active">Status</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                    data-testid="switch-active"
                  />
                  <Label htmlFor="active">{formData.active ? 'Active' : 'Inactive'}</Label>
                </div>
              </div>
            </div>

            {/* Days of Week */}
            <div className="space-y-2">
              <Label>Days of Operation</Label>
              <div className="flex gap-4 flex-wrap">
                {[
                  { key: 'mon', label: 'Monday' },
                  { key: 'tue', label: 'Tuesday' },
                  { key: 'wed', label: 'Wednesday' },
                  { key: 'thu', label: 'Thursday' },
                  { key: 'fri', label: 'Friday' },
                  { key: 'sat', label: 'Saturday' },
                  { key: 'sun', label: 'Sunday' }
                ].map(day => (
                  <div key={day.key} className="flex items-center space-x-2">
                    <Switch
                      id={day.key}
                      checked={formData[day.key as keyof TripBaseFormData] as boolean}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, [day.key]: checked }))}
                      data-testid={`switch-${day.key}`}
                    />
                    <Label htmlFor={day.key} className="text-sm">{day.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Valid Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom">Valid From</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                  data-testid="input-valid-from"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validTo">Valid To</Label>
                <Input
                  id="validTo"
                  type="date"
                  value={formData.validTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, validTo: e.target.value }))}
                  data-testid="input-valid-to"
                />
              </div>
            </div>

            {/* Defaults */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultLayout">Default Layout</Label>
                <Select
                  value={formData.defaultLayoutId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, defaultLayoutId: value }))}
                >
                  <SelectTrigger data-testid="select-layout">
                    <SelectValue placeholder="Select layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {layouts.map((layout: Layout) => (
                      <SelectItem key={layout.id} value={layout.id}>
                        {layout.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultVehicle">Default Vehicle</Label>
                <Select
                  value={formData.defaultVehicleId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, defaultVehicleId: value }))}
                >
                  <SelectTrigger data-testid="select-vehicle">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vehicles.map((vehicle: Vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.code} - {vehicle.plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity Override</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                  placeholder="Override capacity"
                  data-testid="input-capacity"
                />
              </div>
            </div>

            {/* Default Stop Times */}
            {stopTimes.length > 0 && (
              <div className="space-y-4">
                <Label>Default Stop Times *</Label>
                <div className="border rounded-md p-4 space-y-4 bg-muted/30">
                  <div className="text-sm text-muted-foreground">
                    Configure the default departure and arrival times for each stop. The first stop requires departure time, and the last stop requires arrival time.
                  </div>
                  
                  <div className="grid gap-4">
                    {stopTimes.map((stopTime, index) => (
                      <div key={stopTime.stopSequence} className="grid grid-cols-4 gap-4 items-center p-3 bg-background rounded-md border">
                        <div className="font-medium">
                          <div>Stop {stopTime.stopSequence}</div>
                          <div className="text-sm text-muted-foreground">
                            {stopTime.stopName} ({stopTime.stopCode})
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor={`arrive-${stopTime.stopSequence}`} className="text-xs">
                            Arrive At {index === stopTimes.length - 1 && '*'}
                          </Label>
                          <Input
                            id={`arrive-${stopTime.stopSequence}`}
                            type="time"
                            step="1"
                            value={stopTime.arriveAt}
                            onChange={(e) => updateStopTime(stopTime.stopSequence, 'arriveAt', e.target.value)}
                            disabled={index === 0} // First stop doesn't need arrival time
                            data-testid={`input-arrive-${stopTime.stopSequence}`}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor={`depart-${stopTime.stopSequence}`} className="text-xs">
                            Depart At {index === 0 && '*'}
                          </Label>
                          <Input
                            id={`depart-${stopTime.stopSequence}`}
                            type="time"
                            step="1"
                            value={stopTime.departAt}
                            onChange={(e) => updateStopTime(stopTime.stopSequence, 'departAt', e.target.value)}
                            disabled={index === stopTimes.length - 1} // Last stop doesn't need departure time
                            data-testid={`input-depart-${stopTime.stopSequence}`}
                          />
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {index === 0 && 'Origin'}
                          {index === stopTimes.length - 1 && 'Destination'}
                          {index > 0 && index < stopTimes.length - 1 && 'Transit'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingBase ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}