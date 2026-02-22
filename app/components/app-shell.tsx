'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';

type MenuKey = 'dashboard' | 'portfolio' | 'watchlist' | 'settings' | 'kis-settings';

interface AppShellProps {
  active: MenuKey;
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

const menus: Array<{
  key: MenuKey;
  href?: string;
  label: string;
  children?: Array<{ key: MenuKey; href: string; label: string }>;
}> = [
  { key: 'dashboard', href: '/dashboard', label: '대시보드' },
  { key: 'portfolio', href: '/kis/portfolio', label: '포트폴리오' },
  { key: 'watchlist', href: '/watchlist', label: '관심 종목' },
  {
    key: 'settings',
    label: '설정',
    children: [{ key: 'kis-settings', href: '/kis/settings', label: 'KIS 설정' }],
  },
];

export default function AppShell({ active, title, subtitle, actions, children }: AppShellProps) {
  const [expandedMenu, setExpandedMenu] = useState<string | null>('settings');

  const isActiveMenu = (menuKey: MenuKey, children?: Array<{ key: MenuKey }>) => {
    if (active === menuKey) return true;
    if (children) {
      return children.some((child) => child.key === active);
    }
    return false;
  };

  return (
    <div className="si-shell">
      <aside className="si-sidebar">
        <div className="si-brand">SAGEINVEST</div>
        <nav className="si-nav">
          {menus.map((menu) =>
            menu.children ? (
              <div key={menu.key} className="si-nav-group">
                <button
                  type="button"
                  className={`si-nav-link si-nav-toggle ${isActiveMenu(menu.key, menu.children) ? 'active' : ''}`}
                  onClick={() => setExpandedMenu(expandedMenu === menu.key ? null : menu.key)}
                  aria-expanded={expandedMenu === menu.key}
                >
                  <span>{menu.label}</span>
                  <span className="si-nav-arrow">{expandedMenu === menu.key ? '▼' : '▶'}</span>
                </button>
                {expandedMenu === menu.key && (
                  <div className="si-nav-submenu">
                    {menu.children.map((child) => (
                      <Link
                        key={child.key}
                        href={child.href}
                        className={`si-nav-link si-nav-sublink ${active === child.key ? 'active' : ''}`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={menu.key}
                href={menu.href!}
                className={`si-nav-link ${active === menu.key ? 'active' : ''}`}
              >
                {menu.label}
              </Link>
            )
          )}
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
