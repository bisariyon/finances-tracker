'use client';

import { useState } from 'react';
import { getDashboardData } from '@/actions/transactions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { MONTHS } from '@/lib/constants';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Legend, BarChart, Bar,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

type TooltipPayloadItem = {
  name: string;
  value: number;
  color: string;
};

type RecentTransaction = {
  _id: string;
  amount: number;
  type: string;
  date: string;
  merchantName?: string;
  categoryId?: { name: string; color: string; icon: string };
  accountId?: { name: string };
  tags?: string[];
};

type AccountSummary = {
  _id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
};

type MerchantSummary = {
  name: string;
  amount: number;
};

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  bank: '🏦', wallet: '👛', cash: '💵', credit_card: '💳', meal_card: '🍽️', investment: '📈',
};

const CUSTOM_TOOLTIP = ({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-(--card-bg) border border-white/10 rounded-xl p-3 shadow-xl text-sm">
        <p className="text-white/70 mb-2 font-medium">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardClient({
  initialData,
  defaultMonth,
  defaultYear,
}: {
  initialData: DashboardData;
  defaultMonth: number;
  defaultYear: number;
}) {
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);

  async function navigate(dir: 'prev' | 'next') {
    let m = month + (dir === 'next' ? 1 : -1);
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setLoading(true);
    setMonth(m);
    setYear(y);
    try {
      const newData = await getDashboardData(m, y);
      setData(newData);
    } finally {
      setLoading(false);
    }
  }

  const pieData = data.categoryBreakdown.slice(0, 7).map((c) => ({
    name: c.name,
    value: c.amount,
    color: c.color,
  }));

  const statCards = [
    {
      label: 'Total Balance',
      value: data.totalBalance,
      icon: Wallet,
      color: 'from-violet-500/20 to-violet-600/10',
      iconColor: 'text-violet-400',
      border: 'border-violet-500/20',
    },
    {
      label: 'Income',
      value: data.totalIncome,
      icon: TrendingUp,
      color: 'from-emerald-500/20 to-emerald-600/10',
      iconColor: 'text-emerald-400',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Expenses',
      value: data.totalExpense,
      icon: TrendingDown,
      color: 'from-rose-500/20 to-rose-600/10',
      iconColor: 'text-rose-400',
      border: 'border-rose-500/20',
    },
    {
      label: 'Savings',
      value: data.savings,
      icon: PiggyBank,
      color: 'from-sky-500/20 to-sky-600/10',
      iconColor: 'text-sky-400',
      border: 'border-sky-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-white/50 text-sm mt-0.5">Your financial overview</p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
          <button
            onClick={() => navigate('prev')}
            className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-white font-medium text-sm min-w-30 text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <button
            onClick={() => navigate('next')}
            className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className={cn('rounded-2xl border p-5 bg-linear-to-br', s.color, s.border)}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/60 text-sm font-medium">{s.label}</span>
              <span className={cn('p-2 rounded-xl bg-white/5', s.iconColor)}>
                <s.icon size={18} />
              </span>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className={cn('text-2xl font-bold', s.value < 0 ? 'text-rose-400' : 'text-white')}>
                {formatCurrency(s.value)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Monthly Trend */}
        <div className="xl:col-span-3 rounded-2xl border border-white/10 bg-(--card-bg) p-5">
          <h3 className="text-white font-semibold mb-4">Monthly Trend</h3>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.monthlyTrend} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tick={{ fill: 'rgba(255,255,255,0.5)' }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }} />
                <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense Pie */}
        <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-(--card-bg) p-5">
          <h3 className="text-white font-semibold mb-4">Expense Breakdown</h3>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : pieData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-white/30 text-sm">No expense data</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                  itemStyle={{ color: 'white' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          {/* Legend */}
          <div className="space-y-1.5 mt-2">
            {data.categoryBreakdown.slice(0, 5).map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="text-white/60 truncate max-w-25">{c.name}</span>
                </div>
                <span className="text-white/80 font-medium">{formatCurrency(c.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Transactions */}
        <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-(--card-bg) p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Recent Transactions</h3>
            <a href="/transactions" className="text-violet-400 text-sm hover:text-violet-300 transition-colors">View all →</a>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : data.recentTransactions.length === 0 ? (
            <div className="py-12 text-center text-white/30 text-sm">No transactions yet</div>
          ) : (
            <div className="space-y-2">
              {(data.recentTransactions as RecentTransaction[]).map((tx) => (
                <div key={tx._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: (tx.categoryId?.color ?? '#ffffff') + '30', color: tx.categoryId?.color ?? '#fff' }}
                  >
                    {tx.merchantName?.[0]?.toUpperCase() ?? tx.categoryId?.icon?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 text-sm font-medium truncate">
                      {tx.merchantName ?? tx.categoryId?.name ?? tx.type}
                    </p>
                    <p className="text-white/40 text-xs">{formatDate(tx.date)} • {tx.accountId?.name}</p>
                  </div>
                  <span className={cn('text-sm font-bold', tx.type === 'income' ? 'text-emerald-400' : tx.type === 'transfer' ? 'text-sky-400' : 'text-rose-400')}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accounts & Top Merchants */}
        <div className="space-y-4">
          {/* Accounts */}
          <div className="rounded-2xl border border-white/10 bg-(--card-bg) p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Accounts</h3>
              <a href="/accounts" className="text-violet-400 text-xs hover:text-violet-300">Manage →</a>
            </div>
            {data.accounts.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">No accounts yet</p>
            ) : (
              <div className="space-y-2">
                {(data.accounts as AccountSummary[]).slice(0, 4).map((acc) => (
                  <div key={acc._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{ACCOUNT_TYPE_ICONS[acc.type] || '💰'}</span>
                      <span className="text-white/70 text-sm truncate max-w-25">{acc.name}</span>
                    </div>
                    <span className={cn('text-sm font-semibold', acc.balance < 0 ? 'text-rose-400' : 'text-white/90')}>
                      {formatCurrency(acc.balance)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Merchants */}
          <div className="rounded-2xl border border-white/10 bg-(--card-bg) p-5">
            <h3 className="text-white font-semibold mb-3">Top Merchants</h3>
            {data.merchantBreakdown.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">No data yet</p>
            ) : (
              <div className="space-y-2">
                {(data.merchantBreakdown as MerchantSummary[]).map((m, i) => (
                  <div key={m.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 text-xs rounded-full bg-white/10 flex items-center justify-center text-white/50">
                        {i + 1}
                      </span>
                      <span className="text-white/70 text-sm">{m.name}</span>
                    </div>
                    <span className="text-rose-400 text-sm font-semibold">{formatCurrency(m.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
