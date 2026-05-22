import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Moon, PackageCheck, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Button from './Button';

export default function Navbar() {
  const { authUser, logout, theme, toggleTheme } = useApp();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const dashboard = authUser?.role === 'runner' ? '/runner/dashboard' : authUser?.role === 'admin' ? '/admin' : '/customer/dashboard';
  const navLinks = [
    ['Services', '/services'],
    ['Pricing', '/pricing'],
    ['How it works', '/how-it-works'],
    ...(authUser ? [['Dashboard', dashboard]] : []),
  ];

  const onLogout = () => { logout(); navigate('/'); };

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur-xl transition-colors duration-200 dark:border-zinc-800 dark:bg-black/90">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">

        <Link to="/" className="flex items-center gap-2.5 text-lg font-bold text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white shadow-soft dark:bg-zinc-100 dark:text-zinc-900">
            <PackageCheck size={18} />
          </span>
          ErrandBuddy
        </Link>

        <div className="hidden items-center gap-0.5 md:flex">
          {navLinks.map(([label, path]) => (
            <NavLink key={path} to={path} className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ease-out ${
                isActive
                  ? 'bg-stone-100 text-ink dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-muted hover:bg-surface-hi hover:text-ink'
              }`
            }>{label}</NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={toggleTheme}
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-all duration-200 ease-out hover:bg-surface-hi hover:text-ink"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {authUser ? (
            <Button variant="ghost" onClick={onLogout} className="text-sm"><LogOut size={16} /> Logout</Button>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost" className="text-sm">Log in</Button>
              <Button as={Link} to="/register" variant="outline" className="text-sm">Sign up</Button>
              <Button as={Link} to="/book" className="text-sm">Book now</Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleTheme}
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-hi"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="focus-ring rounded-lg p-2 text-muted hover:bg-surface-hi" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-stone-200 bg-white px-4 pb-5 dark:border-zinc-800 dark:bg-black md:hidden">
          <div className="mt-3 space-y-0.5">
            {navLinks.map(([label, path]) => (
              <Link key={path} to={path} onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-surface-hi hover:text-ink">{label}</Link>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {authUser ? (
              <Button variant="outline" className="w-full" onClick={onLogout}><LogOut size={16} /> Logout</Button>
            ) : (
              <>
                <Button as={Link} to="/book" className="w-full" onClick={() => setOpen(false)}>Book now</Button>
                <Button as={Link} to="/register" variant="outline" className="w-full" onClick={() => setOpen(false)}>Sign up free</Button>
                <Button as={Link} to="/login" variant="ghost" className="w-full" onClick={() => setOpen(false)}>Log in</Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
