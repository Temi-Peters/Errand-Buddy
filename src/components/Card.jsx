export default function Card({ children, className = '', as: Component = 'div', ...props }) {
  return (
    <Component className={`rounded-2xl border border-surface-hi bg-surface p-5 shadow-soft transition-colors duration-200 ease-out ${className}`} {...props}>
      {children}
    </Component>
  );
}
