import AppLayout from '../components/AppLayout'
import JobCostingTab from '../components/JobCostingTab'

export default function JobCostingDemo() {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => window.history.back()}
              className="text-neutral-600 hover:text-neutral-900"
            >
              ← Back
            </button>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            Job Costing Demo
          </h1>
          <p className="text-neutral-600">
            Testing the job costing feature with mock data
          </p>
        </div>

        {/* Mock Job Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">Mock Job: Install Deck</p>
              <p className="text-sm text-blue-800">Client: Bob Johnson</p>
              <p className="text-sm text-blue-800">Status: In Progress</p>
              <p className="text-xs text-blue-700 mt-2">
                This page demonstrates the job costing feature with sample data.
                All expenses and calculations are mock data for testing purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Job Costing Content */}
        <JobCostingTab />

        {/* Implementation Notes */}
        <div className="mt-8 bg-neutral-50 border border-neutral-200 rounded-lg p-6">
          <h3 className="font-semibold text-neutral-900 mb-3">Implementation Notes</h3>
          <div className="space-y-2 text-sm text-neutral-700">
            <p>✅ <strong>Profit Overview:</strong> 3 big cards (Revenue, Costs, Profit) with color-coded indicators</p>
            <p>✅ <strong>Add Expense:</strong> Mobile-first modal with camera support and OCR simulation</p>
            <p>✅ <strong>Expense List:</strong> Grouped by category with receipt indicators</p>
            <p>✅ <strong>Labor Integration:</strong> Shows time tracking data linked to job</p>
            <p>✅ <strong>Collapsible Details:</strong> Simple overview by default, expand for full breakdown</p>
            <p>⏳ <strong>Database Integration:</strong> Pending (currently using mock data)</p>
            <p>⏳ <strong>Receipt Storage:</strong> Pending Supabase Storage setup</p>
            <p>⏳ <strong>Real OCR:</strong> Pending Tesseract.js integration</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
