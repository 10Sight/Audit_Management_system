import React from "react";
import { ChevronRight } from "lucide-react";

export default function Header({ setMobileSidebarOpen, user, getInitials }) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm p-4 flex items-center justify-between sticky top-0 z-30">
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
      >
        <ChevronRight size={20} />
      </button>

      {/* Brand */}
      <div className="flex items-center gap-2">
        <img src="/marelli.svg" alt="Logo" className="w-8 h-8 object-contain" />
        <span className="text-xl font-bold text-black">Moterson</span>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-4">
        <span className="font-medium hidden sm:block text-gray-700">
          {user?.fullName || "User"}
        </span>
        <div className="w-10 h-10 rounded-full bg-[#099cdb] flex items-center justify-center text-white font-semibold">
          {getInitials(user?.fullName)}
        </div>
      </div>
    </header>
  );
}
