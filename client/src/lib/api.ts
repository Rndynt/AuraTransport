import { apiRequest } from "./queryClient";
import type { 
  Stop, Outlet, Vehicle, Layout, TripPattern, PatternStop,
  Trip, TripWithDetails, TripStopTime, PriceRule, Booking,
  SeatmapResponse, HoldResponse, CreateBookingRequest, CreateHoldRequest
} from "@/types";

// Stops API
export const stopsApi = {
  getAll: () => fetch('/api/stops').then(res => res.json()) as Promise<Stop[]>,
  getById: (id: string) => fetch(`/api/stops/${id}`).then(res => res.json()) as Promise<Stop>,
  create: (data: any) => apiRequest('POST', '/api/stops', data).then(res => res.json()),
  update: (id: string, data: any) => apiRequest('PUT', `/api/stops/${id}`, data).then(res => res.json()),
  delete: (id: string) => apiRequest('DELETE', `/api/stops/${id}`)
};

// Outlets API
export const outletsApi = {
  getAll: () => fetch('/api/outlets').then(res => res.json()) as Promise<Outlet[]>,
  getById: (id: string) => fetch(`/api/outlets/${id}`).then(res => res.json()) as Promise<Outlet>,
  create: (data: any) => apiRequest('POST', '/api/outlets', data).then(res => res.json()),
  update: (id: string, data: any) => apiRequest('PUT', `/api/outlets/${id}`, data).then(res => res.json()),
  delete: (id: string) => apiRequest('DELETE', `/api/outlets/${id}`)
};

// Vehicles API
export const vehiclesApi = {
  getAll: () => fetch('/api/vehicles').then(res => res.json()) as Promise<Vehicle[]>,
  getById: (id: string) => fetch(`/api/vehicles/${id}`).then(res => res.json()) as Promise<Vehicle>,
  create: (data: any) => apiRequest('POST', '/api/vehicles', data).then(res => res.json()),
  update: (id: string, data: any) => apiRequest('PUT', `/api/vehicles/${id}`, data).then(res => res.json()),
  delete: (id: string) => apiRequest('DELETE', `/api/vehicles/${id}`)
};

// Layouts API
export const layoutsApi = {
  getAll: () => fetch('/api/layouts').then(res => res.json()) as Promise<Layout[]>,
  getById: (id: string) => fetch(`/api/layouts/${id}`).then(res => res.json()) as Promise<Layout>,
  create: (data: any) => apiRequest('POST', '/api/layouts', data).then(res => res.json()),
  update: (id: string, data: any) => apiRequest('PUT', `/api/layouts/${id}`, data).then(res => res.json()),
  delete: (id: string) => apiRequest('DELETE', `/api/layouts/${id}`)
};

// Trip Patterns API
export const tripPatternsApi = {
  getAll: () => fetch('/api/trip-patterns').then(res => res.json()) as Promise<TripPattern[]>,
  getById: (id: string) => fetch(`/api/trip-patterns/${id}`).then(res => res.json()) as Promise<TripPattern>,
  create: (data: any) => apiRequest('POST', '/api/trip-patterns', data).then(res => res.json()),
  update: (id: string, data: any) => apiRequest('PUT', `/api/trip-patterns/${id}`, data).then(res => res.json()),
  delete: (id: string) => apiRequest('DELETE', `/api/trip-patterns/${id}`),
  getStops: (patternId: string) => fetch(`/api/trip-patterns/${patternId}/stops`).then(res => res.json()) as Promise<PatternStop[]>
};

// Pattern Stops API
export const patternStopsApi = {
  create: (data: any) => apiRequest('POST', '/api/pattern-stops', data).then(res => res.json()),
  update: (id: string, data: any) => apiRequest('PUT', `/api/pattern-stops/${id}`, data).then(res => res.json()),
  delete: (id: string) => apiRequest('DELETE', `/api/pattern-stops/${id}`)
};

// Trips API
export const tripsApi = {
  getAll: (date?: string) => {
    const url = date ? `/api/trips?date=${date}` : '/api/trips';
    return fetch(url).then(res => res.json()) as Promise<TripWithDetails[]>;
  },
  getById: (id: string) => fetch(`/api/trips/${id}`).then(res => res.json()) as Promise<Trip>,
  create: (data: any) => apiRequest('POST', '/api/trips', data).then(res => res.json()),
  update: (id: string, data: any) => apiRequest('PUT', `/api/trips/${id}`, data).then(res => res.json()),
  delete: (id: string) => apiRequest('DELETE', `/api/trips/${id}`),
  deriveLegs: (id: string) => apiRequest('POST', `/api/trips/${id}/derive-legs`).then(res => res.json()),
  precomputeSeatInventory: (id: string) => apiRequest('POST', `/api/trips/${id}/precompute-seat-inventory`).then(res => res.json()),
  getStopTimes: (id: string) => fetch(`/api/trips/${id}/stop-times`).then(res => res.json()) as Promise<TripStopTime[]>,
  getSeatmap: (id: string, originSeq: number, destinationSeq: number) => 
    fetch(`/api/trips/${id}/seatmap?originSeq=${originSeq}&destinationSeq=${destinationSeq}`)
      .then(res => res.json()) as Promise<SeatmapResponse>
};

// Trip Stop Times API
export const tripStopTimesApi = {
  create: (data: any) => apiRequest('POST', '/api/trip-stop-times', data).then(res => res.json()),
  update: (id: string, data: any) => apiRequest('PUT', `/api/trip-stop-times/${id}`, data).then(res => res.json()),
  delete: (id: string) => apiRequest('DELETE', `/api/trip-stop-times/${id}`)
};

// Price Rules API
export const priceRulesApi = {
  getAll: () => fetch('/api/price-rules').then(res => res.json()) as Promise<PriceRule[]>,
  create: (data: any) => apiRequest('POST', '/api/price-rules', data).then(res => res.json()),
  update: (id: string, data: any) => apiRequest('PUT', `/api/price-rules/${id}`, data).then(res => res.json()),
  delete: (id: string) => apiRequest('DELETE', `/api/price-rules/${id}`)
};

// Bookings API
export const bookingsApi = {
  getAll: (tripId?: string) => {
    const url = tripId ? `/api/bookings?tripId=${tripId}` : '/api/bookings';
    return fetch(url).then(res => res.json()) as Promise<Booking[]>;
  },
  getById: (id: string) => fetch(`/api/bookings/${id}`).then(res => res.json()) as Promise<Booking>,
  create: async (data: CreateBookingRequest, idempotencyKey?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Unknown error occurred';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.details || errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }
    
    return response.json();
  }
};

// Holds API
export const holdsApi = {
  create: (data: CreateHoldRequest) => apiRequest('POST', '/api/holds', data).then(res => res.json()) as Promise<HoldResponse>,
  release: (holdRef: string) => apiRequest('DELETE', `/api/holds/${holdRef}`)
};

// Seed API
export const seedApi = {
  run: () => apiRequest('POST', '/api/seed').then(res => res.json())
};
