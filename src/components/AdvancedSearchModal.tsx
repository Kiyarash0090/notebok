import React from 'react';
import {
  Search,
  X,
  Filter,
  Calendar,
  Tag,
  Paperclip,
  Folder,
  Star,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Category, ImportanceLevel } from '../types';

export interface AdvancedSearchFilters {
  search: string;
  category: string;
  tag: string;
  importanceLevel: string;
  hasAttachment: boolean;
  attachmentType: string;
  fromDate: string;
  toDate: string;
}

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedSearchFilters;
  onApplyFilters: (filters: AdvancedSearchFilters) => void;
  categories: Category[];
  availableTags: string[];
}

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  categories,
  availableTags,
}) => {
  const [localFilters, setLocalFilters] = React.useState<AdvancedSearchFilters>(filters);

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  if (!isOpen) return null;

  const handleReset = () => {
    const emptyFilters: AdvancedSearchFilters = {
      search: '',
      category: 'all',
      tag: '',
      importanceLevel: '',
      hasAttachment: false,
      attachmentType: '',
      fromDate: '',
      toDate: '',
    };
    setLocalFilters(emptyFilters);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters(localFilters);
    onClose();
  };

  const activeFiltersCount = [
    localFilters.search.trim() ? 1 : 0,
    localFilters.category && localFilters.category !== 'all' ? 1 : 0,
    localFilters.tag ? 1 : 0,
    localFilters.importanceLevel ? 1 : 0,
    localFilters.hasAttachment || localFilters.attachmentType ? 1 : 0,
    localFilters.fromDate ? 1 : 0,
    localFilters.toDate ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#FAF9F5] dark:bg-[#1C1C17] text-[#1A1C16] dark:text-[#E2E3DC] rounded-[28px] shadow-2xl border border-[#E1E4D5] dark:border-[#43493E] overflow-hidden flex flex-col max-h-[90vh] anim-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E1E4D5] dark:border-[#43493E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Filter className="w-5 h-5 text-[#4A6D22] dark:text-[#D0E8B2]" />
            <h2 className="font-bold text-base text-[#1A1C16] dark:text-[#E2E3DC]">
              جستجوی پیشرفته در جزوه‌ها و یادداشت‌ها
            </h2>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#D0E8B2] text-[#1A3700] text-xs font-bold">
                {activeFiltersCount} فیلتر فعال
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApply} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Keyword Search */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#5E6258] dark:text-[#8F9285] flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>کلمات کلیدی در متن، عنوان یا خلاصه</span>
            </label>
            <input
              type="text"
              value={localFilters.search}
              onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
              placeholder="مثلاً: فرمول، جلسه سه، کوانتوم..."
              className="w-full bg-white dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#5E6258] focus:outline-none focus:border-[#D0E8B2]"
            />
          </div>

          {/* Category Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#5E6258] dark:text-[#8F9285] flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5" />
              <span>دسته‌بندی موضوعی</span>
            </label>
            <select
              value={localFilters.category}
              onChange={(e) => setLocalFilters({ ...localFilters, category: e.target.value })}
              className="w-full bg-white dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none focus:border-[#D0E8B2]"
            >
              <option value="all">همه دسته‌ها</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#5E6258] dark:text-[#8F9285] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>برچسب (Tag)</span>
            </label>
            {availableTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-white dark:bg-[#12140E] rounded-2xl border border-[#E1E4D5] dark:border-[#43493E]">
                <button
                  type="button"
                  onClick={() => setLocalFilters({ ...localFilters, tag: '' })}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    !localFilters.tag
                      ? 'bg-[#D0E8B2] text-[#1A3700]'
                      : 'bg-black/5 dark:bg-white/5 text-[#5E6258] dark:text-[#8F9285]'
                  }`}
                >
                  همه برچسب‌ها
                </button>
                {availableTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLocalFilters({ ...localFilters, tag: localFilters.tag === t ? '' : t })}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                      localFilters.tag === t
                        ? 'bg-[#D0E8B2] text-[#1A3700]'
                        : 'bg-black/5 dark:bg-white/5 text-[#5E6258] dark:text-[#8F9285] hover:bg-black/10'
                    }`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={localFilters.tag}
                onChange={(e) => setLocalFilters({ ...localFilters, tag: e.target.value })}
                placeholder="نام برچسب..."
                className="w-full bg-white dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] rounded-2xl px-3.5 py-2.5 text-xs text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none focus:border-[#D0E8B2]"
              />
            )}
          </div>

          {/* Importance Level */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#5E6258] dark:text-[#8F9285] flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5" />
              <span>میزان اهمیت یادداشت</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: '', label: 'همه' },
                { id: 'normal', label: 'عادی' },
                { id: 'high', label: 'مهم' },
                { id: 'critical', label: 'فوق‌العاده حیاتی' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setLocalFilters({ ...localFilters, importanceLevel: lvl.id })}
                  className={`py-2 px-2 rounded-2xl text-xs font-bold border transition-all text-center ${
                    localFilters.importanceLevel === lvl.id
                      ? 'border-[#D0E8B2] bg-[#D0E8B2]/30 text-[#1A3700] dark:text-[#D0E8B2]'
                      : 'border-[#E1E4D5] dark:border-[#43493E] bg-white dark:bg-[#12140E] text-[#5E6258] dark:text-[#8F9285]'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Attachments Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#5E6258] dark:text-[#8F9285] flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              <span>فیلتر پیوست‌ها</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: '', label: 'همه' },
                { id: 'image', label: '🖼️ تصاویر' },
                { id: 'audio', label: '🎙️ صدا / ویس' },
                { id: 'video', label: '🎥 ویدیوها' },
              ].map((att) => (
                <button
                  key={att.id}
                  type="button"
                  onClick={() =>
                    setLocalFilters({
                      ...localFilters,
                      attachmentType: att.id,
                      hasAttachment: att.id ? true : false,
                    })
                  }
                  className={`py-2 px-2 rounded-2xl text-xs font-bold border transition-all text-center ${
                    localFilters.attachmentType === att.id
                      ? 'border-[#D0E8B2] bg-[#D0E8B2]/30 text-[#1A3700] dark:text-[#D0E8B2]'
                      : 'border-[#E1E4D5] dark:border-[#43493E] bg-white dark:bg-[#12140E] text-[#5E6258] dark:text-[#8F9285]'
                  }`}
                >
                  {att.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date range filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#5E6258] dark:text-[#8F9285] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>بازه زمانی تاریخ ایجاد</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[10px] text-[#5E6258] dark:text-[#8F9285] mb-1">از تاریخ:</span>
                <input
                  type="date"
                  value={localFilters.fromDate}
                  onChange={(e) => setLocalFilters({ ...localFilters, fromDate: e.target.value })}
                  className="w-full bg-white dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] rounded-2xl px-3 py-2 text-xs text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none focus:border-[#D0E8B2]"
                />
              </div>
              <div>
                <span className="block text-[10px] text-[#5E6258] dark:text-[#8F9285] mb-1">تا تاریخ:</span>
                <input
                  type="date"
                  value={localFilters.toDate}
                  onChange={(e) => setLocalFilters({ ...localFilters, toDate: e.target.value })}
                  className="w-full bg-white dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] rounded-2xl px-3 py-2 text-xs text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none focus:border-[#D0E8B2]"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#E1E4D5] dark:border-[#43493E] flex items-center justify-between bg-black/5 dark:bg-white/5">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285] rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            پاک کردن فیلترها
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[#1A1C16] dark:text-[#E2E3DC] rounded-full text-xs font-bold transition-colors"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-6 py-2 bg-[#D0E8B2] hover:bg-[#c2de9f] text-[#1A3700] rounded-full text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              اعمال جستجو
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
