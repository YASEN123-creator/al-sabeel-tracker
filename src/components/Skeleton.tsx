'use client';

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24" />
        <div className="h-9 w-9 bg-gray-200 dark:bg-slate-700 rounded-xl" />
      </div>
      <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-20 mb-2" />
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-3 h-3 bg-gray-200 dark:bg-slate-700 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
          </div>
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-12" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm animate-pulse">
      <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-40 mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-56 mb-6" />
      <div className="h-52 flex items-end gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-t-lg" style={{ height: `${30 + ((i * 17 + 23) % 50)}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-20" />
            <div className="h-9 w-9 bg-gray-200 dark:bg-slate-700 rounded-xl" />
          </div>
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-16" />
        </div>
      ))}
    </div>
  );
}
