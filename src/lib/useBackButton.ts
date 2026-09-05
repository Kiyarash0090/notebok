import { useEffect, useRef } from 'react';

export interface BackStackItem {
  id: string;
  onClose: () => void;
}

const backStack: BackStackItem[] = [];
let isPoppingState = false;
let isInitialized = false;

let toastTimeout: ReturnType<typeof setTimeout> | null = null;
let lastBackPressTime = 0;

function showExitToastMessage() {
  if (typeof document === 'undefined') return;
  let toastEl = document.getElementById('mobile-exit-toast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'mobile-exit-toast';
    toastEl.className =
      'fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-2xl bg-[#1A1C16] text-[#E2E3DC] border border-[#4A6D22]/60 text-xs sm:text-sm font-bold shadow-2xl transition-all duration-300 opacity-0 pointer-events-none transform translate-y-2 flex items-center gap-2 dir-rtl';
    toastEl.dir = 'rtl';
    toastEl.innerHTML = `<span>برای خروج از برنامه، دوباره دکمه برگشت را بزنید</span>`;
    document.body.appendChild(toastEl);
  }

  requestAnimationFrame(() => {
    if (!toastEl) return;
    toastEl.classList.remove('opacity-0', 'translate-y-2', 'pointer-events-none');
    toastEl.classList.add('opacity-100', 'translate-y-0');
  });

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    if (toastEl) {
      toastEl.classList.remove('opacity-100', 'translate-y-0');
      toastEl.classList.add('opacity-0', 'translate-y-2', 'pointer-events-none');
    }
  }, 2000);
}

function initBackListener() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // Set initial base state in browser history
  if (!window.history.state || typeof window.history.state !== 'object' || !window.history.state.appBase) {
    window.history.replaceState({ appBase: true, time: Date.now() }, '');
  }

  window.addEventListener('popstate', () => {
    if (isPoppingState) {
      isPoppingState = false;
      return;
    }

    if (backStack.length > 0) {
      // Pop the topmost active overlay/modal
      const top = backStack.pop();
      if (top) {
        isPoppingState = true;
        try {
          top.onClose();
        } catch (err) {
          console.error('Error executing back handler:', err);
        }
        setTimeout(() => {
          isPoppingState = false;
        }, 50);
      }
    } else {
      // No overlays or filters open (Main home view)
      const now = Date.now();
      if (now - lastBackPressTime < 2000) {
        // User pressed back twice within 2s on home screen -> allow browser back / exit
        return;
      }
      lastBackPressTime = now;

      // Keep user in app, re-push base state, show friendly Persian toast
      window.history.pushState({ appBase: true, time: now }, '');
      showExitToastMessage();
    }
  });
}

/**
 * Custom React Hook to register a component / modal / filter with the mobile back button.
 *
 * @param isOpen Whether the modal/overlay/filter is currently open/active
 * @param onClose Callback function to invoke when user presses the mobile back button
 * @param id Unique identifier for the modal/overlay
 */
export function useBackButton(isOpen: boolean, onClose: () => void, id: string) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    initBackListener();

    if (!isOpen) return;

    // Ensure no duplicate entry with same ID in backStack
    const existingIndex = backStack.findIndex((item) => item.id === id);
    if (existingIndex !== -1) {
      backStack.splice(existingIndex, 1);
    }

    // Push dummy history entry for this overlay
    window.history.pushState({ modalId: id, time: Date.now() }, '');

    const entry: BackStackItem = {
      id,
      onClose: () => onCloseRef.current(),
    };
    backStack.push(entry);

    return () => {
      // Cleanup when unmounting or when isOpen changes to false programmatically
      const idx = backStack.findIndex((item) => item.id === id);
      if (idx !== -1) {
        backStack.splice(idx, 1);
        if (!isPoppingState) {
          isPoppingState = true;
          window.history.back();
          setTimeout(() => {
            isPoppingState = false;
          }, 50);
        }
      }
    };
  }, [isOpen, id]);
}
