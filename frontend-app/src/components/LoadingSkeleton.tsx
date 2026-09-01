import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  className = '',
  count = 1,
}) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {skeletons.map((_, i) => (
        <div
          key={i}
          className={`bg-gradient-to-r from-[#e3ebe8] via-[#f4f7f6] to-[#e3ebe8] rounded-lg animate-shimmer ${className}`}
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height,
            backgroundSize: '1000px 100%',
            marginBottom: i < count - 1 ? '12px' : '0',
          }}
        />
      ))}
    </>
  );
};

export const SkeletonCard: React.FC<{ count?: number }> = ({ count = 3 }) => {
  const cards = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {cards.map((_, i) => (
        <div key={i} className="surface p-6 rounded-2xl animate-fade-in">
          <Skeleton height={20} width="60%" className="mb-4" />
          <Skeleton height={32} width="100%" className="mb-4" />
          <Skeleton height={16} width="80%" count={2} />
        </div>
      ))}
    </>
  );
};

export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
}> = ({ rows = 5, columns = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} width="100%" height={48} className="rounded-lg flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const Spinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`${sizeMap[size]} ${className}`}>
      <svg
        className="animate-spin text-current"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

export default Skeleton;
