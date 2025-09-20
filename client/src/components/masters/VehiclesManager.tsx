import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { vehiclesApi, layoutsApi } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { Vehicle, Layout } from '@/types';

interface VehicleFormData {
  code: string;
  plate: string;
  layoutId: string;
  capacity: string;
  notes: string;
}

export default function VehiclesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<VehicleFormData>({
    code: '',
    plate: '',
    layoutId: '',
    capacity: '',
    notes: ''
  });
  const { toast } = useToast();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['/api/vehicles'],
    queryFn: vehiclesApi.getAll
  });

  const { data: layouts = [] } = useQuery({
    queryKey: ['/api/layouts'],
    queryFn: layoutsApi.getAll
  });

  const createMutation = useMutation({
    mutationFn: vehiclesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Vehicle created successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create vehicle",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => vehiclesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
      setIsDialogOpen(false);
      resetForm();
      setEditingVehicle(null);
      toast({
        title: "Success",
        description: "Vehicle updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update vehicle",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: vehiclesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
      toast({
        title: "Success",
        description: "Vehicle deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete vehicle",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      code: '',
      plate: '',
      layoutId: '',
      capacity: '',
      notes: ''
    });
  };

  const handleCreate = () => {
    setEditingVehicle(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      code: vehicle.code,
      plate: vehicle.plate,
      layoutId: vehicle.layoutId,
      capacity: vehicle.capacity.toString(),
      notes: vehicle.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      capacity: parseInt(formData.capacity, 10)
    };

    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this vehicle?')) {
      deleteMutation.mutate(id);
    }
  };

  const getLayoutName = (layoutId: string) => {
    const layout = layouts.find(l => l.id === layoutId);
    return layout ? `${layout.name} (${layout.rows}x${layout.cols})` : 'Unknown Layout';
  };

  return (
    <div className="space-y-6" data-testid="vehicles-manager">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Vehicles Management</h3>
          <p className="text-sm text-muted-foreground">Manage bus fleet and vehicle configurations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate} data-testid="add-vehicle-button">
              <i className="fas fa-plus mr-2"></i>
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="vehicle-dialog">
            <DialogHeader>
              <DialogTitle>
                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Vehicle Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g., BUS-001"
                    required
                    data-testid="input-code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plate">License Plate *</Label>
                  <Input
                    id="plate"
                    value={formData.plate}
                    onChange={(e) => setFormData(prev => ({ ...prev, plate: e.target.value }))}
                    placeholder="e.g., B 1234 ABC"
                    required
                    data-testid="input-plate"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="layoutId">Layout *</Label>
                <Select 
                  value={formData.layoutId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, layoutId: value }))}
                  required
                >
                  <SelectTrigger data-testid="select-layout">
                    <SelectValue placeholder="Select a layout" />
                  </SelectTrigger>
                  <SelectContent>
                    {layouts.map(layout => (
                      <SelectItem key={layout.id} value={layout.id}>
                        {layout.name} ({layout.rows}x{layout.cols} - {(layout.seatMap as any[]).length} seats)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about the vehicle"
                  rows={3}
                  data-testid="input-notes"
                />
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
            <Table data-testid="vehicles-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Layout</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No vehicles found. Create your first vehicle to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  vehicles.map(vehicle => (
                    <TableRow key={vehicle.id} data-testid={`vehicle-row-${vehicle.code}`}>
                      <TableCell className="font-mono font-medium">{vehicle.code}</TableCell>
                      <TableCell className="font-mono">{vehicle.plate}</TableCell>
                      <TableCell>{getLayoutName(vehicle.layoutId)}</TableCell>
                      <TableCell>{vehicle.capacity} seats</TableCell>
                      <TableCell className="max-w-xs truncate">{vehicle.notes || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(vehicle)}
                            data-testid={`edit-vehicle-${vehicle.code}`}
                          >
                            <i className="fas fa-edit text-primary"></i>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(vehicle.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`delete-vehicle-${vehicle.code}`}
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
    </div>
  );
}
