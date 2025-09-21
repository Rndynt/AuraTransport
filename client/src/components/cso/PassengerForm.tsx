import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface BookerData {
  fullName: string;
  phone?: string | null;
  idNumber?: string | null;
}

interface PassengerData {
  fullName: string;
  phone?: string | null;
  idNumber?: string | null;
  seatNo: string;
}

interface PassengerFormProps {
  selectedSeats: string[];
  passengers: PassengerData[];
  onPassengersUpdate: (passengers: PassengerData[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function PassengerForm({
  selectedSeats,
  passengers,
  onPassengersUpdate,
  onNext,
  onBack
}: PassengerFormProps) {
  const [bookerData, setBookerData] = useState<BookerData>({
    fullName: '',
    phone: '',
    idNumber: ''
  });
  const [formData, setFormData] = useState<PassengerData[]>([]);
  const [sameNameAsBooker, setSameNameAsBooker] = useState(false);
  const [samePhoneFromSecond, setSamePhoneFromSecond] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize form data based on selected seats
    const initialData = selectedSeats.map((seatNo, index) => ({
      fullName: passengers[index]?.fullName || '',
      phone: passengers[index]?.phone || '',
      idNumber: passengers[index]?.idNumber || '',
      seatNo
    }));
    setFormData(initialData);
  }, [selectedSeats, passengers]);

  const handleBookerInputChange = (field: keyof BookerData, value: string) => {
    setBookerData(current => ({ ...current, [field]: value }));
    
    // If same name checkbox is checked, update first passenger
    if (field === 'fullName' && sameNameAsBooker && formData.length > 0) {
      handleInputChange(0, 'fullName', value);
    }
    
    // If same phone for second+ passengers, update them
    if (field === 'phone' && samePhoneFromSecond && formData.length > 1) {
      setFormData(current => 
        current.map((passenger, index) => 
          index > 0 ? { ...passenger, phone: value } : passenger
        )
      );
    }
  };

  const handleInputChange = (index: number, field: keyof PassengerData, value: string) => {
    setFormData(current => {
      const updated = [...current];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSameNameAsBooker = (checked: boolean | "indeterminate") => {
    const isChecked = !!checked;
    setSameNameAsBooker(isChecked);
    if (isChecked && formData.length > 0) {
      handleInputChange(0, 'fullName', bookerData.fullName);
    }
  };

  const handleSamePhoneFromSecond = (checked: boolean | "indeterminate") => {
    const isChecked = !!checked;
    setSamePhoneFromSecond(isChecked);
    if (isChecked && formData.length > 1) {
      setFormData(current =>
        current.map((passenger, index) =>
          index > 0 ? { ...passenger, phone: bookerData.phone } : passenger
        )
      );
    }
  };

  const validateForm = () => {
    const errors: string[] = [];
    
    // Validate booker data
    if (!bookerData.fullName.trim()) {
      errors.push('Booker full name is required');
    }
    if (bookerData.fullName.length < 2) {
      errors.push('Booker full name must be at least 2 characters');
    }
    
    // Validate passenger data
    formData.forEach((passenger, index) => {
      if (!passenger.fullName.trim()) {
        errors.push(`Passenger ${index + 1}: Full name is required`);
      }
      if (passenger.fullName.length < 2) {
        errors.push(`Passenger ${index + 1}: Full name must be at least 2 characters`);
      }
    });

    return errors;
  };

  const handleSubmit = () => {
    const errors = validateForm();
    
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors[0],
        variant: "destructive"
      });
      return;
    }

    onPassengersUpdate(formData);
    onNext();
  };

  const handleAutoFill = () => {
    if (formData.length === 0) return;
    
    const firstPassenger = formData[0];
    if (!firstPassenger.fullName.trim()) {
      toast({
        title: "Auto-fill Error",
        description: "Please fill the first passenger's details first",
        variant: "destructive"
      });
      return;
    }

    setFormData(current => current.map((passenger, index) => 
      index === 0 ? passenger : {
        ...passenger,
        fullName: `${firstPassenger.fullName} +${index}`,
        phone: firstPassenger.phone,
        idNumber: firstPassenger.idNumber
      }
    ));

    toast({
      title: "Auto-filled",
      description: "Passenger details have been auto-filled based on first passenger"
    });
  };

  return (
    <Card data-testid="passenger-form">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <i className="fas fa-users mr-2 text-primary"></i>
            Booking Details
          </CardTitle>
          {formData.length > 1 && (
            <Button 
              onClick={handleAutoFill} 
              variant="outline" 
              size="sm"
              data-testid="auto-fill-button"
            >
              <i className="fas fa-magic mr-2"></i>
              Auto-fill
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Booker Information */}
          <div className="p-4 border border-primary/20 rounded-lg bg-primary/5" data-testid="booker-form">
            <div className="flex items-center mb-4">
              <h4 className="font-semibold text-foreground">
                <i className="fas fa-user-tie mr-2 text-primary"></i>
                Booker Information
              </h4>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="booker-fullName">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="booker-fullName"
                  value={bookerData.fullName}
                  onChange={(e) => handleBookerInputChange('fullName', e.target.value)}
                  placeholder="Enter booker full name"
                  data-testid="input-booker-fullname"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="booker-phone">Phone Number</Label>
                <Input
                  id="booker-phone"
                  value={bookerData.phone || ''}
                  onChange={(e) => handleBookerInputChange('phone', e.target.value)}
                  placeholder="+62 xxx xxx xxxx"
                  data-testid="input-booker-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="booker-idNumber">ID Number</Label>
                <Input
                  id="booker-idNumber"
                  value={bookerData.idNumber || ''}
                  onChange={(e) => handleBookerInputChange('idNumber', e.target.value)}
                  placeholder="ID/Passport number"
                  data-testid="input-booker-idnumber"
                />
              </div>
            </div>

            {/* Same name checkbox */}
            {formData.length > 0 && (
              <div className="flex items-center space-x-2 mt-4">
                <Checkbox
                  id="same-name-booker"
                  checked={sameNameAsBooker}
                  onCheckedChange={handleSameNameAsBooker}
                  data-testid="checkbox-same-name-booker"
                />
                <Label htmlFor="same-name-booker" className="text-sm">
                  Booker name same as first passenger
                </Label>
              </div>
            )}
          </div>

          {/* Same phone checkbox for 2nd+ passengers */}
          {formData.length > 1 && (
            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
              <Checkbox
                id="same-phone-second"
                checked={samePhoneFromSecond}
                onCheckedChange={handleSamePhoneFromSecond}
                data-testid="checkbox-same-phone-second"
              />
              <Label htmlFor="same-phone-second" className="text-sm">
                Use booker's phone number for all passengers (except first)
              </Label>
            </div>
          )}
          {formData.map((passenger, index) => (
            <div key={index} className="p-4 border border-border rounded-lg" data-testid={`passenger-${index}`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-foreground">
                  Passenger {index + 1}
                </h4>
                <div className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-mono">
                  Seat {passenger.seatNo}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`fullName-${index}`}>
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`fullName-${index}`}
                    value={passenger.fullName}
                    onChange={(e) => handleInputChange(index, 'fullName', e.target.value)}
                    placeholder="Enter full name"
                    data-testid={`input-fullname-${index}`}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`phone-${index}`}>Phone Number</Label>
                  <Input
                    id={`phone-${index}`}
                    value={passenger.phone || ''}
                    onChange={(e) => handleInputChange(index, 'phone', e.target.value)}
                    placeholder="+62 xxx xxx xxxx"
                    data-testid={`input-phone-${index}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`idNumber-${index}`}>ID Number</Label>
                  <Input
                    id={`idNumber-${index}`}
                    value={passenger.idNumber || ''}
                    onChange={(e) => handleInputChange(index, 'idNumber', e.target.value)}
                    placeholder="ID/Passport number"
                    data-testid={`input-idnumber-${index}`}
                  />
                </div>
              </div>
            </div>
          ))}

          {formData.length === 0 && (
            <div className="text-center py-8">
              <i className="fas fa-users text-muted-foreground text-3xl mb-4"></i>
              <p className="text-muted-foreground">No seats selected</p>
              <p className="text-sm text-muted-foreground">Please go back and select seats first</p>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
          <Button onClick={onBack} variant="outline" data-testid="back-to-seats">
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Seats
          </Button>

          <Button 
            onClick={handleSubmit} 
            disabled={formData.length === 0}
            data-testid="continue-to-payment"
          >
            Continue to Payment
            <i className="fas fa-arrow-right ml-2"></i>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
