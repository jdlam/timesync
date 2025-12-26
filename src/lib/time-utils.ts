import { format, parse, addMinutes } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

/**
 * Generate all time slots between start/end times for given dates
 * @param dates - Array of date strings in 'YYYY-MM-DD' format
 * @param timeRangeStart - Start time in 'HH:mm' format (e.g., '09:00')
 * @param timeRangeEnd - End time in 'HH:mm' format (e.g., '17:00')
 * @param slotDuration - Duration in minutes (e.g., 30)
 * @param timeZone - IANA timezone string (e.g., 'America/New_York')
 * @returns Array of ISO timestamp strings
 */
export function generateTimeSlots(
  dates: string[],
  timeRangeStart: string,
  timeRangeEnd: string,
  slotDuration: number,
  timeZone: string
): string[] {
  const slots: string[] = []

  for (const dateStr of dates) {
    // Parse the date and times in the specified timezone
    const startDateTime = parseTimeInZone(dateStr, timeRangeStart, timeZone)
    const endDateTime = parseTimeInZone(dateStr, timeRangeEnd, timeZone)

    let currentSlot = startDateTime

    // Generate slots from start to end
    while (currentSlot < endDateTime) {
      // Convert to UTC ISO string for storage
      slots.push(currentSlot.toISOString())
      currentSlot = addMinutes(currentSlot, slotDuration)
    }
  }

  return slots
}

/**
 * Parse a time string in a specific timezone
 * @param dateStr - Date string in 'YYYY-MM-DD' format
 * @param timeStr - Time string in 'HH:mm' format
 * @param timeZone - IANA timezone string
 * @returns Date object
 */
export function parseTimeInZone(
  dateStr: string,
  timeStr: string,
  timeZone: string
): Date {
  // Combine date and time strings
  const dateTimeStr = `${dateStr} ${timeStr}`

  // Parse as if it's in the specified timezone
  const parsedDate = parse(dateTimeStr, 'yyyy-MM-dd HH:mm', new Date())

  // Convert from the specified timezone to UTC
  return fromZonedTime(parsedDate, timeZone)
}

/**
 * Format ISO timestamp to display format in specific timezone
 * @param isoTimestamp - ISO 8601 timestamp string
 * @param timeZone - IANA timezone string
 * @param formatType - 'short' (9:00 AM) or 'long' (Mon, Jan 15, 9:00 AM)
 * @returns Formatted time string
 */
export function formatTimeSlot(
  isoTimestamp: string,
  timeZone: string,
  formatType: 'short' | 'long' = 'short'
): string {
  const date = new Date(isoTimestamp)
  const zonedDate = toZonedTime(date, timeZone)

  if (formatType === 'short') {
    return format(zonedDate, 'h:mm a') // 9:00 AM
  } else {
    return format(zonedDate, 'EEE, MMM d, h:mm a') // Mon, Jan 15, 9:00 AM
  }
}

/**
 * Format ISO timestamp to just the date in specific timezone
 * @param isoTimestamp - ISO 8601 timestamp string
 * @param timeZone - IANA timezone string
 * @returns Formatted date string
 */
export function formatDate(
  isoTimestamp: string,
  timeZone: string
): string {
  const date = new Date(isoTimestamp)
  const zonedDate = toZonedTime(date, timeZone)
  return format(zonedDate, 'yyyy-MM-dd') // 2025-01-15
}

/**
 * Format date string for display
 * @param dateStr - Date string in 'YYYY-MM-DD' format
 * @returns Formatted date string (e.g., "Mon, Jan 15")
 */
export function formatDateDisplay(dateStr: string): string {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date())
  return format(date, 'EEE, MMM d') // Mon, Jan 15
}

/**
 * Group time slots by date
 * @param slots - Array of ISO timestamp strings
 * @param timeZone - IANA timezone string
 * @returns Map of date string to array of slot timestamps
 */
export function groupSlotsByDate(
  slots: string[],
  timeZone: string
): Map<string, string[]> {
  const grouped = new Map<string, string[]>()

  for (const slot of slots) {
    const dateKey = formatDate(slot, timeZone)

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, [])
    }

    grouped.get(dateKey)!.push(slot)
  }

  return grouped
}

/**
 * Get display label for a date column
 * @param dateStr - Date string in 'YYYY-MM-DD' format
 * @returns Display label (e.g., "Mon 1/15")
 */
export function getDateColumnLabel(dateStr: string): string {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date())
  return format(date, 'EEE M/d') // Mon 1/15
}

/**
 * Validate that end time is after start time
 * @param startTime - Start time in 'HH:mm' format
 * @param endTime - End time in 'HH:mm' format
 * @returns true if valid, false otherwise
 */
export function validateTimeRange(startTime: string, endTime: string): boolean {
  const start = parse(startTime, 'HH:mm', new Date())
  const end = parse(endTime, 'HH:mm', new Date())
  return end > start
}

/**
 * Check if a date is in the past
 * @param dateStr - Date string in 'YYYY-MM-DD' format
 * @returns true if date is in the past
 */
export function isDateInPast(dateStr: string): boolean {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date())
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

/**
 * Get the current timezone of the user's browser
 * @returns IANA timezone string
 */
export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
