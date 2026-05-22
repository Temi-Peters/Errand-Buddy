export default function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-surface-hi bg-surface p-5 shadow-soft transition-colors duration-200 ease-out ${className}`}>
      {children}
    </div>
  );
}
