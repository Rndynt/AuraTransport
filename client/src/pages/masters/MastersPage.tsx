import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StopsManager from '@/components/masters/StopsManager';
import OutletsManager from '@/components/masters/OutletsManager';
import VehiclesManager from '@/components/masters/VehiclesManager';
import LayoutsManager from '@/components/masters/LayoutsManager';
import TripPatternsManager from '@/components/masters/TripPatternsManager';
import TripBasesManager from '@/components/masters/TripBasesManager';
import TripsManager from '@/components/masters/TripsManager';
import PriceRulesManager from '@/components/masters/PriceRulesManager';

export default function MastersPage() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const tabFromUrl = urlParams.get('tab') || 'stops';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  
  useEffect(() => {
    const newTab = urlParams.get('tab') || 'stops';
    setActiveTab(newTab);
  }, [location]);

  const tabs = [
    { id: 'stops', label: 'Stops', icon: 'fas fa-map-marker-alt', component: StopsManager },
    { id: 'outlets', label: 'Outlets', icon: 'fas fa-store', component: OutletsManager },
    { id: 'vehicles', label: 'Vehicles', icon: 'fas fa-shuttle-van', component: VehiclesManager },
    { id: 'layouts', label: 'Layouts', icon: 'fas fa-th-large', component: LayoutsManager },
    { id: 'patterns', label: 'Trip Patterns', icon: 'fas fa-route', component: TripPatternsManager },
    { id: 'trip-bases', label: 'Trip Bases', icon: 'fas fa-calendar-plus', component: TripBasesManager },
    { id: 'trips', label: 'Trips', icon: 'fas fa-calendar-alt', component: TripsManager },
    { id: 'pricing', label: 'Price Rules', icon: 'fas fa-money-bill-wave', component: PriceRulesManager }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6" data-testid="masters-page">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">Master Data Management</CardTitle>
          <p className="text-muted-foreground">
            Configure stops, vehicles, routes, and pricing rules for the multi-stop travel system
          </p>
        </CardHeader>
      </Card>

      {/* Masters Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border px-3 lg:px-6">
            <TabsList className="flex h-auto p-0 bg-transparent overflow-x-auto scrollbar-hide">
              {tabs.map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex-col h-auto py-3 lg:py-4 px-3 lg:px-4 min-w-0 flex-shrink-0 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none"
                  data-testid={`tab-${tab.id}`}
                >
                  <i className={`${tab.icon} text-base lg:text-lg mb-1`}></i>
                  <span className="text-xs lg:text-sm font-medium whitespace-nowrap text-center">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <CardContent className="p-6">
            {tabs.map(tab => (
              <TabsContent 
                key={tab.id} 
                value={tab.id} 
                className="mt-0"
                data-testid={`content-${tab.id}`}
              >
                <tab.component />
              </TabsContent>
            ))}
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
