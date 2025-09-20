export interface AppConfig {
  holdTtlShortSeconds: number;
  holdTtlLongSeconds: number;
  pendingBookingAutoRelease: boolean;
}

export const config: AppConfig = {
  holdTtlShortSeconds: parseInt(process.env.HOLD_TTL_SHORT_SECONDS || '60'),
  holdTtlLongSeconds: parseInt(process.env.HOLD_TTL_LONG_SECONDS || '1200'), // 20 minutes
  pendingBookingAutoRelease: process.env.PENDING_BOOKING_AUTO_RELEASE !== 'false'
};

export function getConfig(): AppConfig {
  return config;
}