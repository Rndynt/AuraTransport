import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { layoutsApi } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { Layout } from '@/types';

interface LayoutFormData {
  name: string;
  rows: string;
  cols: string;
}

interface SeatMapItem {
  seat_no: string;
  row: number;
  col: number;
  class?: string;
  disabled?: boolean;
}

export default function LayoutsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLayout, setEditingLayout] = useState<Layout | null>(null);
  const [formData, setFormData] = useState<LayoutFormData>({
    name: '',
    rows: '',
    cols: ''
  });
  const [previewSeatMap, setPreviewSeatMap] = useState<SeatMapItem[]>([]);
  const { toast } = useToast();

  const { data: layouts = [], isLoading } = useQuery({
    queryKey: ['/api/layouts'],
    queryFn: layoutsApi.getAll
  });

  const createMutation = useMutation({
    mutationFn: layoutsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layouts'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Layout created successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create layout",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => layoutsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layouts'] });
      setIsDialogOpen(false);
      resetForm();
      setEditingLayout(null);
      toast({
        title: "Success",
        description: "Layout updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update layout",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: layoutsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/layouts'] });
      toast({
        title: "Success",
        description: "Layout deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete layout",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      rows: '',
      cols: ''
    });
    setPreviewSeatMap([]);
  };

  const generateSeatMap = (rows: number, cols: number): SeatMapItem[] => {
    const seatMap: SeatMapItem[] = [];
    const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    for (let row = 1; row <= rows; row++) {
      for (let col = 1; col <= cols; col++) {
        const seatNo = `${row}${rowLabels[col - 1]}`;
        seatMap.push({
          seat_no: seatNo,
          row,
          col,
          class: 'standard',
          disabled: false
        });
      }
    }
    
    return seatMap;
  };

  const handleRowsColsChange = () => {
    const rows = parseInt(formData.rows, 10);
    const cols = parseInt(formData.cols, 10);
    
    if (rows > 0 && cols > 0 && rows <= 20 && cols <= 10) {
      const seatMap = generateSeatMap(rows, cols);
      setPreviewSeatMap(seatMap);
    } else {
      setPreviewSeatMap([]);
    }
  };

  const handleCreate = () => {
    setEditingLayout(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (layout: Layout) => {
    setEditingLayout(layout);
    setFormData({
      name: layout.name,
      rows: layout.rows.toString(),
      cols: layout.cols.toString()
    });
    setPreviewSeatMap(layout.seatMap as SeatMapItem[]);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const rows = parseInt(formData.rows, 10);
    const cols = parseInt(formData.cols, 10);
    const seatMap = editingLayout ? (editingLayout.seatMap as SeatMapItem[]) : generateSeatMap(rows, cols);
    
    const submitData = {
      name: formData.name,
      rows,
      cols,
      seatMap
    };

    if (editingLayout) {
      updateMutation.mutate({ id: editingLayout.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this layout?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6" data-testid="layouts-manager">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Layouts Management</h3>
          <p className="text-sm text-muted-foreground">Manage seat layout configurations for vehicles</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate} data-testid="add-layout-button">
              <i className="fas fa-plus mr-2"></i>
              Add Layout
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="layout-dialog">
            <DialogHeader>
              <DialogTitle>
                {editingLayout ? 'Edit Layout' : 'Add New Layout'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Layout Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Standard 40-seat"
                  required
                  data-testid="input-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rows">Rows *</Label>
                  <Input
                    id="rows"
                    type="number"
                    value={formData.rows}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, rows: e.target.value }));
                      setTimeout(handleRowsColsChange, 100);
                    }}
                    placeholder="e.g., 10"
                    min="1"
                    max="20"
                    required
                    data-testid="input-rows"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cols">Columns *</Label>
                  <Input
                    id="cols"
                    type="number"
                    value={formData.cols}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, cols: e.target.value }));
                      setTimeout(handleRowsColsChange, 100);
                    }}
                    placeholder="e.g., 4"
                    min="1"
                    max="10"
                    required
                    data-testid="input-cols"
                  />
                </div>
              </div>

              {/* Seat Map Preview */}
              {previewSeatMap.length > 0 && (
                <div className="space-y-2">
                  <Label>Seat Map Preview</Label>
                  <div className="border border-border rounded-lg p-4 bg-muted/20">
                    <div className="text-center mb-2 text-xs text-muted-foreground">
                      <i className="fas fa-steering-wheel mr-1"></i>
                      Driver
                    </div>
                    <div 
                      className="grid gap-1 justify-center"
                      style={{ 
                        gridTemplateColumns: `repeat(${parseInt(formData.cols) || 1}, minmax(0, 1fr))`,
                        maxWidth: '300px',
                        margin: '0 auto'
                      }}
                      data-testid="seat-preview"
                    >
                      {previewSeatMap.map(seat => (
                        <div
                          key={seat.seat_no}
                          className="w-8 h-8 border border-primary rounded text-xs flex items-center justify-center bg-card text-primary font-mono"
                          title={seat.seat_no}
                        >
                          {seat.seat_no}
                        </div>
                      ))}
                    </div>
                    <div className="text-center mt-2 text-xs text-muted-foreground">
                      Total: {previewSeatMap.length} seats
                    </div>
                  </div>
                </div>
              )}

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
                  disabled={createMutation.isPending || updateMutation.isPending || previewSeatMap.length === 0}
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
            <Table data-testid="layouts-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Dimensions</TableHead>
                  <TableHead>Total Seats</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {layouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No layouts found. Create your first layout to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  layouts.map(layout => {
                    const seatMap = layout.seatMap as SeatMapItem[];
                    return (
                      <TableRow key={layout.id} data-testid={`layout-row-${layout.id}`}>
                        <TableCell className="font-medium">{layout.name}</TableCell>
                        <TableCell className="font-mono">{layout.rows} × {layout.cols}</TableCell>
                        <TableCell>{seatMap.length} seats</TableCell>
                        <TableCell>
                          <div 
                            className="grid gap-0.5 max-w-32"
                            style={{ gridTemplateColumns: `repeat(${layout.cols}, 1fr)` }}
                          >
                            {seatMap.slice(0, Math.min(12, seatMap.length)).map(seat => (
                              <div
                                key={seat.seat_no}
                                className="w-3 h-3 bg-primary/20 rounded-sm border border-primary/40"
                                title={seat.seat_no}
                              />
                            ))}
                            {seatMap.length > 12 && (
                              <div className="text-xs text-muted-foreground col-span-full text-center">
                                +{seatMap.length - 12} more
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(layout)}
                              data-testid={`edit-layout-${layout.id}`}
                            >
                              <i className="fas fa-edit text-primary"></i>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(layout.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`delete-layout-${layout.id}`}
                            >
                              <i className="fas fa-trash text-destructive"></i>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
