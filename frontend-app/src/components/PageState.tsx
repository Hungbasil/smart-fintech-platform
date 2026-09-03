import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Spinner } from './LoadingSkeleton';

type PageStateProps = {
  loading?: boolean;
  error?: string | null;
  loadingLabel?: string;
  onRetry?: () => void;
  children?: React.ReactNode;
};

export const PageState: React.FC<PageStateProps> = ({
  loading = false,
  error,
  loadingLabel = 'Loading',
  onRetry,
  children,
}) => {
  if (loading) {
    return (
      <div className="surface flex min-h-[180px] items-center justify-center p-6 text-center" role="status" aria-live="polite">
        <div>
          <Spinner size="md" className="mx-auto text-[#087f74]" />
          <p className="mt-3 text-sm font-semibold text-[#71808c]">{loadingLabel}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface border-[#f4d4d0] bg-[#fff8f7] p-5" role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 shrink-0 text-[#d76756]" size={19} />
          <div className="min-w-0">
            <p className="font-bold text-[#17212b]">Something went wrong</p>
            <p className="mt-1 break-words text-sm text-[#71808c]">{error}</p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#087f74] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#075c57]">
                <RefreshCw size={14} /> Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PageState;
