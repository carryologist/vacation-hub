// Timezone-safe date parsing and formatting utilities

/**
 * Parse a date string (YYYY-MM-DD) as a local date instead of UTC
 * This prevents timezone shifts that cause dates to appear one day off
 */
export const parseLocalDate = (dateString: string): Date => {
  // Strip any time/timezone portion so we always work with the date part only
  const datePart = dateString.includes('T') ? dateString.split('T')[0] : dateString
  const [year, month, day] = datePart.split('-').map(Number)
  return new Date(year, month - 1, day) // month is 0-indexed
}

/**
 * Format a date string for display, ensuring it shows the correct local date
 */
export const formatDisplayDate = (dateString: string): string => {
  return parseLocalDate(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}
