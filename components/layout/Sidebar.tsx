import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Clock,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  DollarSign,
  Table2,
  ChefHat,
  FileText,
} from "lucide-react";
import { Role, Employee, CashDrawer } from "../../types";
import NavItem from "./NavItem";
import { BRANDING } from "../../constants";

interface SidebarProps {
  currentUser: Employee;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  onLogout: () => void;
  cashDrawers: CashDrawer[];
  lowStockCount: number;
  branchName: string;
  onNavigateToPOS: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  onLogout,
  cashDrawers,
  lowStockCount,
  branchName,
  onNavigateToPOS,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <aside
      className={`${
        isSidebarCollapsed ? "w-16" : "w-20 tablet:w-48 desktop:w-56"
      } bg-black text-white flex flex-col transition-all duration-300 ease-in-out relative z-30 h-screen overflow-hidden`}
    >
      {/* Header Section */}
      <div
        className={`flex-shrink-0 flex items-center transition-all ${
          isSidebarCollapsed
            ? "p-2 h-16 tablet:h-20 justify-center"
            : "p-3 tablet:p-4 desktop:p-6 justify-between"
        }`}
      >
        {!isSidebarCollapsed && (
          <div className="hidden tablet:block border-b border-white/10 pb-3 tablet:pb-4 flex-1">
            <div className="mb-2">
              <img
                src={BRANDING.LOGO_WHITE}
                alt={BRANDING.LOGO_ALT_TEXT}
                className="h-6 tablet:h-7 desktop:h-8 object-contain"
              />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-[7px] tablet:text-[8px] text-zinc-500 font-bold uppercase tracking-widest">
                {branchName}
              </p>
            </div>
          </div>
        )}
        <div
          className={`${
            !isSidebarCollapsed && "tablet:hidden"
          } w-9 tablet:w-11 h-9 tablet:h-11 bg-white text-black flex-shrink-0 flex items-center justify-center rounded-full font-black text-lg tablet:text-xl shadow-lg shadow-white/10 transition-all`}
        >
          {BRANDING.SYSTEM_NAME.slice(0, 1)}
        </div>
      </div>

      {/* Navigation Section - Scrollable on small screens */}
      <nav className="flex-1 px-3 py-2 space-y-2 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-white scrollbar-track-black">
        <style jsx>{`
          nav::-webkit-scrollbar {
            width: 4px;
          }
          nav::-webkit-scrollbar-track {
            background: #000000;
            border-radius: 4px;
          }
          nav::-webkit-scrollbar-thumb {
            background: #ffffff;
            border-radius: 4px;
          }
          nav::-webkit-scrollbar-thumb:hover {
            background: #e5e5e5;
          }
        `}</style>
        {currentUser?.role === Role.MANAGER && (
          <NavItem
            icon={<BarChart3 size={18} className="tablet:w-5 tablet:h-5" />}
            label="Insights"
            active={location.pathname === "/dashboard"}
            collapsed={isSidebarCollapsed}
            onClick={() => navigate("/dashboard")}
          />
        )}
        <NavItem
          icon={<ShoppingCart size={18} className="tablet:w-5 tablet:h-5" />}
          label="Terminal"
          active={location.pathname === "/pos" || location.pathname === "/"}
          collapsed={isSidebarCollapsed}
          onClick={onNavigateToPOS}
        />
        <NavItem
          icon={<Package size={18} className="tablet:w-5 tablet:h-5" />}
          label="Inventory"
          active={location.pathname === "/inventory"}
          collapsed={isSidebarCollapsed}
          onClick={() => navigate("/inventory")}
          badge={lowStockCount > 0 ? lowStockCount : undefined}
        />
        <NavItem
          icon={<Users size={18} className="tablet:w-5 tablet:h-5" />}
          label="Customers"
          active={location.pathname === "/crm"}
          collapsed={isSidebarCollapsed}
          onClick={() => navigate("/crm")}
        />
        <NavItem
          icon={<Clock size={18} className="tablet:w-5 tablet:h-5" />}
          label="Payroll"
          active={location.pathname === "/employees"}
          collapsed={isSidebarCollapsed}
          onClick={() => navigate("/employees")}
        />
        <NavItem
          icon={<Table2 size={18} className="tablet:w-5 tablet:h-5" />}
          label="Tables"
          active={location.pathname === "/tables"}
          collapsed={isSidebarCollapsed}
          onClick={() => navigate("/tables")}
        />
        <NavItem
          icon={<ChefHat size={18} className="tablet:w-5 tablet:h-5" />}
          label="Kitchen"
          active={location.pathname === "/kitchen"}
          collapsed={isSidebarCollapsed}
          onClick={() => navigate("/kitchen")}
        />
        {currentUser?.role === Role.MANAGER && (
          <>
            <NavItem
              icon={<DollarSign size={18} className="tablet:w-5 tablet:h-5" />}
              label="Cash Drawer"
              active={location.pathname === "/cash"}
              collapsed={isSidebarCollapsed}
              onClick={() => navigate("/cash")}
            />
            <NavItem
              icon={<FileText size={18} className="tablet:w-5 tablet:h-5" />}
              label="Audit Logs"
              active={location.pathname === "/audit-logs"}
              collapsed={isSidebarCollapsed}
              onClick={() => navigate("/audit-logs")}
            />
          </>
        )}
      </nav>

      {/* Footer Section - Always visible at bottom */}
      <div className="flex-shrink-0 p-2 tablet:p-3 desktop:p-4 space-y-2 tablet:space-y-3 desktop:space-y-4 border-t border-white/10">
        {/* User Info - More compact on mobile */}
        <div
          className={`flex items-center space-x-2 p-1.5 tablet:p-2 rounded-xl bg-zinc-900 border border-white/5 ${
            isSidebarCollapsed ? "justify-center" : ""
          }`}
        >
          <div
            className={`flex-shrink-0 rounded-lg bg-white text-black flex items-center justify-center font-black transition-all ${
              isSidebarCollapsed ? "w-7 tablet:w-8 h-7 tablet:h-8 text-xs tablet:text-sm" : "w-7 tablet:w-8 h-7 tablet:h-8 text-[10px] tablet:text-xs"
            }`}
          >
            {currentUser?.name[0]}
          </div>
          {!isSidebarCollapsed && (
            <div className="hidden tablet:block overflow-hidden">
              <p className="text-[10px] tablet:text-xs font-black truncate">{currentUser?.name}</p>
              <p className="text-[7px] tablet:text-[8px] text-gray-500 uppercase font-black tracking-widest">
                {currentUser?.role}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons in a row on mobile, stacked on desktop */}
        <div
          className={`flex ${
            isSidebarCollapsed
              ? "flex-col space-y-2"
              : "flex-row tablet:flex-col space-x-2 tablet:space-x-0 tablet:space-y-2"
          }`}
        >
          {/* Collapse/Expand button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`flex items-center transition-all rounded-xl text-zinc-500 hover:text-white hover:bg-white/5
              ${
                isSidebarCollapsed
                  ? "justify-center h-8 tablet:h-10 w-full"
                  : "justify-center tablet:justify-start px-2 tablet:px-3 py-1.5 tablet:py-2 desktop:py-3 flex-1 tablet:flex-none"
              }`}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen size={18} className="tablet:w-5 tablet:h-5" />
            ) : (
              <PanelLeftClose size={16} className="tablet:w-[18px] tablet:h-[18px]" />
            )}
            {!isSidebarCollapsed && (
              <span className="hidden tablet:block ml-2 text-[8px] tablet:text-[9px] font-black uppercase tracking-widest">
                Collapse
              </span>
            )}
          </button>

          {/* Logout button */}
          <button
            onClick={onLogout}
            className={`flex items-center transition-all text-zinc-500 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 rounded-xl border border-transparent
              ${
                isSidebarCollapsed
                  ? "justify-center h-8 tablet:h-10 w-full"
                  : "justify-center tablet:justify-start px-2 tablet:px-3 py-1.5 tablet:py-2 desktop:py-3 flex-1 tablet:flex-none"
              }`}
            title="Sign Out"
          >
            <LogOut size={isSidebarCollapsed ? 18 : 16} className={isSidebarCollapsed ? "tablet:w-5 tablet:h-5" : "tablet:w-[18px] tablet:h-[18px]"} />
            {!isSidebarCollapsed && (
              <span className="hidden tablet:block ml-2 text-[8px] tablet:text-[9px] font-black uppercase tracking-widest">
                Sign Out
              </span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
