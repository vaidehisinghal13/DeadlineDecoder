import type { ReactNode } from 'react';
import { LayoutDashboard, Wand2, GraduationCap } from 'lucide-react';
import { cn } from '../ui/cn';

export type View = 'dashboard' | 'decoder';

export function Shell({
  view,
  onNavigate,
  children,
}: {
  view: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
}) {
  const navItems: Array<{ id: View; label: string; icon: ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: 'decoder', label: 'Decode assignment', icon: <Wand2 className="h-5 w-5" /> },
  ];

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      {/* Sidebar (desktop) / top bar (mobile) */}
      <aside className="shrink-0 border-b border-slate-200 bg-white md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Deadline Decoder</p>
            <p className="text-xs text-slate-400">Plan smarter</p>
          </div>
        </div>
        <nav className="flex gap-1 px-3 pb-3 md:flex-col md:pb-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:flex-none',
                view === item.id
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50',
              )}
              aria-current={view === item.id ? 'page' : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
