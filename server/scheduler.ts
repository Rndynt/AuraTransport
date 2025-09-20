import { BookingsService } from './modules/bookings/bookings.service';
import { storage } from './storage';
import { getConfig } from './config';

export class Scheduler {
  private bookingsService: BookingsService;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.bookingsService = new BookingsService(storage);
  }

  start(): void {
    const config = getConfig();
    
    if (!config.pendingBookingAutoRelease) {
      console.log('Pending booking auto-release is disabled');
      return;
    }

    // Run cleanup every 5 minutes
    this.intervalId = setInterval(async () => {
      try {
        console.log('Running expired pending bookings cleanup...');
        await this.bookingsService.cleanupExpiredPendingBookings();
      } catch (error) {
        console.error('Error during pending bookings cleanup:', error);
      }
    }, 5 * 60 * 1000);

    console.log('Pending bookings auto-cleanup scheduler started');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Pending bookings auto-cleanup scheduler stopped');
    }
  }
}

export const scheduler = new Scheduler();