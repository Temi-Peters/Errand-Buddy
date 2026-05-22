export default function Button({ children, variant = 'primary', className = '', loading = false, as: Component = 'button', ...props }) {
  const variants = {
    primary: 'bg-gradient-to-br from-primary to-violet-800 text-white shadow-glow hover:from-violet-700 hover:to-violet-900',
    secondary: 'bg-secondary text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-600',
    accent: 'bg-gradient-to-br from-accent to-yellow-600 text-white shadow-lg shadow-yellow-500/20 hover:from-yellow-500 hover:to-yellow-700',
    outline: 'border border-surface-hi bg-surface text-ink shadow-soft hover:border-primary/40 hover:bg-violet-50 hover:text-primary dark:hover:bg-violet-900/20',
    ghost: 'bg-transparent text-muted hover:bg-surface-hi hover:text-ink',
    white: 'border border-white/30 bg-white/10 text-white hover:bg-white/20',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };

  return (
    <Component
      className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? 'Please wait…' : children}
    </Component>
  );
}
