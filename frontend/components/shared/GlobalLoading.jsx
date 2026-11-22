'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';

const LoadingContext = createContext(null);
const scrollKeys = new Set([
  ' ', 'Spacebar', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'PageUp', 'PageDown', 'Home', 'End',
]);

export function useBlockingLoading(pending) {
  const begin = useContext(LoadingContext);
  useLayoutEffect(() => {
    if (pending) return begin();
  }, [begin, pending]);
}

export function LoadingFallback() {
  useBlockingLoading(true);
  return null;
}

function LoadingOverlay() {
  const dialog = useRef(null);

  useLayoutEffect(() => {
    const element = dialog.current;
    element.showModal();

    const blockKey = (event) => {
      if (event.key === 'Escape' || scrollKeys.has(event.key)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('keydown', blockKey, true);
    return () => {
      window.removeEventListener('keydown', blockKey, true);
      element.close();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="voiceed-loading"
      aria-label="Loading"
      onCancel={(event) => event.preventDefault()}
    >
      <img src="/logo%20for%20blue.png" alt="" />
      <span role="status" className="voiceed-loading-status">Loading…</span>
    </dialog>
  );
}

export function LoadingProvider({ children }) {
  const [pendingCount, setPendingCount] = useState(0);
  const begin = useCallback(() => {
    setPendingCount((count) => count + 1);
    return () => setPendingCount((count) => count - 1);
  }, []);

  return (
    <LoadingContext.Provider value={begin}>
      {children}
      {pendingCount > 0 && <LoadingOverlay />}
    </LoadingContext.Provider>
  );
}
