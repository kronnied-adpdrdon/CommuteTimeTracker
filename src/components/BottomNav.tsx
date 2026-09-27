'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

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

const ProfileIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke={active ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

export default function BottomNav() {
  const pathname = usePathname();

  // Hide nav on login pages
  if (pathname === '/login') {
    return null;
  }

  const tabs = [
    { name: 'Home', path: '/', icon: HomeIcon },
    { name: 'History', path: '/history', icon: HistoryIcon },
    { name: 'Reports', path: '/reports', icon: ReportsIcon },
    { name: 'Profile', path: '/profile', icon: ProfileIcon },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'var(--nav-height)',
      backgroundColor: 'var(--surface-color)',
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingBottom: '20px', // Safe area for iOS
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
              color: isActive ? 'var(--primary-blue)' : 'var(--text-secondary)',
              gap: '4px',
              width: '25%',
              paddingTop: '8px'
            }}
          >
            <tab.icon active={isActive} />
            <span style={{ fontSize: '0.7rem', fontWeight: isActive ? 600 : 500 }}>
              {tab.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
