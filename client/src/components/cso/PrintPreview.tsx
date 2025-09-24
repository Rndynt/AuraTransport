import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PrintPreviewProps {
  booking: any;
  printPayload: any;
  onNewBooking: () => void;
  onPrint?: () => void;
}

export default function PrintPreview({ 
  booking, 
  printPayload, 
  onNewBooking, 
  onPrint 
}: PrintPreviewProps) {
  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <Card className="border-secondary bg-secondary/5" data-testid="booking-success">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-check text-2xl"></i>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Booking Successful!
            </h3>
            <p className="text-muted-foreground">
              Booking reference: <span className="font-mono font-bold">{booking.id.slice(-8).toUpperCase()}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Print Preview */}
      <Card data-testid="print-preview">
        <CardHeader>
          <CardTitle className="flex items-center">
            <i className="fas fa-receipt mr-2 text-primary"></i>
            Ticket Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white border border-border rounded-lg p-6 font-mono text-sm space-y-4">
            {/* Header */}
            <div className="text-center border-b border-dashed pb-4">
              <h4 className="font-bold text-lg mb-1">{printPayload.content.header}</h4>
              <p className="text-xs text-muted-foreground">Multi-Stop Travel System</p>
            </div>

            {/* Booking Info */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Booking Ref:</span>
                <span className="font-bold">{printPayload.content.bookingRef}</span>
              </div>
              <div className="flex justify-between">
                <span>Date/Time:</span>
                <span>{formatDateTime(printPayload.content.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span>Channel:</span>
                <span>{booking.channel}</span>
              </div>
            </div>

            {/* Journey Details */}
            <div className="border-t border-dashed pt-4">
              <h5 className="font-bold mb-2">JOURNEY DETAILS</h5>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>From:</span>
                  <span>{booking.originStop?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>To:</span>
                  <span>{booking.destinationStop?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Date:</span>
                  <span>{booking.trip?.serviceDate ? new Date(booking.trip.serviceDate).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Departure:</span>
                  <span>{booking.departAt ? new Date(booking.departAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }) : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Passenger Details */}
            <div className="border-t border-dashed pt-4">
              <h5 className="font-bold mb-2">PASSENGER(S)</h5>
              {booking.passengers && booking.passengers.length > 0 ? (
                booking.passengers.map((passenger: any, index: number) => (
                  <div key={index} className="space-y-1 mb-3">
                    <div className="flex justify-between">
                      <span>Name:</span>
                      <span>{passenger.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Seat:</span>
                      <span>{passenger.seatNo}</span>
                    </div>
                    {passenger.phone && (
                      <div className="flex justify-between">
                        <span>Phone:</span>
                        <span>{passenger.phone}</span>
                      </div>
                    )}
                    {index < booking.passengers.length - 1 && <hr className="border-dashed my-2" />}
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground">No passenger data</div>
              )}
            </div>

            {/* Payment Details */}
            <div className="border-t border-dashed pt-4">
              <h5 className="font-bold mb-2">PAYMENT</h5>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-bold">{formatCurrency(booking.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span>{booking.payments?.[0]?.method?.toUpperCase() || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span>{booking.payments?.[0]?.status?.toUpperCase() || 'PAID'}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-dashed pt-4 text-center text-xs">
              <p>{printPayload.content.note}</p>
              <p className="mt-2">Thank you for choosing BusTicket Pro</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card data-testid="print-actions">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-4">
            <Button 
              onClick={onPrint} 
              variant="outline"
              data-testid="print-ticket"
            >
              <i className="fas fa-print mr-2"></i>
              Print Ticket
            </Button>
            
            <Button 
              onClick={onNewBooking}
              data-testid="new-booking"
            >
              <i className="fas fa-plus mr-2"></i>
              New Booking
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
