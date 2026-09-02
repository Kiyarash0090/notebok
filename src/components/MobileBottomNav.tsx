import React from 'react';
import {
  BookOpen,
  Star,
  Folder,
  Database,
  Plus,
  CheckSquare,
} from 'lucide-react';
import { ViewFilter } from '../types';

interface MobileBottomNavProps {
  currentFilter: ViewFilter;
  onSelectFilter: (filter: ViewFilter) => void;
  onOpenCreateModal: () => void;
  onOpenCategoryManager: () => void;
  onOpenBackup: () => void;
  importantCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentFilter,
  onSelectFilter,
  onOpenCreateModal,
  onOpenCategoryManager,
  onOpenBackup,
  importantCount,
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF9F5]/98 dark:bg-[#1C1C17]/98 backdrop-blur-md border-t border-[#E1E4D5] dark:border-[#43493E] px-2 py-1 flex items-center justify-between safe-bottom shadow-xl">
      {/* All Notes Tab */}
      <button
        type="button"
        id="mobile-tab-all"
        onClick={() => onSelectFilter('all')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors ${
          currentFilter === 'all'
            ? 'text-[#1A3700] dark:text-[#D0E8B2]'
            : 'text-[#5E6258] dark:text-[#8F9285]'
        }`}
      >
        <div
          className={`px-2.5 py-0.5 rounded-full ${
            currentFilter === 'all' ? 'bg-[#D0E8B2] dark:bg-[#324B10]' : ''
          }`}
        >
          <BookOpen className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold">جزوه‌ها</span>
      </button>

      {/* Important / Starred Tab */}
      <button
        type="button"
        id="mobile-tab-important"
        onClick={() => onSelectFilter('important')}
        className={`relative flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors ${
          currentFilter === 'important'
            ? 'text-[#8B6814] dark:text-[#FFE086]'
            : 'text-[#5E6258] dark:text-[#8F9285]'
        }`}
      >
        <div
          className={`px-2.5 py-0.5 rounded-full ${
            currentFilter === 'important' ? 'bg-[#FFE086]/30 dark:bg-[#5C4509]' : ''
          }`}
        >
          <Star className={`w-5 h-5 ${currentFilter === 'important' ? 'fill-current' : ''}`} />
        </div>
        <span className="text-[10px] font-bold">نکات طلایی</span>
        {importantCount > 0 && (
          <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#8B6814] dark:bg-[#FFE086]" />
        )}
      </button>

      {/* Central Floating Action Button (FAB) Natural Tones Style */}
      <div className="relative -top-3 flex items-center justify-center shrink-0 px-1">
        <button
          type="button"
          id="btn-mobile-fab"
          onClick={onOpenCreateModal}
          className="w-12 h-12 rounded-2xl bg-[#D0E8B2] hover:bg-[#c2de9f] text-[#1A3700] shadow-lg shadow-black/20 flex items-center justify-center active:scale-95 transition-transform"
          title="نوشتن جزوه یا نکته جدید"
          aria-label="یادداشت جدید"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Categories Tab */}
      <button
        type="button"
        id="mobile-tab-categories"
        onClick={onOpenCategoryManager}
        className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16] dark:hover:text-[#E2E3DC]"
      >
        <div className="px-2.5 py-0.5 rounded-full">
          <Folder className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold">دسته‌ها</span>
      </button>

      {/* Backup Tab */}
      <button
        type="button"
        id="mobile-tab-backup"
        onClick={onOpenBackup}
        className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16] dark:hover:text-[#E2E3DC]"
      >
        <div className="px-2.5 py-0.5 rounded-full">
          <Database className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold">بک‌آپ</span>
      </button>
    </div>
  );
};
