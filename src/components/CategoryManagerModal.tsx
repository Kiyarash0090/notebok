import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Folder,
  Trash2,
  Edit2,
  Check,
  GraduationCap,
  AlertCircle,
  Briefcase,
  Lightbulb,
  BookOpen,
  Code,
  Sparkles,
  ChevronLeft,
  CornerDownLeft,
  FolderTree,
  Layers,
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
  }) => Promise<void>;
  onUpdateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  categoryCounts: Record<string, number>;
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

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  categoryCounts,
}) => {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0]);
  const [newIcon, setNewIcon] = useState('Folder');
  const [newDesc, setNewDesc] = useState('');
  const [newParentId, setNewParentId] = useState<string>('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editParentId, setEditParentId] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Flattened tree for select options with visual indentations
  const flatCategoryOptions = useMemo(() => {
    return getFlattenedCategoryTree(categories);
  }, [categories]);

  // Tree nodes for hierarchical modal display
  const categoryTree = useMemo(() => {
    return buildCategoryTree(categories);
  }, [categories]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateCategory({
        name: newName.trim(),
        color: newColor,
        icon: newIcon,
        description: newDesc.trim() || undefined,
        parentId: newParentId ? newParentId : null,
      });
      setNewName('');
      setNewDesc('');
      setNewParentId('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartAddSubcategory = (parentCat: Category) => {
    setNewParentId(parentCat.id);
    setNewColor(parentCat.color || CATEGORY_COLORS[0]);
    // Scroll smoothly to form if needed
    const formElem = document.getElementById('category-form-container');
    if (formElem) {
      formElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    const inputElem = document.getElementById('new-category-name-input');
    if (inputElem) {
      inputElem.focus();
    }
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

  // Preview path when adding with a parent
  const parentPreviewPath = newParentId
    ? getCategoryPathString(newParentId, categories)
    : '';

  // Render recursive category tree item
  const renderTreeItem = (node: CategoryTreeNode) => {
    const cat = node.category;
    const directCount = categoryCounts[cat.id] || 0;
    const totalCount = getTotalCategoryNoteCount(cat.id, categories, categoryCounts);
    const isEditing = editingId === cat.id;
    const hasSubcategories = node.children.length > 0;
    const pathBreadcrumb = node.pathString;

    return (
      <div key={cat.id} className="space-y-2">
        <div
          className={`p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#12140E] border transition-all ${
            node.depth > 0
              ? 'border-[#E1E4D5]/80 dark:border-[#43493E]/80 mr-4 sm:mr-6 relative before:absolute before:-right-3 sm:before:-right-4 before:top-1/2 before:w-3 sm:before:w-4 before:h-[1.5px] before:bg-[#CCD1C1] dark:before:bg-[#43493E]'
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
                  className="flex-1 bg-black/5 dark:bg-white/5 border border-[#D0E8B2] rounded-xl px-3 py-1.5 text-xs text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none"
                  autoFocus
                />
                <select
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                  className="bg-black/5 dark:bg-white/5 border border-[#E1E4D5] dark:border-[#43493E] rounded-xl px-2.5 py-1.5 text-xs text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none"
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

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(cat.id)}
                    className="px-3 py-1.5 bg-[#D0E8B2] text-[#1A3700] rounded-xl text-xs font-bold flex items-center gap-1"
                    title="ذخیره"
                  >
                    <Check className="w-3.5 h-3.5" /> ذخیره
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-2.5 py-1.5 bg-black/10 dark:bg-white/10 text-[#5E6258] dark:text-[#8F9285] rounded-xl text-xs"
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
                      <span className="text-[10px] text-[#76796E] dark:text-[#8F9285] bg-black/5 dark:bg-white/5 px-2 py-0.2 rounded-full border border-black/5 dark:border-white/5 truncate max-w-[200px]" title={pathBreadcrumb}>
                        {pathBreadcrumb}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#5E6258] dark:text-[#8F9285] flex items-center gap-2 mt-0.5">
                    <span>{directCount} یادداشت مستقیم</span>
                    {hasSubcategories && (
                      <span className="text-[#4A6D22] dark:text-[#D0E8B2] font-medium">
                        ({totalCount} با زیرمجموعه‌ها)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStartAddSubcategory(cat)}
                  className="px-2 py-1 rounded-xl bg-[#EDEEEB] dark:bg-[#1C1C17] hover:bg-[#D0E8B2]/30 text-[#4A6D22] dark:text-[#D0E8B2] text-[11px] font-bold flex items-center gap-1 transition-colors"
                  title="افزودن زیرمجموعه به این دسته"
                >
                  <Plus className="w-3 h-3" />
                  <span className="hidden sm:inline">زیردسته</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStartEdit(cat)}
                  className="p-1.5 sm:p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285] hover:text-[#4A6D22] dark:hover:text-[#D0E8B2] transition-colors"
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
                  className="p-1.5 sm:p-2 rounded-xl hover:bg-[#5C1A1A]/30 text-[#5E6258] dark:text-[#8F9285] hover:text-[#A64D3B] dark:hover:text-[#FFAB91] transition-colors"
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
          <div className="space-y-2 relative pr-2 border-r-2 border-dashed border-[#E1E4D5] dark:border-[#33382E] mr-2 sm:mr-3">
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
        className="w-full max-w-xl bg-[#FAF9F5] dark:bg-[#1C1C17] text-[#1A1C16] dark:text-[#E2E3DC] rounded-[28px] shadow-2xl border border-[#E1E4D5] dark:border-[#43493E] overflow-hidden flex flex-col max-h-[88vh] anim-scale-in"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E1E4D5] dark:border-[#43493E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#D0E8B2]/30 dark:bg-[#1A3700] flex items-center justify-center text-[#4A6D22] dark:text-[#D0E8B2]">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[#1A1C16] dark:text-[#E2E3DC]">
                مدیریت دسته‌ها و زیرمجموعه‌ها
              </h2>
              <p className="text-[11px] text-[#5E6258] dark:text-[#8F9285]">
                سازماندهی درختی یادداشت‌ها (مثال: دانشگاه « ترم اول « درس ریاضی)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* Create New Category / Subcategory Form */}
          <form
            id="category-form-container"
            onSubmit={handleCreate}
            className="p-4 rounded-[20px] bg-black/5 dark:bg-white/5 border border-[#E1E4D5] dark:border-[#43493E] space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-[#5E6258] dark:text-[#8F9285] uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-[#4A6D22] dark:text-[#D0E8B2]" />
                {newParentId ? 'افزودن زیرمجموعه جدید' : 'افزودن دسته‌بندی جدید'}
              </h3>
              {newParentId && (
                <button
                  type="button"
                  onClick={() => setNewParentId('')}
                  className="text-[11px] text-[#8B6814] dark:text-[#FFE086] hover:underline flex items-center gap-1 font-bold"
                >
                  تغییر به دسته اصلی
                </button>
              )}
            </div>

            {/* Parent Category Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285] flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#4A6D22] dark:text-[#D0E8B2]" />
                <span>دسته والد (اختیاری برای زیرمجموعه‌سازی):</span>
              </label>
              <select
                value={newParentId}
                onChange={(e) => setNewParentId(e.target.value)}
                className="w-full bg-white dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] rounded-xl px-3 py-2 text-xs text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none focus:border-[#4A6D22]"
              >
                <option value="">بدون والد (دسته‌بندی اصلی)</option>
                {flatCategoryOptions.map((opt) => (
                  <option key={opt.category.id} value={opt.category.id}>
                    {'— '.repeat(opt.depth)} {opt.category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Name Input */}
            <div>
              <input
                id="new-category-name-input"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={
                  newParentId
                    ? `نام زیرمجموعه (مثلاً: ترم اول، درس ریاضی، مبحث انتگرال...)`
                    : 'نام دسته‌بندی (مثلاً: دانشگاه، کاری، شخصی...)'
                }
                className="w-full bg-white dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#5E6258] dark:placeholder-[#8F9285] focus:outline-none focus:border-[#4A6D22]"
              />
            </div>

            {/* Breadcrumb Preview */}
            {parentPreviewPath && newName.trim() && (
              <div className="text-[11px] bg-[#D0E8B2]/20 dark:bg-[#1A3700]/50 text-[#1A3700] dark:text-[#D0E8B2] px-3 py-1.5 rounded-xl border border-[#D0E8B2]/40 dark:border-[#3D522C] flex items-center gap-1.5">
                <CornerDownLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold">مسیر نهایی:</span>
                <span className="font-bold">{parentPreviewPath} « {newName.trim()}</span>
              </div>
            )}

            {/* Color choices & Submit */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5E6258] dark:text-[#8F9285]">رنگ:</span>
                <div className="flex items-center gap-1">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-5 h-5 rounded-full transition-transform ${
                        newColor === c ? 'ring-2 ring-[#4A6D22] dark:ring-[#D0E8B2] scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !newName.trim()}
                className="px-4 py-2 bg-[#D0E8B2] hover:bg-[#c2de9f] disabled:opacity-50 text-[#1A3700] rounded-full text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                {newParentId ? 'ثبت زیرمجموعه' : 'افزودن دسته‌بندی'}
              </button>
            </div>
          </form>

          {/* List of existing categories as a Tree */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-[#5E6258] dark:text-[#8F9285] uppercase tracking-wider">
                ساختار درختی دسته‌ها ({categories.length})
              </h3>
              <span className="text-[10px] text-[#76796E] dark:text-[#8F9285]">
                برای افزودن زیرمجموعه روی دکمه «+ زیردسته» کلیک کنید
              </span>
            </div>

            {categoryTree.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#5E6258] dark:text-[#8F9285] bg-black/5 dark:bg-white/5 rounded-2xl">
                هنوز هیچ دسته‌بندی ثبت نشده است. از فرم بالا اولین دسته را بسازید.
              </div>
            ) : (
              <div className="space-y-2.5">
                {categoryTree.map((rootNode) => renderTreeItem(rootNode))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#E1E4D5] dark:border-[#43493E] flex items-center justify-between bg-black/5 dark:bg-white/5">
          <span className="text-[11px] text-[#5E6258] dark:text-[#8F9285] hidden sm:inline">
            یادداشت‌ها می‌توانند در هر سطحی از دسته‌ها و زیرمجموعه‌ها قرار بگیرند.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-[#D0E8B2] hover:bg-[#c2de9f] text-[#1A3700] rounded-full text-xs font-bold shadow-sm transition-all ml-auto"
          >
            تأیید و بستن
          </button>
        </div>
      </div>
    </div>
  );
};
