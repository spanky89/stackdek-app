import { useState } from 'react'
import ProfitOverview from './ProfitOverview'
import ExpenseList from './ExpenseList'
import AddExpenseModal from './AddExpenseModal'
import { mockJobExpenses, mockJobCostingSummary, JobExpense, ExpenseCategory } from '../types/jobCosting'

export default function JobCostingTab() {
  const [expenses, setExpenses] = useState<JobExpense[]>(mockJobExpenses)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const handleAddExpense = (newExpense: {
    category: ExpenseCategory
    description: string
    amount: number
    receiptFile?: File
  }) => {
    const expense: JobExpense = {
      id: `expense-${Date.now()}`,
      jobId: 'job-1',
      companyId: 'company-1',
      category: newExpense.category,
      description: newExpense.description,
      amount: newExpense.amount,
      receiptUrl: newExpense.receiptFile ? URL.createObjectURL(newExpense.receiptFile) : undefined,
      addedBy: 'current-user',
      addedByName: 'You',
      isBillable: false,
      createdAt: new Date().toISOString()
    }

    setExpenses([expense, ...expenses])
    setShowAddModal(false)
    
    // Show success message
    alert(`Expense added: ${newExpense.description} - $${newExpense.amount}`)
  }

  return (
    <div className="space-y-6">
      {/* Pro Feature Badge */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <div>
            <p className="text-sm font-semibold text-purple-900">Pro Feature</p>
            <p className="text-xs text-purple-800">
              Track expenses, labor costs, and real-time profitability for every job.
            </p>
          </div>
        </div>
      </div>

      {/* Profit Overview (Always Visible) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-neutral-900">Job Profitability</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            Add Expense
          </button>
        </div>
        <ProfitOverview summary={mockJobCostingSummary} />
      </div>

      {/* Detailed Breakdown (Collapsible) */}
      <div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full bg-white border border-neutral-200 rounded-lg p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
        >
          <span className="font-semibold text-neutral-900">
            {showDetails ? '▼' : '▶'} Show Detailed Breakdown
          </span>
          <span className="text-sm text-neutral-600">
            {expenses.length} expenses • ${expenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString()}
          </span>
        </button>

        {showDetails && (
          <div className="mt-4">
            {/* Revenue Breakdown */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-4">
              <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <span className="text-xl">💰</span>
                Revenue Breakdown
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Original Quote</span>
                  <span className="font-medium text-neutral-900">
                    ${mockJobCostingSummary.revenue.originalQuote.toLocaleString()}
                  </span>
                </div>
                {mockJobCostingSummary.revenue.changeOrders > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Change Orders</span>
                    <span className="font-medium text-green-600">
                      +${mockJobCostingSummary.revenue.changeOrders.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="border-t border-neutral-200 pt-2 flex justify-between">
                  <span className="font-semibold text-neutral-900">Total Billed</span>
                  <span className="font-bold text-neutral-900">
                    ${mockJobCostingSummary.revenue.totalBilled.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Collected</span>
                  <span className="font-medium text-green-600">
                    ${mockJobCostingSummary.revenue.collected.toLocaleString()} ✓
                  </span>
                </div>
              </div>
            </div>

            {/* Expenses */}
            <div className="mb-4">
              <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <span className="text-xl">💸</span>
                Expenses
              </h3>
              <ExpenseList expenses={expenses} />
            </div>

            {/* Labor Costs */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <span className="text-xl">👷</span>
                Labor Costs
              </h3>
              <div className="space-y-3">
                <div className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-neutral-900">John Smith (Lead)</p>
                      <p className="text-sm text-neutral-600">$35/hour</p>
                    </div>
                    <p className="font-bold text-neutral-900">$840</p>
                  </div>
                  <p className="text-xs text-neutral-500">24 hours • Mar 1-3</p>
                </div>

                <div className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-neutral-900">Mike Davis (Helper)</p>
                      <p className="text-sm text-neutral-600">$25/hour</p>
                    </div>
                    <p className="font-bold text-neutral-900">$400</p>
                  </div>
                  <p className="text-xs text-neutral-500">16 hours • Mar 2-3</p>
                </div>

                <div className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-neutral-900">Sarah Johnson (Painter)</p>
                      <p className="text-sm text-neutral-600">$30/hour</p>
                    </div>
                    <p className="font-bold text-neutral-900">$360</p>
                  </div>
                  <p className="text-xs text-neutral-500">12 hours • Mar 4-5</p>
                </div>

                <div className="border-t border-neutral-300 pt-3 flex justify-between">
                  <span className="font-semibold text-neutral-900">Total Labor (52 hours)</span>
                  <span className="font-bold text-neutral-900">$1,680</span>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-600">⚠️</span>
                    <div className="text-sm">
                      <p className="font-medium text-yellow-900">Labor variance</p>
                      <p className="text-yellow-800">
                        Estimated 30 hours, actual 52 hours (+22h over)
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Consider adjusting future deck estimates to 50-55 hours
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddExpense}
      />
    </div>
  )
}
