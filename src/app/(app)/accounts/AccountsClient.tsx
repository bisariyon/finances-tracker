'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AccountSchema, type AccountInput } from '@/lib/validations';
import { createAccount, updateAccount, deleteAccount, setDefaultAccount } from '@/actions/accounts-categories';
import { formatCurrency, cn } from '@/lib/utils';
import { ACCOUNT_TYPES, ACCOUNT_COLORS } from '@/lib/constants';
import { toast } from 'sonner';
import { createTransaction } from '@/actions/transactions';
import { Plus, Pencil, Trash2, ArrowLeftRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  bank: '🏦', wallet: '👛', cash: '💵', credit_card: '💳', meal_card: '🍽️', investment: '📈',
};

const DEFAULT_COLOR = '#6366f1';

type AccountData = {
  _id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
  isDefault?: boolean;
};

export default function AccountsClient({ initialAccounts }: { initialAccounts: AccountData[] }) {
  const [accounts, setAccounts] = useState<AccountData[]>(initialAccounts);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AccountData | null>(null);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [isPending, startTransition] = useTransition();

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });



  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AccountInput>({
    resolver: zodResolver(AccountSchema),
    defaultValues: { name: '', type: 'bank', balance: 0, color: DEFAULT_COLOR },
  });

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  function pickColor(c: string) {
    setSelectedColor(c);
    setValue('color', c);
  }

  function openCreate() {
    setSelectedColor(DEFAULT_COLOR);
    reset({ name: '', type: 'bank', balance: 0, color: DEFAULT_COLOR });
    setEditing(null);
    setOpen(true);
  }

  function openEdit(acc: AccountData) {
    setSelectedColor(acc.color);
    reset({
      name: acc.name,
      type: acc.type as AccountInput['type'],
      balance: acc.balance,
      color: acc.color,
    });
    setEditing(acc);
    setOpen(true);
  }

  function openTransfer() {
    setTransferData({
      fromAccountId: accounts[0]?._id || '',
      toAccountId: accounts.length > 1 ? accounts[1]._id : '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setTransferOpen(true);
  }

  function onTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transferData.fromAccountId || !transferData.toAccountId) {
      toast.error('Please select both accounts');
      return;
    }
    if (transferData.fromAccountId === transferData.toAccountId) {
      toast.error('Cannot transfer to the same account');
      return;
    }
    const amt = parseFloat(transferData.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    startTransition(async () => {
      try {
        await createTransaction({
          amount: amt,
          type: 'transfer',
          date: transferData.date,
          accountId: transferData.fromAccountId,
          toAccountId: transferData.toAccountId,
          tags: [],
          notes: transferData.notes,
        });
        toast.success('Transfer successful!');
        setTransferOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Transfer failed');
      }
    });
  }

  function onSubmit(values: AccountInput) {
    startTransition(async () => {
      try {
        if (editing) {
          const updated = await updateAccount(editing._id, values) as unknown as AccountData;
          setAccounts((prev) => prev.map((a) => (a._id === editing._id ? { ...a, ...updated } : a)));
          toast.success('Account updated!');
        } else {
          const created = await createAccount(values) as unknown as AccountData;
          setAccounts((prev) => [...prev, created]);
          toast.success('Account created!');
        }
        setOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  async function handleSetDefault(id: string) {
    const previous = accounts; // snapshot for rollback
    // optimistic update first
    setAccounts((prev) => prev.map((a) => ({ ...a, isDefault: a._id === id })));
    try {
      await setDefaultAccount(id);
      toast.success('Default account updated');
    } catch {
      setAccounts(previous); // full rollback
      toast.error('Failed to set default');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this account? All transactions will remain.')) return;
    startTransition(async () => {
      try {
        await deleteAccount(id);
        setAccounts((prev) => prev.filter((a) => a._id !== id));
        toast.success('Account deleted');
      } catch {
        toast.error('Delete failed');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounts</h1>
          <p className="text-white/50 text-sm mt-0.5">Manage your financial accounts</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {accounts.length >= 2 && (
            <Button onClick={openTransfer} variant="outline" className="bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10 gap-2">
              <ArrowLeftRight size={14} /> Transfer
            </Button>
          )}
          <Button onClick={openCreate} className="bg-violet-500 hover:bg-violet-600 text-white gap-2">
            <Plus size={16} /> Add Account
          </Button>
        </div>
      </div>

      {/* Total Balance Card */}
      <div className="rounded-2xl bg-linear-to-br from-violet-600/30 to-violet-800/20 border border-violet-500/20 p-6">
        <p className="text-white/60 text-sm mb-1">Total Net Worth</p>
        <p className={cn('text-4xl font-bold', totalBalance < 0 ? 'text-rose-400' : 'text-white')}>
          {formatCurrency(totalBalance)}
        </p>
        <p className="text-white/30 text-xs mt-2">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-(--card-bg) p-16 text-center">
          <p className="text-4xl mb-3">🏦</p>
          <p className="text-white/50 text-sm">No accounts yet. Add your first account to get started.</p>
        </div>
      ) : (() => {
        const defaultAcc = accounts.find((a) => a.isDefault);
        const others = accounts.filter((a) => !a.isDefault);
        return (
          <div className="space-y-4">
            {/* Default account — hero card */}
            {defaultAcc && (
              <div
                className="relative rounded-2xl p-6 overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${defaultAcc.color}33 0%, ${defaultAcc.color}11 100%)`, border: `1px solid ${defaultAcc.color}50` }}
              >
                {/* Glow blob */}
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 blur-2xl" style={{ background: defaultAcc.color }} />
                <div className="relative flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: defaultAcc.color + '30' }}>
                      {ACCOUNT_TYPE_ICONS[defaultAcc.type] || '💰'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-white font-bold text-lg">{defaultAcc.name}</p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white/80" style={{ background: defaultAcc.color + '50' }}>Default</span>
                      </div>
                      <p className="text-white/50 text-xs capitalize">{defaultAcc.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(defaultAcc)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-violet-400 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(defaultAcc._id)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-rose-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <p className="text-white/50 text-xs mb-1">Balance</p>
                  <p className={cn('text-3xl font-bold', defaultAcc.balance < 0 ? 'text-rose-400' : 'text-white')}>
                    {formatCurrency(defaultAcc.balance)}
                  </p>
                </div>
              </div>
            )}

            {/* Non-default accounts grid */}
            {others.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {others.map((acc) => (
                  <div key={acc._id} className="relative rounded-2xl border border-white/10 bg-(--card-bg) p-5 group hover:border-white/20 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: acc.color + '20' }}>
                          {ACCOUNT_TYPE_ICONS[acc.type] || '💰'}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{acc.name}</p>
                          <p className="text-white/40 text-xs capitalize">{acc.type.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(acc)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-violet-400 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(acc._id)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-rose-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-white/40 mb-0.5">Balance</p>
                        <p className={cn('text-2xl font-bold', acc.balance < 0 ? 'text-rose-400' : 'text-white')}>
                          {formatCurrency(acc.balance)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="w-2 h-8 rounded-full" style={{ background: acc.color }} />
                        <button
                          onClick={() => handleSetDefault(acc._id)}
                          className="text-[10px] text-white/30 hover:text-violet-400 transition-colors"
                        >
                          Set as default
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}


      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-(--card-bg) border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? 'Edit Account' : 'Add Account'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Account Name</label>
              <Input
                className="bg-white/5 border-white/10 text-white"
                placeholder="e.g. HDFC Savings"
                {...register('name')}
              />
              {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name.message}</p>}
            </div>

            {/* Type */}
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Account Type</label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-[#1a1a2e]">{t.label}</option>
                ))}
              </select>
              {errors.type && <p className="text-xs text-rose-400 mt-1">{errors.type.message}</p>}
            </div>

            {/* Opening Balance (create only) */}
            {!editing && (
              <div>
                <label className="text-sm text-white/70 mb-1.5 block">Opening Balance (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  className="bg-white/5 border-white/10 text-white"
                  {...register('balance', { valueAsNumber: true })}
                />
                {errors.balance && <p className="text-xs text-rose-400 mt-1">{errors.balance.message}</p>}
              </div>
            )}

            {/* Color — driven by local state to avoid react-hook-form watch() */}
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Color</label>
              {/* hidden input keeps value in form state */}
              <input type="hidden" {...register('color')} />
              <div className="flex flex-wrap gap-2">
                {ACCOUNT_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => pickColor(c)}
                    className={cn(
                      'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
                      selectedColor === c ? 'border-white scale-110' : 'border-transparent'
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            <Button type="submit" disabled={isPending} className="w-full bg-violet-500 hover:bg-violet-600 text-white">
              {isPending ? 'Saving...' : editing ? 'Update Account' : 'Create Account'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md bg-(--card-bg) border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Transfer Money</DialogTitle>
          </DialogHeader>
          <form onSubmit={onTransferSubmit} className="space-y-4">
            {/* From */}
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">From</label>
              <select
                value={transferData.fromAccountId}
                onChange={(e) => setTransferData(p => ({ ...p, fromAccountId: e.target.value }))}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
                required
              >
                <option value="">Select account...</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id} className="bg-[#1a1a2e]">
                    {a.name} — {formatCurrency(a.balance)}
                  </option>
                ))}
              </select>
            </div>

            {/* Arrow indicator */}
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 text-white/30 text-xs">
                <div className="h-px w-16 bg-white/10" />
                <ArrowLeftRight size={14} className="text-violet-400" />
                <div className="h-px w-16 bg-white/10" />
              </div>
            </div>

            {/* To */}
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">To</label>
              <select
                value={transferData.toAccountId}
                onChange={(e) => setTransferData(p => ({ ...p, toAccountId: e.target.value }))}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
                required
              >
                <option value="">Select account...</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id} className="bg-[#1a1a2e]">
                    {a.name} — {formatCurrency(a.balance)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/70 mb-1.5 block">Amount (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={transferData.amount}
                  onChange={(e) => setTransferData(p => ({ ...p, amount: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1.5 block">Date</label>
                <Input
                  type="date"
                  required
                  value={transferData.date}
                  onChange={(e) => setTransferData(p => ({ ...p, date: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Notes (optional)</label>
              <Input
                value={transferData.notes}
                onChange={(e) => setTransferData(p => ({ ...p, notes: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
                placeholder="e.g. Rent share..."
              />
            </div>

            <Button type="submit" disabled={isPending} className="w-full bg-violet-500 hover:bg-violet-600 text-white">
              {isPending ? 'Processing...' : 'Transfer'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
