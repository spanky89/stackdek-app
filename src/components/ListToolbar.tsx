type Props = {
  search: string
  onSearch: (v: string) => void
  placeholder?: string
  filters?: { label: string; value: string }[]
  activeFilter: string
  onFilter: (v: string) => void
  count: number
  total: number
  sortOptions?: { label: string }[]
  sortIdx?: number
  onSort?: (idx: number) => void
}

export default function ListToolbar({
  search, onSearch, placeholder = 'Search…',
  filters, activeFilter, onFilter,
  count, total,
  sortOptions, sortIdx = 0, onSort,
}: Props) {
  return (
    <div className="mb-4 space-y-3">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 pr-10 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
        />
        {search && (
          <button
            onClick={() => onSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Filters + Sort + Count */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 overflow-x-auto">
          {filters?.map(f => (
            <button
              key={f.value}
              onClick={() => onFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === f.value
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {sortOptions && onSort && (
            <select
              value={sortIdx}
              onChange={e => onSort(Number(e.target.value))}
              className="text-xs bg-white border border-neutral-200 rounded-lg px-2 py-1 text-neutral-600"
            >
              {sortOptions.map((s, i) => (
                <option key={i} value={i}>{s.label}</option>
              ))}
            </select>
          )}
          <span className="text-xs text-neutral-600 whitespace-nowrap">
            {count === total ? `${total} results` : `${count} of ${total} results`}
          </span>
        </div>
      </div>
    </div>
  )
}
