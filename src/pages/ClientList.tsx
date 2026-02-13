import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
import CreateClientForm from '../components/CreateClientForm'
import ListToolbar from '../components/ListToolbar'
import { useListFilter } from '../hooks/useListFilter'
import AppLayout from '../components/AppLayout'
import { useCompany } from '../context/CompanyContext'

type Client = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  vip: boolean
  created_at?: string
}

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'VIP', value: 'true' },
  { label: 'Non-VIP', value: 'false' },
]

const SORT_OPTIONS = [
  { label: 'Name A-Z', fn: (a: Client, b: Client) => a.name.localeCompare(b.name) },
  { label: 'Name Z-A', fn: (a: Client, b: Client) => b.name.localeCompare(a.name) },
  { label: 'Newest', fn: (a: Client, b: Client) => (b.created_at ?? '').localeCompare(a.created_at ?? '') },
]

export default function ClientListPage() {
  const nav = useNavigate()
  const { companyId } = useCompany()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const list = useListFilter(clients, {
    searchKeys: ['name', 'email', 'phone', 'address'],
    filterKey: (c) => String(c.vip),
    sortOptions: SORT_OPTIONS,
  })

  useEffect(() => {
    if (!companyId) { setLoading(false); return }

    ;(async () => {
      try {
        console.log('Fetching clients for company:', companyId)
        const { data, error: fetchErr } = await supabase
          .from('clients').select('id, name, email, phone, address, vip, created_at')
          .eq('company_id', companyId).order('name')
        
        console.log('Clients response:', { data, fetchErr })
        
        if (fetchErr) { 
          console.error('Fetch error:', fetchErr)
          setError(fetchErr.message)
          return 
        }
        setClients(data || [])
        setError(null)
      } catch (e: any) { 
        console.error('Exception:', e)
        setError(e?.message ?? 'Unknown error') 
      }
      finally { setLoading(false) }
    })()
  }, [refreshKey, companyId])

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <AppLayout>
      <>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Clients</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(true)} className="text-sm px-3 py-1.5 bg-neutral-900 text-white rounded-lg font-medium">+ New Client</button>
            <button onClick={() => nav('/home')} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Home</button>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <ListToolbar
          search={list.search} onSearch={list.setSearch}
          placeholder="Search clients…"
          filters={FILTERS} activeFilter={list.filter} onFilter={list.setFilter}
          count={list.count} total={list.total}
          sortOptions={SORT_OPTIONS.map(s => ({ label: s.label }))}
          sortIdx={list.sortIdx} onSort={list.setSortIdx}
        />

        {list.filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center text-neutral-600">
            {clients.length === 0 ? 'No clients yet.' : 'No matching clients.'}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600 hidden sm:table-cell">Phone</th>
                </tr>
              </thead>
              <tbody>
                {list.filtered.map(c => (
                  <tr key={c.id} onClick={() => nav(`/client/${c.id}`)} className={`border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer ${c.vip ? 'border-l-4 border-l-amber-500' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.name}</div>
                      {c.address && <div className="text-xs text-neutral-500 mt-0.5">{c.address}</div>}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 hidden sm:table-cell">{c.phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[95vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">New Client</h2>
                <button onClick={() => setShowCreate(false)} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">&times;</button>
              </div>
              <CreateClientForm onSuccess={() => { 
                console.log('Client created, refreshing list')
                setShowCreate(false)
                setRefreshKey(k => k + 1)
              }} />
            </div>
          </div>
        )}
      </>
    </AppLayout>
  )
}
