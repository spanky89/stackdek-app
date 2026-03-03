import { useState, useEffect } from 'react'

interface TimeEntry {
  clockIn: string
  clockOut?: string
}

export default function ClockInOut() {
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null)
  const [todayHours, setTodayHours] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Mock: Check if currently clocked in
  useEffect(() => {
    const savedEntry = localStorage.getItem('currentTimeEntry')
    if (savedEntry) {
      const entry = JSON.parse(savedEntry)
      setCurrentEntry(entry)
      setIsClockedIn(true)
    }
  }, [])

  // Update elapsed time every second when clocked in
  useEffect(() => {
    if (!isClockedIn || !currentEntry) return

    const interval = setInterval(() => {
      const clockInTime = new Date(currentEntry.clockIn).getTime()
      const now = new Date().getTime()
      const elapsed = Math.floor((now - clockInTime) / 1000) // seconds
      setElapsedTime(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [isClockedIn, currentEntry])

  const handleClockIn = () => {
    const entry: TimeEntry = {
      clockIn: new Date().toISOString()
    }
    setCurrentEntry(entry)
    setIsClockedIn(true)
    localStorage.setItem('currentTimeEntry', JSON.stringify(entry))
  }

  const handleClockOut = () => {
    if (!currentEntry) return

    const entry = {
      ...currentEntry,
      clockOut: new Date().toISOString()
    }

    // Calculate hours worked
    const clockIn = new Date(currentEntry.clockIn).getTime()
    const clockOut = new Date(entry.clockOut!).getTime()
    const hoursWorked = (clockOut - clockIn) / (1000 * 60 * 60) // hours

    // Add to today's total
    setTodayHours(todayHours + hoursWorked)

    // Clear current entry
    setCurrentEntry(null)
    setIsClockedIn(false)
    setElapsedTime(0)
    localStorage.removeItem('currentTimeEntry')

    alert(`Clocked out! You worked ${hoursWorked.toFixed(2)} hours this session.`)
  }

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Time Clock</h2>

      {/* Clock Status */}
      <div className="mb-6">
        {isClockedIn && currentEntry ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">Currently Clocked In</span>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-green-800">Clocked in at:</span>
                <span className="text-sm font-medium text-green-900">{formatTime(currentEntry.clockIn)}</span>
              </div>
              <div className="text-center mt-4">
                <p className="text-xs text-green-700 mb-1">Time Elapsed</p>
                <p className="text-3xl font-bold text-green-900 font-mono">{formatElapsedTime(elapsedTime)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-neutral-300 rounded-full"></div>
            <span className="text-sm font-medium text-neutral-600">Currently Clocked Out</span>
          </div>
        )}
      </div>

      {/* Clock In/Out Button */}
      <button
        onClick={isClockedIn ? handleClockOut : handleClockIn}
        className={`w-full py-4 rounded-lg text-lg font-semibold transition-colors ${
          isClockedIn
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {isClockedIn ? '🕐 Clock Out' : '▶️ Clock In'}
      </button>

      {/* Today's Stats */}
      <div className="mt-6 pt-6 border-t border-neutral-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-neutral-500 mb-1">Today's Hours</p>
            <p className="text-xl font-bold text-neutral-900">{todayHours.toFixed(2)}h</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">This Week</p>
            <p className="text-xl font-bold text-neutral-900">32.5h</p>
          </div>
        </div>
      </div>
    </div>
  )
}
