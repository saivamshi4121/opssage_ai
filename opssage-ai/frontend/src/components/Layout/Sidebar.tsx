import React from "react";
import { BookOpen, LayoutDashboard, Search, Activity, MessageSquare } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded px-3 py-2 text-sm transition ${
    isActive
      ? "bg-opssage-500/20 text-slate-100 border border-opssage-500/30"
      : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
  }`;

export function Sidebar(): JSX.Element {
  return (
    <aside className="hidden h-full w-[240px] flex-col border-r border-slate-800 bg-slate-900 p-4 md:flex">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-opssage-500">OpsSage</div>
      </div>

      <nav className="mt-6 flex flex-col gap-2">
        <NavLink to="/" className={navItemClass} end>
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/search" className={navItemClass}>
          <Search size={16} />
          <span>Search</span>
        </NavLink>
        <NavLink to="/knowledge" className={navItemClass}>
          <BookOpen size={16} />
          <span>Knowledge</span>
        </NavLink>
        <NavLink to="/health" className={navItemClass}>
          <Activity size={16} />
          <span>Health</span>
        </NavLink>
        <NavLink to="/slack" className={navItemClass}>
          <MessageSquare size={16} />
          <span>Slack</span>
        </NavLink>
      </nav>

      <div className="mt-auto pt-6 text-xs text-slate-400">
        v1.0.0 · MVP
      </div>
    </aside>
  );
}
