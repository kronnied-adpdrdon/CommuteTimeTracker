'use client';

import { useEffect } from 'react';
import { logToDiagnostics } from './support';

/** Mounted once in the layout: copies uncaught errors into the on-phone log so bug reports can include them. */
export function DiagnosticsSync() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => void logToDiagnostics(`Uncaught error: ${event.message} (${event.filename}:${event.lineno})`);
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
      void logToDiagnostics(`Unhandled promise rejection: ${reason}`);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}
