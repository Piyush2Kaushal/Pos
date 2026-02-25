import { useState, useMemo, useRef, useEffect } from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  ShoppingCart, Search, LogOut, Package, ChevronRight,
  Plus, Minus, Trash2, CheckCircle2, Clock, Truck,
  User, ShoppingBag, Grid3X3, List, CreditCard,
  Wallet, Building2, Store, Eye, EyeOff, ArrowLeft,
  MapPin, Phone, Mail, TrendingDown, Gift,
  BadgePercent, AlertCircle, RefreshCw, ChevronDown,
  ChevronUp, PackageCheck, X, CircleUser, Home,
  LayoutGrid, ClipboardList, Settings2,
  Tag, Menu, ExternalLink,
  Info, MessageCircle, HelpCircle, Globe, Lock,
  ReceiptText, BadgeCheck, ArrowRight, Bell, Award,
  UserCircle2, Calendar, Sparkles, TrendingUp,
} from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/app/components/ui/select";
import { cn } from "@/app/components/ui/utils";
import { format } from "date-fns";
import { Customer, CustomerType, Product, CustomerOrder, CustomerOrderItem } from "@/app/types";
import { toast } from "sonner";
import { MobileBottomNav } from "@/app/components/customer-portal-nav";

// ─── Types ────────────────────────────────────────────────────────────────────
type PortalPage = "login" | "dashboard" | "shop" | "cart" | "checkout" | "confirmation" | "orders" | "account";

interface PortalCartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

// ─── Constants (defined outside component to be stable) ───────────────────────
const tierConfig: Record<CustomerType, {
  label: string; color: string; bg: string; textLight: string;
  discount: string; savePct: number; icon: React.ElementType;
}> = {
  wholesaler: { label: "Wholesaler", color: "text-blue-700",    bg: "bg-blue-600",    textLight: "text-blue-500",    discount: "30% off retail", savePct: 30, icon: Building2  },
  trader:     { label: "Trader",     color: "text-purple-700",  bg: "bg-purple-600",  textLight: "text-purple-500",  discount: "15% off retail", savePct: 15, icon: Store      },
  retailer:   { label: "Retailer",   color: "text-emerald-700", bg: "bg-emerald-600", textLight: "text-emerald-500", discount: "Standard price", savePct: 0,  icon: ShoppingBag},
};

const orderStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:    { label: "Pending",    color: "bg-amber-500",   icon: Clock        },
  confirmed:  { label: "Confirmed",  color: "bg-blue-500",    icon: CheckCircle2 },
  processing: { label: "Processing", color: "bg-indigo-500",  icon: RefreshCw    },
  shipped:    { label: "Shipped",    color: "bg-purple-500",  icon: Truck        },
  delivered:  { label: "Delivered",  color: "bg-emerald-500", icon: PackageCheck },
  cancelled:  { label: "Cancelled",  color: "bg-red-500",     icon: X            },
};

// ─── Pure helpers (defined outside component) ─────────────────────────────────
function getCustomerPrice(product: Product, type: CustomerType): number {
  if (type === "wholesaler") return product.wholesalePrice;
  if (type === "trader")     return product.traderPrice;
  return product.retailPrice;
}
function savingsPct(product: Product, type: CustomerType): number {
  if (type === "retailer") return 0;
  return Math.round((1 - getCustomerPrice(product, type) / product.retailPrice) * 100);
}
function getCustomerPin(c: Customer) {
  return c.phone.replace(/\D/g, "").slice(-4);
}

// ─── TierBadge: plain function (NOT a React component) ───────────────────────
// Called as {renderTierBadge(type)} — avoids React unmount/remount issues
function renderTierBadge(type: CustomerType, sm = false) {
  const cfg = tierConfig[type];
  const Icon = cfg.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white font-semibold",
      cfg.bg, sm ? "text-[10px]" : "text-xs"
    )}>
      <Icon className={sm ? "w-2.5 h-2.5" : "w-3 h-3"} />
      {cfg.label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CustomerPortal({ initialCustomer, onLogout: onLogoutProp }: {
  initialCustomer?: Customer;
  onLogout?: () => void;
} = {}) {
  const { products, customers, customerOrders, addCustomerOrder, staff } = usePOS();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [page,             setPage]             = useState<PortalPage>(initialCustomer ? "dashboard" : "login");
  const [loggedInCustomer, setLoggedInCustomer] = useState<Customer | null>(initialCustomer ?? null);
  const [cart,             setCart]             = useState<PortalCartItem[]>([]);
  const [lastOrder,        setLastOrder]        = useState<CustomerOrder | null>(null);

  // ── Login ───────────────────────────────────────────────────────────────────
  const [loginEmail,   setLoginEmail]   = useState("");
  const [loginPin,     setLoginPin]     = useState("");
  const [showPin,      setShowPin]      = useState(false);
  const [loginError,   setLoginError]   = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Shop ────────────────────────────────────────────────────────────────────
  const [searchTerm,     setSearchTerm]     = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy,         setSortBy]         = useState("name");
  const [viewMode,       setViewMode]       = useState<"grid" | "list">("grid");

  // ── Header dropdowns ────────────────────────────────────────────────────────
  const [mobileMenuOpen,   setMobileMenuOpen]   = useState(false);
  const [cartPreviewOpen,  setCartPreviewOpen]  = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchOpen,       setSearchOpen]       = useState(false);
  const [headerSearch,     setHeaderSearch]     = useState("");

  // ── Orders expanded row ─────────────────────────────────────────────────────
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // ── Checkout ────────────────────────────────────────────────────────────────
  const [checkoutForm, setCheckoutForm] = useState({
    deliveryAddress: initialCustomer?.address || "", paymentMethod: "bank_transfer", notes: "",
  });

  // ── Refs for click-outside ───────────────────────────────────────────────────
  const cartRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cartRef.current && !cartRef.current.contains(e.target as Node)) setCartPreviewOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────────
  const categories = useMemo(() =>
    ["all", ...new Set(products.map(p => p.category))].sort(), [products]);

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.stock > 0);
    const q = searchTerm.toLowerCase();
    if (q) list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
    if (categoryFilter !== "all") list = list.filter(p => p.category === categoryFilter);
    if (sortBy === "price_asc")  list = [...list].sort((a, b) => loggedInCustomer ? getCustomerPrice(a, loggedInCustomer.type) - getCustomerPrice(b, loggedInCustomer.type) : 0);
    if (sortBy === "price_desc") list = [...list].sort((a, b) => loggedInCustomer ? getCustomerPrice(b, loggedInCustomer.type) - getCustomerPrice(a, loggedInCustomer.type) : 0);
    if (sortBy === "savings")    list = [...list].sort((a, b) => loggedInCustomer ? savingsPct(b, loggedInCustomer.type) - savingsPct(a, loggedInCustomer.type) : 0);
    if (sortBy === "name")       list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, searchTerm, categoryFilter, sortBy, loggedInCustomer]);

  const headerSearchResults = useMemo(() => {
    if (!headerSearch.trim() || !loggedInCustomer) return [];
    const q = headerSearch.toLowerCase();
    return products.filter(p =>
      p.stock > 0 && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [headerSearch, products, loggedInCustomer]);

  const cartTotal   = useMemo(() => cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0), [cart]);
  const cartRetail  = useMemo(() => cart.reduce((s, i) => s + i.product.retailPrice * i.quantity, 0), [cart]);
  const cartSavings = cartRetail - cartTotal;
  const cartQty     = cart.reduce((s, i) => s + i.quantity, 0);

  const myOrders = useMemo(() =>
    loggedInCustomer ? customerOrders.filter(o => o.customerId === loggedInCustomer.id) : [],
    [customerOrders, loggedInCustomer]);

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const handleLogin = () => {
    setLoginError(""); setLoginLoading(true);
    setTimeout(() => {
      const c = customers.find(x => x.email?.toLowerCase() === loginEmail.toLowerCase().trim());
      if (!c) { setLoginError("No account found with that email address."); setLoginLoading(false); return; }
      if (loginPin !== getCustomerPin(c)) { setLoginError("Incorrect PIN. Use the last 4 digits of your registered phone."); setLoginLoading(false); return; }
      setLoggedInCustomer(c);
      setCheckoutForm(f => ({ ...f, deliveryAddress: c.address || "" }));
      setPage("shop"); setMobileMenuOpen(false);
      toast.success(`Welcome back, ${c.name.split(" ")[0]}!`);
      setLoginLoading(false);
    }, 700);
  };

  const handleLogout = () => {
    setLoggedInCustomer(null); setCart([]); setPage("login");
    setLoginEmail(""); setLoginPin(""); setLoginError(""); setUserDropdownOpen(false);
    onLogoutProp?.();
  };

  // ── Cart helpers ─────────────────────────────────────────────────────────────
  const addToCart = (product: Product, qty = 1) => {
    if (!loggedInCustomer) return;
    const price = getCustomerPrice(product, loggedInCustomer.type);
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, quantity: Math.min(i.quantity + qty, product.stock) } : i);
      return [...prev, { product, quantity: qty, unitPrice: price }];
    });
    toast.success(`${product.name} added`, { duration: 1500 });
  };
  const updateCartQty = (id: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.product.id !== id));
    else setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: Math.min(qty, i.product.stock) } : i));
  };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.product.id !== id));
  const cartItemQty   = (id: string) => cart.find(i => i.product.id === id)?.quantity || 0;

  // ── Place order ──────────────────────────────────────────────────────────────
  const placeOrder = () => {
    if (!loggedInCustomer) return;
    if (!checkoutForm.deliveryAddress.trim()) { toast.error("Please enter a delivery address"); return; }
    const items: CustomerOrderItem[] = cart.map(i => ({
      productId: i.product.id, productName: i.product.name, productSku: i.product.sku,
      category: i.product.category, quantity: i.quantity, unitPrice: i.unitPrice,
      retailPrice: i.product.retailPrice, total: i.unitPrice * i.quantity,
    }));
    const order: Omit<CustomerOrder, "id"> = {
      orderNumber: `ORD-${String(myOrders.length + 1).padStart(4, "0")}`,
      customerId: loggedInCustomer.id, customerName: loggedInCustomer.name,
      customerType: loggedInCustomer.type, items,
      subtotal: cartTotal, totalSavings: cartSavings, total: cartTotal,
      status: "pending", notes: checkoutForm.notes || undefined,
      deliveryAddress: checkoutForm.deliveryAddress,
      paymentMethod: checkoutForm.paymentMethod,
      createdAt: new Date(), updatedAt: new Date(),
    };
    addCustomerOrder(order);
    setLastOrder({ ...order, id: `ORD-${Date.now()}` } as CustomerOrder);
    setCart([]); setPage("confirmation");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER HELPERS (plain functions, NOT React components)
  //  Called as {renderLoginHeader()} — stable identity, no unmount/remount
  // ═══════════════════════════════════════════════════════════════════════════

  const renderLoginHeader = () => (
    <header className="w-full bg-slate-900/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/60">
            <Package className="w-5 h-5 text-white"/>
          </div>
          <div>
            <p className="font-bold text-white leading-none text-base">BNM Parts</p>
            <p className="text-[10px] text-blue-400 leading-none mt-0.5">Customer Portal</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: "Home",     icon: <Home className="w-3.5 h-3.5"/>,          active: true  },
            { label: "Products", icon: <LayoutGrid className="w-3.5 h-3.5"/>,    active: false },
            { label: "About Us", icon: <Info className="w-3.5 h-3.5"/>,          active: false },
            { label: "Contact",  icon: <MessageCircle className="w-3.5 h-3.5"/>, active: false },
            { label: "Help",     icon: <HelpCircle className="w-3.5 h-3.5"/>,    active: false },
          ].map(item => (
            <button key={item.label}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                item.active ? "text-white bg-white/10" : "text-blue-300 hover:text-white hover:bg-white/5"
              )}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3">
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs text-blue-400 hover:text-white transition-colors">
            <ExternalLink className="w-3.5 h-3.5"/>Staff Portal
          </a>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-blue-300">
            <Lock className="w-3 h-3"/>Secure Login
          </div>
          <button onClick={() => setMobileMenuOpen(v => !v)}
            className="md:hidden p-2 rounded-lg text-blue-300 hover:bg-white/10">
            <Menu className="w-5 h-5"/>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-slate-900 px-4 py-3 space-y-1">
          {["Home","Products","About Us","Contact","Help"].map(label => (
            <button key={label} className="w-full text-left px-3 py-2 rounded-lg text-sm text-blue-300 hover:text-white hover:bg-white/5">
              {label}
            </button>
          ))}
        </div>
      )}
    </header>
  );

  // Simplified top bar for mobile app style
  const renderTopBar = () => {
    const cust = loggedInCustomer!;
    const tc = tierConfig[cust.type];
    
    return (
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => setPage("dashboard")} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 text-sm leading-none">BNM Parts</p>
              <p className="text-[10px] text-gray-500 leading-none mt-0.5">Customer Portal</p>
            </div>
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage("cart")}
              className="relative p-2 text-gray-600 hover:text-gray-900"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartQty > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {cartQty}
                </span>
              )}
            </button>
            <button onClick={handleLogout} className="p-2 text-gray-600 hover:text-red-600">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAuthHeader = () => {
    const cust = loggedInCustomer!;
    const tc   = tierConfig[cust.type];
    const pendingCount = myOrders.filter(o => o.status === "pending").length;

    const navItems: { id: PortalPage; label: string; icon: React.ElementType; badge?: number }[] = [
      { id: "dashboard", label: "Home",      icon: Home          },
      { id: "shop",      label: "Shop",      icon: LayoutGrid    },
      { id: "orders",    label: "My Orders", icon: ClipboardList, badge: pendingCount || undefined },
      { id: "account",   label: "Account",   icon: CircleUser    },
    ];

    // Return null - we use renderTopBar + MobileBottomNav instead
    return renderTopBar();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE — LOGIN
  // ═══════════════════════════════════════════════════════════════════════════
  if (page === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
        {renderLoginHeader()}

        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"/>
          <div className="absolute bottom-0 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"/>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 relative">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-2xl shadow-blue-900/60">
                <Package className="w-8 h-8 text-white"/>
              </div>
              <h1 className="text-3xl font-bold text-white">Customer Portal</h1>
              <p className="text-blue-300 mt-1 text-sm">Sign in to view your pricing &amp; place orders</p>
            </div>

            {/* Login card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-blue-100 text-sm">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400"/>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-300 focus:border-blue-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-blue-100 text-sm">PIN (last 4 digits of phone)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400"/>
                    <Input
                      type={showPin ? "text" : "password"}
                      placeholder="••••"
                      maxLength={4}
                      value={loginPin}
                      onChange={e => setLoginPin(e.target.value.replace(/\D/g,""))}
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                      className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-blue-300 focus:border-blue-400"
                    />
                    <button type="button" onClick={() => setShowPin(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-white">
                      {showPin ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="flex items-center gap-2 text-red-300 text-sm bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0"/>{loginError}
                  </div>
                )}

                <Button
                  onClick={handleLogin}
                  disabled={loginLoading || !loginEmail || !loginPin}
                  className="w-full bg-blue-600 hover:bg-blue-500 h-11 font-semibold shadow-lg shadow-blue-900/40 gap-2">
                  {loginLoading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Lock className="w-4 h-4"/>}
                  {loginLoading ? "Signing in…" : "Sign In"}
                </Button>
              </div>

              {/* Tier info */}
              <div className="mt-5 pt-4 border-t border-white/10">
                <p className="text-blue-300 text-xs font-medium mb-3 text-center uppercase tracking-widest">Your Account Type Unlocks</p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(tierConfig) as [CustomerType, typeof tierConfig[CustomerType]][]).map(([type, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <div key={type} className="bg-white/5 rounded-xl p-2.5 text-center border border-white/10">
                        <div className={cn("w-7 h-7 rounded-lg mx-auto mb-1.5 flex items-center justify-center", cfg.bg)}>
                          <Icon className="w-3.5 h-3.5 text-white"/>
                        </div>
                        <p className="text-[10px] font-bold text-white">{cfg.label}</p>
                        <p className="text-[9px] text-blue-400 mt-0.5">{cfg.discount}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Demo accounts */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-blue-300 text-xs font-medium mb-2 uppercase tracking-wide">Quick Demo Login</p>
                <div className="space-y-1.5">
                  {([
                    { type:"wholesaler" as CustomerType, label:"ABC Electronics Wholesale", email:"contact@abcelectronics.com", pin:"4567" },
                    { type:"trader"     as CustomerType, label:"Tech Trading Co.",           email:"sales@techtradingco.com",    pin:"5678" },
                    { type:"retailer"   as CustomerType, label:"Mobile Plus Store",          email:"info@mobileplus.com",        pin:"6789" },
                  ]).map(d => (
                    <button key={d.email} type="button"
                      onClick={() => { setLoginEmail(d.email); setLoginPin(d.pin); }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                      <div className="flex items-center gap-2">
                        {renderTierBadge(d.type, true)}
                        <span className="text-blue-200 text-xs">{d.label}</span>
                      </div>
                      <span className="text-blue-400 text-[10px] font-mono">PIN {d.pin}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-center text-blue-500 text-xs mt-5 flex items-center justify-center gap-2">
              <Globe className="w-3 h-3"/>www.bnmparts.com
              <span>·</span>
              <Mail className="w-3 h-3"/>info@bnmparts.com
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Shared post-login vars ────────────────────────────────────────────────
  const customer = loggedInCustomer!;
  const tc       = tierConfig[customer.type];

  // Get assigned staff member (account manager)
  const assignedStaff = useMemo(() => {
    const assigned = staff.find(s => s.assignedCustomers?.includes(customer.id));
    return assigned || staff.find(s => s.status === "active" && s.role === "staff");
  }, [staff, customer.id]);

  // Mock notifications data
  const notifications = useMemo(() => [
    {
      id: "1",
      type: "success",
      icon: CheckCircle2,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      title: "Order Delivered",
      message: "Your order #ORD1 has been delivered successfully",
      time: "2 hours ago",
      unread: true,
    },
    {
      id: "2",
      type: "promo",
      icon: Gift,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      title: "New Promotion Available",
      message: "Get 20% off on all Vaping products this week",
      time: "5 hours ago",
      unread: true,
    },
    {
      id: "3",
      type: "shipping",
      icon: Truck,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      title: "Order Shipped",
      message: "Your order #ORD2 is on its way",
      time: "1 day ago",
      unread: false,
    },
    {
      id: "4",
      type: "reward",
      icon: Award,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      title: "Reward Points Earned",
      message: "You earned 1,150 reward points on your recent order",
      time: "2 days ago",
      unread: false,
    },
    {
      id: "5",
      type: "alert",
      icon: AlertCircle,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      title: "Low Stock Alert",
      message: "Ultra Max 2000 is running low on stock",
      time: "3 days ago",
      unread: false,
    },
  ], []);

  const unreadCount = notifications.filter(n => n.unread).length;

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE — DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  if (page === "dashboard") {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {renderAuthHeader()}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          
          {/* Header */}
          <div>
            <h1 className="text-3xl font-black text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Your central hub for notifications and recent orders</p>
          </div>

          {/* Dedicated Rep Card */}
          {assignedStaff && (
            <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 rounded-3xl p-6 text-white shadow-lg">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shrink-0 overflow-hidden">
                  <UserCircle2 className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-purple-200" />
                    <span className="text-xs font-semibold text-purple-100">Your Dedicated Rep</span>
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed">
                    Need help? Contact your personal account manager
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-purple-100">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Available: Mon-Fri, 9:00 AM - 6:00 PM</span>
                  </div>
                </div>
              </div>

              {/* Staff Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-purple-200" />
                  <span className="font-semibold">{assignedStaff.name}</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Account Manager</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <Phone className="w-4 h-4 text-purple-200" />
                  <span>{assignedStaff.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <Mail className="w-4 h-4 text-purple-200" />
                  <span>{assignedStaff.email}</span>
                </div>
              </div>

              {/* Contact Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <a href={`tel:${assignedStaff.phone}`}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl py-3 flex flex-col items-center gap-1 transition-all">
                  <Phone className="w-5 h-5" />
                  <span className="text-xs font-medium">Call</span>
                </a>
                <a href={`mailto:${assignedStaff.email}`}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl py-3 flex flex-col items-center gap-1 transition-all">
                  <Mail className="w-5 h-5" />
                  <span className="text-xs font-medium">Email</span>
                </a>
                <button
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl py-3 flex flex-col items-center gap-1 transition-all">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-xs font-medium">Chat</span>
                </button>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                Mark all read
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Stay updated with your latest activities</p>

            {/* Notifications List */}
            <div className="space-y-3">
              {notifications.map((notif) => {
                const Icon = notif.icon;
                return (
                  <div key={notif.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors relative">
                    {notif.unread && (
                      <div className="absolute right-3 top-3 w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", notif.iconBg)}>
                      <Icon className={cn("w-5 h-5", notif.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{notif.title}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View All Button */}
            <button className="w-full mt-4 py-2.5 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all flex items-center justify-center gap-1">
              View All Notifications
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <MobileBottomNav
          currentPage={page}
          onNavigate={setPage}
          pendingOrdersCount={myOrders.filter(o => o.status === "pending").length}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE — SHOP
  // ═══════════════════════════════════════════════════════════════════════════
  if (page === "shop") {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {renderAuthHeader()}
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

          {/* Welcome banner */}
          <div className={cn("rounded-2xl p-5 text-white relative overflow-hidden",
            customer.type === "wholesaler" ? "bg-gradient-to-r from-blue-700 to-blue-500" :
            customer.type === "trader"     ? "bg-gradient-to-r from-purple-700 to-purple-500" :
                                             "bg-gradient-to-r from-emerald-700 to-emerald-500")}>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
              <div className="w-32 h-32 rounded-full bg-white"/>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-white/70 text-sm">Welcome back,</p>
                <h2 className="text-2xl font-bold">{customer.name}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {renderTierBadge(customer.type)}
                  <span className="text-white/75 text-sm flex items-center gap-1">
                    <BadgePercent className="w-3.5 h-3.5"/>{tc.discount}
                  </span>
                  {customer.creditBalance > 0 && (
                    <span className="text-white/75 text-sm flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5"/>£{customer.creditBalance.toFixed(2)} credit
                    </span>
                  )}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-center bg-white/10 rounded-xl px-4 py-2">
                  <p className="text-xl font-bold">{filteredProducts.length}</p>
                  <p className="text-[10px] text-white/70">Products</p>
                </div>
                <div className="text-center bg-white/10 rounded-xl px-4 py-2">
                  <p className="text-xl font-bold">{myOrders.length}</p>
                  <p className="text-[10px] text-white/70">Orders</p>
                </div>
                {tc.savePct > 0 && (
                  <div className="text-center bg-white/10 rounded-xl px-4 py-2">
                    <p className="text-xl font-bold">{tc.savePct}%</p>
                    <p className="text-[10px] text-white/70">Your Discount</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap gap-3 items-center bg-white rounded-xl border p-3 shadow-sm">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
              <Input placeholder="Search products, SKU…" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 border-0 shadow-none focus-visible:ring-0"/>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44 h-9 text-sm"><SelectValue/></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c === "all" ? "All Categories" : c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 h-9 text-sm"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A–Z</SelectItem>
                <SelectItem value="price_asc">Price ↑</SelectItem>
                <SelectItem value="price_desc">Price ↓</SelectItem>
                {customer.type !== "retailer" && <SelectItem value="savings">Best Savings</SelectItem>}
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg overflow-hidden">
              <button onClick={() => setViewMode("grid")} className={cn("p-2", viewMode==="grid"?"bg-blue-600 text-white":"bg-white text-gray-400 hover:bg-gray-50")}><Grid3X3 className="w-4 h-4"/></button>
              <button onClick={() => setViewMode("list")} className={cn("p-2 border-l", viewMode==="list"?"bg-blue-600 text-white":"bg-white text-gray-400 hover:bg-gray-50")}><List className="w-4 h-4"/></button>
            </div>
            <span className="text-xs text-gray-400">{filteredProducts.length} products</span>
          </div>

          {/* Product grid / list */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredProducts.map(p => {
                const myPrice = getCustomerPrice(p, customer.type);
                const savings = savingsPct(p, customer.type);
                const inCart  = cartItemQty(p.id);
                return (
                  <div key={p.id} className="bg-white rounded-2xl border hover:shadow-lg transition-all hover:-translate-y-0.5 overflow-hidden flex flex-col">
                    <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 aspect-square flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-300"/>
                      {savings > 0 && <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">-{savings}%</div>}
                      {p.stock <= 10 && <div className="absolute bottom-2 left-2 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">Low</div>}
                    </div>
                    <div className="p-3 flex flex-col flex-1 gap-1.5">
                      <Badge variant="outline" className="text-[9px] self-start">{p.category}</Badge>
                      <p className="text-sm font-semibold text-gray-800 line-clamp-2 flex-1 leading-tight">{p.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{p.sku}</p>
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className={cn("text-base font-bold", tc.color)}>£{myPrice.toFixed(2)}</span>
                          {savings > 0 && <span className="text-xs text-gray-300 line-through">£{p.retailPrice.toFixed(2)}</span>}
                        </div>
                        {savings > 0 && <p className="text-[10px] text-green-600">Save £{(p.retailPrice - myPrice).toFixed(2)}</p>}
                      </div>
                      {inCart > 0 ? (
                        <div className="flex items-center justify-between bg-blue-50 rounded-lg p-1 mt-1">
                          <button onClick={() => updateCartQty(p.id, inCart-1)} className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"><Minus className="w-3 h-3"/></button>
                          <span className="text-sm font-bold text-blue-700">{inCart}</span>
                          <button onClick={() => updateCartQty(p.id, inCart+1)} disabled={inCart >= p.stock} className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40"><Plus className="w-3 h-3"/></button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(p)}
                          className="mt-1 w-full h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors">
                          <Plus className="w-3 h-3"/>Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map(p => {
                const myPrice = getCustomerPrice(p, customer.type);
                const savings = savingsPct(p, customer.type);
                const inCart  = cartItemQty(p.id);
                return (
                  <div key={p.id} className="bg-white rounded-xl border hover:shadow-md transition-all flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><Package className="w-6 h-6 text-gray-300"/></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 font-mono">{p.sku}</span>
                        <Badge variant="outline" className="text-[9px]">{p.category}</Badge>
                        {p.stock <= 10 && <Badge className="bg-amber-500 text-white text-[9px]">Low Stock</Badge>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn("font-bold", tc.color)}>£{myPrice.toFixed(2)}</div>
                      {savings > 0 && <div className="text-xs text-gray-400 line-through">£{p.retailPrice.toFixed(2)}</div>}
                      {savings > 0 && <div className="text-[10px] text-green-600">-{savings}%</div>}
                    </div>
                    <div className="shrink-0">
                      {inCart > 0 ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateCartQty(p.id, inCart-1)} className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center hover:bg-blue-200"><Minus className="w-3.5 h-3.5"/></button>
                          <span className="w-6 text-center font-bold text-sm">{inCart}</span>
                          <button onClick={() => updateCartQty(p.id, inCart+1)} disabled={inCart >= p.stock} className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40"><Plus className="w-3.5 h-3.5"/></button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(p)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
                          <Plus className="w-3 h-3"/>Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <Package className="w-14 h-14 mx-auto mb-3 opacity-30"/>
              <p className="font-medium text-lg">No products found</p>
              <button onClick={() => { setSearchTerm(""); setCategoryFilter("all"); }} className="mt-2 text-blue-600 text-sm hover:underline">Clear filters</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE — CART
  // ═══════════════════════════════════════════════════════════════════════════
  if (page === "cart") {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {renderAuthHeader()}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setPage("shop")} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"><ArrowLeft className="w-5 h-5"/></button>
            <h2 className="text-2xl font-bold text-gray-900">Your Cart</h2>
            {cart.length > 0 && <Badge className="bg-blue-600 text-white">{cartQty} items</Badge>}
          </div>
          {cart.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30"/>
              <p className="text-lg font-medium">Cart is empty</p>
              <Button onClick={() => setPage("shop")} className="mt-4 bg-blue-600 hover:bg-blue-700 gap-2"><LayoutGrid className="w-4 h-4"/>Start Shopping</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                {cart.map(item => {
                  const sav = item.product.retailPrice - item.unitPrice;
                  return (
                    <div key={item.product.id} className="bg-white rounded-2xl border p-4 flex gap-4 items-start shadow-sm">
                      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><Package className="w-7 h-7 text-gray-300"/></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{item.product.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{item.product.sku}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => updateCartQty(item.product.id, item.quantity-1)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100"><Minus className="w-3.5 h-3.5 text-gray-600"/></button>
                            <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                            <button onClick={() => updateCartQty(item.product.id, item.quantity+1)} disabled={item.quantity >= item.product.stock} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40"><Plus className="w-3.5 h-3.5 text-gray-600"/></button>
                          </div>
                          <span className={cn("font-bold", tc.color)}>£{item.unitPrice.toFixed(2)}/ea</span>
                          {sav > 0 && <Badge className="bg-green-100 text-green-700 text-[10px]">Save £{(sav * item.quantity).toFixed(2)}</Badge>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-900">£{(item.unitPrice * item.quantity).toFixed(2)}</p>
                        <button onClick={() => removeFromCart(item.product.id)} className="mt-2 text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5"/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div>
                <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-3 sticky top-20">
                  <h3 className="font-bold text-gray-900">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600"><span>Subtotal ({cartQty} items)</span><span>£{cartTotal.toFixed(2)}</span></div>
                    {cartSavings > 0 && <div className="flex justify-between text-green-600 font-medium"><span className="flex items-center gap-1"><Gift className="w-3.5 h-3.5"/>Savings</span><span>-£{cartSavings.toFixed(2)}</span></div>}
                    <div className="flex justify-between text-gray-500"><span>Delivery</span><span className="text-green-600">Free</span></div>
                    <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span className={tc.color}>£{cartTotal.toFixed(2)}</span></div>
                  </div>
                  {cartSavings > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 shrink-0"/>Saving £{cartSavings.toFixed(2)} vs retail!
                    </div>
                  )}
                  <Button onClick={() => setPage("checkout")} className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-semibold gap-2">
                    Checkout <ChevronRight className="w-4 h-4"/>
                  </Button>
                  <button onClick={() => setPage("shop")} className="w-full text-sm text-blue-600 hover:underline text-center">Continue Shopping</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <MobileBottomNav
          currentPage={page}
          onNavigate={setPage}
          pendingOrdersCount={myOrders.filter(o => o.status === "pending").length}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE — CHECKOUT
  // ═══════════════════════════════════════════════════════════════════════════
  if (page === "checkout") {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {renderAuthHeader()}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setPage("cart")} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"><ArrowLeft className="w-5 h-5"/></button>
            <h2 className="text-2xl font-bold text-gray-900">Checkout</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600"/>Delivery Address</h3>
                <Textarea rows={3} placeholder="Enter full delivery address…" value={checkoutForm.deliveryAddress}
                  onChange={e => setCheckoutForm(f => ({...f, deliveryAddress: e.target.value}))} className="resize-none"/>
              </div>
              <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-600"/>Payment Method</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id:"bank_transfer", label:"Bank Transfer",      icon:<Building2 className="w-5 h-5"/> },
                    { id:"credit",        label:"Account Credit",     icon:<Wallet className="w-5 h-5"/>    },
                    { id:"card",          label:"Credit/Debit Card",  icon:<CreditCard className="w-5 h-5"/>},
                    { id:"cash",          label:"Cash on Delivery",   icon:<Wallet className="w-5 h-5"/>    },
                  ].map(m => (
                    <button key={m.id} type="button"
                      onClick={() => setCheckoutForm(f => ({...f, paymentMethod: m.id}))}
                      className={cn("flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all text-left",
                        checkoutForm.paymentMethod === m.id ? "border-blue-500 bg-blue-50 text-blue-800" : "border-gray-200 hover:border-gray-300 text-gray-700")}>
                      <span className={checkoutForm.paymentMethod === m.id ? "text-blue-600" : "text-gray-400"}>{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-2">
                <h3 className="font-bold text-gray-900">Order Notes <span className="font-normal text-gray-400 text-sm">(optional)</span></h3>
                <Textarea rows={2} placeholder="Special instructions…" value={checkoutForm.notes}
                  onChange={e => setCheckoutForm(f => ({...f, notes: e.target.value}))} className="resize-none"/>
              </div>
            </div>
            <div>
              <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-4 sticky top-20">
                <h3 className="font-bold text-gray-900">Summary</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex justify-between text-sm">
                      <span className="text-gray-600 truncate flex-1 mr-2">{item.product.name} ×{item.quantity}</span>
                      <span className="font-medium shrink-0">£{(item.unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>£{cartTotal.toFixed(2)}</span></div>
                  {cartSavings > 0 && <div className="flex justify-between text-green-600"><span>Savings</span><span>-£{cartSavings.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span className={tc.color}>£{cartTotal.toFixed(2)}</span></div>
                </div>
                <Button onClick={placeOrder} className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-semibold gap-2">
                  <CheckCircle2 className="w-4 h-4"/>Place Order
                </Button>
              </div>
            </div>
          </div>
        </div>
        <MobileBottomNav
          currentPage={page}
          onNavigate={setPage}
          pendingOrdersCount={myOrders.filter(o => o.status === "pending").length}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE — CONFIRMATION
  // ═══════════════════════════════════════════════════════════════════════════
  if (page === "confirmation" && lastOrder) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {renderAuthHeader()}
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="bg-white rounded-3xl border p-10 shadow-sm space-y-5">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600"/>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Order Placed!</h2>
              <p className="text-gray-500 mt-1">Thanks {customer.name.split(" ")[0]}, your order has been received.</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-left space-y-2 text-sm">
              {([
                { l:"Order Number", v: <span className="font-mono font-bold text-blue-700">{lastOrder.orderNumber}</span> },
                { l:"Status",       v: <span className="text-amber-600 font-medium">Pending Confirmation</span> },
                { l:"Total",        v: <span className={cn("font-bold", tc.color)}>£{lastOrder.total.toFixed(2)}</span> },
                lastOrder.totalSavings > 0 ? { l:"You saved", v: <span className="text-green-600 font-semibold">£{lastOrder.totalSavings.toFixed(2)}</span> } : null,
                { l:"Payment",      v: <span className="capitalize">{lastOrder.paymentMethod.replace(/_/g," ")}</span> },
              ] as ({l:string;v:React.ReactNode}|null)[]).filter(Boolean).map((row) => (
                <div key={row!.l} className="flex justify-between"><span className="text-gray-500">{row!.l}</span>{row!.v}</div>
              ))}
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button onClick={() => { setPage("orders"); setLastOrder(null); }} variant="outline" className="gap-2">
                <ClipboardList className="w-4 h-4"/>My Orders
              </Button>
              <Button onClick={() => { setPage("shop"); setLastOrder(null); }} className="bg-blue-600 hover:bg-blue-700 gap-2">
                <LayoutGrid className="w-4 h-4"/>Continue Shopping
              </Button>
            </div>
          </div>
        </div>
        <MobileBottomNav
          currentPage={page}
          onNavigate={setPage}
          pendingOrdersCount={myOrders.filter(o => o.status === "pending").length}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE — MY ORDERS
  // ═══════════════════════════════════════════════════════════════════════════
  if (page === "orders") {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {renderAuthHeader()}
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600"/>My Orders
            {myOrders.length > 0 && <Badge variant="outline">{myOrders.length}</Badge>}
          </h2>
          {myOrders.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-30"/>
              <p className="text-lg font-medium">No orders yet</p>
              <Button onClick={() => setPage("shop")} className="mt-4 bg-blue-600 hover:bg-blue-700">Start Shopping</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {myOrders.map(order => {
                const scfg = orderStatusConfig[order.status];
                const Icon = scfg.icon;
                const exp  = expandedOrder === order.id;
                return (
                  <div key={order.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                    <button className="w-full p-5 text-left flex items-center justify-between gap-4 flex-wrap hover:bg-gray-50"
                      onClick={() => setExpandedOrder(exp ? null : order.id)}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono font-bold text-blue-700">{order.orderNumber}</span>
                        <Badge className={cn("text-white gap-1 text-[10px]", scfg.color)}>
                          <Icon className="w-3 h-3"/>{scfg.label}
                        </Badge>
                        <span className="text-sm text-gray-500">{format(new Date(order.createdAt), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={cn("font-bold", tc.color)}>£{order.total.toFixed(2)}</div>
                          <div className="text-xs text-gray-400">{order.items.length} item(s)</div>
                        </div>
                        {exp ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
                      </div>
                    </button>
                    {exp && (
                      <div className="border-t bg-gray-50 p-5 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          {[
                            { l:"Payment",  v: order.paymentMethod.replace(/_/g," ") },
                            { l:"Address",  v: order.deliveryAddress.substring(0,40) + (order.deliveryAddress.length > 40 ? "…" : "") },
                            { l:"Date",     v: format(new Date(order.createdAt),"MMM d, h:mm a") },
                            { l:"Savings",  v: order.totalSavings > 0 ? `£${order.totalSavings.toFixed(2)}` : "—" },
                          ].map(({l,v}) => (
                            <div key={l}><p className="text-xs text-gray-400">{l}</p><p className="font-medium capitalize truncate">{v}</p></div>
                          ))}
                        </div>
                        <div className="space-y-2">
                          {order.items.map(item => (
                            <div key={item.productId} className="flex items-center justify-between bg-white rounded-xl border p-3 text-sm">
                              <div>
                                <p className="font-medium">{item.productName}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{item.productSku}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">£{item.total.toFixed(2)}</p>
                                <p className="text-xs text-gray-400">{item.quantity} × £{item.unitPrice.toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              const items = order.items
                                .map(i => {
                                  const p = products.find(x => x.id === i.productId);
                                  return p ? { product: p, quantity: i.quantity, unitPrice: i.unitPrice } : null;
                                })
                                .filter((x): x is PortalCartItem => x !== null);
                              setCart(items); setPage("cart");
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100">
                            <RefreshCw className="w-3.5 h-3.5"/>Reorder
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <MobileBottomNav
          currentPage={page}
          onNavigate={setPage}
          pendingOrdersCount={myOrders.filter(o => o.status === "pending").length}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE — ACCOUNT
  // ═══════════════════════════════════════════════════════════════════════════
  if (page === "account") {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {renderAuthHeader()}
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CircleUser className="w-6 h-6 text-blue-600"/>My Account
          </h2>

          {/* Profile banner */}
          <div className={cn("rounded-2xl p-6 text-white relative overflow-hidden",
            customer.type === "wholesaler" ? "bg-gradient-to-r from-blue-700 to-blue-500" :
            customer.type === "trader"     ? "bg-gradient-to-r from-purple-700 to-purple-500" :
                                             "bg-gradient-to-r from-emerald-700 to-emerald-500")}>
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold">{customer.name[0]}</div>
              <div>
                <h3 className="text-xl font-bold">{customer.name}</h3>
                {renderTierBadge(customer.type)}
                <p className="text-white/70 text-sm mt-1">{tc.discount}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-blue-600"/>Account Information</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { icon:<Mail className="w-3.5 h-3.5"/>,   l:"Email",   v: customer.email || "—"   },
                  { icon:<Phone className="w-3.5 h-3.5"/>,  l:"Phone",   v: customer.phone          },
                  { icon:<MapPin className="w-3.5 h-3.5"/>, l:"Address", v: customer.address || "—" },
                ].map(({icon,l,v}) => (
                  <div key={l} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-gray-400">{icon}</span>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{l}</p>
                      <p className="font-medium text-gray-700">{v}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t text-xs text-gray-400">
                  Member since {format(new Date(customer.createdAt), "MMMM yyyy")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><BadgePercent className="w-4 h-4 text-blue-600"/>Pricing &amp; Credit</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className={cn("rounded-xl p-4 text-white", tc.bg)}>
                  <p className="text-sm opacity-80">Account Type</p>
                  <p className="text-xl font-bold mt-0.5">{tc.label}</p>
                  <p className="text-sm opacity-80">{tc.discount}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600">Credit Balance</span>
                    <span className={cn("font-bold", customer.creditBalance > 0 ? "text-green-600" : "text-gray-500")}>£{customer.creditBalance.toFixed(2)}</span>
                  </div>
                  {customer.creditLimit !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Credit Limit</span>
                      <span className="font-medium">£{customer.creditLimit.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ReceiptText className="w-4 h-4 text-blue-600"/>Order Statistics</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                    <p className="text-xs font-medium text-blue-600 mb-1">Total Orders</p>
                    <p className="text-xl font-bold text-blue-700">{myOrders.length}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
                    <p className="text-xs font-medium text-purple-600 mb-1">Total Spent</p>
                    <p className="text-xl font-bold text-purple-700">£{myOrders.reduce((s,o) => s+o.total, 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                    <p className="text-xs font-medium text-green-600 mb-1">Total Savings</p>
                    <p className="text-xl font-bold text-green-700">£{myOrders.reduce((s,o) => s+o.totalSavings, 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                    <p className="text-xs font-medium text-amber-600 mb-1">Pending</p>
                    <p className="text-xl font-bold text-amber-700">{myOrders.filter(o => o.status === "pending").length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button onClick={handleLogout} variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
            <LogOut className="w-4 h-4"/>Sign Out
          </Button>
        </div>
        <MobileBottomNav
          currentPage={page}
          onNavigate={setPage}
          pendingOrdersCount={myOrders.filter(o => o.status === "pending").length}
        />
      </div>
    );
  }

  return null;
}
