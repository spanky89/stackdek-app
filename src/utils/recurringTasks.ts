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

/**
 * Filter tasks to show only the next occurrence of recurring tasks
 * For tasks with the same parent_task_id, only the earliest incomplete instance is shown
 */
export function filterToNextOccurrence<T extends { 
  id: string
  parent_task_id?: string | null
  status: string
  due_date?: string | null
}>(tasks: T[]): T[] {
  // Group tasks by their recurring series
  const seriesMap = new Map<string, T[]>()
  const standaloneNonRecurring: T[] = []

  tasks.forEach(task => {
    // Determine the series ID (parent_task_id for instances, own id for parents)
    const seriesId = task.parent_task_id || task.id
    
    // If task is neither a recurring parent nor an instance, treat as standalone
    const isRecurringSeries = task.parent_task_id || tasks.some(t => t.parent_task_id === task.id)
    
    if (!isRecurringSeries) {
      standaloneNonRecurring.push(task)
      return
    }

    if (!seriesMap.has(seriesId)) {
      seriesMap.set(seriesId, [])
    }
    seriesMap.get(seriesId)!.push(task)
  })

  // For each series, find the next incomplete occurrence
  const nextOccurrences: T[] = []
  
  seriesMap.forEach((seriesTasks) => {
    // Filter to incomplete tasks
    const incompleteTasks = seriesTasks.filter(t => t.status !== 'completed')
    
    if (incompleteTasks.length === 0) {
      // If all are completed, show the most recent completed one (optional)
      // Or show none - for now we'll show none to keep the list clean
      return
    }

    // Sort by due_date ascending (earliest first)
    incompleteTasks.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })

    // Take the first (earliest) incomplete task
    nextOccurrences.push(incompleteTasks[0])
  })

  // Combine standalone non-recurring tasks with next occurrences
  return [...standaloneNonRecurring, ...nextOccurrences]
}
