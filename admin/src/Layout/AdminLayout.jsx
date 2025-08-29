import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  HelpCircle,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "../components/ui/Sidebar";
import Header from "../components/ui/Header";

export default function HomeLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const navLinks = [
    { to: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard size={22} /> },
    { to: "/admin/employees", label: "Employees", icon: <Users size={22} /> },
    { to: "/admin/audits", label: "Audits", icon: <HelpCircle size={22} /> },
    { to: "/admin/questions", label: "Questions", icon: <HelpCircle size={22} /> },
    { to: "/admin/departments", label: "Departments", icon: <Building2 size={22} /> },
    { to: "/admin/settings", label: "Settings", icon: <Settings size={22} /> },
  ];

  const handleLogout = async () => {
    try {
      await axios.post("http://localhost:5000/api/v1/auth/logout", {}, { withCredentials: true });
      setUser(null);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout. Try again.");
    }
  };

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
      {/* Sidebar (Desktop) */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        navLinks={navLinks}
        handleLogout={handleLogout}
        panelName="Admin Panel" // 👈 can pass Employee Panel too
      />

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col transition-all duration-300">
        <Header
          setMobileSidebarOpen={setMobileSidebarOpen}
          user={user}
          getInitials={getInitials}
        />

        <main className="flex-1 p-6 bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
