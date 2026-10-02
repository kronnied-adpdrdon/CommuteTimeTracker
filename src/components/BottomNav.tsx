'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Using inline SVGs to avoid extra dependencies and match the mockups perfectly.
const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke={active ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const HistoryIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const ReportsIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke={active ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const SettingsIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

export default function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { name: 'Home', path: '/', icon: HomeIcon },
    { name: 'History', path: '/history', icon: HistoryIcon },
    { name: 'Reports', path: '/reports', icon: ReportsIcon },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'var(--nav-height)',
      backgroundColor: 'color-mix(in srgb, var(--surface-color) 90%, transparent)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      boxShadow: 'var(--shadow-nav)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      // Keep the tabs above Android's gesture bar / navigation buttons.
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      maxWidth: '480px',
      margin: '0 auto',
      zIndex: 50,
    }}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;
        return (
          <Link 
            href={tab.path} 
            key={tab.name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textDecoration: 'none',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              gap: '4px',
              width: '25%',
              paddingTop: '8px',
              position: 'relative',
            }}
          >
            {/* A short gold bar marks the current tab. */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 0,
                width: isActive ? '22px' : '0px',
                height: '3px',
                borderRadius: '0 0 3px 3px',
                background: 'var(--gold-gradient)',
                transition: 'width 0.2s ease',
              }}
            />
            <tab.icon active={isActive} />
            <span style={{ fontSize: '0.68rem', letterSpacing: '0.04em', fontWeight: isActive ? 700 : 500 }}>
              {tab.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
