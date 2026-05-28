import Navbar from './Navbar';
import Toast from './Toast';
import { Link } from 'react-router-dom';
import { PackageCheck } from 'lucide-react';

const footerLinks = [
  { heading: 'Platform', links: [['Services', '/services'], ['Pricing', '/pricing'], ['How it works', '/how-it-works'], ['Book an errand', '/book']] },
  { heading: 'Runners', links: [['Become a runner', '/become-a-runner'], ['Runner login', '/login']] },
  { heading: 'Company', links: [['Contact', '/contact'], ['Terms', '/terms'], ['Privacy', '/privacy']] },
];

export default function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[calc(100vh-72px)] max-w-6xl px-4 py-8 sm:py-12">{children}</main>
      <footer className="border-t border-surface-hi bg-surface transition-colors duration-200">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link to="/" className="flex items-center gap-2 font-extrabold text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                  <PackageCheck size={15} />
                </span>
                ErrandBuddy
              </Link>
              <p className="mt-3 max-w-xs text-sm leading-6 text-muted">
                Trusted local errand support, wherever you are. Vetted runners, clear pricing, real updates.
              </p>
            </div>
            {footerLinks.map(({ heading, links }) => (
              <div key={heading}>
                <p className="text-xs font-bold uppercase tracking-widest text-ink">{heading}</p>
                <ul className="mt-4 space-y-2.5">
                  {links.map(([label, path]) => (
                    <li key={path}>
                      <Link to={path} className="text-sm font-medium text-muted transition hover:text-primary">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 border-t border-surface-hi pt-6 text-center text-xs text-muted">
            © {new Date().getFullYear()} ErrandBuddy. All rights reserved.
          </div>
        </div>
      </footer>
      <Toast />
    </>
  );
}
