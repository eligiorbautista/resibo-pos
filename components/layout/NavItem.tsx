
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
    className={`w-full flex items-center rounded-xl transition-smooth group relative
      ${collapsed ? 'justify-center px-0 py-3 tablet:py-3.5 laptop:py-4 h-12 tablet:h-14 laptop:h-16' : 'justify-center tablet:justify-start px-2 tablet:px-3 laptop:px-4 py-2.5 tablet:py-3 laptop:py-3.5 space-x-3'}
      ${active ? 'bg-white text-black shadow-lg shadow-black/5' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
    title={collapsed ? label : undefined}
  >
    <div className="relative flex items-center justify-center">
      {icon}
      {badge && <span className={`absolute bg-black text-white text-[8px] tablet:text-[9px] rounded-full flex items-center justify-center ring-2 ring-white font-black ${collapsed ? '-top-1 -right-1 w-5 h-5' : '-top-1.5 -right-1.5 w-4 h-4 tablet:w-5 tablet:h-5'}`}>{badge}</span>}
    </div>
    {!collapsed && <span className="hidden tablet:block font-black text-[10px] laptop:text-[11px] desktop:text-xs uppercase tracking-widest truncate">{label}</span>}
    {active && !collapsed && <div className="hidden tablet:block ml-auto w-1 h-3 laptop:h-4 bg-black rounded-full" />}
  </button>
);

export default NavItem;

