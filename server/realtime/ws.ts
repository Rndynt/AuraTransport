import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { log } from '../vite';

// WebSocket event types
export interface WSEvents {
  TRIP_STATUS_CHANGED: { tripId: string; status: string };
  TRIP_CANCELED: { tripId: string };
  HOLDS_RELEASED: { tripId: string; seatNos?: string[] };
  TRIP_MATERIALIZED: { baseId: string; serviceDate: string; tripId: string };
  INVENTORY_UPDATED: { tripId: string; seatNo: string; legIndexes?: number[] };
}

export type WSEventName = keyof WSEvents;
export type WSEventData<T extends WSEventName> = WSEvents[T];

class WebSocketService {
  private io: SocketIOServer | null = null;

  initialize(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.io.on('connection', (socket: Socket) => {
      log(`WebSocket client connected: ${socket.id}`, 'websocket');
      
      // Handle room subscriptions
      socket.on('subscribe-trip', (tripId: string) => {
        const roomName = `trip:${tripId}`;
        socket.join(roomName);
        log(`Client ${socket.id} subscribed to ${roomName}`, 'websocket');
      });

      socket.on('unsubscribe-trip', (tripId: string) => {
        const roomName = `trip:${tripId}`;
        socket.leave(roomName);
        log(`Client ${socket.id} unsubscribed from ${roomName}`, 'websocket');
      });

      socket.on('subscribe-base', (baseId: string) => {
        const roomName = `base:${baseId}`;
        socket.join(roomName);
        log(`Client ${socket.id} subscribed to ${roomName}`, 'websocket');
      });

      socket.on('unsubscribe-base', (baseId: string) => {
        const roomName = `base:${baseId}`;
        socket.leave(roomName);
        log(`Client ${socket.id} unsubscribed from ${roomName}`, 'websocket');
      });

      socket.on('subscribe-cso', (outletId: string, serviceDate: string) => {
        const roomName = `cso:${outletId}:${serviceDate}`;
        socket.join(roomName);
        log(`Client ${socket.id} subscribed to ${roomName}`, 'websocket');
      });

      socket.on('unsubscribe-cso', (outletId: string, serviceDate: string) => {
        const roomName = `cso:${outletId}:${serviceDate}`;
        socket.leave(roomName);
        log(`Client ${socket.id} unsubscribed from ${roomName}`, 'websocket');
      });

      socket.on('disconnect', (reason) => {
        log(`WebSocket client disconnected: ${socket.id}, reason: ${reason}`, 'websocket');
      });
    });

    log('WebSocket server initialized', 'websocket');
  }

  // Event emission helpers
  emitToTrip<T extends WSEventName>(tripId: string, event: T, data: WSEventData<T>) {
    if (!this.io) {
      log('WebSocket not initialized, cannot emit event', 'websocket');
      return;
    }
    
    const roomName = `trip:${tripId}`;
    this.io.to(roomName).emit(event, data);
    log(`Emitted ${event} to ${roomName}`, 'websocket');
  }

  emitToBase<T extends WSEventName>(baseId: string, event: T, data: WSEventData<T>) {
    if (!this.io) {
      log('WebSocket not initialized, cannot emit event', 'websocket');
      return;
    }
    
    const roomName = `base:${baseId}`;
    this.io.to(roomName).emit(event, data);
    log(`Emitted ${event} to ${roomName}`, 'websocket');
  }

  emitToCso<T extends WSEventName>(outletId: string, serviceDate: string, event: T, data: WSEventData<T>) {
    if (!this.io) {
      log('WebSocket not initialized, cannot emit event', 'websocket');
      return;
    }
    
    const roomName = `cso:${outletId}:${serviceDate}`;
    this.io.to(roomName).emit(event, data);
    log(`Emitted ${event} to ${roomName}`, 'websocket');
  }

  // Broadcast to all clients (use sparingly)
  broadcast<T extends WSEventName>(event: T, data: WSEventData<T>) {
    if (!this.io) {
      log('WebSocket not initialized, cannot broadcast event', 'websocket');
      return;
    }
    
    this.io.emit(event, data);
    log(`Broadcasted ${event} to all clients`, 'websocket');
  }

  // Helper to emit TRIP_STATUS_CHANGED and TRIP_CANCELED together
  emitTripStatusChanged(tripId: string, status: string, additionalRooms?: { baseId?: string; outletId?: string; serviceDate?: string }) {
    const data: WSEventData<'TRIP_STATUS_CHANGED'> = { tripId, status };
    
    // Always emit to trip room
    this.emitToTrip(tripId, 'TRIP_STATUS_CHANGED', data);
    
    // If status is canceled, also emit TRIP_CANCELED
    if (status === 'canceled') {
      this.emitToTrip(tripId, 'TRIP_CANCELED', { tripId });
    }
    
    // Emit to additional rooms if provided
    if (additionalRooms?.baseId) {
      this.emitToBase(additionalRooms.baseId, 'TRIP_STATUS_CHANGED', data);
      if (status === 'canceled') {
        this.emitToBase(additionalRooms.baseId, 'TRIP_CANCELED', { tripId });
      }
    }
    
    if (additionalRooms?.outletId && additionalRooms?.serviceDate) {
      this.emitToCso(additionalRooms.outletId, additionalRooms.serviceDate, 'TRIP_STATUS_CHANGED', data);
      if (status === 'canceled') {
        this.emitToCso(additionalRooms.outletId, additionalRooms.serviceDate, 'TRIP_CANCELED', { tripId });
      }
    }
  }

  // Helper to emit HOLDS_RELEASED
  emitHoldsReleased(tripId: string, seatNos?: string[], additionalRooms?: { outletId?: string; serviceDate?: string }) {
    const data: WSEventData<'HOLDS_RELEASED'> = { tripId, seatNos };
    
    // Always emit to trip room
    this.emitToTrip(tripId, 'HOLDS_RELEASED', data);
    
    // Emit to additional rooms if provided
    if (additionalRooms?.outletId && additionalRooms?.serviceDate) {
      this.emitToCso(additionalRooms.outletId, additionalRooms.serviceDate, 'HOLDS_RELEASED', data);
    }
  }

  // Helper to emit TRIP_MATERIALIZED
  emitTripMaterialized(baseId: string, serviceDate: string, tripId: string, additionalRooms?: { outletId?: string }) {
    const data: WSEventData<'TRIP_MATERIALIZED'> = { baseId, serviceDate, tripId };
    
    // Always emit to base room
    this.emitToBase(baseId, 'TRIP_MATERIALIZED', data);
    
    // Emit to CSO rooms if provided
    if (additionalRooms?.outletId) {
      this.emitToCso(additionalRooms.outletId, serviceDate, 'TRIP_MATERIALIZED', data);
    }
  }

  // Helper to emit INVENTORY_UPDATED
  emitInventoryUpdated(tripId: string, seatNo: string, legIndexes?: number[], additionalRooms?: { outletId?: string; serviceDate?: string }) {
    const data: WSEventData<'INVENTORY_UPDATED'> = { tripId, seatNo, legIndexes };
    
    // Always emit to trip room
    this.emitToTrip(tripId, 'INVENTORY_UPDATED', data);
    
    // Emit to additional rooms if provided
    if (additionalRooms?.outletId && additionalRooms?.serviceDate) {
      this.emitToCso(additionalRooms.outletId, additionalRooms.serviceDate, 'INVENTORY_UPDATED', data);
    }
  }

  getConnectedClientsCount(): number {
    return this.io?.engine.clientsCount || 0;
  }

  getRoomClientsCount(roomName: string): number {
    return this.io?.sockets.adapter.rooms.get(roomName)?.size || 0;
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();

// Export helper functions for use in services
export const {
  emitToTrip,
  emitToBase,
  emitToCso,
  broadcast,
  emitTripStatusChanged,
  emitHoldsReleased,
  emitTripMaterialized,
  emitInventoryUpdated
} = webSocketService;