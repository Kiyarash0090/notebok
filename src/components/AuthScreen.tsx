import React, { useState } from 'react';
import {
  BookOpen,
  User,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlertCircle,
  Loader2,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import { ThemeMode } from '../types';
import { api } from '../services/api';

interface AuthScreenProps {
  mode: 'setup' | 'login';
  theme: ThemeMode;
  onToggleTheme: () => void;
  onAuthenticated: (username: string) => void;
  onNeedsSetup?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  mode,
  theme,
  onToggleTheme,
  onAuthenticated,
  onNeedsSetup,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSetup = mode === 'setup';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedUsername = username.trim();
    if (isSetup) {
      if (trimmedUsername.length < 2 || trimmedUsername.length > 40) {
        setError('نام کاربری باید بین ۲ تا ۴۰ کاراکتر باشد.');
        return;
      }
      if (password.length < 4 || password.length > 128) {
        setError('رمز عبور باید حداقل ۴ کاراکتر باشد.');
        return;
      }
      if (password !== confirmPassword) {
        setError('رمز عبور و تکرار آن یکسان نیستند.');
        return;
      }
    } else {
      if (!trimmedUsername || !password) {
        setError('لطفاً نام کاربری و رمز عبور را وارد کنید.');
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isSetup) {
        const result = await api.setupAuth({
          username: trimmedUsername,
          password,
          confirmPassword,
        });
        onAuthenticated(result.user.username);
      } else {
        const result = await api.login({
          username: trimmedUsername,
          password,
        });
        onAuthenticated(result.user.username);
      }
    } catch (err: any) {
      if (err?.needsSetup && onNeedsSetup) {
        onNeedsSetup();
        return;
      }
      setError(err?.message || 'خطا در برقراری ارتباط با سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#FAF9F5] dark:bg-[#12140E] text-[#1A1C16] dark:text-[#E2E3DC] flex flex-col items-center justify-center px-4 py-8 sm:px-6 relative transition-colors selection:bg-[#D0E8B2] dark:selection:bg-[#324B10]"
      dir="rtl"
    >
      {/* Top Corner Theme Toggle */}
      <div className="fixed top-4 left-4 sm:top-6 sm:left-6 z-20">
        <button
          id="btn-auth-toggle-theme"
          type="button"
          onClick={onToggleTheme}
          className="w-11 h-11 rounded-2xl bg-white/90 dark:bg-[#1C1C17]/90 border border-[#E1E4D5] dark:border-[#43493E] hover:bg-[#EAECE2] dark:hover:bg-[#23261F] text-[#43493E] dark:text-[#E2E3DC] flex items-center justify-center shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#D0E8B2]"
          title={theme === 'dark' ? 'حالت روز' : 'حالت شب'}
          aria-label="تغییر تم"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-[#FFE086]" />
          ) : (
            <Moon className="w-5 h-5 text-[#43493E]" />
          )}
        </button>
      </div>

      {/* Centered Card Container */}
      <div className="w-full max-w-md anim-fade-up">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#D0E8B2] text-[#1A3700] flex items-center justify-center shadow-sm mb-3">
            <BookOpen className="w-7 h-7" />
          </div>
          <span className="font-bold text-xl tracking-tight text-[#1A1C16] dark:text-[#E2E3DC]">
            NIVRA
          </span>
          <span className="text-xs text-[#5E6258] dark:text-[#8F9285] mt-0.5">
            Write Learn Remember
          </span>
        </div>

        {/* Auth Form Card */}
        <div className="bg-white dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] rounded-3xl p-6 sm:p-8 shadow-sm transition-colors">
          <div className="mb-6 text-center sm:text-right">
            <h1 className="text-lg sm:text-xl font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
              {isSetup ? 'تنظیم نام کاربری و رمز عبور' : 'ورود به حساب کاربری'}
            </h1>
            <p className="text-xs sm:text-[13px] text-[#5E6258] dark:text-[#8F9285] mt-1.5 leading-relaxed">
              {isSetup
                ? 'برای اولین ورود، یک نام کاربری و رمز عبور برای محافظت از یادداشت‌های خود تعیین کنید.'
                : 'برای دسترسی به جزوه‌ها و یادداشت‌های خود وارد شوید.'}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-2xl bg-[#5C1A1A]/10 dark:bg-[#5C1A1A]/30 border border-[#A64D3B]/30 dark:border-[#FFAB91]/30 text-[#8B2B1B] dark:text-[#FFAB91] text-xs flex items-start gap-2.5 anim-fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Username */}
            <div>
              <label
                htmlFor="auth-username"
                className="block text-xs font-semibold text-[#43493E] dark:text-[#C4C7BA] mb-1.5"
              >
                نام کاربری
              </label>
              <div className="relative flex items-center">
                <span className="absolute right-3.5 text-[#5E6258] dark:text-[#8F9285] pointer-events-none flex items-center">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="auth-username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete="username"
                  autoFocus
                  dir="auto"
                  placeholder="مثلاً ali یا student"
                  className="w-full bg-[#F5F6EE] dark:bg-[#12140E] text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#8F9285] text-sm rounded-2xl pr-10 pl-4 py-3 border border-[#E1E4D5] dark:border-[#43493E] focus:bg-white dark:focus:bg-[#12140E] focus:border-[#4A6D22] dark:focus:border-[#D0E8B2] focus:ring-2 focus:ring-[#D0E8B2]/40 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold text-[#43493E] dark:text-[#C4C7BA] mb-1.5"
              >
                رمز عبور
              </label>
              <div className="relative flex items-center">
                <span className="absolute right-3.5 text-[#5E6258] dark:text-[#8F9285] pointer-events-none flex items-center">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete={isSetup ? 'new-password' : 'current-password'}
                  dir="auto"
                  placeholder={isSetup ? 'حداقل ۴ کاراکتر' : 'رمز عبور خود را وارد کنید'}
                  className="w-full bg-[#F5F6EE] dark:bg-[#12140E] text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#8F9285] text-sm rounded-2xl pr-10 pl-11 py-3 border border-[#E1E4D5] dark:border-[#43493E] focus:bg-white dark:focus:bg-[#12140E] focus:border-[#4A6D22] dark:focus:border-[#D0E8B2] focus:ring-2 focus:ring-[#D0E8B2]/40 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute left-2 p-2 rounded-xl text-[#5E6258] hover:text-[#1A1C16] dark:text-[#8F9285] dark:hover:text-[#E2E3DC] transition-colors focus:outline-none focus:ring-2 focus:ring-[#D0E8B2]"
                  aria-label={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
                  title={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (First-Time Setup only) */}
            {isSetup && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-xs font-semibold text-[#43493E] dark:text-[#C4C7BA] mb-1.5"
                >
                  تکرار رمز عبور
                </label>
                <div className="relative flex items-center">
                  <span className="absolute right-3.5 text-[#5E6258] dark:text-[#8F9285] pointer-events-none flex items-center">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    autoComplete="new-password"
                    dir="auto"
                    placeholder="رمز عبور را مجدداً وارد کنید"
                    className="w-full bg-[#F5F6EE] dark:bg-[#12140E] text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#8F9285] text-sm rounded-2xl pr-10 pl-11 py-3 border border-[#E1E4D5] dark:border-[#43493E] focus:bg-white dark:focus:bg-[#12140E] focus:border-[#4A6D22] dark:focus:border-[#D0E8B2] focus:ring-2 focus:ring-[#D0E8B2]/40 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute left-2 p-2 rounded-xl text-[#5E6258] hover:text-[#1A1C16] dark:text-[#8F9285] dark:hover:text-[#E2E3DC] transition-colors focus:outline-none focus:ring-2 focus:ring-[#D0E8B2]"
                    aria-label={showConfirmPassword ? 'مخفی کردن تکرار رمز عبور' : 'نمایش تکرار رمز عبور'}
                    title={showConfirmPassword ? 'مخفی کردن تکرار رمز عبور' : 'نمایش تکرار رمز عبور'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="btn-auth-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-[#4A6D22] hover:bg-[#3B571B] dark:bg-[#D0E8B2] dark:hover:bg-[#BDE098] text-white dark:text-[#1A3700] font-bold text-sm shadow-xs transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D0E8B2]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isSetup ? 'در حال ثبت اطلاعات...' : 'در حال ورود...'}</span>
                </>
              ) : (
                <>
                  {isSetup ? <ShieldCheck className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                  <span>{isSetup ? 'ذخیره اطلاعات و ورود' : 'ورود به حساب'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
