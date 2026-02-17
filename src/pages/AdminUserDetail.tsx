import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import AppLayout from '../components/AppLayout';

interface CompanyInfo {
  name: string;
  email: string;
  phone: string;
  logo_url: string | null;
  tax_id: string;
  stripe_connected: boolean;
}

interface Stats {
  totalClients: number;
  totalJobs: number;
  totalQuotes: number;
  totalInvoices: number;
  revenueProcessed: number;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

interface Job {
  id: string;
  title: string;
  status: string;
  estimate_amount: number | null;
  created_at: string;
}

interface Quote {
  id: string;
  client_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  total_amount: number;
  status: string;
  paid_date: string | null;
}

type TabView = 'clients' | 'jobs' | 'quotes' | 'invoices';

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    totalJobs: 0,
    totalQuotes: 0,
    totalInvoices: 0,
    revenueProcessed: 0,
  });
  const [activeTab, setActiveTab] = useState<TabView>('clients');
  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCompanyDetails();
      loadStats();
      loadClients();
      loadJobs();
      loadQuotes();
      loadInvoices();
    }
  }, [id]);

  async function loadCompanyDetails() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('name, email, phone, logo_url, tax_id, stripe_publishable_key')
        .eq('id', id)
        .single();

      if (error) throw error;

      setCompany({
        name: data.name || 'Unknown',
        email: data.email || 'No email',
        phone: data.phone || 'No phone',
        logo_url: data.logo_url,
        tax_id: data.tax_id || 'N/A',
        stripe_connected: !!data.stripe_publishable_key,
      });
    } catch (err) {
      console.error('Error loading company details:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', id);

      const { count: jobsCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', id);

      const { count: quotesCount } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', id);

      const { count: invoicesCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', id);

      // Calculate revenue processed (sum of paid invoices)
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('company_id', id)
        .eq('status', 'paid');

      const revenueProcessed = paidInvoices?.reduce(
        (sum, invoice) => sum + (invoice.total_amount || 0),
        0
      ) || 0;

      setStats({
        totalClients: clientsCount || 0,
        totalJobs: jobsCount || 0,
        totalQuotes: quotesCount || 0,
        totalInvoices: invoicesCount || 0,
        revenueProcessed,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }

  async function loadClients() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, created_at')
        .eq('company_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  }

  async function loadJobs() {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, status, estimate_amount, created_at')
        .eq('company_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Error loading jobs:', err);
    }
  }

  async function loadQuotes() {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('id, client_name, total_amount, status, created_at')
        .eq('company_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (err) {
      console.error('Error loading quotes:', err);
    }
  }

  async function loadInvoices() {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, client_name, total_amount, status, paid_date')
        .eq('company_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error loading invoices:', err);
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatCurrency(amount: number | null) {
    if (amount === null) return '$0.00';
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-neutral-600">Loading user details…</p>
        </div>
      </AppLayout>
    );
  }

  if (!company) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-neutral-600">Company not found</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => nav('/admin')}
          className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Admin Dashboard
        </button>

        {/* Business Info Section */}
        <div className="bg-white rounded-xl p-6 border border-neutral-200">
          <div className="flex items-start gap-4">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt="Company logo"
                className="w-16 h-16 rounded-lg object-cover border border-neutral-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                <span className="text-2xl font-bold text-neutral-400">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-neutral-900">{company.name}</h1>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-neutral-600">
                  <span className="font-medium">Email:</span> {company.email}
                </p>
                <p className="text-sm text-neutral-600">
                  <span className="font-medium">Phone:</span> {company.phone}
                </p>
                <p className="text-sm text-neutral-600">
                  <span className="font-medium">Tax ID:</span> {company.tax_id}
                </p>
              </div>
              <div className="mt-3">
                <span
                  className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                    company.stripe_connected
                      ? 'bg-green-100 text-green-800'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {company.stripe_connected ? '✓ Stripe Connected' : 'Stripe Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="text-xs text-neutral-600 font-medium mb-1">Total Clients</div>
            <div className="text-2xl font-bold text-neutral-900">{stats.totalClients}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="text-xs text-neutral-600 font-medium mb-1">Total Jobs</div>
            <div className="text-2xl font-bold text-neutral-900">{stats.totalJobs}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="text-xs text-neutral-600 font-medium mb-1">Total Quotes</div>
            <div className="text-2xl font-bold text-neutral-900">{stats.totalQuotes}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="text-xs text-neutral-600 font-medium mb-1">Total Invoices</div>
            <div className="text-2xl font-bold text-neutral-900">{stats.totalInvoices}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="text-xs text-neutral-600 font-medium mb-1">Revenue Processed</div>
            <div className="text-2xl font-bold text-neutral-900">
              {formatCurrency(stats.revenueProcessed)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="flex border-b border-neutral-200">
            {(['clients', 'jobs', 'quotes', 'invoices'] as TabView[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                  activeTab === tab
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* Clients Tab */}
            {activeTab === 'clients' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase">
                        Phone
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase">
                        Created Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {clients.map((client) => (
                      <tr key={client.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 text-sm text-neutral-900">{client.name}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600">{client.phone || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {formatDate(client.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {clients.length === 0 && (
                  <p className="text-center text-sm text-neutral-600 py-8">No clients found</p>
                )}
              </div>
            )}

            {/* Jobs Tab */}
            {activeTab === 'jobs' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase">
                        Title
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase">
                        Created Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 text-sm text-neutral-900">{job.title}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600 capitalize">{job.status}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {formatCurrency(job.estimate_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {formatDate(job.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {jobs.length === 0 && (
                  <p className="text-center text-sm text-neutral-600 py-8">No jobs found</p>
                )}
              </div>
            )}

            {/* Quotes Tab */}
            {activeTab === 'quotes' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase">
                        Quote For
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase">
                        Created Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {quotes.map((quote) => (
                      <tr key={quote.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 text-sm text-neutral-900">{quote.client_name}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {formatCurrency(quote.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 capitalize">{quote.status}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {formatDate(quote.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {quotes.length === 0 && (
                  <p className="text-center text-sm text-neutral-600 py-8">No quotes found</p>
                )}
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase">
                        Invoice #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase">
                        Client
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-600 uppercase">
                        Paid Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 text-sm text-neutral-900">{invoice.invoice_number}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600">{invoice.client_name}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {formatCurrency(invoice.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 capitalize">{invoice.status}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {formatDate(invoice.paid_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {invoices.length === 0 && (
                  <p className="text-center text-sm text-neutral-600 py-8">No invoices found</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
