export default function Button({ children, variant = 'primary', className = '', loading = false, as: Component = 'button', ...props }) {
  const variants = {
    primary:   'bg-stone-900 text-white shadow-soft hover:bg-stone-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white',
    secondary: 'bg-secondary text-white shadow-soft hover:bg-emerald-600',
    outline:   'border border-stone-200 bg-white text-ink shadow-soft hover:bg-stone-50 dark:border-zinc-700 dark:bg-surface dark:hover:bg-surface-hi',
    ghost:     'bg-transparent text-muted hover:bg-surface-hi hover:text-ink',
    white:     'border border-white/30 bg-white/10 text-white hover:bg-white/20',
    danger:    'bg-red-500 text-white hover:bg-red-600',
  };

  return (
    <Component
      className={`btn-glow focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? 'Please wait…' : children}
    </Component>
  );
}
