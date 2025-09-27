import { parseISO, getDay } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

/**
 * Convert HH:MM time string to UTC timestamp using specified timezone
 * @param serviceDate Date string in YYYY-MM-DD format
 * @param hhmm Time string in HH:MM or HH:MM:SS format
 * @param tz Timezone string (e.g., "Asia/Jakarta")
 * @returns UTC Date object
 */
export function fromZonedHHMMToUtc(serviceDate: string, hhmm: string, tz: string = 'Asia/Jakarta'): Date {
  // Ensure we have seconds component
  const timeWithSeconds = hhmm.includes(':') && hhmm.split(':').length === 2 ? `${hhmm}:00` : hhmm;
  
  // Create datetime string in local timezone
  const localDateTimeStr = `${serviceDate}T${timeWithSeconds}`;
  
  // Parse as local time and convert to UTC using the specified timezone
  const localDateTime = parseISO(localDateTimeStr);
  
  // Convert from the specified timezone to UTC
  return fromZonedTime(localDateTime, tz);
}

/**
 * Get day of week in specified timezone
 * @param serviceDate Date string in YYYY-MM-DD format  
 * @param tz Timezone string (e.g., "Asia/Jakarta")
 * @returns Day of week (0 = Sunday, 1 = Monday, etc.)
 */
export function getDayInTZ(serviceDate: string, tz: string = 'Asia/Jakarta'): number {
  // Parse the service date
  const date = parseISO(serviceDate);
  
  // Format the date in the specified timezone and get day of week
  // We need to get the actual date in the target timezone, not just the day of week
  const dateInTZ = formatInTimeZone(date, tz, 'yyyy-MM-dd');
  const dateInTZObj = parseISO(dateInTZ);
  
  return getDay(dateInTZObj);
}

/**
 * Format timestamp in the specified timezone as HH:MM
 * @param timestamp UTC timestamp (Date object)
 * @param tz Timezone string (e.g., "Asia/Jakarta")
 * @returns Time string in HH:MM format
 */
export function formatTimeInTZ(timestamp: Date, tz: string = 'Asia/Jakarta'): string {
  return formatInTimeZone(timestamp, tz, 'HH:mm');
}

/**
 * Ensure timezone is set to default if not specified
 * @param timezone Timezone string or null/undefined
 * @returns Timezone string, defaulting to "Asia/Jakarta"
 */
export function ensureDefaultTimezone(timezone?: string | null): string {
  return timezone || 'Asia/Jakarta';
}