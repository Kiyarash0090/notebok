import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Folder,
  FolderPlus,
  Trash2,
  Edit2,
  Check,
  FolderTree,
  Layers,
  CornerDownLeft,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Category } from '../types';
import {
  getCategoryPathString,
  getFlattenedCategoryTree,
  canBeParentCategory,
  getTotalCategoryNoteCount,
  buildCategoryTree,
  CategoryTreeNode,
} from '../lib/categoryUtils';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCreateCategory: (cat: {
    name: string;
    color: string;
    icon: string;
    description?: string;
    parentId?: string | null;
    subcategories?: string[];
  }) => Promise<any>;
  onUpdateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  categoryCounts: Record<string, number>;
  initialParentId?: string | null;
}

const CATEGORY_COLORS = [
  '#4A6D22', // Sage Moss
  '#8B6814', // Earth Ochre
  '#71554E', // Terracotta Clay
  '#3B5B5D', // Deep Pine
  '#62603B', // Olive
  '#7D5260', // Warm Heather
  '#4F6546', // Forest green
  '#5B5E55', // Earth Slate
];

const QUICK_SUGGESTIONS = ['ترم اول', 'ترم دوم', 'پروژه‌ها', 'منابع و اسناد', 'تکالیف'];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  categoryCounts,
  initialParentId,
}) => {
  // Mode: 'main' = root category, 'sub' = subcategory under an existing parent
  const [createMode, setCreateMode] = useState<'main' | 'sub'>('main');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0]);
  const [newIcon, setNewIcon] = useState('Folder');
  const [newDesc, setNewDesc] = useState('');
  const [newParentId, setNewParentId] = useState<string>('');

  // Simultaneous subcategories list
  const [subcategoriesList, setSubcategoriesList] = useState<string[]>([]);
  const [subInputText, setSubInputText] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editParentId, setEditParentId] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Initialize or handle initialParentId
  useEffect(() => {
    if (isOpen) {
      if (initialParentId) {
        setCreateMode('sub');
        setNewParentId(initialParentId);
        const parent = categories.find((c) => c.id === initialParentId);
        if (parent?.color) {
          setNewColor(parent.color);
        }
      } else {
        setCreateMode('main');
        setNewParentId('');
      }
      setNewName('');
      setSubcategoriesList([]);
      setSubInputText('');
      setEditingId(null);
    }
  }, [isOpen, initialParentId, categories]);

  // Flattened tree for select options with visual indentations
  const flatCategoryOptions = useMemo(() => {
    return getFlattenedCategoryTree(categories);
  }, [categories]);

  // Tree nodes for hierarchical modal display
  const categoryTree = useMemo(() => {
    return buildCategoryTree(categories);
  }, [categories]);

  // Preview path when adding with a parent
  const parentPreviewPath = useMemo(() => {
    if (createMode === 'sub' && newParentId) {
      return getCategoryPathString(newParentId, categories);
    }
    return '';
  }, [createMode, newParentId, categories]);

  if (!isOpen) return null;

  const handleAddSubcategoryChip = () => {
    const trimmed = subInputText.trim();
    if (!trimmed) return;
    if (!subcategoriesList.includes(trimmed)) {
      setSubcategoriesList((prev) => [...prev, trimmed]);
    }
    setSubInputText('');
  };

  const handleRemoveSubcategoryChip = (indexToRemove: number) => {
    setSubcategoriesList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleApplySuggestion = (suggestion: string) => {
    if (!subcategoriesList.includes(suggestion)) {
      setSubcategoriesList((prev) => [...prev, suggestion]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    // Also include whatever is currently in subInputText if user forgot to click Add
    const finalSubcategories = [...subcategoriesList];
    const pendingSub = subInputText.trim();
    if (pendingSub && !finalSubcategories.includes(pendingSub)) {
      finalSubcategories.push(pendingSub);
    }

    setIsSubmitting(true);
    try {
      await onCreateCategory({
        name: newName.trim(),
        color: newColor,
        icon: newIcon,
        description: newDesc.trim() || undefined,
        parentId: createMode === 'sub' && newParentId ? newParentId : null,
        subcategories: finalSubcategories.length > 0 ? finalSubcategories : undefined,
      });

      // Reset form
      setNewName('');
      setNewDesc('');
      setSubcategoriesList([]);
      setSubInputText('');
      if (createMode === 'sub') {
        // Keep parent or switch to main
        setCreateMode('main');
        setNewParentId('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartAddSubcategoryTo = (parentCat: Category) => {
    setCreateMode('sub');
    setNewParentId(parentCat.id);
    setNewColor(parentCat.color || CATEGORY_COLORS[0]);
    setSubcategoriesList([]);
    setSubInputText('');

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 150);
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color || CATEGORY_COLORS[0]);
    setEditIcon(cat.icon || 'Folder');
    setEditParentId(cat.parentId || '');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setIsSubmitting(true);
    try {
      await onUpdateCategory(id, {
        name: editName.trim(),
        color: editColor,
        icon: editIcon,
        parentId: editParentId ? editParentId : null,
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render recursive category tree item
  const renderTreeItem = (node: CategoryTreeNode) => {
    const cat = node.category;
    const directCount = categoryCounts[cat.id] || 0;
    const totalCount = getTotalCategoryNoteCount(cat.id, categories, categoryCounts);
    const isEditing = editingId === cat.id;
    const hasSubcategories = node.children.length > 0;
    const pathBreadcrumb = node.pathString;
    const isCurrentSelectedParent = createMode === 'sub' && newParentId === cat.id;

    return (
      <div key={cat.id} className="space-y-2">
        <div
          className={`p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#12140E] border transition-all ${
            isCurrentSelectedParent
              ? 'border-[#4A6D22] dark:border-[#D0E8B2] ring-2 ring-[#4A6D22]/20 dark:ring-[#D0E8B2]/20 shadow-md'
              : node.depth > 0
              ? 'border-[#E1E4D5]/80 dark:border-[#43493E]/80 mr-3 sm:mr-5 relative before:absolute before:-right-3 sm:before:-right-4 before:top-1/2 before:w-3 sm:before:w-4 before:h-[1.5px] before:bg-[#CCD1C1] dark:before:bg-[#43493E]'
              : 'border-[#E1E4D5] dark:border-[#43493E] shadow-xs'
          }`}
        >
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="نام دسته‌بندی"
                  className="flex-1 bg-black/5 dark:bg-white/5 border border-[#D0E8B2] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none"
                  autoFocus
                />
                <select
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                  className="bg-black/5 dark:bg-white/5 border border-[#E1E4D5] dark:border-[#43493E] rounded-xl px-2.5 py-2 text-xs text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none"
                >
                  <option value="">دسته اصلی (بدون والد)</option>
                  {flatCategoryOptions
                    .filter((opt) => canBeParentCategory(cat.id, opt.category.id, categories))
                    .map((opt) => (
                      <option key={opt.category.id} value={opt.category.id}>
                        {'— '.repeat(opt.depth)} {opt.category.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Color choices in edit mode */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#5E6258] dark:text-[#8F9285]">رنگ:</span>
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`w-4 h-4 rounded-full transition-transform ${
                        editColor === c ? 'ring-2 ring-[#4A6D22] dark:ring-[#D0E8B2] scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(cat.id)}
                    className="px-3 py-1.5 bg-[#D0E8B2] text-[#1A3700] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="ذخیره تغییرات"
                  >
                    <Check className="w-3.5 h-3.5" /> ذخیره
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-2.5 py-1.5 bg-black/10 dark:bg-white/10 text-[#5E6258] dark:text-[#8F9285] rounded-xl text-xs cursor-pointer"
                    title="انصراف"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: cat.color || '#4A6D22' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC] truncate">
                      {cat.name}
                    </span>
                    {node.depth > 0 && (
                      <span
                        className="text-[10px] text-[#76796E] dark:text-[#8F9285] bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full border border-black/5 dark:border-white/5 truncate max-w-[200px]"
                        title={pathBreadcrumb}
                      >
                        {pathBreadcrumb}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#5E6258] dark:text-[#8F9285] flex items-center gap-2 mt-0.5">
                    <span>{directCount} یادداشت</span>
                    {hasSubcategories && (
                      <span className="text-[#4A6D22] dark:text-[#D0E8B2] font-medium">
                        ({totalCount} با زیرمجموعه‌ها)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStartAddSubcategoryTo(cat)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    isCurrentSelectedParent
                      ? 'bg-[#4A6D22] text-white shadow-xs'
                      : 'bg-[#D0E8B2]/30 dark:bg-[#1A3700] hover:bg-[#D0E8B2] text-[#335014] dark:text-[#D0E8B2] hover:text-[#163300]'
                  }`}
                  title={`افزودن زیرمجموعه به «${cat.name}»`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>زیرمجموعه</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStartEdit(cat)}
                  className="p-1.5 sm:p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285] hover:text-[#4A6D22] dark:hover:text-[#D0E8B2] transition-colors cursor-pointer"
                  title="ویرایش دسته‌بندی"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const promptText = hasSubcategories
                      ? `آیا از حذف دسته‌بندی "${cat.name}" و تمام زیرمجموعه‌های آن اطمینان دارید؟`
                      : `آیا از حذف دسته‌بندی "${cat.name}" اطمینان دارید؟`;
                    if (confirm(promptText)) {
                      onDeleteCategory(cat.id);
                    }
                  }}
                  className="p-1.5 sm:p-2 rounded-xl hover:bg-[#5C1A1A]/30 text-[#5E6258] dark:text-[#8F9285] hover:text-[#A64D3B] dark:hover:text-[#FFAB91] transition-colors cursor-pointer"
                  title="حذف دسته‌بندی"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recursive Children with nested line guides */}
        {node.children.length > 0 && (
          <div className="space-y-2 relative pr-2 border-r-2 border-dashed border-[#CCD1C1] dark:border-[#383D33] mr-2 sm:mr-3">
            {node.children.map((childNode) => renderTreeItem(childNode))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#FAF9F5] dark:bg-[#1C1C17] text-[#1A1C16] dark:text-[#E2E3DC] rounded-[24px] sm:rounded-[28px] shadow-2xl border border-[#E1E4D5] dark:border-[#43493E] overflow-hidden flex flex-col max-h-[90vh] anim-scale-in"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E1E4D5] dark:border-[#43493E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#D0E8B2]/30 dark:bg-[#1A3700] flex items-center justify-center text-[#4A6D22] dark:text-[#D0E8B2] shrink-0">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-[#1A1C16] dark:text-[#E2E3DC]">
                مدیریت و ساخت دسته‌بندی‌ها
              </h2>
              <p className="text-[11px] text-[#5E6258] dark:text-[#8F9285]">
                تعریف پوشه‌ها و زیرمجموعه‌ها به صورت درختی و منظم
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-5">
          {/* Create Category Form */}
          <form
            ref={formRef}
            id="category-form-container"
            onSubmit={handleCreate}
            className="p-4 sm:p-4.5 rounded-[22px] bg-white dark:bg-[#141610] border border-[#E1E4D5] dark:border-[#383D33] shadow-xs space-y-4"
          >
            {/* Clear Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E1E4D5]/80 dark:border-[#383D33] pb-3">
              <span className="text-xs font-bold text-[#5E6258] dark:text-[#8F9285]">نوع دسته‌بندی:</span>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setCreateMode('main');
                    setNewParentId('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    createMode === 'main'
                      ? 'bg-white dark:bg-[#23271E] text-[#1A1C16] dark:text-[#E2E3DC] shadow-xs'
                      : 'text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16] dark:hover:text-[#E2E3DC]'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-[#4A6D22] dark:text-[#D0E8B2]" />
                  <span>پوشه اصلی</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreateMode('sub');
                    if (!newParentId && categories.length > 0) {
                      setNewParentId(categories[0].id);
                    }
                  }}
                  disabled={categories.length === 0}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                    createMode === 'sub'
                      ? 'bg-white dark:bg-[#23271E] text-[#1A1C16] dark:text-[#E2E3DC] shadow-xs'
                      : 'text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16] dark:hover:text-[#E2E3DC]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-[#8B6814] dark:text-[#FFE086]" />
                  <span>زیرمجموعه یک پوشه</span>
                </button>
              </div>
            </div>

            {/* Parent Selection when in Subcategory Mode */}
            {createMode === 'sub' && (
              <div className="p-3 rounded-xl bg-[#F4F6EC] dark:bg-[#1A1E14] border border-[#D0E8B2]/50 dark:border-[#384525] space-y-2 anim-scale-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#355216] dark:text-[#D0E8B2] flex items-center gap-1.5">
                    <CornerDownLeft className="w-3.5 h-3.5" />
                    <span>انتخاب پوشه والد (این زیرمجموعه درون کدام پوشه قرار گیرد؟):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateMode('main');
                      setNewParentId('');
                    }}
                    className="text-[11px] text-[#71554E] dark:text-[#D7CCC8] hover:underline cursor-pointer"
                  >
                    تغییر به پوشه اصلی
                  </button>
                </div>

                <select
                  value={newParentId}
                  onChange={(e) => {
                    setNewParentId(e.target.value);
                    const selected = categories.find((c) => c.id === e.target.value);
                    if (selected?.color) setNewColor(selected.color);
                  }}
                  className="w-full bg-white dark:bg-[#12140E] border border-[#CCD1C1] dark:border-[#43493E] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none focus:ring-1 focus:ring-[#4A6D22]"
                >
                  {flatCategoryOptions.map((opt) => (
                    <option key={opt.category.id} value={opt.category.id}>
                      {'— '.repeat(opt.depth)} {opt.category.name}
                    </option>
                  ))}
                </select>

                {parentPreviewPath && (
                  <div className="text-[11px] text-[#4A6D22] dark:text-[#D0E8B2] flex items-center gap-1 pt-0.5">
                    <span className="font-semibold">مسیر والد:</span>
                    <span className="font-bold">{parentPreviewPath}</span>
                  </div>
                )}
              </div>
            )}

            {/* Folder Name Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#5E6258] dark:text-[#8F9285] block">
                {createMode === 'main' ? 'نام پوشه اصلی:' : 'نام این زیرمجموعه:'}
              </label>
              <input
                ref={nameInputRef}
                id="new-category-name-input"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={
                  createMode === 'main'
                    ? 'مثال: دانشگاه، کارهای شخصی، ایده‌ها، پروژه آلفا...'
                    : 'مثال: ترم اول، درس ریاضی، جلسات...'
                }
                className="w-full bg-[#FAF9F5] dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#8F9285] focus:outline-none focus:border-[#4A6D22] focus:ring-1 focus:ring-[#4A6D22]"
              />
            </div>

            {/* Breadcrumb Preview */}
            {parentPreviewPath && newName.trim() && (
              <div className="text-xs bg-[#D0E8B2]/20 dark:bg-[#1A3700]/50 text-[#1A3700] dark:text-[#D0E8B2] px-3 py-2 rounded-xl border border-[#D0E8B2]/40 dark:border-[#3D522C] flex items-center gap-1.5">
                <CornerDownLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">مسیر نهایی:</span>
                <span className="font-bold truncate">
                  {parentPreviewPath} « {newName.trim()}
                </span>
              </div>
            )}

            {/* Color Palette */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-xs font-bold text-[#5E6258] dark:text-[#8F9285]">رنگ پوشه:</span>
              <div className="flex items-center gap-1.5">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                      newColor === c ? 'ring-2 ring-[#4A6D22] dark:ring-[#D0E8B2] scale-115' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* SIMULTANEOUS SUBCATEGORIES BUILDER */}
            <div className="pt-2 border-t border-[#E1E4D5]/80 dark:border-[#383D33] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FolderPlus className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                  <span className="text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                    زیرمجموعه‌های این پوشه (ایجاد همزمان)
                  </span>
                  <span className="text-[10px] bg-[#EAEEDF] dark:bg-[#252920] text-[#5E6258] dark:text-[#8F9285] px-1.5 py-0.5 rounded-md font-medium">
                    اختیاری
                  </span>
                </div>
                {subcategoriesList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSubcategoriesList([])}
                    className="text-[11px] text-[#A64D3B] hover:underline cursor-pointer"
                  >
                    پاک کردن همه
                  </button>
                )}
              </div>

              <p className="text-[11px] text-[#5E6258] dark:text-[#8F9285] leading-relaxed">
                می‌توانید همزمان زیرمجموعه‌های این پوشه را هم وارد کنید تا همه با هم ساخته شوند:
              </p>

              {/* Subcategory Input Row */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={subInputText}
                  onChange={(e) => setSubInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubcategoryChip();
                    }
                  }}
                  placeholder="افزودن نام زیرمجموعه (مثلاً: ترم اول، فیزیک، یادداشت‌ها...)"
                  className="flex-1 bg-[#FAF9F5] dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] rounded-xl px-3 py-2 text-xs text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#8F9285] focus:outline-none focus:border-[#4A6D22]"
                />
                <button
                  type="button"
                  onClick={handleAddSubcategoryChip}
                  disabled={!subInputText.trim()}
                  className="px-3 py-2 bg-[#E5E9DB] dark:bg-[#252A1E] hover:bg-[#D0E8B2] hover:text-[#1A3700] text-[#335014] dark:text-[#D0E8B2] disabled:opacity-40 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن</span>
                </button>
              </div>

              {/* Tags/Chips List */}
              {subcategoriesList.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#F6F7F2] dark:bg-[#181B13] rounded-xl border border-[#E1E4D5]/80 dark:border-[#2D3325]">
                  {subcategoriesList.map((subName, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-white dark:bg-[#23271E] text-[#1A1C16] dark:text-[#E2E3DC] px-2.5 py-1 rounded-lg border border-[#D0E8B2] dark:border-[#3E4F28] text-xs shadow-2xs anim-scale-in"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: newColor }}
                      />
                      <span className="font-semibold">{subName}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubcategoryChip(idx)}
                        className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[#5E6258] hover:text-[#A64D3B] transition-colors cursor-pointer"
                        title="حذف این زیرمجموعه"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <span className="text-[11px] text-[#5E6258] dark:text-[#8F9285] mr-auto pl-1 font-medium">
                    {subcategoriesList.length} زیرمجموعه آماده ساخت
                  </span>
                </div>
              ) : (
                /* Quick Clickable Suggestions */
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[11px] text-[#5E6258] dark:text-[#8F9285]">پیشنهاد سریع:</span>
                  {QUICK_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handleApplySuggestion(sug)}
                      className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-[#D0E8B2]/30 text-[#4A6D22] dark:text-[#D0E8B2] text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>{sug}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !newName.trim()}
                className="w-full py-2.5 sm:py-3 bg-[#D0E8B2] hover:bg-[#c2de9f] disabled:opacity-40 text-[#1A3700] rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {isSubmitting ? (
                  <span>در حال ایجاد...</span>
                ) : subcategoriesList.length > 0 ? (
                  <span>
                    {createMode === 'main' ? 'ایجاد پوشه' : 'ایجاد زیرمجموعه'} به همراه {subcategoriesList.length} زیرشاخه
                  </span>
                ) : createMode === 'main' ? (
                  <span>ایجاد پوشه جدید</span>
                ) : (
                  <span>ایجاد زیرمجموعه</span>
                )}
              </button>
            </div>
          </form>

          {/* Existing Categories Tree */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-[#5E6258] dark:text-[#8F9285] uppercase tracking-wider flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-[#4A6D22] dark:text-[#D0E8B2]" />
                <span>پوشه‌ها و ساختار درختی ({categories.length})</span>
              </h3>
              <span className="text-[10px] text-[#76796E] dark:text-[#8F9285] hidden sm:inline">
                روی دکمه «+ زیرمجموعه» هر پوشه کلیک کنید تا زیرشاخه به آن اضافه شود
              </span>
            </div>

            {categoryTree.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#5E6258] dark:text-[#8F9285] bg-black/5 dark:bg-white/5 rounded-2xl">
                هنوز هیچ دسته‌بندی ایجاد نشده است. از فرم بالا اولین پوشه را بسازید.
              </div>
            ) : (
              <div className="space-y-2.5">
                {categoryTree.map((rootNode) => renderTreeItem(rootNode))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#E1E4D5] dark:border-[#43493E] flex items-center justify-between bg-black/5 dark:bg-white/5 shrink-0">
          <span className="text-[11px] text-[#5E6258] dark:text-[#8F9285] hidden sm:inline">
            یادداشت‌ها در هر سطحی از دسته‌ها و زیرمجموعه‌ها پشتیبانی می‌شوند.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-[#D0E8B2] hover:bg-[#c2de9f] text-[#1A3700] rounded-full text-xs font-bold shadow-xs transition-all mr-auto cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
