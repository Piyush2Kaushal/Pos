import { useLocation, Link, Outlet } from "react-router";
import {
  Smartphone,
  Package,
  Users,
  FileText,
  BarChart3,
  ShoppingBag,
  Tag,
  PoundSterling,
  ShoppingCart,
  UserCog,
  RotateCcw,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Store,
  Search,
  Globe,
  Warehouse,
  Archive,
  Plus,
  CircleUser,
  ClipboardList,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { useAuth } from "@/app/context/auth-context";
import { Button } from "@/app/components/ui/button";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { AdvancedSearch } from "@/app/components/advanced-search";
import { POSProvider } from "@/app/context/pos-context";
import { ProtectedRoute } from "@/app/components/protected-route";

// Navigation groups with section labels
const navGroups = [
  {
    label: null,
    items: [
      { path: "/",       label: "Dashboard", icon: LayoutDashboard, color: "from-blue-500 to-indigo-600" },
      { path: "/sales",  label: "New Sale",  icon: Smartphone,      color: "from-blue-400 to-cyan-500"   },
    ],
  },
  {
    label: "Catalog",
    items: [
      { path: "/inventory", label: "Inventory", icon: Package, color: "from-emerald-500 to-teal-500" },
      { path: "/products", label: "Products", icon: ShoppingBag, color: "from-purple-500 to-pink-500" },
      { path: "/categories", label: "Categories", icon: Tag, color: "from-amber-500 to-orange-500" },
      { path: "/prices", label: "Pricing", icon: PoundSterling, color: "from-green-500 to-emerald-500" },
      { path: "/warehouse", label: "Warehouse", icon: Warehouse, color: "from-teal-500 to-cyan-500" },
      { path: "/product-shelving", label: "Shelving", icon: Archive, color: "from-purple-600 to-violet-600" },
    ],
  },
  {
    label: "Operations",
    items: [
      { path: "/purchases",       label: "Purchases",       icon: ShoppingCart, color: "from-indigo-500 to-blue-500"   },
      { path: "/customers",       label: "Customers",       icon: Users,        color: "from-rose-500 to-pink-500"     },
      { path: "/customer-orders", label: "Orders",          icon: ClipboardList,color: "from-blue-500 to-cyan-500"     },
      { path: "/staff",           label: "Staff",           icon: UserCog,      color: "from-violet-500 to-purple-500" },
    ],
  },
  {
    label: "Finance",
    items: [
      { path: "/invoices", label: "Invoices", icon: FileText, color: "from-sky-500 to-blue-500" },
      { path: "/invoice-templates", label: "Templates", icon: Settings, color: "from-slate-500 to-gray-600" },
      { path: "/returns", label: "Returns", icon: RotateCcw, color: "from-orange-500 to-red-500" },
      { path: "/reports", label: "Reports", icon: BarChart3, color: "from-fuchsia-500 to-purple-500" },
    ],
  },
  {
    label: "Settings",
    items: [
      { path: "/website", label: "Website", icon: Globe, color: "from-cyan-500 to-blue-500" },
    ],
  },
  {
    label: "External",
    items: [
      { path: "/storefront", label: "Storefront", icon: Store, color: "from-blue-500 to-blue-600" },
      { path: "/portal", label: "Portal", icon: CircleUser, color: "from-indigo-500 to-purple-600" },
    ],
  },
];

// Flat list for active-state lookup
const allNavItems = navGroups.flatMap((g) => g.items);

// Page title from path
function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  const item = allNavItems.find((i) => i.path !== "/" && pathname.startsWith(i.path));
  return item?.label ?? "BNM Parts POS";
}

export function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem("sidebarExpanded");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("sidebarExpanded", JSON.stringify(isSidebarExpanded));
  }, [isSidebarExpanded]);

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const pageTitle = getPageTitle(location.pathname);

  return (
    <ProtectedRoute>
      <POSProvider>
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-16 backdrop-blur-xl bg-white/90 border-b border-gray-200/80 shadow-sm flex items-center px-6 z-50 relative gap-6">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/40 via-purple-50/30 to-pink-50/40 pointer-events-none" />

        {/* Logo & Brand */}
        <div className="flex items-center gap-3 relative z-10 shrink-0">
        <Link to="/">
  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/20 cursor-pointer">
    <Smartphone className="w-5 h-5 text-white" />
  </div>
</Link>
          <div className="hidden sm:block">
            <div className="font-bold text-lg leading-none bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              BNM Parts
            </div>
            <p className="text-[10px] text-gray-400 -mt-0.5 tracking-wide">Point of Sale</p>
          </div>
        </div>

        {/* Page Title Badge */}
        <div className="hidden lg:flex items-center gap-3 relative z-10">
          <div className="w-px h-7 bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
          <div className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200/60 shadow-sm">
            <span className="text-sm font-semibold text-gray-700">{pageTitle}</span>
          </div>
        </div>

        {/* Quick Action: New Sale */}
        {location.pathname !== "/sales" && (
          <div className="relative z-10 hidden md:block">
            <Link to="/sales">
              <Button
                size="sm"
                className="gap-2 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 font-semibold px-4"
              >
                <Plus className="w-4 h-4" />
                New Sale
              </Button>
            </Link>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 relative z-10">
          {/* Storefront Link */}
          <Link to="/storefront">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 hover:bg-blue-50/80 hover:border-blue-300 border-gray-300/60 bg-white/60 backdrop-blur-sm shadow-sm transition-all hidden md:flex"
            >
              <Store className="w-4 h-4" />
              <span className="text-sm">Storefront</span>
            </Button>
          </Link>

          {/* Portal Link */}
          <Link to="/portal">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 hover:bg-indigo-50/80 hover:border-indigo-300 border-gray-300/60 bg-white/60 backdrop-blur-sm shadow-sm transition-all hidden md:flex"
            >
              <CircleUser className="w-4 h-4" />
              <span className="text-sm">Portal</span>
            </Button>
          </Link>

          {/* Search Bar */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2.5 hover:bg-blue-50/80 hover:border-blue-300 min-w-[200px] border-gray-300/60 bg-white/60 backdrop-blur-sm shadow-sm transition-all hidden lg:flex"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500 flex-1 text-left">Search...</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 font-mono text-[10px] font-medium text-gray-500">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* Search Icon (Mobile) */}
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden w-9 h-9 border-gray-300/60 bg-white/60 hover:bg-blue-50/80"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="w-4 h-4 text-gray-500" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 px-2.5 rounded-xl hover:bg-gray-100/80 transition-all border border-transparent hover:border-gray-200/60 hover:shadow-sm"
              >
                <Avatar className="h-8 w-8 ring-2 ring-white shadow-md">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white text-sm font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold text-gray-700 ml-2.5 hidden md:inline">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-2xl bg-white/95 backdrop-blur-xl border-gray-200/80 shadow-xl">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1 py-1">
                  <span className="font-semibold text-base text-gray-900">{user?.name}</span>
                  <span className="text-xs text-gray-500 font-normal">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200/60" />
              <DropdownMenuItem disabled className="opacity-100">
                <User className="mr-2.5 h-4 w-4 text-blue-600" />
                <span className="capitalize text-sm text-gray-700 font-medium">{user?.role}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "relative bg-white border-r border-gray-200 flex flex-col shadow-lg transition-all duration-300 ease-in-out",
            isSidebarExpanded ? "w-56" : "w-16"
          )}
        >
          {/* Subtle top gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/3 to-transparent pointer-events-none" />

          {/* Collapse toggle */}
          <button
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-full bg-white border border-gray-200 shadow-md hover:bg-blue-50 hover:border-blue-300 transition-all absolute -right-3.5 top-5 z-20"
            )}
            title={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarExpanded ? (
              <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            )}
          </button>

          {/* Navigation */}
          <nav className="flex-1 flex flex-col overflow-y-auto py-3 px-2 gap-0.5 relative z-10">
            {navGroups.map((group, groupIndex) => (
              <div key={groupIndex} className={cn(groupIndex > 0 ? "mt-3" : "")}>
                {/* Section label */}
                {group.label && isSidebarExpanded && (
                  <div className="px-2 pb-1 pt-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {group.label}
                    </span>
                  </div>
                )}
                {/* Divider for collapsed mode */}
                {group.label && !isSidebarExpanded && groupIndex > 0 && (
                  <div className="border-t border-gray-100 mx-1 mb-2" />
                )}

                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.path === "/"
                      ? location.pathname === "/"
                      : location.pathname.startsWith(item.path);
                  
                  // All items are now internal React Router links
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={!isSidebarExpanded ? item.label : undefined}
                      className={cn(
                        "relative flex items-center rounded-xl transition-all duration-200 group",
                        isSidebarExpanded ? "gap-3 px-3 h-10" : "justify-center w-10 h-10 mx-auto",
                        isActive
                          ? "bg-blue-50 shadow-sm"
                          : "hover:bg-gray-100"
                      )}
                    >
                      {/* Active left bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full" />
                      )}

                      {/* Icon */}
                      <div
                        className={cn(
                          "flex items-center justify-center rounded-lg shrink-0 transition-all duration-200",
                          isSidebarExpanded ? "w-7 h-7" : "w-8 h-8",
                          isActive
                            ? `bg-gradient-to-br ${item.color} shadow-sm`
                            : "bg-gray-100 group-hover:bg-gray-200"
                        )}
                      >
                        <Icon
                          className={cn(
                            "transition-all duration-200",
                            isSidebarExpanded ? "w-4 h-4" : "w-4 h-4",
                            isActive ? "text-white" : "text-gray-500 group-hover:text-gray-700"
                          )}
                        />
                      </div>

                      {/* Label */}
                      {isSidebarExpanded && (
                        <span
                          className={cn(
                            "text-sm font-medium truncate transition-all duration-200",
                            isActive ? "text-blue-700" : "text-gray-700 group-hover:text-gray-900"
                          )}
                        >
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Bottom user info (expanded only) */}
          {isSidebarExpanded && (
            <div className="px-3 pb-4 relative z-10">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{user?.name}</p>
                  <p className="text-[10px] text-gray-500 capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <Outlet />
        </main>
      </div>

      {/* Advanced Search Dialog */}
      <AdvancedSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
      </POSProvider>
    </ProtectedRoute>
  );
}