/**
 * Recurring Tasks Utility Functions
 * Handles generation and management of recurring task instances
 */

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface RecurrenceConfig {
  pattern: RecurrencePattern
  interval: number // e.g., every 2 weeks = interval 2
  endDate?: string // ISO date string
  count?: number // number of occurrences
}

/**
 * Calculate the next occurrence date based on recurrence pattern
 */
export function getNextOccurrenceDate(
  currentDate: Date,
  pattern: RecurrencePattern,
  interval: number
): Date {
  const next = new Date(currentDate)

  switch (pattern) {
    case 'daily':
      next.setDate(next.getDate() + interval)
      break
    case 'weekly':
      next.setDate(next.getDate() + interval * 7)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + interval)
      break
    case 'custom':
      next.setDate(next.getDate() + interval)
      break
  }

  return next
}

/**
 * Generate future occurrences for a recurring task
 * Returns array of dates (ISO strings) for upcoming instances
 */
export function generateOccurrences(
  startDate: string,
  config: RecurrenceConfig,
  maxOccurrences: number = 10
): string[] {
  const occurrences: string[] = []
  let currentDate = new Date(startDate)
  const endDate = config.endDate ? new Date(config.endDate) : null
  const maxCount = config.count || maxOccurrences

  for (let i = 0; i < maxCount; i++) {
    const nextDate = getNextOccurrenceDate(currentDate, config.pattern, config.interval)

    // Stop if we've exceeded the end date
    if (endDate && nextDate > endDate) {
      break
    }

    occurrences.push(nextDate.toISOString().split('T')[0])
    currentDate = nextDate
  }

  return occurrences
}

/**
 * Format recurrence pattern for display
 */
export function formatRecurrencePattern(
  pattern: RecurrencePattern,
  interval: number
): string {
  if (interval === 1) {
    switch (pattern) {
      case 'daily':
        return 'Daily'
      case 'weekly':
        return 'Weekly'
      case 'monthly':
        return 'Monthly'
      case 'custom':
        return 'Custom'
    }
  } else {
    switch (pattern) {
      case 'daily':
        return `Every ${interval} days`
      case 'weekly':
        return `Every ${interval} weeks`
      case 'monthly':
        return `Every ${interval} months`
      case 'custom':
        return `Every ${interval} days`
    }
  }
}

/**
 * Check if a recurring task should generate a new instance
 */
export function shouldGenerateNextInstance(
  lastInstanceDate: string,
  pattern: RecurrencePattern,
  interval: number,
  endDate?: string,
  remainingCount?: number
): boolean {
  // Check count limit
  if (remainingCount !== undefined && remainingCount <= 0) {
    return false
  }

  const nextDate = getNextOccurrenceDate(new Date(lastInstanceDate), pattern, interval)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check if next occurrence date has arrived
  if (nextDate > today) {
    return false
  }

  // Check end date
  if (endDate) {
    const endDateObj = new Date(endDate)
    if (nextDate > endDateObj) {
      return false
    }
  }

  return true
}
