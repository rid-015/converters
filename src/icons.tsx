import type { IconName } from './tools';

// 24-unit stroke paths from the design (Main.dc.html → icons).
const PATHS: Record<IconName, string> = {
  compress: 'M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7',
  film: 'M4 5h16v14H4zM8 5v14M16 5v14',
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0a3 3 0 0 1 6 0M21 16a3 3 0 1 1-6 0a3 3 0 0 1 6 0',
  repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  wave: 'M3 12h2l2-6 3 12 3-9 2 6 2-3h4'
};

export const ToolIcon = ({ name }: { name: IconName }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={PATHS[name]} />
  </svg>
);

export const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const Close = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const Alert = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16h.01" />
  </svg>
);
