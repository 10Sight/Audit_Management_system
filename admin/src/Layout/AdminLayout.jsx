import React, { Profiler, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { 
  ChevronRight, 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  HelpCircle, 
  Building2, 
  Settings,
  Layers,
  Menu,
  Bell,
  LogOut,
  User,
  Shield,
  Zap,
  Wrench,
  Cog,
  UsbIcon,
  User2Icon,
  CircleUserIcon
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLogoutMutation } from "@/store/api";
import RealtimeNotifications from "@/components/RealtimeNotifications";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription, SheetHeader } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start collapsed on mobile
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();
  const [logout] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      setUser(null);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleProfile = async () => {
    try {
      navigate("/admin/settings");
    } catch (error) {
      console.error("Profile Error:", error);
    }
  }

  const navLinks = [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/employees", label: "Auditors", icon: Users },
    { to: "/admin/audits", label: "Audits", icon: ClipboardCheck },
    { to: "/admin/questions", label: "Questions", icon: HelpCircle },
    { to: "/admin/question-categories", label: "Question Categories", icon: Layers },
    { to: "/admin/departments", label: "Departments", icon: Building2 },
    { to: "/admin/lines", label: "Lines", icon: Zap },
    { to: "/admin/machines", label: "Machines", icon: Wrench },
    { to: "/admin/processes", label: "Processes", icon: Cog },
    { to: "/admin/units", label: "Units", icon: UsbIcon },
    { to: "/admin/email-settings", label: "Email Settings", icon: Settings },
    { to: "/admin/settings", label: "Profile", icon: CircleUserIcon },
  ];

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase() : "AD";

  const getDepartmentName = (dept) => {
    if (!dept) return "Admin";
    if (typeof dept === "string") return dept;
    if (typeof dept === "object" && dept?.name) return dept.name;
    return "Admin";
  };

  // Desktop collapsed sidebar content
  const CollapsedSidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b">
        <Shield className="h-6 w-6 text-primary" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-2 overflow-y-auto">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center justify-center w-full h-10 rounded-lg transition-all hover:bg-accent ${
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-accent-foreground"
              }`}
              title={link.label}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full h-10 p-0">
              <Avatar className="h-6 w-6">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(user?.fullName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.fullName || "Administrator"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {getDepartmentName(user?.department)}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleProfile}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  // Full sidebar content
  const SidebarContent = ({ isMobile = false, onLinkClick = () => {} }) => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">Admin Panel</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => isMobile && onLinkClick()}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground ${
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 p-2 h-auto"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(user?.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-sm font-medium truncate">
                  {user?.fullName || "Administrator"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {getDepartmentName(user?.department)}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleProfile}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ width: sidebarOpen ? 280 : 64 }}
        animate={{ width: sidebarOpen ? 280 : 64 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:block border-r bg-background shrink-0"
      >
        {sidebarOpen ? <SidebarContent /> : <CollapsedSidebarContent />}
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 shrink-0">
          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
                <SheetDescription>Main navigation menu for the application</SheetDescription>
              </SheetHeader>
              <SidebarContent 
                isMobile={true} 
                onLinkClick={() => setMobileMenuOpen(false)} 
              />
            </SheetContent>
          </Sheet>

          {/* Desktop Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Header Actions */}
          <div className="ml-auto flex items-center gap-2 md:gap-4">
            {/* Real-time Notifications */}
            <RealtimeNotifications />
            
            {/* Brand Logo */}
            <div className="hidden sm:flex items-center gap-2">
              <img 
                src="/motherson+marelli.png" 
                alt="Motherson" 
                className="h-8 w-8 md:h-8 md:w-30 object-contain" 
              />
              {/* <span className="hidden md:block font-semibold text-lg">
                Motherson
              </span> */}
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user?.fullName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.fullName || "Administrator"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {getDepartmentName(user?.department)}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfile}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 bg-muted/10">
          <div className="mx-auto max-w-7xl w-full p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
