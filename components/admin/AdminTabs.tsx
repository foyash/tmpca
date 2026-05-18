'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';

export function AdminTabs() {
  const pathname = usePathname();
  const isSettings = pathname.startsWith('/admin/settings');
  const isOverview = !isSettings;

  return (
    <div style={{ borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 32px',
          display: 'flex',
        }}
      >
        <Link
          href="/admin"
          className={`tab-button ${isOverview ? 'active' : ''}`}
          style={{ textDecoration: 'none' }}
        >
          Overview
        </Link>
        <Link
          href="/admin/settings"
          className={`tab-button ${isSettings ? 'active' : ''}`}
          style={{ textDecoration: 'none' }}
        >
          <Settings size={13} style={{ verticalAlign: -2, marginRight: 6 }} />
          Course Settings
        </Link>
      </div>
    </div>
  );
}
