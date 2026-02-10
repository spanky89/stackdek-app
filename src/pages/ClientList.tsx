import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
import CreateClientForm from '../components/CreateClientForm'
import ListToolbar from '../components/ListToolbar'
import { useListFilter } from '../hooks/useListFilter'
import AppLayout from '../components/AppLayout'

type Client = {
  id: string
  name: string
  email: string | null
  phone: string | null
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
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const list = useListFilter(clients, {
    searchKeys: ['name', 'email', 'phone'],
    filterKey: (c) => String(c.vip),
    sortOptions: SORT_OPTIONS,
  })

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: company } = await supabase
          .from('companies').select('id').eq('owner_id', user.id).single()
        if (!company) return
        const { data, error: fetchErr } = await supabase
          .from('clients').select('id, name, email, phone, vip, created_at')
          .eq('company_id', company.id).order('name')
        if (fetchErr) { setError(fetchErr.message); return }
        setClients(data || [])
      } catch (e: any) { setError(e?.message ?? 'Unknown error') }
      finally { setLoading(false) }
    })()
  }, [refreshKey])

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
                  <th className="text-left px-4 py-3 font-medium text-neutral-600 hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600 hidden sm:table-cell">Phone</th>
                  <th className="text-center px-4 py-3 font-medium text-neutral-600">VIP</th>
                </tr>
              </thead>
              <tbody>
                {list.filtered.map(c => (
                  <tr key={c.id} onClick={() => nav(`/client/${c.id}`)} className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-neutral-600 hidden sm:table-cell">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-neutral-600 hidden sm:table-cell">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-center">{c.vip ? <span className="bg-neutral-100 text-neutral-800 text-xs px-2 py-0.5 rounded-full font-medium">VIP</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">New Client</h2>
                <button onClick={() => setShowCreate(false)} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">&times;</button>
              </div>
              <CreateClientForm onSuccess={() => { setShowCreate(false); setLoading(true); setRefreshKey(k => k + 1) }} />
            </div>
          </div>
        )}
      </>
    </AppLayout>
  )
}
