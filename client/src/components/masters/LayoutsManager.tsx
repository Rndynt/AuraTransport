import { useState, useRef, useEffect } from 'react';
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

type LayoutMode = 'automatic' | 'custom';

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
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('automatic');
  const [customSeatMap, setCustomSeatMap] = useState<SeatMapItem[]>([]);
  const [draggedSeat, setDraggedSeat] = useState<SeatMapItem | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
    setCustomSeatMap([]);
    setLayoutMode('automatic');
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
    
    if (!isNaN(rows) && !isNaN(cols) && rows > 0 && cols > 0 && rows <= 20 && cols <= 10) {
      const seatMap = generateSeatMap(rows, cols);
      setPreviewSeatMap(seatMap);
    } else {
      setPreviewSeatMap([]);
    }
  };

  const debouncedPreviewUpdate = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      handleRowsColsChange();
    }, 100); // Reduced from 300ms to 100ms for more responsive feedback
  };

  // Add immediate preview update when both fields have valid values
  // Skip auto-generation when editing unless user explicitly changes rows/cols
  useEffect(() => {
    const rows = parseInt(formData.rows, 10);
    const cols = parseInt(formData.cols, 10);
    
    if (!isNaN(rows) && !isNaN(cols) && rows > 0 && cols > 0 && rows <= 20 && cols <= 10) {
      if (layoutMode === 'automatic' && !editingLayout) {
        handleRowsColsChange();
      }
    }
  }, [formData.rows, formData.cols, layoutMode, editingLayout]);

  // Drag and drop functions
  const handleDragStart = (seat: SeatMapItem) => {
    setDraggedSeat(seat);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetRow: number, targetCol: number) => {
    e.preventDefault();
    if (!draggedSeat) return;

    const rows = parseInt(formData.rows, 10);
    const cols = parseInt(formData.cols, 10);
    if (isNaN(rows) || isNaN(cols)) return;

    // Check if position is already occupied
    const existingSeat = customSeatMap.find(seat => seat.row === targetRow && seat.col === targetCol);
    if (existingSeat) {
      toast({
        title: "Position Occupied",
        description: `Position ${targetRow}${String.fromCharCode(64 + targetCol)} is already occupied`,
        variant: "destructive"
      });
      setDraggedSeat(null);
      return;
    }

    // Place the dragged seat in the new position with updated coordinates
    const newSeat: SeatMapItem = {
      ...draggedSeat,
      seat_no: `${targetRow}${String.fromCharCode(64 + targetCol)}`,
      row: targetRow,
      col: targetCol
    };

    setCustomSeatMap(prev => [...prev, newSeat]);
    setDraggedSeat(null);
  };

  const removeSeatFromCustom = (seatToRemove: SeatMapItem) => {
    setCustomSeatMap(prev => prev.filter(seat => 
      !(seat.row === seatToRemove.row && seat.col === seatToRemove.col)
    ));
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
    
    const seatMap = layout.seatMap as SeatMapItem[];
    const totalCells = layout.rows * layout.cols;
    
    // Check if it's a full automatic layout (all cells filled with standard seat naming)
    const isFullAutomatic = seatMap.length === totalCells && 
      seatMap.every(seat => {
        const expectedSeatNo = `${seat.row}${String.fromCharCode(64 + seat.col)}`;
        return seat.seat_no === expectedSeatNo;
      });
    
    if (isFullAutomatic) {
      setLayoutMode('automatic');
      setPreviewSeatMap(seatMap);
      setCustomSeatMap([]);
    } else {
      setLayoutMode('custom');
      setCustomSeatMap(seatMap);
      setPreviewSeatMap([]);
    }
    
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = formData.name.trim();
    const rows = parseInt(formData.rows, 10);
    const cols = parseInt(formData.cols, 10);
    
    // Validate name
    if (!trimmedName) {
      toast({
        title: "Name Required",
        description: "Please enter a layout name",
        variant: "destructive"
      });
      return;
    }
    
    // Validate input values
    if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0 || rows > 20 || cols > 10) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid numbers for rows (1-20) and columns (1-10)",
        variant: "destructive"
      });
      return;
    }
    
    // Runtime validation for custom mode
    if (layoutMode === 'custom') {
      if (customSeatMap.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one seat to the layout",
          variant: "destructive"
        });
        return;
      }
      
      // Check for out-of-bounds seats
      const outOfBoundsSeats = customSeatMap.filter(seat => 
        seat.row < 1 || seat.row > rows || seat.col < 1 || seat.col > cols
      );
      
      if (outOfBoundsSeats.length > 0) {
        toast({
          title: "Error",
          description: `${outOfBoundsSeats.length} seat(s) are outside the layout bounds. Please adjust the layout.`,
          variant: "destructive"
        });
        return;
      }
    }
    
    // Use custom seatMap if in custom mode, otherwise generate automatically
    const seatMap = layoutMode === 'custom' ? customSeatMap : generateSeatMap(rows, cols);
    
    const submitData = {
      name: trimmedName,
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
          <DialogContent className="w-[800px] h-[700px] max-w-none" data-testid="layout-dialog">
            <DialogHeader>
              <DialogTitle>
                {editingLayout ? 'Edit Layout' : 'Add New Layout'}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 px-1">
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
                      const value = e.target.value;
                      setFormData(prev => ({ ...prev, rows: value }));
                      
                      // Immediate update if both fields are valid
                      const rows = parseInt(value, 10);
                      const cols = parseInt(formData.cols, 10);
                      if (!isNaN(rows) && !isNaN(cols) && rows > 0 && cols > 0 && rows <= 20 && cols <= 10) {
                        // Prune out-of-bounds seats in custom mode
                        if (layoutMode === 'custom') {
                          const validSeats = customSeatMap.filter(seat => 
                            seat.row >= 1 && seat.row <= rows && seat.col >= 1 && seat.col <= cols
                          );
                          const removedCount = customSeatMap.length - validSeats.length;
                          setCustomSeatMap(validSeats);
                          if (removedCount > 0) {
                            toast({
                              title: "Seats Removed",
                              description: `${removedCount} seat(s) were outside the new layout bounds and have been removed`,
                              variant: "default"
                            });
                          }
                        } else {
                          const seatMap = generateSeatMap(rows, cols);
                          setPreviewSeatMap(seatMap);
                        }
                      } else {
                        debouncedPreviewUpdate();
                      }
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
                      const value = e.target.value;
                      setFormData(prev => ({ ...prev, cols: value }));
                      
                      // Immediate update if both fields are valid
                      const rows = parseInt(formData.rows, 10);
                      const cols = parseInt(value, 10);
                      if (!isNaN(rows) && !isNaN(cols) && rows > 0 && cols > 0 && rows <= 20 && cols <= 10) {
                        // Prune out-of-bounds seats in custom mode
                        if (layoutMode === 'custom') {
                          const validSeats = customSeatMap.filter(seat => 
                            seat.row >= 1 && seat.row <= rows && seat.col >= 1 && seat.col <= cols
                          );
                          const removedCount = customSeatMap.length - validSeats.length;
                          setCustomSeatMap(validSeats);
                          if (removedCount > 0) {
                            toast({
                              title: "Seats Removed",
                              description: `${removedCount} seat(s) were outside the new layout bounds and have been removed`,
                              variant: "default"
                            });
                          }
                        } else {
                          const seatMap = generateSeatMap(rows, cols);
                          setPreviewSeatMap(seatMap);
                        }
                      } else {
                        debouncedPreviewUpdate();
                      }
                    }}
                    placeholder="e.g., 4"
                    min="1"
                    max="10"
                    required
                    data-testid="input-cols"
                  />
                </div>
              </div>

              {/* Layout Mode Toggle */}
              <div className="space-y-2">
                <Label>Layout Mode</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={layoutMode === 'automatic' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setLayoutMode('automatic');
                      // Immediately populate preview when switching to automatic mode
                      const rows = parseInt(formData.rows, 10);
                      const cols = parseInt(formData.cols, 10);
                      if (!isNaN(rows) && !isNaN(cols) && rows > 0 && cols > 0) {
                        handleRowsColsChange();
                      }
                    }}
                    data-testid="mode-automatic"
                  >
                    <i className="fas fa-magic mr-2"></i>
                    Automatic
                  </Button>
                  <Button
                    type="button"
                    variant={layoutMode === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLayoutMode('custom')}
                    data-testid="mode-custom"
                  >
                    <i className="fas fa-hand-pointer mr-2"></i>
                    Custom Drag & Drop
                  </Button>
                </div>
              </div>

              {/* Automatic Mode - Seat Map Preview */}
              {layoutMode === 'automatic' && previewSeatMap.length > 0 && (
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

              {/* Custom Mode - Drag & Drop Layout */}
              {layoutMode === 'custom' && parseInt(formData.rows) > 0 && parseInt(formData.cols) > 0 && (
                <div className="space-y-4">
                  <Label>Custom Seat Layout - Drag & Drop</Label>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    
                    {/* Available Seats Panel */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Available Seats</h4>
                      <div className="border border-border rounded-lg p-4 bg-muted/10 min-h-[200px]">
                        <div className="text-xs text-muted-foreground mb-2">
                          Drag seats to place them in the grid
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: Math.max(0, parseInt(formData.rows) * parseInt(formData.cols) - customSeatMap.length) }, (_, index) => {
                            const dummySeat: SeatMapItem = {
                              seat_no: `SEAT`,
                              row: 0,
                              col: 0,
                              class: 'standard',
                              disabled: false
                            };
                            return (
                              <div
                                key={`available-${index}`}
                                draggable
                                onDragStart={() => handleDragStart(dummySeat)}
                                className="w-10 h-10 border border-primary rounded text-xs flex items-center justify-center bg-card text-primary font-mono cursor-grab hover:bg-primary/10 active:cursor-grabbing"
                                title="Drag to place seat in layout"
                              >
                                <i className="fas fa-chair"></i>
                              </div>
                            );
                          })}
                        </div>
                        {customSeatMap.length === 0 && (
                          <div className="text-center text-muted-foreground mt-4 text-sm">
                            No seats placed yet. Start by dragging seats to the grid.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Layout Grid */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Layout Grid ({formData.rows}×{formData.cols})</h4>
                      <div className="border border-border rounded-lg p-4 bg-muted/10 overflow-auto max-h-[400px]">
                        <div className="text-center mb-2 text-xs text-muted-foreground">
                          <i className="fas fa-steering-wheel mr-1"></i>
                          Driver
                        </div>
                        <div 
                          className="grid gap-2 justify-center"
                          style={{ 
                            gridTemplateColumns: `repeat(${parseInt(formData.cols)}, minmax(0, 1fr))`,
                            maxWidth: '400px',
                            margin: '0 auto'
                          }}
                        >
                          {Array.from({ length: parseInt(formData.rows) }, (_, rowIndex) =>
                            Array.from({ length: parseInt(formData.cols) }, (_, colIndex) => {
                              const row = rowIndex + 1;
                              const col = colIndex + 1;
                              const placedSeat = customSeatMap.find(seat => seat.row === row && seat.col === col);
                              
                              return (
                                <div
                                  key={`${row}-${col}`}
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => handleDrop(e, row, col)}
                                  className={`w-12 h-12 border-2 border-dashed border-border rounded text-xs flex items-center justify-center transition-colors ${
                                    placedSeat 
                                      ? 'bg-primary text-primary-foreground border-primary cursor-pointer' 
                                      : 'bg-muted/20 hover:bg-muted/40 hover:border-primary/50'
                                  }`}
                                  title={placedSeat ? `${placedSeat.seat_no} - Click to remove` : `Drop zone for row ${row}, column ${String.fromCharCode(64 + col)}`}
                                  onClick={() => placedSeat && removeSeatFromCustom(placedSeat)}
                                >
                                  {placedSeat ? placedSeat.seat_no : `${row}${String.fromCharCode(64 + col)}`}
                                </div>
                              );
                            })
                          ).flat()}
                        </div>
                        <div className="text-center mt-2 text-xs text-muted-foreground">
                          Total placed: {customSeatMap.length} seats
                        </div>
                      </div>
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
                  disabled={createMutation.isPending || updateMutation.isPending || 
                    (layoutMode === 'automatic' && previewSeatMap.length === 0) ||
                    (layoutMode === 'custom' && customSeatMap.length === 0) ||
                    !formData.name.trim() ||
                    !formData.rows.trim() ||
                    !formData.cols.trim()}
                  data-testid="submit-button"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
            </div>
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
