import { useState, useMemo } from 'react'

type SortDir = 'asc' | 'desc'

export function useListFilter<T>(
  items: T[],
  opts: {
    searchKeys: (keyof T | ((item: T) => string))[]
    filterKey?: keyof T | ((item: T) => string)
    sortOptions?: { label: string; fn: (a: T, b: T) => number }[]
  }
) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortIdx, setSortIdx] = useState(0)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const filtered = useMemo(() => {
    let result = [...items]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(item =>
        opts.searchKeys.some(k => {
          const val = typeof k === 'function' ? k(item) : String(item[k] ?? '')
          return val.toLowerCase().includes(q)
        })
      )
    }

    // Filter
    if (filter !== 'all' && opts.filterKey) {
      result = result.filter(item => {
        const val = typeof opts.filterKey === 'function'
          ? opts.filterKey(item)
          : String(item[opts.filterKey!] ?? '')
        return val.toLowerCase() === filter.toLowerCase()
      })
    }

    // Sort
    if (opts.sortOptions?.[sortIdx]) {
      const fn = opts.sortOptions[sortIdx].fn
      result.sort((a, b) => sortDir === 'asc' ? fn(a, b) : fn(b, a))
    }

    return result
  }, [items, search, filter, sortIdx, sortDir, opts.searchKeys, opts.filterKey, opts.sortOptions])

  return {
    search, setSearch,
    filter, setFilter,
    sortIdx, setSortIdx,
    sortDir, setSortDir,
    filtered,
    total: items.length,
    count: filtered.length,
  }
}
