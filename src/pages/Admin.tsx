import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import { useCompany } from '../context/CompanyContext';
import AppLayout from '../components/AppLayout';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface MetricsData {
  totalUsers: number;
  totalUsersGrowth: number;
  activeUsers: number;
  mrr: number;
  totalJobs: number;
  totalJobsGrowth: number;
}

interface ChartDataPoint {
  date: string;
  count: number;
}

interface UserRow {
  id: string;
  business_name: string;
  email: string;
  signup_date: string;
  last_login: string | null;
  jobs_count: number;
  stripe_connected: boolean;
}

type ChartView = 'users' | 'jobs' | 'quotes';

export default function AdminPage() {
  const nav = useNavigate();
  const { companyId } = useCompany();

  const [metrics, setMetrics] = useState<MetricsData>({
    totalUsers: 0,
    totalUsersGrowth: 0,
    activeUsers: 0,
    mrr: 0,
    totalJobs: 0,
    totalJobsGrowth: 0,
  });

  const [chartView, setChartView] = useState<ChartView>('users');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAscending, setSortAscending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    loadChartData('users');
    loadUsers();
  }, []);

  useEffect(() => {
    loadChartData(chartView);
  }, [chartView]);

  async function loadMetrics() {
    try {
      // Total Users
      const { count: totalUsers } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      // Total Users 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: totalUsers30DaysAgo } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .lte('created_at', thirtyDaysAgo.toISOString());

      const totalUsersGrowth = totalUsers30DaysAgo
        ? ((totalUsers! - totalUsers30DaysAgo) / totalUsers30DaysAgo) * 100
        : 0;

      // Active Users (logged in last 30 days)
      // Note: This is a placeholder since we can't directly query auth.users from client
      // In production, this should use a server-side function or admin API
      const activeUsersCount = 0; // Placeholder for now

      // Total Jobs this month
      const firstDayThisMonth = new Date();
      firstDayThisMonth.setDate(1);
      firstDayThisMonth.setHours(0, 0, 0, 0);

      const { count: totalJobsThisMonth } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayThisMonth.toISOString());

      // Total Jobs last month
      const firstDayLastMonth = new Date();
      firstDayLastMonth.setMonth(firstDayLastMonth.getMonth() - 1);
      firstDayLastMonth.setDate(1);
      firstDayLastMonth.setHours(0, 0, 0, 0);

      const lastDayLastMonth = new Date(firstDayThisMonth);
      lastDayLastMonth.setDate(0);
      lastDayLastMonth.setHours(23, 59, 59, 999);

      const { count: totalJobsLastMonth } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayLastMonth.toISOString())
        .lte('created_at', lastDayLastMonth.toISOString());

      const totalJobsGrowth = totalJobsLastMonth
        ? ((totalJobsThisMonth! - totalJobsLastMonth) / totalJobsLastMonth) * 100
        : 0;

      setMetrics({
        totalUsers: totalUsers || 0,
        totalUsersGrowth,
        activeUsers: activeUsersCount,
        mrr: 0, // Placeholder
        totalJobs: totalJobsThisMonth || 0,
        totalJobsGrowth,
      });
    } catch (err) {
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadChartData(view: ChartView) {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      let tableName = '';
      if (view === 'users') tableName = 'companies';
      else if (view === 'jobs') tableName = 'jobs';
      else if (view === 'quotes') tableName = 'quotes';

      const { data, error } = await supabase
        .from(tableName)
        .select('created_at')
        .gte('created_at', ninetyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by week
      const weeklyData: { [key: string]: number } = {};
      data?.forEach((item) => {
        const date = new Date(item.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
      });

      const chartDataPoints: ChartDataPoint[] = Object.entries(weeklyData)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setChartData(chartDataPoints);
    } catch (err) {
      console.error('Error loading chart data:', err);
    }
  }

  async function loadUsers() {
    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, owner_id, name, email, created_at, stripe_publishable_key');

      if (error) throw error;

      const userRows: UserRow[] = [];
      for (const company of companies || []) {
        // Get jobs count
        const { count: jobsCount } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id);

        userRows.push({
          id: company.id,
          business_name: company.name || 'Unknown',
          email: company.email || 'No email',
          signup_date: company.created_at,
          last_login: null, // Placeholder - requires server-side auth lookup
          jobs_count: jobsCount || 0,
          stripe_connected: !!company.stripe_publishable_key,
        });
      }

      setUsers(userRows);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const dateA = new Date(a.signup_date).getTime();
    const dateB = new Date(b.signup_date).getTime();
    return sortAscending ? dateA - dateB : dateB - dateA;
  });

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatGrowth(value: number) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-neutral-600">Loading admin dashboard…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
          <p className="text-sm text-neutral-600 mt-1">
            System-wide metrics and user management
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="text-xs text-neutral-600 font-medium mb-1">Total Users</div>
            <div className="text-2xl font-bold text-neutral-900">{metrics.totalUsers}</div>
            <div
              className={`text-xs font-medium mt-1 ${
                metrics.totalUsersGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatGrowth(metrics.totalUsersGrowth)} vs 30d ago
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="text-xs text-neutral-600 font-medium mb-1">Active Users</div>
            <div className="text-2xl font-bold text-neutral-900">{metrics.activeUsers}</div>
            <div className="text-xs text-neutral-600 mt-1">Last 30 days</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="text-xs text-neutral-600 font-medium mb-1">MRR</div>
            <div className="text-2xl font-bold text-neutral-900">${metrics.mrr}</div>
            <div className="text-xs text-neutral-600 mt-1">Placeholder</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="text-xs text-neutral-600 font-medium mb-1">Total Jobs</div>
            <div className="text-2xl font-bold text-neutral-900">{metrics.totalJobs}</div>
            <div
              className={`text-xs font-medium mt-1 ${
                metrics.totalJobsGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatGrowth(metrics.totalJobsGrowth)} vs last month
            </div>
          </div>
        </div>

        {/* Growth Chart */}
        <div className="bg-white rounded-xl p-6 border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-neutral-900">Growth Over Time</h2>
            <div className="flex gap-2">
              {(['users', 'jobs', 'quotes'] as ChartView[]).map((view) => (
                <button
                  key={view}
                  onClick={() => setChartView(view)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                    chartView === view
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis
                dataKey="date"
                stroke="#737373"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis stroke="#737373" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [value, 'Count']}
                labelFormatter={(label) => formatDate(label)}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#171717"
                strokeWidth={2}
                dot={{ fill: '#171717', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* User Management Table */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h2 className="text-lg font-bold text-neutral-900 mb-3">User Management</h2>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Business Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider cursor-pointer hover:text-neutral-900"
                    onClick={() => setSortAscending(!sortAscending)}
                  >
                    Signup Date {sortAscending ? '↑' : '↓'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Jobs
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Stripe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {sortedUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => nav(`/admin/user/${user.id}`)}
                    className="hover:bg-neutral-50 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 text-sm text-neutral-900 font-medium">
                      {user.business_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {formatDate(user.signup_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {formatDate(user.last_login)}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{user.jobs_count}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          user.stripe_connected
                            ? 'bg-green-100 text-green-800'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {user.stripe_connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
