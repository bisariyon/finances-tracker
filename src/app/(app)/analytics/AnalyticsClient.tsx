'use client';

import { useState } from 'react';
import { getAnalyticsData } from '@/actions/transactions';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsData>>;

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-(--card-bg) border border-white/10 rounded-xl p-3 shadow-xl text-sm">
        <p className="text-white/70 mb-1 font-medium">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsClient({
  initialData,
  defaultYear,
  accounts,
  categories,
}: {
  initialData: AnalyticsData;
  defaultYear: number;
  accounts: any[];
  categories: any[];
}) {
  const [year, setYear] = useState(defaultYear);
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [loading, setLoading] = useState(false);

  async function navigateYear(dir: 'prev' | 'next') {
    const y = year + (dir === 'next' ? 1 : -1);
    setLoading(true);
    setYear(y);
    try {
      const newData = await getAnalyticsData(y);
      setData(newData);
    } finally {
      setLoading(false);
    }
  }

  const pieData = data.categoryBreakdown.slice(0, 8).map((c) => ({
    name: c.name,
    value: c.amount,
    color: c.color,
  }));

  const savingsRate = data.totalIncome > 0
    ? Math.round((data.savings / data.totalIncome) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-white/50 text-sm mt-0.5">Financial insights and trends</p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
          <button onClick={() => navigateYear('prev')} className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
            <ChevronLeft size={18} />
          </button>
          <span className="text-white font-medium text-sm min-w-15 text-center">{year}</span>
          <button onClick={() => navigateYear('next')} className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <p className="text-emerald-300/70 text-sm mb-1">Total Income</p>
          {loading ? <Skeleton className="h-8 w-32" /> : <p className="text-2xl font-bold text-emerald-300">{formatCurrency(data.totalIncome)}</p>}
        </div>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5">
          <p className="text-rose-300/70 text-sm mb-1">Total Expenses</p>
          {loading ? <Skeleton className="h-8 w-32" /> : <p className="text-2xl font-bold text-rose-300">{formatCurrency(data.totalExpense)}</p>}
        </div>
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-5">
          <p className="text-sky-300/70 text-sm mb-1">Net Savings</p>
          {loading ? <Skeleton className="h-8 w-32" /> : (
            <div>
              <p className={`text-2xl font-bold ${data.savings >= 0 ? 'text-sky-300' : 'text-rose-300'}`}>{formatCurrency(data.savings)}</p>
              <p className="text-sky-400/60 text-xs mt-0.5">{savingsRate}% savings rate</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trend Bar */}
      <div className="rounded-2xl border border-white/10 bg-(--card-bg) p-5">
        <h3 className="text-white font-semibold mb-4">Monthly Income vs Expense — {year}</h3>
        {loading ? <Skeleton className="h-72 w-full" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.monthly} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tick={{ fill: 'rgba(255,255,255,0.5)' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CUSTOM_TOOLTIP />} />
              <Legend wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }} />
              <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Savings Trend Line */}
      <div className="rounded-2xl border border-white/10 bg-(--card-bg) p-5">
        <h3 className="text-white font-semibold mb-4">Monthly Savings Trend</h3>
        {loading ? <Skeleton className="h-56 w-full" /> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.monthly.map((m) => ({ ...m, savings: m.income - m.expense }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tick={{ fill: 'rgba(255,255,255,0.5)' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CUSTOM_TOOLTIP />} />
              <Line type="monotone" dataKey="savings" name="Savings" stroke="#38bdf8" strokeWidth={2.5} dot={{ fill: '#38bdf8', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-(--card-bg) p-5">
          <h3 className="text-white font-semibold mb-4">Expense by Category</h3>
          {loading ? <Skeleton className="h-64 w-full" /> : pieData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-white/30 text-sm">No data for {year}</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  formatter={(value: any) => formatCurrency(value)}
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                  itemStyle={{ color: 'white' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-(--card-bg) p-5">
          <h3 className="text-white font-semibold mb-4">Top Categories</h3>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : data.categoryBreakdown.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-white/30 text-sm">No expenses for {year}</div>
          ) : (
            <div className="space-y-3">
              {data.categoryBreakdown.slice(0, 8).map((cat) => {
                const pct = data.totalExpense > 0 ? (cat.amount / data.totalExpense) * 100 : 0;
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                        <span className="text-white/70 text-sm">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40 text-xs">{pct.toFixed(0)}%</span>
                        <span className="text-white/90 text-sm font-semibold">{formatCurrency(cat.amount)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cat.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
