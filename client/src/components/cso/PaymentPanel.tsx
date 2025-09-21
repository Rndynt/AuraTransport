import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface PaymentData {
  method: 'cash' | 'qr' | 'ewallet' | 'bank';
  amount: number;
}

interface PaymentPanelProps {
  totalAmount: number;
  payment?: PaymentData;
  onPaymentUpdate: (payment: PaymentData) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading?: boolean;
}

export default function PaymentPanel({
  totalAmount,
  payment,
  onPaymentUpdate,
  onSubmit,
  onBack,
  loading = false
}: PaymentPanelProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentData['method']>(payment?.method || 'cash');
  const [receivedAmount, setReceivedAmount] = useState(payment?.amount?.toString() || totalAmount.toString());
  const { toast } = useToast();

  // Initialize payment data safely in useEffect to avoid render side effects
  useEffect(() => {
    if (!payment) {
      onPaymentUpdate({
        method: selectedMethod,
        amount: parseFloat(receivedAmount) || totalAmount
      });
    }
  }, []); // Empty dependency array - only run once on mount

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: 'fas fa-money-bill-wave' },
    { value: 'qr', label: 'QR Code', icon: 'fas fa-qrcode' },
    { value: 'ewallet', label: 'E-Wallet', icon: 'fas fa-mobile-alt' },
    { value: 'bank', label: 'Bank Transfer', icon: 'fas fa-university' }
  ] as const;

  const handleMethodChange = (method: PaymentData['method']) => {
    setSelectedMethod(method);
    onPaymentUpdate({
      method,
      amount: parseFloat(receivedAmount) || totalAmount
    });
  };

  const handleAmountChange = (amount: string) => {
    setReceivedAmount(amount);
    const numAmount = parseFloat(amount) || 0;
    onPaymentUpdate({
      method: selectedMethod,
      amount: numAmount
    });
  };

  const calculateChange = () => {
    const received = parseFloat(receivedAmount) || 0;
    return received - totalAmount;
  };

  const canSubmit = () => {
    const received = parseFloat(receivedAmount) || 0;
    return received >= totalAmount && selectedMethod;
  };

  const handleSubmit = () => {
    if (!canSubmit()) {
      toast({
        title: "Payment Error",
        description: "Received amount must be at least the total amount",
        variant: "destructive"
      });
      return;
    }

    onSubmit();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card data-testid="payment-panel">
      <CardHeader>
        <CardTitle className="flex items-center">
          <i className="fas fa-credit-card mr-2 text-primary"></i>
          Payment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Amount Summary */}
          <div className="bg-muted p-4 rounded-lg" data-testid="payment-summary">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-mono font-bold text-lg" data-testid="total-amount">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              {selectedMethod === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span>Received:</span>
                    <span className="font-mono" data-testid="received-amount">
                      {formatCurrency(parseFloat(receivedAmount) || 0)}
                    </span>
                  </div>
                  {calculateChange() >= 0 && (
                    <div className="flex justify-between text-secondary">
                      <span>Change:</span>
                      <span className="font-mono font-bold" data-testid="change-amount">
                        {formatCurrency(calculateChange())}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={selectedMethod} onValueChange={handleMethodChange} data-testid="payment-method-select">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map(method => (
                  <SelectItem key={method.value} value={method.value}>
                    <div className="flex items-center">
                      <i className={`${method.icon} mr-2`}></i>
                      {method.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input for Cash */}
          {selectedMethod === 'cash' && (
            <div className="space-y-2">
              <Label htmlFor="received-amount">Received Amount</Label>
              <Input
                id="received-amount"
                type="number"
                value={receivedAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="Enter received amount"
                min={totalAmount}
                step="1000"
                data-testid="received-amount-input"
              />
            </div>
          )}

          {/* Payment Method Specific Info */}
          {selectedMethod === 'qr' && (
            <div className="text-center p-6 border border-dashed border-border rounded-lg">
              <i className="fas fa-qrcode text-4xl text-muted-foreground mb-4"></i>
              <p className="text-sm text-muted-foreground">
                Scan QR code to complete payment
              </p>
            </div>
          )}

          {selectedMethod === 'ewallet' && (
            <div className="text-center p-6 border border-dashed border-border rounded-lg">
              <i className="fas fa-mobile-alt text-4xl text-muted-foreground mb-4"></i>
              <p className="text-sm text-muted-foreground">
                Complete payment through e-wallet app
              </p>
            </div>
          )}

          {selectedMethod === 'bank' && (
            <div className="text-center p-6 border border-dashed border-border rounded-lg">
              <i className="fas fa-university text-4xl text-muted-foreground mb-4"></i>
              <p className="text-sm text-muted-foreground">
                Process bank transfer payment
              </p>
            </div>
          )}
        </div>

        {/* Payment Actions */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
          <Button onClick={onBack} variant="outline" data-testid="back-to-passengers">
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Passengers
          </Button>

          <Button 
            onClick={handleSubmit}
            disabled={!canSubmit() || loading}
            data-testid="process-payment"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <i className="fas fa-check mr-2"></i>
                Process Payment & Issue Ticket
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
