import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleSoftReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F6EE] dark:bg-[#12140E] text-[#1A1C16] dark:text-[#E2E3DC] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#1C1C17] p-6 sm:p-8 rounded-[28px] border border-[#E1E4D5] dark:border-[#43493E] shadow-xl text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#5C1A1A]/10 dark:bg-[#5C1A1A]/30 text-[#A64D3B] dark:text-[#FFAB91] mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                خطایی در اجرای برنامه رخ داد
              </h2>
              <p className="text-xs sm:text-sm text-[#5E6258] dark:text-[#8F9285] leading-relaxed">
                متأسفانه یک خطای غیرمنتظره مانع از نمایش بخش مورد نظر شد. اطلاعات شما در حافظه ذخیره شده است.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[11px] font-mono text-left text-red-600 dark:text-red-400 overflow-x-auto max-h-28 dir-ltr">
                {this.state.error.message || 'Unknown Error'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-[#D0E8B2] hover:bg-[#c2dea0] text-[#1A3700] rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>بارگذاری مجدد صفحه</span>
              </button>

              <button
                type="button"
                onClick={this.handleSoftReset}
                className="w-full py-2.5 px-4 bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[#1A1C16] dark:text-[#E2E3DC] rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <span>تلاش دوباره</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
