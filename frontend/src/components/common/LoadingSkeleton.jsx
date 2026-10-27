import React from 'react';

/**
 * Lightweight Loading Skeleton placeholder for KneeAxis
 */
export function SkeletonLine({ width = '100%', height = '16px', className = '' }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded-[6px] ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard({ height = '110px', className = '' }) {
  return (
    <div
      className={`animate-pulse bg-white border border-slate-100 rounded-[12px] p-5 shadow-xs ${className}`}
      style={{ minHeight: height }}
    >
      <div className="w-1/3 h-3 bg-slate-200 rounded mb-4" />
      <div className="w-1/2 h-7 bg-slate-200 rounded" />
    </div>
  );
}

export function SkeletonTableRow({ columns = 5 }) {
  return (
    <tr className="animate-pulse border-b border-slate-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <div className="h-4 bg-slate-200 rounded w-4/5" />
        </td>
      ))}
    </tr>
  );
}

export default function LoadingSkeleton({ count = 3, height = '20px', className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonLine key={i} height={height} />
      ))}
    </div>
  );
}
