/**
 * Mobile App-Style Bottom Navigation for Customer Portal
 */
import { Home, LayoutGrid, ClipboardList, CircleUser } from "lucide-react";
import { cn } from "@/app/components/ui/utils";

type PortalPage = "login" | "dashboard" | "shop" | "cart" | "checkout" | "confirmation" | "orders" | "account";

interface MobileBottomNavProps {
  currentPage: PortalPage;
  onNavigate: (page: PortalPage) => void;
  pendingOrdersCount?: number;
}

export function MobileBottomNav({ currentPage, onNavigate, pendingOrdersCount = 0 }: MobileBottomNavProps) {
  const navItems: { id: PortalPage; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "dashboard", label: "Home", icon: Home },
    { id: "shop", label: "Shop", icon: LayoutGrid },
    { id: "orders", label: "Orders", icon: ClipboardList, badge: pendingOrdersCount || undefined },
    { id: "account", label: "Account", icon: CircleUser },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-gray-200">
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "relative flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200 min-w-[70px]",
                active
                  ? "text-blue-600"
                  : "text-gray-400 active:scale-95"
              )}
            >
              {active && (
                <div className="absolute inset-0 bg-blue-50 rounded-2xl -z-10" />
              )}
              <div className="relative">
                <Icon className={cn("w-6 h-6 transition-transform", active && "scale-110")} />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={cn("text-[11px] font-medium", active && "font-semibold")}>
                {item.label}
              </span>
              {active && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
