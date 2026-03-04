import { JobCostingSummary } from '../types/jobCosting'

interface ProfitOverviewProps {
  summary: JobCostingSummary
}

export default function ProfitOverview({ summary }: ProfitOverviewProps) {
  const { revenue, costs, profit } = summary

  const getProfitColor = (margin: number) => {
    if (margin >= 30) return 'text-green-600'
    if (margin >= 15) return 'text-yellow-600'
    if (margin >= 0) return 'text-orange-600'
    return 'text-red-600'
  }

  const getProfitEmoji = (margin: number) => {
    if (margin >= 30) return '🟢'
    if (margin >= 15) return '🟡'
    if (margin >= 0) return '🟠'
    return '🔴'
  }

  const getProfitLabel = (margin: number) => {
    if (margin >= 30) return 'Healthy profit'
    if (margin >= 15) return 'Acceptable profit'
    if (margin >= 0) return 'Low profit'
    return 'Loss'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-4">
      {/* Three Big Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue Card */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-neutral-600">Revenue</h3>
            <span className="text-2xl">💵</span>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-neutral-900">
              {formatCurrency(revenue.totalBilled)}
            </p>
            <div className="text-xs text-neutral-500 space-y-0.5">
              <div>Quote: {formatCurrency(revenue.originalQuote)}</div>
              {revenue.changeOrders > 0 && (
                <div>Change orders: +{formatCurrency(revenue.changeOrders)}</div>
              )}
            </div>
            {revenue.collected >= revenue.totalBilled ? (
              <p className="text-sm text-green-600 font-medium mt-2">✓ Fully collected</p>
            ) : (
              <p className="text-sm text-yellow-600 font-medium mt-2">
                Collected: {formatCurrency(revenue.collected)} ({Math.round((revenue.collected / revenue.totalBilled) * 100)}%)
              </p>
            )}
          </div>
        </div>

        {/* Costs Card */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-neutral-600">Total Costs</h3>
            <span className="text-2xl">💸</span>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-neutral-900">
              {formatCurrency(costs.total)}
            </p>
            <p className="text-xs text-neutral-500">
              {Math.round((costs.total / revenue.totalBilled) * 100)}% of revenue
            </p>
            <div className="text-xs text-neutral-500 space-y-0.5 mt-2">
              {costs.materials > 0 && <div>Materials: {formatCurrency(costs.materials)}</div>}
              {costs.labor > 0 && <div>Labor: {formatCurrency(costs.labor)}</div>}
              {costs.equipment > 0 && <div>Equipment: {formatCurrency(costs.equipment)}</div>}
              {costs.subcontractors > 0 && <div>Subcontractors: {formatCurrency(costs.subcontractors)}</div>}
            </div>
          </div>
        </div>

        {/* Profit Card */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-neutral-600">Profit</h3>
            <span className="text-2xl">{getProfitEmoji(profit.margin)}</span>
          </div>
          <div className="space-y-1">
            <p className={`text-3xl font-bold ${getProfitColor(profit.margin)}`}>
              {formatCurrency(profit.amount)}
            </p>
            <p className={`text-sm font-medium ${getProfitColor(profit.margin)}`}>
              {profit.margin.toFixed(1)}% margin
            </p>
            <p className="text-xs text-neutral-500 mt-2">
              {getProfitLabel(profit.margin)}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Profit Margin</span>
            <span className={`font-medium ${getProfitColor(profit.margin)}`}>
              {profit.margin.toFixed(1)}% {getProfitEmoji(profit.margin)}
            </span>
          </div>
          <div className="bg-neutral-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all ${
                profit.margin >= 30
                  ? 'bg-green-600'
                  : profit.margin >= 15
                  ? 'bg-yellow-500'
                  : profit.margin >= 0
                  ? 'bg-orange-500'
                  : 'bg-red-600'
              }`}
              style={{ width: `${Math.min(profit.margin, 100)}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500">
            {getProfitLabel(profit.margin)} • Target: 30%+
          </p>
        </div>
      </div>
    </div>
  )
}
