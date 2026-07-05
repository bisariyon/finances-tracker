'use client';

import { useState, useEffect } from 'react';
import { getAnalyticsData, getMonthlyBreakdown } from '@/actions/transactions';
import { formatCurrency, cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
}: {
  initialData: AnalyticsData;
  defaultYear: number;
  accounts: any[];
  categories: any[];
}) {
  const [year, setYear] = useState(defaultYear);
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [loading, setLoading] = useState(false);

  const [activeView, setActiveView] = useState<'yearly' | 'monthly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [monthlyYear, setMonthlyYear] = useState<number>(defaultYear);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [selectedCategoryTxs, setSelectedCategoryTxs] = useState<{ id: string; name: string; color: string; txs: any[] } | null>(null);
  const [activeCategorySlice, setActiveCategorySlice] = useState<{ name: string; amount: number; color: string } | null>(null);
  const [txSortOption, setTxSortOption] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  const MONTHS_LIST = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  useEffect(() => {
    let active = true;
    async function loadMonthlyData() {
      setMonthlyLoading(true);
      try {
        const breakdown = await getMonthlyBreakdown(monthlyYear, selectedMonth);
        if (active) {
          setMonthlyData(breakdown);
          setActiveCategorySlice(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) {
          setMonthlyLoading(false);
        }
      }
    }
    loadMonthlyData();
    return () => {
      active = false;
    };
  }, [monthlyYear, selectedMonth]);

  useEffect(() => {
    if (!selectedCategoryTxs) return;

    window.history.pushState({ dialogOpen: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      setSelectedCategoryTxs(null);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.dialogOpen) {
        window.history.back();
      }
    };
  }, [selectedCategoryTxs]);

  const handleTabChange = (view: 'yearly' | 'monthly') => {
    setActiveView(view);
  };

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

  const pieData = data.categoryBreakdown.map((c) => ({
    name: c.name,
    value: c.amount,
    color: c.color,
  }));

  const savingsRate = data.totalIncome > 0
    ? Math.round((data.savings / data.totalIncome) * 100)
    : 0;


  return (
    <div className="space-y-6">
      {/* Header and Toggler */}
      <div className="flex items-start justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-white/50 text-sm mt-0.5">Financial insights and trends</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-white/5 border border-white/10 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleTabChange('yearly')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer border",
                activeView === 'yearly'
                  ? "bg-violet-500/20 border-violet-500/30 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                  : "border-transparent text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
            >
              Yearly Overview
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('monthly')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer border",
                activeView === 'monthly'
                  ? "bg-violet-500/20 border-violet-500/30 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                  : "border-transparent text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
            >
              Monthly Breakdown
            </button>
          </div>

          {/* View-specific controls */}
          {activeView === 'yearly' ? (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 shrink-0">
              <button onClick={() => navigateYear('prev')} className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
                <ChevronLeft size={18} />
              </button>
              <span className="text-white font-medium text-sm min-w-15 text-center">{year}</span>
              <button onClick={() => navigateYear('next')} className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
                <ChevronRight size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              {/* Year Selector */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
                <button
                  onClick={() => {
                    setMonthlyYear(prev => prev - 1);
                  }}
                  className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-white font-medium text-sm min-w-15 text-center">{monthlyYear}</span>
                <button
                  onClick={() => {
                    setMonthlyYear(prev => prev + 1);
                  }}
                  className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Month Dropdown */}
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(parseInt(e.target.value));
                }}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50"
              >
                {MONTHS_LIST.map((m) => (
                  <option key={m.value} value={m.value} className="bg-[#1a1a2e]">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Yearly Overview View ───────────────────────────────────────────── */}
      {activeView === 'yearly' && (
        <div className="space-y-6">
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
                  {data.categoryBreakdown.map((cat) => {
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
      )}

      {/* ── Monthly Breakdown View ─────────────────────────────────────────── */}
      {activeView === 'monthly' && (
        <div className="space-y-6">
          {/* Monthly summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <p className="text-emerald-300/70 text-sm mb-1">Income this Month</p>
              {monthlyLoading || !monthlyData ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className="text-2xl font-bold text-emerald-300">{formatCurrency(monthlyData.totalIncome)}</p>
              )}
            </div>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5">
              <p className="text-rose-300/70 text-sm mb-1">Expenses this Month</p>
              {monthlyLoading || !monthlyData ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className="text-2xl font-bold text-rose-300">{formatCurrency(monthlyData.totalExpense)}</p>
              )}
            </div>
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-5">
              <p className="text-sky-300/70 text-sm mb-1">Net Savings</p>
              {monthlyLoading || !monthlyData ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div>
                  <p className={`text-2xl font-bold ${monthlyData.savings >= 0 ? 'text-sky-300' : 'text-rose-300'}`}>
                    {formatCurrency(monthlyData.savings)}
                  </p>
                  <p className="text-sky-400/60 text-xs mt-0.5">
                    {monthlyData.totalIncome > 0
                      ? Math.round((monthlyData.savings / monthlyData.totalIncome) * 100)
                      : 0}% savings rate
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Monthly Breakdown Data */}
          {monthlyLoading || !monthlyData ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Skeleton className="h-64 col-span-1" />
              <Skeleton className="h-64 col-span-1" />
              <Skeleton className="h-64 col-span-1" />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Pie Chart of category expenses */}
              <div className="rounded-2xl border border-white/10 bg-(--card-bg) p-5">
                <h3 className="text-white font-semibold mb-4">Category Expenses</h3>
                {monthlyData.categoryBreakdown.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-white/30 text-sm">No expenses this month</div>
                ) : (
                  <div className="relative outline-none">
                    <ResponsiveContainer width="100%" height={220} className="outline-none">
                      <PieChart
                        onClick={() => setActiveCategorySlice(null)}
                        className="outline-none"
                        style={{ outline: 'none' }}
                      >
                        <Pie
                          data={monthlyData.categoryBreakdown.map((c: any) => ({
                            name: c.name,
                            value: c.amount,
                            color: c.color,
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          onClick={(eventData, index, e) => {
                            if (e && e.stopPropagation) e.stopPropagation();
                            if (eventData && eventData.payload) {
                              const payload = eventData.payload;
                              if (activeCategorySlice?.name === payload.name) {
                                setActiveCategorySlice(null);
                              } else {
                                setActiveCategorySlice({
                                  name: payload.name,
                                  amount: payload.value,
                                  color: payload.color || '#fff'
                                });
                              }
                            }
                          }}
                          onMouseEnter={(eventData) => {
                            if (eventData && eventData.payload) {
                              const payload = eventData.payload;
                              setActiveCategorySlice({
                                name: payload.name,
                                amount: payload.value,
                                color: payload.color || '#fff'
                              });
                            }
                          }}
                          onMouseLeave={() => {
                            setActiveCategorySlice(null);
                          }}
                        >
                          {monthlyData.categoryBreakdown.map((c: any, i: number) => {
                            const isSelected = activeCategorySlice?.name === c.name;
                            const hasSelection = activeCategorySlice !== null;
                            return (
                              <Cell
                                key={i}
                                fill={c.color}
                                opacity={hasSelection && !isSelected ? 0.3 : 1}
                                style={{ outline: 'none', cursor: 'pointer' }}
                              />
                            );
                          })}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Centered text overlay inside the donut hole */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center text-center w-28 h-28 bg-[#0a0a18]/60 rounded-full border border-white/5 shadow-inner backdrop-blur-xs select-none">
                      {activeCategorySlice ? (
                        <div className="p-2 animate-in fade-in zoom-in duration-200">
                          <span className="text-[9px] uppercase font-bold tracking-wider block truncate max-w-24 leading-none" style={{ color: activeCategorySlice.color }}>
                            {activeCategorySlice.name}
                          </span>
                          <span className="text-xs font-extrabold text-white mt-1.5 block">
                            {formatCurrency(activeCategorySlice.amount)}
                          </span>
                        </div>
                      ) : (
                        <div className="p-2 animate-in fade-in duration-200">
                          <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider block leading-none">
                            Total Cost
                          </span>
                          <span className="text-xs font-extrabold text-white mt-1.5 block">
                            {formatCurrency(monthlyData.totalExpense)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress bars list of category totals */}
              <div className="rounded-2xl border border-white/10 bg-(--card-bg) p-5">
                <h3 className="text-white font-semibold mb-4">Category Breakdown</h3>
                {monthlyData.categoryBreakdown.length === 0 ? (
                  <div className="py-12 text-center text-white/30 text-sm">No category expenses</div>
                ) : (
                  <div className="space-y-3 max-h-75 overflow-y-auto overflow-x-hidden pr-1">
                    {monthlyData.categoryBreakdown.map((cat: any) => {
                      const pct = monthlyData.totalExpense > 0 ? (cat.amount / monthlyData.totalExpense) * 100 : 0;
                      return (
                        <div
                          key={cat.name}
                          onClick={() => {
                            const catId = cat._id;
                            const filteredTxs = (monthlyData.transactions || []).filter((tx: any) => {
                              const tCatId = tx.categoryId?._id?.toString() || tx.categoryId?.toString();
                              return tCatId === catId;
                            });
                            setSelectedCategoryTxs({
                              id: catId,
                              name: cat.name,
                              color: cat.color,
                              txs: filteredTxs
                            });
                          }}
                          className="group cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-xl transition-all"
                          title="Click to view transactions"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                              <span className="text-white/70 text-xs font-medium group-hover:text-white transition-colors">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-white/40 text-[10px]">{pct.toFixed(0)}%</span>
                              <span className="text-white/90 text-xs font-semibold group-hover:text-violet-300 transition-colors">{formatCurrency(cat.amount)}</span>
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

              {/* Top Merchants list */}
              <div className="rounded-2xl border border-white/10 bg-(--card-bg) p-5">
                <h3 className="text-white font-semibold mb-4">Merchant Breakdown</h3>
                {monthlyData.merchantBreakdown.length === 0 ? (
                  <div className="py-12 text-center text-white/30 text-sm">No merchant expenses</div>
                ) : (
                  <div className="space-y-3 max-h-75 overflow-y-auto overflow-x-hidden pr-1">
                    {monthlyData.merchantBreakdown.map((m: any, idx: number) => {
                      const pct = monthlyData.totalExpense > 0 ? (m.amount / monthlyData.totalExpense) * 100 : 0;
                      return (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-white/80 text-xs font-medium truncate">{m.name}</p>
                            <p className="text-[10px] text-white/40 mt-0.5">{pct.toFixed(1)}% of expenses</p>
                          </div>
                          <span className="text-white font-bold text-xs shrink-0">{formatCurrency(m.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Transactions Drilldown Dialog */}
      {selectedCategoryTxs && (
        <Dialog open={!!selectedCategoryTxs} onOpenChange={() => { setSelectedCategoryTxs(null); setTxSortOption('date-desc'); }}>
          <DialogContent className="bg-[#121225] border-white/10 text-white rounded-2xl max-w-md w-full max-sm:fixed max-sm:bottom-0 max-sm:top-auto max-sm:left-0.5 max-sm:right-0.5 max-sm:w-[calc(100%-0.25rem)] max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-t-3xl max-sm:rounded-b-none max-sm:border-b-0 max-sm:p-5 max-sm:pb-8">
            {/* Mobile Drawer drag handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-white">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: selectedCategoryTxs.color }} />
                {selectedCategoryTxs.name} Transactions
              </DialogTitle>
            </DialogHeader>

            {/* Sort Control Row */}
            <div className="flex items-center justify-between mt-4 pb-2 border-b border-white/5">
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
                {selectedCategoryTxs.txs.length} transactions
              </span>
              <select
                value={txSortOption}
                onChange={(e) => setTxSortOption(e.target.value as any)}
                className="bg-white/5 border border-white/10 rounded-lg text-white/70 text-[10px] px-2 py-1 focus:outline-none focus:border-violet-500/50 cursor-pointer font-medium"
              >
                <option value="date-desc" className="bg-[#0f0f1e] text-white">Date: Latest first</option>
                <option value="date-asc" className="bg-[#0f0f1e] text-white">Date: Oldest first</option>
                <option value="amount-desc" className="bg-[#0f0f1e] text-white">Price: High to Low</option>
                <option value="amount-asc" className="bg-[#0f0f1e] text-white">Price: Low to High</option>
              </select>
            </div>

            <div className="mt-3 space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {[...selectedCategoryTxs.txs]
                .sort((a, b) => {
                  if (txSortOption === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
                  if (txSortOption === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
                  if (txSortOption === 'amount-desc') return b.amount - a.amount;
                  if (txSortOption === 'amount-asc') return a.amount - b.amount;
                  return 0;
                })
                .map((tx: any) => (
                  <div key={tx._id} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-semibold text-white/90 truncate">
                        {tx.merchantName || tx.notes || 'Expense'}
                      </p>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-rose-400 shrink-0">
                      -{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              {selectedCategoryTxs.txs.length === 0 && (
                <p className="text-center text-white/35 py-8 text-xs">No transactions found in this category.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
