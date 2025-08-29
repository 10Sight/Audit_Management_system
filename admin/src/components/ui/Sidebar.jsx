import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  navLinks,
  handleLogout,
  panelName = "Admin Panel", // 👈 Default name if not passed
}) {
  const location = useLocation();

  return (
    <aside
      className={`${
        sidebarOpen ? "w-64" : "w-20"
      } hidden md:flex flex-col transition-all duration-300 bg-gray-100 border-r border-gray-200`}
    >
      {/* Logo Section */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200">
        {sidebarOpen && <h1 className="text-xl font-bold">{panelName}</h1>}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-200 rounded-lg transition"
        >
          {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Links */}
      <nav className="flex-1 px-2 py-6 space-y-2">
        {navLinks.map((link, idx) => (
          <Link
            key={idx}
            to={link.to}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              location.pathname === link.to
                ? "bg-[#099cdb] text-white font-semibold"
                : "hover:bg-[#099cdb]/10 text-black"
            }`}
          >
            {link.icon}
            {sidebarOpen && <span>{link.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg transition text-black"
        >
          <LogOut size={20} />
          {sidebarOpen && "Logout"}
        </button>
      </div>
    </aside>
  );
}
