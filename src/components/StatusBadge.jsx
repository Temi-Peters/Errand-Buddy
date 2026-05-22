const styles = {
  'Pending Payment': 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-700/30',
  Pending:           'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-700/30',
  Assigned:          'bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-700/30',
  'In Progress':     'bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-700/30',
  Completed:         'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-700/30',
  Cancelled:         'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:ring-slate-700/30',
  Active:            'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-700/30',
  Rejected:          'bg-red-100 text-red-800 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-700/30',
  Suspended:         'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:ring-slate-700/30',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${styles[status] || styles.Pending}`}>
      {status}
    </span>
  );
}
