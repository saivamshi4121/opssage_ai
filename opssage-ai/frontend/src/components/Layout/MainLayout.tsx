import React from "react";
import { Activity, LayoutDashboard, MessageSquare, Search } from "lucide-react";
import { NavLink } from "react-router-dom";

import { Sidebar } from "./Sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps): JSX.Element {
  const mobileNavItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex items-center justify-center py-3 transition ${
      isActive ? "text-opssage-500" : "text-slate-300 hover:text-slate-100"
    }`;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top nav */}
        <nav className="flex border-b border-slate-800 bg-slate-900 md:hidden">
          <NavLink to="/" className={mobileNavItemClass} end>
            <LayoutDashboard size={18} />
          </NavLink>
          <NavLink to="/search" className={mobileNavItemClass}>
            <Search size={18} />
          </NavLink>
          <NavLink to="/health" className={mobileNavItemClass}>
            <Activity size={18} />
          </NavLink>
          <NavLink to="/slack" className={mobileNavItemClass}>
            <MessageSquare size={18} />
          </NavLink>
        </nav>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
