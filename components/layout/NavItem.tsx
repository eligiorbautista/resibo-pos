
import React from 'react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  badge?: number;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, collapsed, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center rounded-xl transition-all group relative
      ${collapsed ? 'justify-center px-0 py-4 h-14' : 'justify-center md:justify-start px-3 py-3 space-x-3'}
      ${active ? 'bg-white text-black shadow-lg shadow-black/5' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
    title={collapsed ? label : undefined}
  >
    <div className="relative flex items-center justify-center">
      {icon}
      {badge && <span className={`absolute bg-black text-white text-[8px] rounded-full flex items-center justify-center ring-2 ring-white font-black ${collapsed ? '-top-1 -right-1 w-5 h-5' : '-top-1.5 -right-1.5 w-4 h-4'}`}>{badge}</span>}
    </div>
    {!collapsed && <span className="hidden md:block font-black text-[10px] uppercase tracking-widest truncate">{label}</span>}
    {active && !collapsed && <div className="hidden md:block ml-auto w-1 h-3 bg-black rounded-full" />}
  </button>
);

export default NavItem;

