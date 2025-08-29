import React, { useState } from "react";
import axios from "axios";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; 
import {
  LayoutDashboard,
  FileText,
  Settings,
} from "lucide-react";
import Sidebar from "../components/ui/Sidebar"; // ✅ Reuse Sidebar
import { ChevronRight } from "lucide-react";

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
    <div className="flex min-h-screen bg-white text-black">
      {/* ✅ Reusable Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        navLinks={navLinks}
        handleLogout={handleLogout}
        panelName="Employee Panel"   // 👈 Can change name easily
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col transition-all duration-300">
        {/* ✅ Shared Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm p-4 flex items-center justify-between sticky top-0 z-30">
          {/* Mobile Toggle Button */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronRight size={20} />
          </button>

          {/* Logo + Brand */}
          <div className="flex items-center gap-2">
            <img src="/marelli.svg" alt="Logo" className="h-8 w-8 object-contain" />
            <span className="text-xl font-bold text-black">Moterson</span>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <span className="font-medium hidden sm:block text-gray-700">
              {user?.fullName || "Employee"}
            </span>
            <div className="w-10 h-10 rounded-full bg-[#099cdb] flex items-center justify-center text-white font-semibold">
              {getInitials(user?.fullName)}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
