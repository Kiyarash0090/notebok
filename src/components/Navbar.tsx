import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  X,
  Sun,
  Moon,
  CheckCircle2,
  BookOpen,
  SlidersHorizontal,
  Database,
  Folder,
  ShieldCheck,
  Send,
  Cloud,
} from 'lucide-react';
import { ThemeMode } from '../types';

interface NavbarProps {
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenAdvancedSearch?: () => void;
  hasActiveAdvancedFilters?: boolean;
  onOpenBackup?: () => void;
  onOpenCategoryManager?: () => void;
  onOpenTelegramStorage?: () => void;
  isSaving: boolean;
  notesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  theme,
  onToggleTheme,
  onOpenAdvancedSearch,
  hasActiveAdvancedFilters = false,
  onOpenBackup,
  onOpenCategoryManager,
  onOpenTelegramStorage,
  notesCount,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  return (
    <header className="sticky top-0 z-[60] bg-[#F5F6EE]/95 dark:bg-[#1C1C17]/95 backdrop-blur-md border-b border-[#E1E4D5] dark:border-[#43493E] px-3 sm:px-6 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Right Section (in RTL, Right is the start) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            id="btn-toggle-sidebar"
            onClick={onToggleSidebar}
            className="p-2.5 rounded-2xl hover:bg-[#E8ECE0] dark:hover:bg-[#23261F] text-[#43493E] dark:text-[#E2E3DC] transition-colors focus:outline-none focus:ring-2 focus:ring-[#D0E8B2]"
            title="منوی اصلی"
            aria-label="منوی اصلی"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 cursor-pointer select-none">
            <div className="w-9 h-9 rounded-2xl bg-[#D0E8B2] text-[#1A3700] flex items-center justify-center font-bold text-lg shadow-xs">
              <BookOpen className="w-5 h-5 text-[#1A3700]" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-semibold text-base tracking-tight text-[#1A1C16] dark:text-[#E2E3DC]">
                NIVRA
              </span>
              <span className="text-[11px] text-[#5E6258] dark:text-[#8F9285]">
                Write Learn Remember
              </span>
            </div>
          </div>
        </div>

        {/* Center Section: Natural Tones Search Bar */}
        <div className="flex-1 max-w-2xl mx-1 sm:mx-4">
          <div className="relative flex items-center w-full">
            <div className="absolute right-3.5 text-[#5E6258] dark:text-[#8F9285] pointer-events-none flex items-center">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <input
              id="input-global-search"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="جستجو در یادداشت‌ها، فرمول‌ها، پیوست‌ها..."
              className="w-full bg-[#EAECE2] dark:bg-[#1C1C17] hover:bg-[#E3E6DC] dark:hover:bg-[#23261F] focus:bg-white dark:focus:bg-[#12140E] text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#5E6258] dark:placeholder-[#8F9285] text-xs sm:text-sm rounded-full pr-10 pl-16 py-2.5 sm:py-2.5 transition-all duration-200 border border-[#E1E4D5] dark:border-[#43493E] focus:border-[#D0E8B2] dark:focus:border-[#D0E8B2] focus:ring-2 focus:ring-[#D0E8B2]/30 focus:outline-none"
            />
            <div className="absolute left-2.5 flex items-center gap-1">
              {searchQuery && (
                <button
                  id="btn-clear-search"
                  onClick={() => onSearchChange('')}
                  className="p-1 rounded-full text-[#5E6258] hover:text-[#1A1C16] dark:text-[#8F9285] dark:hover:text-[#E2E3DC]"
                  title="پاک کردن جستجو"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Advanced Search Options Button */}
              {onOpenAdvancedSearch && (
                <button
                  id="btn-open-advanced-search"
                  onClick={onOpenAdvancedSearch}
                  className={`p-1.5 rounded-full transition-colors ${
                    hasActiveAdvancedFilters
                      ? 'bg-[#D0E8B2] text-[#1A3700]'
                      : 'text-[#5E6258] hover:text-[#1A1C16] dark:text-[#8F9285] dark:hover:text-[#E2E3DC] hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                  title="جستجوی پیشرفته و فیلترها"
                  aria-label="جستجوی پیشرفته"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Left Section: Actions (in RTL, Left is the end) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 relative" ref={userMenuRef}>
          {/* Theme Toggle (Dark / Light) */}
          <button
            id="btn-toggle-theme"
            onClick={onToggleTheme}
            className="p-2 rounded-2xl hover:bg-[#E8ECE0] dark:hover:bg-[#23261F] text-[#43493E] dark:text-[#E2E3DC] transition-colors"
            title={theme === 'dark' ? 'حالت روز' : 'حالت شب'}
            aria-label="تغییر تم"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-[#FFE086]" />
            ) : (
              <Moon className="w-5 h-5 text-[#43493E]" />
            )}
          </button>

          {/* Natural Tones User Avatar Button */}
          <button
            id="btn-user-avatar"
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-9 h-9 rounded-2xl bg-[#D0E8B2] hover:bg-[#c2dea0] text-[#1A3700] text-xs font-bold flex items-center justify-center select-none shadow-xs border border-[#43493E]/20 transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#D0E8B2]"
            title="حساب کاربری و تنظیمات پشتیبان‌گیری"
            aria-label="پروفایل و تنظیمات"
          >
            N
          </button>

          {/* User Profile / Quick Actions Dropdown */}
          {showUserMenu && (
            <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-[#1C1C17] rounded-2xl shadow-xl border border-[#E1E4D5] dark:border-[#43493E] p-3 w-64 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 pb-3 border-b border-[#E1E4D5] dark:border-[#43493E]">
                <div className="w-10 h-10 rounded-2xl bg-[#D0E8B2] text-[#1A3700] font-bold text-sm flex items-center justify-center shadow-xs">
                  N
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs text-[#1A1C16] dark:text-[#E2E3DC] truncate">
                    NIVRA
                  </span>
                  <span className="text-[11px] text-[#5E6258] dark:text-[#8F9285]">
                    {notesCount} یادداشت ذخیره‌شده
                  </span>
                </div>
              </div>

              <div className="py-2 space-y-1">
                {onOpenTelegramStorage && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenTelegramStorage();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-[#1A1C16] dark:text-[#E2E3DC] hover:bg-[#E8ECE0] dark:hover:bg-[#23261F] transition-colors text-right"
                  >
                    <div className="flex items-center gap-2.5">
                      <Send className="w-4 h-4 text-[#0088cc]" />
                      <span>ابَر-فضای ابری تلگرام</span>
                    </div>
                    <span className="text-[10px] bg-[#0088cc]/15 text-[#0088cc] px-1.5 py-0.5 rounded-md font-bold">
                      MTProto
                    </span>
                  </button>
                )}

                {onOpenBackup && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenBackup();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#1A1C16] dark:text-[#E2E3DC] hover:bg-[#E8ECE0] dark:hover:bg-[#23261F] transition-colors text-right"
                  >
                    <Database className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                    <span>مرکز پشتیبان‌گیری و بازگردانی</span>
                  </button>
                )}

                {onOpenCategoryManager && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenCategoryManager();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[#1A1C16] dark:text-[#E2E3DC] hover:bg-[#E8ECE0] dark:hover:bg-[#23261F] transition-colors text-right"
                  >
                    <Folder className="w-4 h-4 text-[#8B6814] dark:text-[#FFE086]" />
                    <span>مدیریت موضوعات و دسته‌ها</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onToggleTheme();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-[#1A1C16] dark:text-[#E2E3DC] hover:bg-[#E8ECE0] dark:hover:bg-[#23261F] transition-colors text-right"
                >
                  <div className="flex items-center gap-2.5">
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-[#FFE086]" />
                    ) : (
                      <Moon className="w-4 h-4 text-[#43493E]" />
                    )}
                    <span>حالت تم</span>
                  </div>
                  <span className="text-[10px] text-[#5E6258] dark:text-[#8F9285]">
                    {theme === 'dark' ? 'تاریک' : 'روشن'}
                  </span>
                </button>
              </div>

              <div className="pt-2 border-t border-[#E1E4D5] dark:border-[#43493E] flex items-center justify-between text-[10px] text-[#5E6258] dark:text-[#8F9285]">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>ذخیره‌سازی محلی و ابری فعال</span>
                </div>
                <span>نسخه ۲.۰</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
