'use client';

import { useState, useTransition, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TransactionSchema, type TransactionInput } from '@/lib/validations';
import {
  createTransaction, updateTransaction, deleteTransaction, getTransactions,
} from '@/actions/transactions';
import { searchMerchants } from '@/actions/merchants';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { TRANSACTION_TYPES } from '@/lib/constants';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ────────────────────────────────────────────────────────────────────
type AccountRef = { _id: string; name: string };
type CategoryRef = { _id: string; name: string; type: string; color?: string };
type MerchantRef = {
  _id: string;
  canonicalName: string;
  aliases?: string[];
  categoryId?: { _id: string; name: string } | string;
  usageCount?: number;
};
type TransactionRow = {
  _id: string;
  amount: number;
  type: string;
  date: string;
  merchantName?: string;
  notes?: string;
  tags?: string[];
  accountId?: AccountRef;
  toAccountId?: AccountRef | string;
  categoryId?: CategoryRef;
  merchantId?: MerchantRef | string;
};

type Props = {
  initialTransactions: TransactionRow[];
  initialTotal: number;
  accounts: AccountRef[];
  categories: CategoryRef[];
  merchants: MerchantRef[];
  defaultAccountId?: string;
};

const TYPE_COLORS: Record<string, string> = {
  expense: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  income: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  transfer: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  investment: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  refund: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  loan: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  repayment: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

export default function TransactionsClient({
  initialTransactions,
  initialTotal,
  accounts,
  categories,
  defaultAccountId,
}: Props) {
  const [transactions, setTransactions] = useState<TransactionRow[]>(initialTransactions);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [merchantSuggestions, setMerchantSuggestions] = useState<MerchantRef[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [txType, setTxType] = useState<TransactionInput['type']>('expense');
  const merchantTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const limit = 30;
  const totalPages = Math.ceil(total / limit);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<TransactionInput>({
    resolver: zodResolver(TransactionSchema),
    defaultValues: {
      amount: 0,
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      accountId: defaultAccountId ?? accounts[0]?._id ?? '',
      tags: [],
      notes: '',
    },
  });

  const watchedCategoryId = useWatch({ control, name: 'categoryId' });
  const watchedAccountId = useWatch({ control, name: 'accountId' });

  // ── Loaders ────────────────────────────────────────────────────────────────
  async function load(p: number, s: string, fType: string, fAcc: string, fCat: string) {
    const res = await getTransactions({
      page: p,
      limit,
      search: s || undefined,
      type: fType || undefined,
      accountId: fAcc || undefined,
      categoryId: fCat || undefined,
    });
    setTransactions(res.transactions as TransactionRow[]);
    setTotal(res.total);
    setPage(p);
  }

  // ── Dialog helpers ─────────────────────────────────────────────────────────
  function openCreate() {
    const defaultType: TransactionInput['type'] = 'expense';
    setTxType(defaultType);
    reset({
      amount: 0,
      type: defaultType,
      date: new Date().toISOString().split('T')[0],
      accountId: defaultAccountId ?? accounts[0]?._id ?? '',
      tags: [],
      notes: '',
    });
    setEditing(null);
    setOpen(true);
  }

  function openEdit(tx: TransactionRow) {
    const type = tx.type as TransactionInput['type'];
    setTxType(type);
    reset({
      amount: tx.amount,
      type,
      date: new Date(tx.date).toISOString().split('T')[0],
      accountId: tx.accountId?._id ?? '',
      toAccountId: typeof tx.toAccountId === 'object' ? tx.toAccountId?._id : tx.toAccountId,
      categoryId: tx.categoryId?._id,
      merchantName: tx.merchantName ?? '',
      merchantId: typeof tx.merchantId === 'object' ? tx.merchantId?._id : tx.merchantId,
      tags: tx.tags ?? [],
      notes: tx.notes ?? '',
    });
    setEditing(tx);
    setOpen(true);
  }

  function pickType(t: TransactionInput['type']) {
    setTxType(t);
    setValue('type', t);
  }

  // ── Merchant autocomplete ──────────────────────────────────────────────────
  async function handleMerchantInput(val: string) {
    setValue('merchantName', val);
    clearTimeout(merchantTimeout.current);
    if (val.length < 1) { setMerchantSuggestions([]); return; }
    merchantTimeout.current = setTimeout(async () => {
      const results = await searchMerchants(val);
      setMerchantSuggestions(results as MerchantRef[]);
      setShowSuggestions(true);
    }, 200);
  }

  function selectMerchant(m: MerchantRef) {
    setValue('merchantName', m.canonicalName, { shouldDirty: true });
    setValue('merchantId', m._id, { shouldDirty: true });
    const catId = typeof m.categoryId === 'object' ? m.categoryId?._id : (typeof m.categoryId === 'string' ? m.categoryId : undefined);
    if (catId) setValue('categoryId', catId, { shouldDirty: true, shouldValidate: true });
    setShowSuggestions(false);
    setMerchantSuggestions([]);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  function onSubmit(values: TransactionInput) {
    startTransition(async () => {
      try {
        if (editing) {
          await updateTransaction(editing._id, values as Parameters<typeof updateTransaction>[1]);
          toast.success('Transaction updated!');
        } else {
          await createTransaction(values as Parameters<typeof createTransaction>[0]);
          toast.success('Transaction added!');
        }
        setOpen(false);
        await load(page, search, filterType, filterAccount, filterCategory);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return;
    startTransition(async () => {
      try {
        await deleteTransaction(id);
        toast.success('Deleted');
        await load(page, search, filterType, filterAccount, filterCategory);
      } catch {
        toast.error('Delete failed');
      }
    });
  }

  async function applyFilter(type?: string, acc?: string, cat?: string) {
    const t = type ?? filterType;
    const a = acc ?? filterAccount;
    const c = cat ?? filterCategory;
    setFilterType(t); setFilterAccount(a); setFilterCategory(c);
    await load(1, search, t, a, c);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-white/50 text-sm mt-0.5">{total} total transactions</p>
        </div>
        <Button onClick={openCreate} className="bg-violet-500 hover:bg-violet-600 text-white gap-2">
          <Plus size={16} /> Add Transaction
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-50">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); load(1, e.target.value, filterType, filterAccount, filterCategory); }}
          />
        </div>
        <select
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 focus:outline-none focus:border-violet-500/50"
          value={filterType}
          onChange={(e) => applyFilter(e.target.value, undefined, undefined)}
        >
          <option value="">All Types</option>
          {TRANSACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 focus:outline-none focus:border-violet-500/50"
          value={filterAccount}
          onChange={(e) => applyFilter(undefined, e.target.value, undefined)}
        >
          <option value="">All Accounts</option>
          {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
        </select>
        <select
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 focus:outline-none focus:border-violet-500/50"
          value={filterCategory}
          onChange={(e) => applyFilter(undefined, undefined, e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        {(filterType || filterAccount || filterCategory || search) && (
          <button
            onClick={() => { setSearch(''); setFilterType(''); setFilterAccount(''); setFilterCategory(''); load(1, '', '', '', ''); }}
            className="px-3 py-2 text-xs text-white/50 hover:text-white flex items-center gap-1 border border-white/10 rounded-xl hover:bg-white/5"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-(--card-bg) overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium hidden sm:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Merchant / Note</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium hidden md:table-cell">From account</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium hidden sm:table-cell">Type</th>
                <th className="text-right px-4 py-3 text-xs text-white/40 font-medium">Amount</th>
                <th className="px-4 py-3 text-xs text-white/40 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {isPending ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td colSpan={7} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-white/30 text-sm">
                    No transactions found. Add your first one!
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx._id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-3 text-xs text-white/50 hidden sm:table-cell">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white/90 text-sm font-medium">
                          {tx.type === 'transfer'
                            ? (() => {
                              const dest = tx.toAccountId && typeof tx.toAccountId === 'object' ? tx.toAccountId.name : '';
                              return dest ? `→ ${dest}` : 'Transfer';
                            })()
                            : tx.type === 'income'
                            ? (tx.notes || 'Income')
                            : (tx.merchantName || tx.notes || '—')}
                        </p>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          <span className="sm:hidden">
                            <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full border', TYPE_COLORS[tx.type] ?? 'bg-white/5 text-white/40 border-white/10')}>
                              {tx.type}
                            </span>
                          </span>
                          <span className="text-[10px] text-white/30 sm:hidden">{formatDate(tx.date)}</span>
                          {tx.tags && tx.tags.length > 0 && tx.tags.slice(0, 2).map((t) => (
                            <span key={t} className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">{t}</span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {tx.type === 'transfer' ? (
                        <span className="text-xs text-sky-400/60 italic">internal transfer</span>
                      ) : tx.categoryId ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: tx.categoryId.color }} />
                          <span className="text-xs text-white/60">{tx.categoryId.name}</span>
                        </div>
                      ) : tx.type === 'income' ? (
                        <span className="text-xs text-emerald-400/60 italic">income</span>
                      ) : <span className="text-white/20 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-white/50">{tx.accountId?.name}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={cn('text-[10px] font-medium px-2 py-1 rounded-full border', TYPE_COLORS[tx.type] ?? 'bg-white/5 text-white/40 border-white/10')}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn('text-sm font-bold', tx.type === 'income' || tx.type === 'refund' ? 'text-emerald-400' : tx.type === 'transfer' ? 'text-sky-400' : 'text-rose-400')}>
                        {tx.type === 'income' || tx.type === 'refund' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 transition-opacity">
                        <button onClick={() => openEdit(tx)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-violet-400 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(tx._id)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-rose-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <span className="text-xs text-white/40">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => load(page - 1, search, filterType, filterAccount, filterCategory)}
                className="p-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => load(page + 1, search, filterType, filterAccount, filterCategory)}
                className="p-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg bg-(--card-bg) border-white/10 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* hidden type input — value controlled by local state + setValue */}
            <input type="hidden" {...register('type')} />

            {/* Type selector */}
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Type</label>
              <div className="flex flex-wrap gap-2">
                {TRANSACTION_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => pickType(t.value as TransactionInput['type'])}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      txType === t.value
                        ? 'bg-violet-500 border-violet-500 text-white'
                        : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {errors.type && <p className="text-xs text-rose-400 mt-1">{errors.type.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Amount */}
              <div>
                <label className="text-sm text-white/70 mb-1.5 block">Amount (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  className="bg-white/5 border-white/10 text-white"
                  {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && <p className="text-xs text-rose-400 mt-1">{errors.amount.message}</p>}
              </div>
              {/* Date */}
              <div>
                <label className="text-sm text-white/70 mb-1.5 block">Date</label>
                <Input type="date" className="bg-white/5 border-white/10 text-white" {...register('date')} />
                {errors.date && <p className="text-xs text-rose-400 mt-1">{errors.date.message}</p>}
              </div>
            </div>

            {/* Account */}
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Account</label>
              <select
                value={watchedAccountId ?? ''}
                onChange={(e) => setValue('accountId', e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
              >
                {accounts.map((a) => <option key={a._id} value={a._id} className="bg-[#1a1a2e]">{a.name}</option>)}
              </select>
              {errors.accountId && <p className="text-xs text-rose-400 mt-1">{errors.accountId.message}</p>}
            </div>

            {/* To Account (transfer only) */}
            {(txType as string) === 'transfer' && (
              <div>
                <label className="text-sm text-white/70 mb-1.5 block">To Account</label>
                <select {...register('toAccountId')} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50">
                  <option value="">Select account</option>
                  {accounts.map((a) => <option key={a._id} value={a._id} className="bg-[#1a1a2e]">{a.name}</option>)}
                </select>
              </div>
            )}

            {/* Merchant — hidden for transfers and income */}
            {(txType as string) !== 'transfer' && (txType as string) !== 'income' && (
              <div>
                <label className="text-sm text-white/70 mb-1.5 block">Merchant / Payee</label>
                <div className="relative">
                  <Input
                    className="bg-white/5 border-white/10 text-white"
                    placeholder="e.g. Zomato, Amazon..."
                    autoComplete="off"
                    {...register('merchantName')}
                    onChange={(e) => handleMerchantInput(e.target.value)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  />
                  {showSuggestions && merchantSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-(--card-bg) border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                      {merchantSuggestions.map((m) => (
                        <button
                          type="button"
                          key={m._id}
                          onMouseDown={() => selectMerchant(m)}
                          className="w-full px-3 py-2.5 text-left hover:bg-white/5 transition-colors flex items-center justify-between gap-2"
                        >
                          <div>
                            <p className="text-sm text-white/90 font-medium">{m.canonicalName}</p>
                            {m.aliases && m.aliases.length > 0 && (
                              <p className="text-xs text-white/30">{m.aliases.slice(0, 2).join(', ')}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {m.categoryId && typeof m.categoryId === 'object' && (
                              <span className="text-xs text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">{m.categoryId.name}</span>
                            )}
                            <span className="text-xs text-white/30">×{m.usageCount ?? 0}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Category — hidden for transfers only */}
            {(txType as string) !== 'transfer' && (
              <div>
                <label className="text-sm text-white/70 mb-1.5 block">
                  Category
                  {watchedCategoryId && <span className="ml-2 text-[10px] text-violet-400">auto-filled ✓</span>}
                </label>
                <select
                  value={watchedCategoryId ?? ''}
                  onChange={(e) => setValue('categoryId', e.target.value, { shouldDirty: true })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
                >
                  <option value="">No category</option>
                  {categories
                    .filter((c) => (txType as string) === 'income' ? c.type === 'income' : c.type === 'expense')
                    .map((c) => <option key={c._id} value={c._id} className="bg-[#1a1a2e]">{c.name}</option>)}
                </select>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Notes (optional)</label>
              <Input className="bg-white/5 border-white/10 text-white" placeholder="Add a note..." {...register('notes')} />
            </div>

            <Button type="submit" disabled={isPending} className="w-full bg-violet-500 hover:bg-violet-600 text-white">
              {isPending ? 'Saving...' : editing ? 'Update Transaction' : 'Add Transaction'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
