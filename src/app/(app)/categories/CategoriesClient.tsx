'use client';

import { useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CategorySchema, MerchantSchema, type CategoryInput, type MerchantInput } from '@/lib/validations';
import { createCategory, updateCategory, deleteCategory } from '@/actions/accounts-categories';
import { createMerchant, updateMerchant, deleteMerchant } from '@/actions/merchants';
import { CATEGORY_COLORS, CATEGORY_TYPES } from '@/lib/constants';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Tag, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
type CategoryData = {
  _id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  isSystem?: boolean;
};

type MerchantData = {
  _id: string;
  canonicalName: string;
  aliases: string[];
  categoryId: { _id: string } | string;
  usageCount?: number;
};

// ─── CategoryGroup (defined OUTSIDE the parent to avoid "component during render") ──
type CategoryGroupProps = {
  cats: CategoryData[];
  merchants: MerchantData[];
  expandedCat: string | null;
  setExpandedCat: (id: string | null) => void;
  openCreateMerchant: (catId: string) => void;
  openEditCat: (cat: CategoryData) => void;
  handleDeleteCat: (id: string) => void;
  openEditMerchant: (m: MerchantData) => void;
  handleDeleteMerchant: (id: string) => void;
  isEditMode: boolean;
};

function CategoryGroup({
  cats,
  merchants,
  expandedCat,
  setExpandedCat,
  openCreateMerchant,
  openEditCat,
  handleDeleteCat,
  openEditMerchant,
  handleDeleteMerchant,
  isEditMode,
}: CategoryGroupProps) {
  return (
    <div className="space-y-2">
      {cats.map((cat) => {
        const catMerchants = merchants.filter((m) => {
          const catId = typeof m.categoryId === 'object' ? m.categoryId._id : m.categoryId;
          return catId === cat._id;
        });
        const isExpanded = expandedCat === cat._id;

        return (
          <div key={cat._id} className="rounded-2xl border border-white/10 bg-(--card-bg) overflow-hidden">
            <div className="flex items-center gap-3 p-4 group">
              <button
                onClick={() => setExpandedCat(isExpanded ? null : cat._id)}
                className="flex items-center gap-3 flex-1 text-left"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: cat.color + '25', color: cat.color }}
                >
                  <Tag size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 font-medium text-sm">{cat.name}</p>
                  <p className="text-white/30 text-xs">{catMerchants.length} merchant{catMerchants.length !== 1 ? 's' : ''}</p>
                </div>
                {isExpanded
                  ? <ChevronDown size={14} className="text-white/30" />
                  : <ChevronRight size={14} className="text-white/30" />}
              </button>
              {isEditMode && (
                <div className="flex gap-1 transition-opacity animate-in fade-in duration-200">
                  <button
                    onClick={() => openCreateMerchant(cat._id)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-emerald-400 transition-colors"
                    title="Add merchant"
                  >
                    <Plus size={13} />
                  </button>
                  <button onClick={() => openEditCat(cat)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-violet-400 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDeleteCat(cat._id)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-rose-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>

            {isExpanded && (
              <div className="border-t border-white/10 px-4 pb-3">
                {catMerchants.length === 0 ? (
                  <p className="text-white/30 text-xs py-3">No merchants.{isEditMode ? ' Click + to add.' : ''}</p>
                ) : (
                  <div className="space-y-1 pt-2">
                    {catMerchants.map((m) => (
                      <div key={m._id} className="flex items-center justify-between py-1.5 group/m">
                        <div>
                          <span className="text-sm text-white/80 font-medium">{m.canonicalName}</span>
                          {m.aliases?.length > 0 && (
                            <span className="text-xs text-white/30 ml-2">{m.aliases.slice(0, 3).join(', ')}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditMode && (
                            <div className="flex gap-1 transition-opacity animate-in fade-in duration-200">
                              <button onClick={() => openEditMerchant(m)} className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-violet-400">
                                <Pencil size={11} />
                              </button>
                              <button onClick={() => handleDeleteMerchant(m._id)} className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-rose-400">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const DEFAULT_CAT_COLOR = '#f97316';
const DEFAULT_CAT_ICON = 'Utensils';

export default function CategoriesClient({
  initialCategories,
  initialMerchants,
}: {
  initialCategories: CategoryData[];
  initialMerchants: MerchantData[];
}) {
  const [categories, setCategories] = useState<CategoryData[]>(initialCategories);
  const [merchants, setMerchants] = useState<MerchantData[]>(initialMerchants);
  const [catOpen, setCatOpen] = useState(false);
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryData | null>(null);
  const [editingMerchant, setEditingMerchant] = useState<MerchantData | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [newAlias, setNewAlias] = useState('');
  const [aliases, setAliases] = useState<string[]>([]);
  const [selectedCatColor, setSelectedCatColor] = useState(DEFAULT_CAT_COLOR);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [isEditMode, setIsEditMode] = useState(false);

  // Category form
  const {
    register: catRegister,
    handleSubmit: catHandleSubmit,
    reset: catReset,
    setValue: catSetValue,
    control: catControl,
    formState: { errors: catErrors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(CategorySchema),
    defaultValues: { name: '', type: 'expense', color: DEFAULT_CAT_COLOR, icon: DEFAULT_CAT_ICON },
  });

  const watchedCatType = useWatch({ control: catControl, name: 'type' });

  // Merchant form
  const {
    register: merchantRegister,
    handleSubmit: merchantHandleSubmit,
    reset: merchantReset,
    formState: { errors: merchantErrors },
  } = useForm<MerchantInput>({
    resolver: zodResolver(MerchantSchema),
    defaultValues: { canonicalName: '', aliases: [], categoryId: '' },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openCreateCat() {
    setSelectedCatColor(DEFAULT_CAT_COLOR);
    catReset({ name: '', type: 'expense', color: DEFAULT_CAT_COLOR, icon: DEFAULT_CAT_ICON });
    setEditingCat(null);
    setCatOpen(true);
  }

  function openEditCat(cat: CategoryData) {
    setSelectedCatColor(cat.color);
    catReset({ name: cat.name, type: cat.type, color: cat.color, icon: cat.icon });
    setEditingCat(cat);
    setCatOpen(true);
  }

  function openCreateMerchant(defaultCatId?: string) {
    merchantReset({ canonicalName: '', aliases: [], categoryId: defaultCatId ?? '' });
    setAliases([]);
    setEditingMerchant(null);
    setMerchantOpen(true);
  }

  function openEditMerchant(m: MerchantData) {
    const catId = typeof m.categoryId === 'object' ? m.categoryId._id : m.categoryId;
    merchantReset({ canonicalName: m.canonicalName, aliases: m.aliases, categoryId: catId });
    setAliases(m.aliases ?? []);
    setEditingMerchant(m);
    setMerchantOpen(true);
  }

  function onSubmitCat(values: CategoryInput) {
    startTransition(async () => {
      try {
        if (editingCat) {
          const updated = await updateCategory(editingCat._id, values);
          setCategories((prev) => prev.map((c) => (c._id === editingCat._id ? { ...c, ...(updated as CategoryData) } : c)));
          toast.success('Category updated!');
        } else {
          const created = await createCategory(values);
          setCategories((prev) => [...prev, created as CategoryData]);
          toast.success('Category created!');
        }
        setCatOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  function handleDeleteCat(id: string) {
    if (!confirm('Delete this category?')) return;
    startTransition(async () => {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c._id !== id));
      toast.success('Deleted');
    });
  }

  function onSubmitMerchant(values: MerchantInput) {
    startTransition(async () => {
      try {
        const data = { ...values, aliases };
        if (editingMerchant) {
          const updated = await updateMerchant(editingMerchant._id, data);
          setMerchants((prev) => prev.map((m) => (m._id === editingMerchant._id ? { ...m, ...(updated as MerchantData) } : m)));
          toast.success('Merchant updated!');
        } else {
          const created = await createMerchant(data);
          setMerchants((prev) => [...prev, created as MerchantData]);
          toast.success('Merchant added!');
        }
        setMerchantOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  function handleDeleteMerchant(id: string) {
    if (!confirm('Delete this merchant?')) return;
    startTransition(async () => {
      await deleteMerchant(id);
      setMerchants((prev) => prev.filter((m) => m._id !== id));
      toast.success('Deleted');
    });
  }

  function pickCatColor(c: string) {
    setSelectedCatColor(c);
    catSetValue('color', c);
  }

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const groupProps = {
    merchants,
    expandedCat,
    setExpandedCat,
    openCreateMerchant,
    openEditCat,
    handleDeleteCat,
    openEditMerchant,
    handleDeleteMerchant,
    isEditMode,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-white/50 text-sm mt-0.5">Manage categories and merchant aliases</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Mode Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-white/5 border border-white/10 gap-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsEditMode(false)}
              className={cn(
                "flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer border",
                !isEditMode
                  ? "bg-violet-500/20 border-violet-500/30 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                  : "border-transparent text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
            >
              View Mode
            </button>
            <button
              type="button"
              onClick={() => setIsEditMode(true)}
              className={cn(
                "flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer border",
                isEditMode
                  ? "bg-violet-500/20 border-violet-500/30 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                  : "border-transparent text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
            >
              Edit Mode
            </button>
          </div>

          {isEditMode && (
            <div className="flex gap-2 w-full sm:w-auto animate-in fade-in duration-200">
              <Button onClick={() => openCreateMerchant()} variant="outline" className="flex-1 sm:flex-initial bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10 gap-2 text-xs font-semibold px-3 py-1.5 h-auto rounded-xl">
                <Plus size={13} /> Merchant
              </Button>
              <Button onClick={openCreateCat} className="bg-violet-500 hover:bg-violet-600 text-white gap-2 text-xs font-semibold px-3 py-1.5 h-auto rounded-xl shadow-lg shadow-violet-500/10 flex-1 sm:flex-initial">
                <Plus size={13} /> Category
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="inline-flex p-1 rounded-xl bg-white/5 border border-white/10 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('expense')}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer border",
            activeTab === 'expense'
              ? "bg-rose-500/20 border-rose-500/30 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
              : "border-transparent text-white/50 hover:text-white/80 hover:bg-white/5"
          )}
        >
          Expense ({expenseCategories.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('income')}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer border",
            activeTab === 'income'
              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
              : "border-transparent text-white/50 hover:text-white/80 hover:bg-white/5"
          )}
        >
          Income ({incomeCategories.length})
        </button>
      </div>

      <div className="mt-4">
        {activeTab === 'expense' ? (
          <CategoryGroup cats={expenseCategories} {...groupProps} />
        ) : (
          <CategoryGroup cats={incomeCategories} {...groupProps} />
        )}
      </div>

      {/* ── Category Dialog ───────────────────────────────────────────────── */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="sm:max-w-md bg-(--card-bg) border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{editingCat ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={catHandleSubmit(onSubmitCat)} className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Name</label>
              <Input className="bg-white/5 border-white/10 text-white" placeholder="e.g. Food & Dining" {...catRegister('name')} />
              {catErrors.name && <p className="text-xs text-rose-400 mt-1">{catErrors.name.message}</p>}
            </div>

            {/* Type */}
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Type</label>
              <div className="flex gap-2">
                {CATEGORY_TYPES.map((t) => {
                  const isActive = watchedCatType === t.value;
                  return (
                    <button
                      type="button"
                      key={t.value}
                      onClick={() => catSetValue('type', t.value as CategoryInput['type'], { shouldDirty: true, shouldValidate: true })}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer hover:bg-white/10',
                        isActive
                          ? t.value === 'expense'
                            ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                            : 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                          : 'bg-white/5 border-white/10 text-white/40'
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Color</label>
              <input type="hidden" {...catRegister('color')} />
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => pickCatColor(c)}
                    className={cn('w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
                      selectedCatColor === c ? 'border-white scale-110' : 'border-transparent')}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            <Button type="submit" disabled={isPending} className="w-full bg-violet-500 hover:bg-violet-600 text-white">
              {isPending ? 'Saving...' : editingCat ? 'Update' : 'Create Category'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Merchant Dialog ───────────────────────────────────────────────── */}
      <Dialog open={merchantOpen} onOpenChange={setMerchantOpen}>
        <DialogContent className="sm:max-w-md bg-(--card-bg) border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{editingMerchant ? 'Edit Merchant' : 'Add Merchant'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={merchantHandleSubmit(onSubmitMerchant)} className="space-y-4">
            {/* Canonical Name */}
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Canonical Name</label>
              <Input className="bg-white/5 border-white/10 text-white" placeholder="e.g. Zomato" {...merchantRegister('canonicalName')} />
              {merchantErrors.canonicalName && <p className="text-xs text-rose-400 mt-1">{merchantErrors.canonicalName.message}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Category</label>
              <select
                {...merchantRegister('categoryId')}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id} className="bg-[#1a1a2e]">{c.name}</option>
                ))}
              </select>
              {merchantErrors.categoryId && <p className="text-xs text-rose-400 mt-1">{merchantErrors.categoryId.message}</p>}
            </div>

            {/* Aliases */}
            <div>
              <label className="text-sm text-white/70 mb-1.5 block">Aliases (optional)</label>
              <div className="flex gap-2 mb-2">
                <Input
                  className="bg-white/5 border-white/10 text-white text-sm"
                  placeholder="e.g. Zomato Gold"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newAlias.trim()) { setAliases((prev) => [...prev, newAlias.trim()]); setNewAlias(''); }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  onClick={() => { if (newAlias.trim()) { setAliases((prev) => [...prev, newAlias.trim()]); setNewAlias(''); } }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {aliases.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70">
                    {a}
                    <button
                      type="button"
                      onClick={() => setAliases((prev) => prev.filter((x) => x !== a))}
                      className="text-white/30 hover:text-rose-400"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={isPending} className="w-full bg-violet-500 hover:bg-violet-600 text-white">
              {isPending ? 'Saving...' : editingMerchant ? 'Update' : 'Add Merchant'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
