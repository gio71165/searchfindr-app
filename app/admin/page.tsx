'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { Navigation } from '@/components/Navigation';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Users,
  Activity,
  FileText,
  TrendingUp,
  Briefcase,
  AlertTriangle,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface OverviewStats {
  totalUsers: number;
  newUsersThisWeek: number;
  activeUsers7d: number;
  activeUsersPercent: number;
  totalCims: number;
  cimsThisWeek: number;
  totalFinancials: number;
  financialsThisWeek: number;
  totalDeals: number;
  activeDeals: number;
  churnRiskPercent: number;
  inactiveUsers7d: number;
}

interface TrendDataPoint {
  date: string;
  cims: number;
  financials: number;
  deals: number;
}

interface FeatureAdoption {
  name: string;
  adoption: number;
  users: number;
}

interface UserDetail {
  id: string;
  email: string;
  signedUp: string;
  lastActive: string | null;
  daysSinceActive: number | null;
  isInactive: boolean;
  cimsAnalyzed: number;
  financialsAnalyzed: number;
  deals: number;
  stageBreakdown: Record<string, number>;
  plan: string;
}

interface ActivityEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  icon: string;
}

type SortField = 'email' | 'signedUp' | 'lastActive' | 'cimsAnalyzed' | 'financialsAnalyzed' | 'deals';
type SortDirection = 'asc' | 'desc';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [featureAdoption, setFeatureAdoption] = useState<FeatureAdoption[]>([]);
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('signedUp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        // Use getSession() for better performance - faster than getUser()
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user) {
          router.replace('/');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (!profile?.is_admin) {
          setError('Access denied. Admin privileges required.');
          return;
        }

        await loadData();
      } catch (err) {
        console.error('Admin check error:', err);
        setError('Failed to verify admin access');
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [router]);

  const loadData = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        throw new Error('No auth token');
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Load all data in parallel
      const [overviewRes, trendRes, adoptionRes, usersRes, feedRes] = await Promise.all([
        fetch('/api/admin/analytics/overview', { headers }),
        fetch('/api/admin/analytics/activity-trend', { headers }),
        fetch('/api/admin/analytics/feature-adoption', { headers }),
        fetch('/api/admin/analytics/users-detailed', { headers }),
        fetch('/api/admin/analytics/activity-feed', { headers }),
      ]);

      if (!overviewRes.ok) throw new Error('Failed to load overview');
      const overviewData = await overviewRes.json();
      setOverviewStats(overviewData.stats);

      if (!trendRes.ok) throw new Error('Failed to load trend');
      const trendData = await trendRes.json();
      setTrendData(trendData.data);

      if (!adoptionRes.ok) throw new Error('Failed to load adoption');
      const adoptionData = await adoptionRes.json();
      setFeatureAdoption(adoptionData.features);

      if (!usersRes.ok) throw new Error('Failed to load users');
      const usersData = await usersRes.json();
      setUsers(usersData.users);

      if (!feedRes.ok) throw new Error('Failed to load feed');
      const feedData = await feedRes.json();
      setActivityFeed(feedData.events);
    } catch (err) {
      console.error('Load data error:', err);
      setError('Failed to load dashboard data');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedUsers = [...users]
    .filter((user) => user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'signedUp' || sortField === 'lastActive') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const formatRelativeTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading admin dashboard…</p>
      </main>
    );
  }

  if (error && !overviewStats) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive user activity and system metrics</p>
        </div>

        {/* Metric Cards - Top Row */}
        {overviewStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <MetricCard
              icon={<Users className="h-5 w-5" />}
              title="Total Users"
              value={overviewStats.totalUsers}
              subtitle={`${overviewStats.newUsersThisWeek} new this week`}
            />
            <MetricCard
              icon={<Activity className="h-5 w-5" />}
              title="Active Users (7d)"
              value={overviewStats.activeUsers7d}
              subtitle={`${overviewStats.activeUsersPercent}% of total`}
            />
            <MetricCard
              icon={<FileText className="h-5 w-5" />}
              title="CIMs Analyzed"
              value={overviewStats.totalCims}
              subtitle={`${overviewStats.cimsThisWeek} this week`}
            />
            <MetricCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Financials Analyzed"
              value={overviewStats.totalFinancials}
              subtitle={`${overviewStats.financialsThisWeek} this week`}
            />
            <MetricCard
              icon={<Briefcase className="h-5 w-5" />}
              title="Total Deals"
              value={overviewStats.totalDeals}
              subtitle={`${overviewStats.activeDeals} active`}
            />
            <MetricCard
              icon={<AlertTriangle className="h-5 w-5" />}
              title="Churn Risk"
              value={`${overviewStats.churnRiskPercent}%`}
              subtitle={`${overviewStats.inactiveUsers7d} inactive 7+ days`}
              isWarning={overviewStats.churnRiskPercent > 20}
            />
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Activity Trend Line Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Activity Trend (30 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cims"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="CIMs"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="financials"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Financials"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="deals"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Deals"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Feature Adoption Bar Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Feature Adoption</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={featureAdoption} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" domain={[0, 100]} stroke="#6b7280" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={12} width={120} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number | undefined) => [`${value ?? 0}%`, 'Adoption']}
                />
                <Bar dataKey="adoption" radius={[0, 4, 4, 0]}>
                  {featureAdoption.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        entry.adoption >= 70
                          ? '#10b981'
                          : entry.adoption >= 40
                          ? '#f59e0b'
                          : '#ef4444'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Users</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <TableHeader onClick={() => handleSort('email')} sortField={sortField} field="email">
                    Email
                  </TableHeader>
                  <TableHeader onClick={() => handleSort('signedUp')} sortField={sortField} field="signedUp">
                    Signed Up
                  </TableHeader>
                  <TableHeader onClick={() => handleSort('lastActive')} sortField={sortField} field="lastActive">
                    Last Active
                  </TableHeader>
                  <TableHeader onClick={() => handleSort('cimsAnalyzed')} sortField={sortField} field="cimsAnalyzed">
                    CIMs
                  </TableHeader>
                  <TableHeader
                    onClick={() => handleSort('financialsAnalyzed')}
                    sortField={sortField}
                    field="financialsAnalyzed"
                  >
                    Financials
                  </TableHeader>
                  <TableHeader onClick={() => handleSort('deals')} sortField={sortField} field="deals">
                    Deals
                  </TableHeader>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Pipeline</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Plan</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedUsers.map((user) => (
                  <React.Fragment key={user.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="p-4 text-sm text-gray-900">{user.email}</td>
                      <td className="p-4 text-sm text-gray-600">
                        {new Date(user.signedUp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-4 text-sm">
                        <span className={user.isInactive ? 'text-red-600' : 'text-gray-600'}>
                          {formatRelativeTime(user.lastActive)}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{user.cimsAnalyzed}</td>
                      <td className="p-4 text-sm text-gray-600">{user.financialsAnalyzed}</td>
                      <td className="p-4 text-sm text-gray-600">{user.deals}</td>
                      <td className="p-4">
                        <PipelineBreakdown breakdown={user.stageBreakdown} />
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          {user.plan}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() =>
                            setExpandedUser(expandedUser === user.id ? null : user.id)
                          }
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {expandedUser === user.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedUser === user.id && (
                      <tr>
                        <td colSpan={9} className="p-4 bg-gray-50">
                          <div className="text-sm text-gray-600">
                            <p className="font-medium mb-2">Pipeline Stage Breakdown:</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(user.stageBreakdown).map(([stage, count]) => (
                                <span
                                  key={stage}
                                  className="px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                                >
                                  {stage}: {count}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {activityFeed.map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                <span className="text-xl">{event.icon}</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{event.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(event.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
    </>
  );
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
  isWarning,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  isWarning?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${isWarning ? 'bg-red-100' : 'bg-blue-100'}`}>
          <div className={isWarning ? 'text-red-600' : 'text-blue-600'}>{icon}</div>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${isWarning ? 'text-red-600' : 'text-gray-900'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function TableHeader({
  children,
  onClick,
  sortField,
  field,
}: {
  children: React.ReactNode;
  onClick: () => void;
  sortField: SortField;
  field: SortField;
}) {
  return (
    <th
      onClick={onClick}
      className="text-left p-4 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
    >
      <div className="flex items-center gap-2">
        {children}
        <ArrowUpDown className="h-3 w-3 text-gray-400" />
      </div>
    </th>
  );
}

function PipelineBreakdown({ breakdown }: { breakdown: Record<string, number> }) {
  const total = Object.values(breakdown).reduce((sum, count) => sum + count, 0);
  if (total === 0) return <span className="text-gray-400 text-xs">—</span>;

  const stages = Object.entries(breakdown).slice(0, 3);
  return (
    <div className="flex items-center gap-1">
      {stages.map(([stage, count]) => {
        const width = (count / total) * 100;
        return (
          <div
            key={stage}
            className="h-2 bg-blue-500 rounded"
            style={{ width: `${width}px`, minWidth: '4px' }}
            title={`${stage}: ${count}`}
          />
        );
      })}
      {Object.keys(breakdown).length > 3 && (
        <span className="text-xs text-gray-500 ml-1">+{Object.keys(breakdown).length - 3}</span>
      )}
    </div>
  );
}
