import { JobExpense, ExpenseCategory, categoryIcons, categoryLabels } from '../types/jobCosting'

interface ExpenseListProps {
  expenses: JobExpense[]
  onExpenseClick?: (expense: JobExpense) => void
}

export default function ExpenseList({ expenses, onExpenseClick }: ExpenseListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return `${Math.round(diffInHours)}h ago`
    }
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Group expenses by category
  const expensesByCategory: Record<ExpenseCategory, JobExpense[]> = {
    materials: [],
    equipment: [],
    subcontractors: [],
    permits: [],
    fuel: [],
    other: []
  }

  expenses.forEach(expense => {
    expensesByCategory[expense.category].push(expense)
  })

  // Calculate totals per category
  const categoryTotals: Record<ExpenseCategory, number> = {
    materials: 0,
    equipment: 0,
    subcontractors: 0,
    permits: 0,
    fuel: 0,
    other: 0
  }

  expenses.forEach(expense => {
    categoryTotals[expense.category] += expense.amount
  })

  const categories: ExpenseCategory[] = ['materials', 'equipment', 'subcontractors', 'permits', 'fuel', 'other']
  const categoriesWithExpenses = categories.filter(cat => expensesByCategory[cat].length > 0)

  if (expenses.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
        <div className="text-4xl mb-3">💸</div>
        <p className="text-neutral-600 font-medium mb-1">No expenses yet</p>
        <p className="text-sm text-neutral-500">Add your first expense to start tracking costs</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {categoriesWithExpenses.map(category => (
        <div key={category} className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          {/* Category Header */}
          <div className="bg-neutral-50 border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{categoryIcons[category]}</span>
              <span className="font-semibold text-neutral-900">{categoryLabels[category]}</span>
              <span className="text-sm text-neutral-500">({expensesByCategory[category].length})</span>
            </div>
            <span className="font-bold text-neutral-900">{formatCurrency(categoryTotals[category])}</span>
          </div>

          {/* Expense Items */}
          <div className="divide-y divide-neutral-100">
            {expensesByCategory[category].map(expense => (
              <div
                key={expense.id}
                onClick={() => onExpenseClick?.(expense)}
                className={`p-4 hover:bg-neutral-50 transition-colors ${onExpenseClick ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-neutral-900">{expense.description || 'Expense'}</p>
                      {expense.receiptUrl && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          📎 Receipt
                        </span>
                      )}
                      {expense.isBillable && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          💵 Billable
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span>{expense.addedByName}</span>
                      <span>•</span>
                      <span>{formatDate(expense.createdAt)}</span>
                    </div>
                    {expense.notes && (
                      <p className="text-sm text-neutral-600 mt-1">{expense.notes}</p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <p className="font-bold text-neutral-900 text-right">{formatCurrency(expense.amount)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Total */}
      <div className="bg-neutral-900 text-white rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Total Expenses</span>
          <span className="text-2xl font-bold">
            {formatCurrency(expenses.reduce((sum, exp) => sum + exp.amount, 0))}
          </span>
        </div>
      </div>
    </div>
  )
}
