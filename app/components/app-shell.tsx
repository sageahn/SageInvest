import Link from 'next/link';
import type { ReactNode } from 'react';

type MenuKey = 'dashboard' | 'settings' | 'auth' | 'portfolio';

interface AppShellProps {
  active: MenuKey;
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

const menus: Array<{ key: MenuKey; href: string; label: string }> = [
  { key: 'dashboard', href: '/dashboard', label: '대시보드' },
  { key: 'settings', href: '/kis/settings', label: 'KIS 설정' },
  { key: 'auth', href: '/kis/auth', label: 'KIS 인증' },
  { key: 'portfolio', href: '/kis/portfolio', label: '포트폴리오' },
];

export default function AppShell({ active, title, subtitle, actions, children }: AppShellProps) {
  return (
    <div className="si-shell">
      <aside className="si-sidebar">
        <div className="si-brand">SAGEINVEST</div>
        <nav className="si-nav">
          {menus.map((menu) => (
            <Link
              key={menu.key}
              href={menu.href}
              className={`si-nav-link ${active === menu.key ? 'active' : ''}`}
            >
              {menu.label}
            </Link>
          ))}
        </nav>
        <div className="si-sidebar-footer">KIS OpenAPI 투자 도우미</div>
      </aside>
      <main className="si-main">
        <header className="si-header">
          <h1 className="si-title">{title}</h1>
          {subtitle && <p className="si-subtitle">{subtitle}</p>}
          {actions}
        </header>
        {children}
      </main>
    </div>
  );
}
