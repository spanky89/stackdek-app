import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'

type CostingSummary = {
  job_id: string
  quoted_revenue: number
  labor_cost: number
  approved_expenses: number
  total_cost: number
  projected_profit: number
  projected_margin: number | null
}

type ReviewableExpense = {
  id: string
  amount: number
  category: string
  description: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  receipt_url: string | null
  rejection_reason: string | null
  added_by: string
  added_by_name: string
}

export default function RealJobCosting({ jobId }: { jobId: string }) {
  const [summary, setSummary] = useState<CostingSummary | null>(null)
  const [expenses, setExpenses] = useState<ReviewableExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCosting()
  }, [jobId])

  async function loadCosting() {
    setLoading(true)
    setError('')
    try {
      const [
        { data: costingRows, error: costingError },
        { data: expenseRows, error: expenseError },
      ] = await Promise.all([
        supabase.rpc('get_job_costing', { p_job_id: jobId }),
        supabase.rpc('list_my_job_expenses', { p_job_id: jobId }),
      ])
      if (costingError) throw costingError
      if (expenseError) throw expenseError

      const costing = Array.isArray(costingRows) ? costingRows[0] : costingRows
      setSummary(costing as CostingSummary)
      setExpenses((expenseRows as ReviewableExpense[]) || [])
    } catch (err: any) {
      setError(err.message || 'Unable to load job costing')
    } finally {
      setLoading(false)
    }
  }

  async function reviewExpense(expense: ReviewableExpense, status: 'approved' | 'rejected') {
    const rejectionReason = status === 'rejected'
      ? window.prompt('Why is this expense being rejected?')?.trim()
      : null
    if (status === 'rejected' && !rejectionReason) return

    setReviewingId(expense.id)
    setError('')
    try {
      const { error: reviewError } = await supabase
        .rpc('review_job_expense', {
          p_expense_id: expense.id,
          p_status: status,
          p_rejection_reason: rejectionReason,
        })
      if (reviewError) throw reviewError
      await loadCosting()
    } catch (err: any) {
      setError(err.message || 'Unable to review expense')
    } finally {
      setReviewingId(null)
    }
  }

  async function openReceipt(path: string) {
    setError('')
    const { data, error: receiptError } = await supabase.storage
      .from('job-receipts')
      .createSignedUrl(path, 60)
    if (receiptError || !data?.signedUrl) {
      setError(receiptError?.message || 'Unable to open receipt')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const money = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  if (loading) {
    return <p className="text-sm text-neutral-500 py-8 text-center">Loading job costs…</p>
  }

  if (!summary) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        {error || 'Job costing is unavailable.'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <p className="text-xs text-neutral-500 mb-1">Quoted Revenue</p>
          <p className="text-2xl font-bold text-neutral-900">{money(summary.quoted_revenue)}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <p className="text-xs text-neutral-500 mb-1">Total Cost</p>
          <p className="text-2xl font-bold text-neutral-900">{money(summary.total_cost)}</p>
          <p className="text-xs text-neutral-500 mt-1">
            {money(summary.labor_cost)} labor + {money(summary.approved_expenses)} expenses
          </p>
        </div>
        <div className={`border rounded-xl p-4 ${
          summary.projected_profit >= 0
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <p className="text-xs text-neutral-600 mb-1">Projected Profit</p>
          <p className="text-2xl font-bold text-neutral-900">{money(summary.projected_profit)}</p>
          <p className="text-xs text-neutral-600 mt-1">
            {summary.projected_margin == null ? 'No revenue set' : `${summary.projected_margin}% margin`}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-neutral-900 mb-3">Expenses</h2>
        {expenses.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center text-sm text-neutral-500">
            No expenses submitted for this job.
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map(expense => (
              <div key={expense.id} className="bg-white border border-neutral-200 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-neutral-900">{money(expense.amount)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        expense.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : expense.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {expense.status}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600 capitalize">
                      {expense.category} · {expense.added_by_name}
                    </p>
                    {expense.description && (
                      <p className="text-xs text-neutral-500 mt-1">{expense.description}</p>
                    )}
                    {expense.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1">{expense.rejection_reason}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {expense.receipt_url && (
                      <button
                        onClick={() => openReceipt(expense.receipt_url!)}
                        className="px-3 py-2 border border-neutral-200 rounded-lg text-xs font-medium"
                      >
                        Receipt
                      </button>
                    )}
                    {expense.status === 'pending' && (
                      <>
                        <button
                          onClick={() => reviewExpense(expense, 'rejected')}
                          disabled={reviewingId === expense.id}
                          className="px-3 py-2 border border-red-200 text-red-700 rounded-lg text-xs font-medium disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => reviewExpense(expense, 'approved')}
                          disabled={reviewingId === expense.id}
                          className="px-3 py-2 bg-neutral-900 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                        >
                          Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
