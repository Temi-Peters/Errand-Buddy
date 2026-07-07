export default function Avatar({ url, name = '', size = 40, className = '' }) {
  const initials = name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  const dim = { width: size, height: size };

  if (url) {
    return <img src={url} alt={name} style={dim} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      style={{ ...dim, fontSize: Math.round(size * 0.38) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-surface-hi font-bold text-muted ${className}`}
    >
      {initials}
    </span>
  );
}
