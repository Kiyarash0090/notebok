import React from 'react';
import { BookOpen } from 'lucide-react';

// Full-screen splash shown while the app initializes / loads data.
export const LoadingScreen: React.FC = () => (
  <div className="fixed inset-0 z-[999] bg-[#F5F6EE] dark:bg-[#12140E] flex flex-col items-center justify-center gap-5 anim-fade-in">
    <div className="flex items-center justify-center">
      <div className="relative">
        <span className="absolute inset-0 rounded-2xl bg-[#D0E8B2]/50 animate-ping" />
        <div className="relative w-16 h-16 rounded-2xl bg-[#D0E8B2] text-[#1A3700] flex items-center justify-center shadow-lg">
          <BookOpen className="w-8 h-8" />
        </div>
      </div>
    </div>

    <div className="text-center space-y-1">
      <div className="text-xl font-extrabold tracking-tight text-[#1A1C16] dark:text-[#E2E3DC]">NIVRA</div>
      <div className="text-xs text-[#5E6258] dark:text-[#8F9285]">Write Learn Remember</div>
    </div>

    <div className="w-7 h-7 rounded-full border-3 border-[#D0E8B2] border-t-transparent animate-spin" />
    <div className="text-[11px] text-[#8F9285]">
      در حال بارگذاری…
      <span className="block mt-0.5 text-[9px]">اگر طول کشید، اتصال اینترنت خود را بررسی کنید.</span>
    </div>
  </div>
);
