export const DEFAULT_TIME_ZONE = 'America/New_York'

export const TIME_ZONE_OPTIONS = [
  ['America/New_York', 'Eastern Time'],
  ['America/Chicago', 'Central Time'],
  ['America/Denver', 'Mountain Time'],
  ['America/Phoenix', 'Arizona Time'],
  ['America/Los_Angeles', 'Pacific Time'],
  ['America/Anchorage', 'Alaska Time'],
  ['Pacific/Honolulu', 'Hawaii Time'],
] as const

export const TIME_ZONE_LABELS = Object.fromEntries(TIME_ZONE_OPTIONS)

export function clockInstant(value: string) {
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`)
}

export function formatCompanyDate(value: string, timeZone: string) {
  return clockInstant(value).toLocaleDateString('en-US', { timeZone })
}

export function formatCompanyTime(value: string, timeZone: string) {
  return clockInstant(value).toLocaleTimeString('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })
}

export function companyDateKey(value: string | Date, timeZone: string) {
  const date = typeof value === 'string' ? clockInstant(value) : value
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function payPeriodDateKeys(anchor: string, frequency: 'weekly' | 'biweekly', timeZone: string) {
  const today = companyDateKey(new Date(), timeZone)
  const anchorDate = new Date(`${anchor}T00:00:00Z`)
  const todayDate = new Date(`${today}T00:00:00Z`)
  const days = frequency === 'biweekly' ? 14 : 7
  const elapsed = Math.floor((todayDate.getTime() - anchorDate.getTime()) / 86400000)
  const start = new Date(anchorDate)
  start.setUTCDate(start.getUTCDate() + Math.floor(elapsed / days) * days)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + days - 1)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export function formatDateKey(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric',
  })
}

export function companyDateTimeInput(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(clockInstant(value))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

export function companyInputToUtc(value: string, timeZone: string) {
  const desired = Date.parse(`${value}:00Z`)
  let guess = desired
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const rendered = companyDateTimeInput(new Date(guess).toISOString(), timeZone)
    guess += desired - Date.parse(`${rendered}:00Z`)
  }
  return new Date(guess).toISOString()
}
