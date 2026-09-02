import React from 'react';
import {
  BookOpen,
  Star,
  CheckSquare,
  Folder,
  FolderPlus,
  Archive,
  Trash2,
  Database,
  Tag,
  GraduationCap,
  Briefcase,
  Lightbulb,
  AlertCircle,
  Hash,
  ChevronLeft,
  X,
  Send,
} from 'lucide-react';
import { Category, ViewFilter } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilter: ViewFilter;
  selectedCategory: string | null;
  onSelectFilter: (filter: ViewFilter, categoryId?: string) => void;
  categories: Category[];
  onOpenCategoryManager: () => void;
  onOpenBackup: () => void;
  onOpenTelegramStorage?: () => void;
  counts: {
    all: number;
    important: number;
    checklists: number;
    archive: number;
    trash: number;
  };
  categoryCounts: Record<string, number>;
}

// Icon resolver helper
const renderCategoryIcon = (iconName?: string, color?: string) => {
  const iconProps = { className: 'w-4 h-4 shrink-0', style: { color: color || '#1A73E8' } };
  switch (iconName) {
    case 'GraduationCap':
      return <GraduationCap {...iconProps} />;
    case 'AlertCircle':
      return <AlertCircle {...iconProps} />;
    case 'Briefcase':
      return <Briefcase {...iconProps} />;
    case 'Lightbulb':
      return <Lightbulb {...iconProps} />;
    default:
      return <Folder {...iconProps} />;
  }
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentFilter,
  selectedCategory,
  onSelectFilter,
  categories,
  onOpenCategoryManager,
  onOpenBackup,
  onOpenTelegramStorage,
  counts,
  categoryCounts,
}) => {
  const isSelected = (filter: ViewFilter, catId?: string) => {
    if (filter === 'category') {
      return currentFilter === 'category' && selectedCategory === catId;
    }
    return currentFilter === filter && !selectedCategory;
  };

  const navItemClass = (active: boolean) =>
    `w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-150 ${
      active
        ? 'bg-[#D0E8B2] text-[#1A3700] font-bold shadow-xs'
        : 'text-[#43493E] dark:text-[#E2E3DC] hover:bg-[#EAECE2] dark:hover:bg-[#23261F]'
    }`;

  return (
    <>
      {/* Backdrop (all sizes) — dims and click-closes the drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[45] bg-black/50 backdrop-blur-xs transition-opacity anim-fade-in"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        id="app-sidebar"
        className={`fixed top-16 bottom-0 right-0 z-50 w-64 bg-[#F5F6EE] dark:bg-[#1C1C17] border-l border-[#E1E4D5] dark:border-[#43493E] pt-3 pb-6 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto px-2 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#E1E4D5] dark:border-[#43493E] pb-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#D0E8B2] text-[#1A3700] flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-[#1A1C16] dark:text-[#E2E3DC]">
                دفترچه و دسته‌ها
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[#EAECE2] dark:hover:bg-[#23261F] text-[#5E6258] dark:text-[#8F9285]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Core Navigation Items */}
          <div className="space-y-1">
            <button
              id="sidebar-all-notes"
              onClick={() => {
                onSelectFilter('all');
                onClose();
              }}
              className={navItemClass(isSelected('all'))}
            >
              <div className="flex items-center gap-3">
                <BookOpen className={`w-4 h-4 shrink-0 ${isSelected('all') ? 'text-[#1A3700]' : 'text-[#5E6258] dark:text-[#8F9285]'}`} />
                <span>همه جزوه‌ها و یادداشت‌ها</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isSelected('all') ? 'bg-[#1A3700] text-[#D0E8B2]' : 'bg-[#E0E4D5] dark:bg-[#23261F] text-[#43493E] dark:text-[#8F9285]'}`}>
                {counts.all}
              </span>
            </button>

            <button
              id="sidebar-important-notes"
              onClick={() => {
                onSelectFilter('important');
                onClose();
              }}
              className={navItemClass(isSelected('important'))}
            >
              <div className="flex items-center gap-3">
                <Star className="w-4 h-4 shrink-0 text-[#FFE086] fill-current" />
                <span className="font-medium">نکات طلایی</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isSelected('important') ? 'bg-[#1A3700] text-[#D0E8B2]' : 'bg-[#FAF2DE] dark:bg-[#332A18] text-[#8B6814] dark:text-[#FFE086]'}`}>
                {counts.important}
              </span>
            </button>

            <button
              id="sidebar-checklists"
              onClick={() => {
                onSelectFilter('checklists');
                onClose();
              }}
              className={navItemClass(isSelected('checklists'))}
            >
              <div className="flex items-center gap-3">
                <CheckSquare className={`w-4 h-4 shrink-0 ${isSelected('checklists') ? 'text-[#1A3700]' : 'text-[#4A6D22] dark:text-[#D0E8B2]'}`} />
                <span>چک‌لیست‌ها و کارها</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isSelected('checklists') ? 'bg-[#1A3700] text-[#D0E8B2]' : 'bg-[#E0E4D5] dark:bg-[#23261F] text-[#43493E] dark:text-[#8F9285]'}`}>
                {counts.checklists}
              </span>
            </button>
          </div>

          {/* Subjects / Categories Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between px-4 pb-2">
              <span className="text-[11px] font-bold tracking-wider text-[#5E6258] dark:text-[#8F9285] uppercase">
                دسته‌بندی‌های موضوعی
              </span>
              <button
                id="btn-manage-categories"
                onClick={onOpenCategoryManager}
                className="text-[11px] text-[#4A6D22] dark:text-[#D0E8B2] hover:underline font-bold flex items-center gap-1"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                مدیریت
              </button>
            </div>

            <div className="space-y-1">
              {categories.map((cat) => {
                const count = categoryCounts[cat.id] || 0;
                const active = isSelected('category', cat.id);
                return (
                  <button
                    key={cat.id}
                    id={`sidebar-cat-${cat.id}`}
                    onClick={() => {
                      onSelectFilter('category', cat.id);
                      onClose();
                    }}
                    className={navItemClass(active)}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: cat.color || '#4A6D22' }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${active ? 'bg-[#1A3700] text-[#D0E8B2]' : 'bg-[#E0E4D5] dark:bg-[#23261F] text-[#43493E] dark:text-[#8F9285]'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}

              {categories.length === 0 && (
                <div className="px-4 py-3 text-xs text-[#5E6258] dark:text-[#8F9285] italic">
                  هنوز دسته‌ای ساخته نشده است.
                </div>
              )}
            </div>
          </div>

          {/* System & Utilities */}
          <div className="pt-2 border-t border-[#E1E4D5] dark:border-[#43493E] space-y-1">
            <button
              id="sidebar-archive"
              onClick={() => {
                onSelectFilter('archive');
                onClose();
              }}
              className={navItemClass(isSelected('archive'))}
            >
              <div className="flex items-center gap-3">
                <Archive className={`w-4 h-4 shrink-0 ${isSelected('archive') ? 'text-[#1A3700]' : 'text-[#5E6258] dark:text-[#8F9285]'}`} />
                <span>بایگانی</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isSelected('archive') ? 'bg-[#1A3700] text-[#D0E8B2]' : 'bg-[#E0E4D5] dark:bg-[#23261F] text-[#43493E] dark:text-[#8F9285]'}`}>
                {counts.archive}
              </span>
            </button>

            <button
              id="sidebar-trash"
              onClick={() => {
                onSelectFilter('trash');
                onClose();
              }}
              className={navItemClass(isSelected('trash'))}
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4 shrink-0 text-[#A64D3B]" />
                <span>سطل زباله</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isSelected('trash') ? 'bg-[#1A3700] text-[#D0E8B2]' : 'bg-[#E0E4D5] dark:bg-[#23261F] text-[#43493E] dark:text-[#8F9285]'}`}>
                {counts.trash}
              </span>
            </button>

            {onOpenTelegramStorage && (
              <button
                id="sidebar-telegram-action"
                onClick={() => {
                  onOpenTelegramStorage();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-[#0088cc] hover:bg-[#EAECE2] dark:hover:bg-[#23261F] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Send className="w-4 h-4 shrink-0 text-[#0088cc]" />
                  <span>ابَر-فضای ابری تلگرام</span>
                </div>
                <span className="text-[10px] bg-[#0088cc]/15 text-[#0088cc] px-1.5 py-0.5 rounded-md font-bold">
                  MTProto
                </span>
              </button>
            )}

            <button
              id="sidebar-backup-action"
              onClick={() => {
                onOpenBackup();
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium text-[#4A6D22] dark:text-[#D0E8B2] hover:bg-[#EAECE2] dark:hover:bg-[#23261F] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 shrink-0 text-[#4A6D22] dark:text-[#D0E8B2]" />
                <span>پشتیبان‌گیری و بازگردانی</span>
              </div>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Footer info in sidebar */}
        <div className="px-4 pt-3 border-t border-[#E1E4D5] dark:border-[#43493E] text-[11px] text-[#5E6258] dark:text-[#8F9285] space-y-1">
          <div className="flex items-center justify-between font-medium">
            <span>ذخیره در سرور:</span>
            <span className="text-[#4A6D22] dark:text-[#D0E8B2] font-bold">فعال و دائمی</span>
          </div>
          <div>نسخه ۲.۰ | هماهنگ با تم Natural Tones</div>
        </div>
      </aside>
    </>
  );
};
