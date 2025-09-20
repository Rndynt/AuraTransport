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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { priceRulesApi, tripPatternsApi, tripsApi } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { PriceRule, TripPattern, Trip } from '@/types';

interface PriceRuleFormData {
  scope: 'pattern' | 'trip' | 'leg' | 'time';
  patternId: string;
  tripId: string;
  legIndex: string;
  ruleJson: string;
  validFrom: string;
  validTo: string;
  priority: string;
}

export default function PriceRulesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PriceRule | null>(null);
  const [formData, setFormData] = useState<PriceRuleFormData>({
    scope: 'pattern',
    patternId: '',
    tripId: '',
    legIndex: '',
    ruleJson: '',
    validFrom: '',
    validTo: '',
    priority: '1'
  });
  const { toast } = useToast();

  const { data: priceRules = [], isLoading } = useQuery({
    queryKey: ['/api/price-rules'],
    queryFn: priceRulesApi.getAll
  });

  const { data: patterns = [] } = useQuery({
    queryKey: ['/api/trip-patterns'],
    queryFn: tripPatternsApi.getAll
  });

  const { data: trips = [] } = useQuery({
    queryKey: ['/api/trips'],
    queryFn: () => tripsApi.getAll()
  });

  const createMutation = useMutation({
    mutationFn: priceRulesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/price-rules'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Price rule created successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create price rule",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => priceRulesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/price-rules'] });
      setIsDialogOpen(false);
      resetForm();
      setEditingRule(null);
      toast({
        title: "Success",
        description: "Price rule updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update price rule",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: priceRulesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/price-rules'] });
      toast({
        title: "Success",
        description: "Price rule deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete price rule",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      scope: 'pattern',
      patternId: '',
      tripId: '',
      legIndex: '',
      ruleJson: '',
      validFrom: '',
      validTo: '',
      priority: '1'
    });
  };

  const handleCreate = () => {
    setEditingRule(null);
    resetForm();
    setFormData(prev => ({
      ...prev,
      ruleJson: JSON.stringify({
        basePricePerLeg: 25000,
        currency: "IDR",
        multiplier: 1.0
      }, null, 2)
    }));
    setIsDialogOpen(true);
  };

  const handleEdit = (rule: PriceRule) => {
    setEditingRule(rule);
    setFormData({
      scope: rule.scope,
      patternId: rule.patternId || '',
      tripId: rule.tripId || '',
      legIndex: rule.legIndex?.toString() || '',
      ruleJson: JSON.stringify(rule.rule, null, 2),
      validFrom: rule.validFrom ? new Date(rule.validFrom).toISOString().split('T')[0] : '',
      validTo: rule.validTo ? new Date(rule.validTo).toISOString().split('T')[0] : '',
      priority: (rule.priority || 0).toString()
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const rule = JSON.parse(formData.ruleJson);
      
      const submitData = {
        scope: formData.scope,
        patternId: formData.patternId || null,
        tripId: formData.tripId || null,
        legIndex: formData.legIndex ? parseInt(formData.legIndex, 10) : null,
        rule,
        validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
        validTo: formData.validTo ? new Date(formData.validTo).toISOString() : null,
        priority: parseInt(formData.priority, 10)
      };

      if (editingRule) {
        updateMutation.mutate({ id: editingRule.id, data: submitData });
      } else {
        createMutation.mutate(submitData);
      }
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please provide valid JSON for the rule configuration",
        variant: "destructive"
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this price rule?')) {
      deleteMutation.mutate(id);
    }
  };

  const getPatternName = (patternId: string) => {
    const pattern = patterns.find(p => p.id === patternId);
    return pattern ? `${pattern.name} (${pattern.code})` : 'Unknown Pattern';
  };

  const getTripName = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    return trip ? `Trip ${trip.id.slice(-8)} (${trip.serviceDate})` : 'Unknown Trip';
  };

  const getScopeBadge = (scope: string) => {
    const colors = {
      pattern: 'secondary',
      trip: 'default',
      leg: 'outline',
      time: 'destructive'
    } as const;
    
    return <Badge variant={colors[scope as keyof typeof colors] || 'outline'}>{scope.toUpperCase()}</Badge>;
  };

  const formatRule = (rule: any) => {
    if (typeof rule === 'object') {
      return Object.entries(rule).map(([key, value]) => `${key}: ${value}`).join(', ');
    }
    return String(rule);
  };

  const handleScopeChange = (scope: 'pattern' | 'trip' | 'leg' | 'time') => {
    setFormData(prev => ({
      ...prev,
      scope,
      patternId: '',
      tripId: '',
      legIndex: ''
    }));
  };

  return (
    <div className="space-y-6" data-testid="price-rules-manager">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Price Rules Management</h3>
          <p className="text-sm text-muted-foreground">Manage pricing rules and fare calculations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate} data-testid="add-price-rule-button">
              <i className="fas fa-plus mr-2"></i>
              Add Price Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" data-testid="price-rule-dialog">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit Price Rule' : 'Add New Price Rule'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scope">Scope *</Label>
                <Select 
                  value={formData.scope} 
                  onValueChange={handleScopeChange}
                  required
                >
                  <SelectTrigger data-testid="select-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pattern">Pattern Level</SelectItem>
                    <SelectItem value="trip">Trip Level</SelectItem>
                    <SelectItem value="leg">Leg Level</SelectItem>
                    <SelectItem value="time">Time Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.scope === 'pattern' && (
                <div className="space-y-2">
                  <Label htmlFor="patternId">Trip Pattern *</Label>
                  <Select 
                    value={formData.patternId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, patternId: value }))}
                    required
                  >
                    <SelectTrigger data-testid="select-pattern">
                      <SelectValue placeholder="Select pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      {patterns.map(pattern => (
                        <SelectItem key={pattern.id} value={pattern.id}>
                          {pattern.name} ({pattern.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.scope === 'trip' && (
                <div className="space-y-2">
                  <Label htmlFor="tripId">Trip *</Label>
                  <Select 
                    value={formData.tripId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tripId: value }))}
                    required
                  >
                    <SelectTrigger data-testid="select-trip">
                      <SelectValue placeholder="Select trip" />
                    </SelectTrigger>
                    <SelectContent>
                      {trips.slice(0, 20).map(trip => (
                        <SelectItem key={trip.id} value={trip.id}>
                          Trip {trip.id.slice(-8)} ({trip.serviceDate})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.scope === 'leg' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tripId">Trip *</Label>
                    <Select 
                      value={formData.tripId} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, tripId: value }))}
                      required
                    >
                      <SelectTrigger data-testid="select-trip-leg">
                        <SelectValue placeholder="Select trip" />
                      </SelectTrigger>
                      <SelectContent>
                        {trips.slice(0, 20).map(trip => (
                          <SelectItem key={trip.id} value={trip.id}>
                            Trip {trip.id.slice(-8)} ({trip.serviceDate})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legIndex">Leg Index *</Label>
                    <Input
                      id="legIndex"
                      type="number"
                      value={formData.legIndex}
                      onChange={(e) => setFormData(prev => ({ ...prev, legIndex: e.target.value }))}
                      placeholder="e.g., 1"
                      min="1"
                      required
                      data-testid="input-leg-index"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  placeholder="e.g., 1"
                  min="0"
                  required
                  data-testid="input-priority"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ruleJson">Rule Configuration (JSON) *</Label>
                <Textarea
                  id="ruleJson"
                  value={formData.ruleJson}
                  onChange={(e) => setFormData(prev => ({ ...prev, ruleJson: e.target.value }))}
                  placeholder="Enter JSON rule configuration"
                  rows={8}
                  className="font-mono text-sm"
                  required
                  data-testid="input-rule-json"
                />
                <p className="text-xs text-muted-foreground">
                  Example: {"{ \"basePricePerLeg\": 25000, \"currency\": \"IDR\", \"multiplier\": 1.0 }"}
                </p>
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
            <Table data-testid="price-rules-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Scope</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No price rules found. Create your first rule to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  priceRules.map(rule => (
                    <TableRow key={rule.id} data-testid={`price-rule-row-${rule.id}`}>
                      <TableCell>{getScopeBadge(rule.scope)}</TableCell>
                      <TableCell className="max-w-xs">
                        {rule.scope === 'pattern' && rule.patternId && getPatternName(rule.patternId)}
                        {rule.scope === 'trip' && rule.tripId && getTripName(rule.tripId)}
                        {rule.scope === 'leg' && rule.tripId && `${getTripName(rule.tripId)} - Leg ${rule.legIndex}`}
                        {rule.scope === 'time' && 'Time-based pricing'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate font-mono text-xs">
                        {formatRule(rule.rule)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {rule.validFrom && rule.validTo 
                          ? `${new Date(rule.validFrom).toISOString().split('T')[0]} to ${new Date(rule.validTo).toISOString().split('T')[0]}`
                          : rule.validFrom 
                          ? `From ${new Date(rule.validFrom).toISOString().split('T')[0]}`
                          : rule.validTo 
                          ? `Until ${new Date(rule.validTo).toISOString().split('T')[0]}`
                          : 'Always active'
                        }
                      </TableCell>
                      <TableCell className="font-mono">{rule.priority}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(rule)}
                            data-testid={`edit-price-rule-${rule.id}`}
                          >
                            <i className="fas fa-edit text-primary"></i>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(rule.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`delete-price-rule-${rule.id}`}
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
