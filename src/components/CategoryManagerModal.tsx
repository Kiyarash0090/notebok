import React, { useState } from 'react';
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
  Heart,
  Sparkles,
} from 'lucide-react';
import { Category } from '../types';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCreateCategory: (cat: { name: string; color: string; icon: string; description?: string }) => Promise<void>;
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

const AVAILABLE_ICONS = [
  { id: 'Folder', label: 'پوشه', icon: Folder },
  { id: 'GraduationCap', label: 'دانشگاه و درس', icon: GraduationCap },
  { id: 'AlertCircle', label: 'نکات ضروری', icon: AlertCircle },
  { id: 'Briefcase', label: 'کار و پروژه', icon: Briefcase },
  { id: 'Lightbulb', label: 'ایده‌ها', icon: Lightbulb },
  { id: 'BookOpen', label: 'کتاب و مطالعه', icon: BookOpen },
  { id: 'Code', label: 'کدنویسی', icon: Code },
  { id: 'Sparkles', label: 'طلایی', icon: Sparkles },
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      });
      setNewName('');
      setNewDesc('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color || CATEGORY_COLORS[0]);
    setEditIcon(cat.icon || 'Folder');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setIsSubmitting(true);
    try {
      await onUpdateCategory(id, {
        name: editName.trim(),
        color: editColor,
        icon: editIcon,
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#FAF9F5] dark:bg-[#1C1C17] text-[#1A1C16] dark:text-[#E2E3DC] rounded-[28px] shadow-2xl border border-[#E1E4D5] dark:border-[#43493E] overflow-hidden flex flex-col max-h-[85vh] anim-scale-in"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E1E4D5] dark:border-[#43493E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Folder className="w-5 h-5 text-[#4A6D22] dark:text-[#D0E8B2]" />
            <h2 className="font-bold text-base text-[#1A1C16] dark:text-[#E2E3DC]">
              مدیریت دسته‌بندی‌های موضوعی
            </h2>
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
          {/* Create New Category Form */}
          <form onSubmit={handleCreate} className="p-4 rounded-[20px] bg-black/5 dark:bg-white/5 border border-[#E1E4D5] dark:border-[#43493E] space-y-3.5">
            <h3 className="font-bold text-xs text-[#5E6258] dark:text-[#8F9285] uppercase tracking-wider">
              افزودن موضوع جدید
            </h3>

            <div>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: فیزیک کوانتوم، نکات آزمون، مقالات..."
                className="w-full bg-white dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#5E6258] dark:placeholder-[#8F9285] focus:outline-none focus:border-[#D0E8B2]"
              />
            </div>

            {/* Color & Icon choices */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Color choices */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5E6258] dark:text-[#8F9285]">رنگ:</span>
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

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting || !newName.trim()}
                className="px-4 py-2 bg-[#D0E8B2] hover:bg-[#c2de9f] disabled:opacity-50 text-[#1A3700] rounded-full text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                افزودن دسته‌بندی
              </button>
            </div>
          </form>

          {/* List of existing categories */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-xs text-[#5E6258] dark:text-[#8F9285] uppercase tracking-wider">
              دسته‌های ثبت شده در سرور ({categories.length})
            </h3>

            {categories.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              const isEditing = editingId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] transition-all"
                >
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-black/5 dark:bg-white/5 border border-[#D0E8B2] rounded-xl px-3 py-1.5 text-xs text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(cat.id)}
                        className="p-2 bg-[#D0E8B2] text-[#1A3700] rounded-xl text-xs font-bold"
                        title="ذخیره"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-2 bg-black/10 dark:bg-white/10 text-[#5E6258] rounded-xl text-xs"
                        title="انصراف"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: cat.color || '#4A6D22' }}
                        />
                        <div>
                          <div className="font-semibold text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC]">
                            {cat.name}
                          </div>
                          <div className="text-[10px] text-[#5E6258] dark:text-[#8F9285]">
                            {count} یادداشت ثبت شده
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285] hover:text-[#4A6D22] dark:hover:text-[#D0E8B2] transition-colors"
                          title="ویرایش نام"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`آیا از حذف دسته‌بندی "${cat.name}" اطمینان دارید؟`)) {
                              onDeleteCategory(cat.id);
                            }
                          }}
                          className="p-2 rounded-2xl hover:bg-[#5C1A1A]/30 text-[#5E6258] dark:text-[#8F9285] hover:text-[#A64D3B] dark:hover:text-[#FFAB91] transition-colors"
                          title="حذف دسته‌بندی"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#E1E4D5] dark:border-[#43493E] flex justify-end bg-black/5 dark:bg-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-[#D0E8B2] hover:bg-[#c2de9f] text-[#1A3700] rounded-full text-xs font-bold shadow-sm transition-all"
          >
            تأیید و بازگشت
          </button>
        </div>
      </div>
    </div>
  );
};
