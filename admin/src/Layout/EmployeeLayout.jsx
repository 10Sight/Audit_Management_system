import React, { useState } from "react";
import axios from "axios";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Auth Context
import {
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function EmployeeLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const navLinks = [
    { to: "/employee/dashboard", label: "Dashboard", icon: <LayoutDashboard size={22} /> },
    { to: "/employee/inspections", label: "Forms", icon: <FileText size={22} /> },
    { to: "/employee/settings", label: "Settings", icon: <Settings size={22} /> },
  ];

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://localhost:5000/api/v1/auth/logout",
        {},
        { withCredentials: true }
      );
      setUser(null);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Try again.");
    }
  };

  // Function to generate initials
  const getInitials = (name) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Desktop Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-20"} hidden md:flex flex-col transition-all duration-300 bg-neutral-950 border-r border-neutral-800`}
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-neutral-800">
          {sidebarOpen && <h1 className="text-xl font-bold tracking-wide">⚡ Employee</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-neutral-800 rounded-lg transition"
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-2 py-6 space-y-2">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                location.pathname === link.to
                  ? "bg-white text-black font-semibold"
                  : "hover:bg-neutral-800"
              }`}
            >
              {link.icon}
              {sidebarOpen && <span>{link.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="px-3 py-4 border-t border-neutral-800">
          <button
            className="flex items-center gap-2 w-full bg-neutral-900 hover:bg-neutral-800 px-3 py-2 rounded-lg transition"
            onClick={handleLogout}
          >
            <LogOut size={20} />
            {sidebarOpen && "Logout"}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:hidden flex flex-col bg-neutral-950 border-r border-neutral-800 transition-transform duration-300 w-64 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-800">
          <h1 className="text-lg font-bold tracking-wide">⚡ Logo</h1>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-2 hover:bg-neutral-800 rounded-lg transition"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        <div className="flex-1 px-2 py-4 space-y-2">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              to={link.to}
              onClick={() => setMobileSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                location.pathname === link.to
                  ? "bg-white text-black font-semibold"
                  : "hover:bg-neutral-800"
              }`}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        <div className="px-3 py-4 border-t border-neutral-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full bg-neutral-900 hover:bg-neutral-800 px-3 py-2 rounded-lg transition"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col transition-all duration-300">
        <header className="bg-neutral-950 border-b border-neutral-800 shadow-md p-4 flex items-center justify-between sticky top-0 z-30">
          {/* Mobile Toggle Button */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-2 hover:bg-neutral-800 rounded-lg transition"
          >
            <ChevronRight size={20} />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">⚡ Logo</span>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <span className="font-medium hidden sm:block text-gray-300">
              {user?.fullName || "Employee"}
            </span>
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {getInitials(user?.fullName)}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 bg-black">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
