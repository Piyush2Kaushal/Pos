/**
 * Staff Portal — /staff-portal
 *
 * Full-featured portal for staff to:
 *  • Log in with email + PIN
 *  • See their assigned customers
 *  • View & fill orders for those customers
 *  • Update order status: Pending → Processing → Packed → Dispatched
 */
import { useState, useMemo, useCallback } from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  LogIn, LogOut, Package, Users, ClipboardList, ChevronRight,
  Plus, Minus, Trash2, Check, Clock, Truck, Box, X,
  Search, Filter, AlertCircle, CheckCircle2, RotateCcw,
  Phone, Mail, MapPin, Star, Eye, ShoppingCart, SendHorizonal,
  RefreshCw, Layers, Hash, PoundSterling, TrendingUp, User,
  Zap, ArrowRight, Lock, Building2, BarChart3, CalendarDays,
  PackageCheck, PackageOpen, Navigation, ShieldCheck, Info,
} from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { toast } from "sonner";
import {
  Customer, CustomerOrder, CustomerOrderStatus, CustomerOrderItem,
  Product, Staff,
} from "@/app/types";

// ─── Constants ────────────────────────────────────────────────────────────────
const DEMO_PIN = "1234";

// Staff → Assigned Customer IDs
const STAFF_CUSTOMERS: Record<string, string[]> = {
  "1": ["1", "4", "6", "2"],           // David Anderson  → wholesalers + trader
  "2": ["5", "9", "10", "3"],          // Emily Roberts   → traders + retailer
  "3": ["7", "8", "11", "12"],         // Marcus Thompson → wholesalers + traders
  "4": ["13", "14", "15"],             // Sophie Williams → retailers
  "5": ["16", "17", "18"],             // James Patterson → retailers
  "6": ["1","4","6","7","8","2","5","9","10","11","12","3","13","14","15","16","17","18"], // Rachel Green (mgr) → all
  "7": ["1", "4", "6", "7"],           // Tom Bradley
  "8": ["1","2","3","4","5","6","7","8","9","10"], // Lisa Martinez (admin) → all
};

// Order status pipeline
type FulfillStatus = "pending" | "processing" | "packed" | "dispatched";

const STATUS_PIPELINE: { key: FulfillStatus; label: string; icon: React.ElementType; color: string; bg: string; next?: string }[] = [
  { key: "pending",    label: "Pending",    icon: Clock,        color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  next: "processing" },
  { key: "processing", label: "Processing", icon: RefreshCw,    color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",    next: "packed" },
  { key: "packed",     label: "Packed",     icon: PackageCheck, color: "text-violet-700", bg: "bg-violet-50 border-violet-200", next: "dispatched" },
  { key: "dispatched", label: "Dispatched", icon: Truck,        color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200" },
];

const STATUS_NEXT_LABEL: Record<FulfillStatus, string> = {
  pending: "Start Processing",
  processing: "Mark as Packed",
  packed: "Mark as Dispatched",
  dispatched: "",
};
const STATUS_NEXT_ICON: Record<FulfillStatus, React.ElementType> = {
  pending: RefreshCw,
  processing: PackageCheck,
  packed: Truck,
  dispatched: CheckCircle2,
};

const customerOrderStatusToFulfill = (s: CustomerOrderStatus): FulfillStatus => {
  if (s === "shipped" || s === "delivered") return "dispatched";
  if (s === "processing") return "processing";
  if (s === "confirmed") return "processing";
  return "pending";
};

const fulfillToOrderStatus: Record<FulfillStatus, CustomerOrderStatus> = {
  pending: "pending",
  processing: "processing",
  packed: "confirmed",
  dispatched: "shipped",
};

// ─── Price helper ────────────────────────────────────────────────────────────
function priceForCustomer(p: Product, c: Customer): number {
  if (c.type === "wholesaler") return p.wholesalePrice;
  if (c.type === "trader") return p.traderPrice;
  return p.retailPrice;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const genId = () => `OP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const genOrderNum = () => `ORD-${String(Date.now()).slice(-6)}`;

function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}
function avatarColor(name: string) {
  const colors = ["from-blue-500 to-indigo-600","from-emerald-500 to-teal-600","from-violet-500 to-purple-600","from-rose-500 to-pink-600","from-amber-500 to-orange-600","from-cyan-500 to-blue-600"];
  const i = name.charCodeAt(0) % colors.length;
  return colors[i];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// PIN input dots
function PinInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-3 justify-center">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className={cn(
          "w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl transition-all duration-150",
          value.length > i ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"
        )}>
          {value.length > i ? <div className="w-3 h-3 rounded-full bg-blue-600" /> : null}
        </div>
      ))}
    </div>
  );
}

// Status badge
function StatusBadge({ status }: { status: FulfillStatus }) {
  const s = STATUS_PIPELINE.find(x => x.key === status)!;
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", s.bg, s.color)}>
      <Icon className="w-3 h-3" />{s.label}
    </span>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function StaffPortal({ initialStaff, onLogout: onLogoutProp }: {
  initialStaff?: Staff;
  onLogout?: () => void;
} = {}) {
  const { staff, customers, products, customerOrders, addCustomerOrder, updateCustomerOrder, staffAssignments } = usePOS();

  // ── Auth state ──────────────────────────────────────────────────────────────
  const [loggedIn, setLoggedIn]         = useState(!!initialStaff);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(initialStaff ?? null);
  const [loginEmail, setLoginEmail]   = useState("");
  const [loginPin, setLoginPin]       = useState("");
  const [loginError, setLoginError]   = useState("");
  const [pinDraft, setPinDraft]       = useState(""); // for numpad

  // ── Navigation state ────────────────────────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOrder, setSelectedOrder]       = useState<CustomerOrder | null>(null);
  const [view, setView] = useState<"overview" | "customer" | "order" | "new-order">("overview");
  const [orderTab, setOrderTab] = useState<"active" | "all">("active");
  const [customerSearch, setCustomerSearch] = useState("");

  // ── New order builder ────────────────────────────────────────────────────────
  const [orderItems, setOrderItems]   = useState<{ product: Product; qty: number }[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [orderNotes, setOrderNotes]   = useState("");

  // ── Status update note ───────────────────────────────────────────────────────
  const [statusNote, setStatusNote]   = useState("");
  const [showStatusNote, setShowStatusNote] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<FulfillStatus | null>(null);

  // ── Derived: my customers (from live context assignments) ────────────────
  const myCustomerIds = useMemo(() => {
    if (!currentStaff) return [];
    return Object.entries(staffAssignments)
      .filter(([, sid]) => sid === currentStaff.id)
      .map(([cid]) => cid);
  }, [currentStaff, staffAssignments]);

  const myCustomers = useMemo(() =>
    customers.filter(c => myCustomerIds.includes(c.id)), [customers, myCustomerIds]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return myCustomers;
    const q = customerSearch.toLowerCase();
    return myCustomers.filter(c => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
  }, [myCustomers, customerSearch]);

  // ── Derived: orders ────────────────────────────────────────────────────────
  const myOrders = useMemo(() =>
    customerOrders.filter(o => myCustomerIds.includes(o.customerId)), [customerOrders, myCustomerIds]);

  const customerActiveOrders = useCallback((custId: string) =>
    myOrders.filter(o => o.customerId === custId && !["shipped","delivered","cancelled"].includes(o.status)),
    [myOrders]);

  const customerAllOrders = useCallback((custId: string) =>
    myOrders.filter(o => o.customerId === custId), [myOrders]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    totalCustomers: myCustomers.length,
    pendingOrders:  myOrders.filter(o => o.status === "pending").length,
    processing:     myOrders.filter(o => o.status === "processing" || o.status === "confirmed").length,
    dispatched:     myOrders.filter(o => o.status === "shipped").length,
    totalRevenue:   myOrders.reduce((s, o) => s + o.total, 0),
  }), [myOrders, myCustomers]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = () => {
    const member = staff.find(s =>
      s.email.toLowerCase() === loginEmail.toLowerCase() && s.status === "active"
    );
    if (!member) { setLoginError("Email not found or account inactive"); return; }
    if (loginPin !== DEMO_PIN) { setLoginError("Incorrect PIN"); return; }
    setCurrentStaff(member);
    setLoggedIn(true);
    setLoginError("");
    toast.success(`Welcome back, ${member.name.split(" ")[0]}!`);
  };

  const handlePinKey = (digit: string) => {
    if (loginPin.length < 4) setLoginPin(p => p + digit);
  };
  const handlePinBackspace = () => setLoginPin(p => p.slice(0, -1));

  const handleLogout = () => {
    if (onLogoutProp) { onLogoutProp(); return; }
    setLoggedIn(false);
    setCurrentStaff(null);
    setSelectedCustomer(null);
    setSelectedOrder(null);
    setView("overview");
    setLoginEmail("");
    setLoginPin("");
  };

  // ── Status advance ─────────────────────────────────────────────────────────
  const advanceStatus = (order: CustomerOrder, toStatus: FulfillStatus) => {
    const nextOrderStatus = fulfillToOrderStatus[toStatus];
    const patch: Partial<CustomerOrder> = {
      status: nextOrderStatus,
      updatedAt: new Date(),
    };
    if (toStatus === "packed") patch.packedBy = currentStaff?.name;
    if (toStatus === "dispatched") {
      patch.dispatchedAt = new Date();
      patch.dispatchNotes = statusNote || undefined;
    }
    updateCustomerOrder(order.id, patch);
    if (selectedOrder?.id === order.id) {
      setSelectedOrder({ ...order, ...patch } as CustomerOrder);
    }
    setStatusNote("");
    setShowStatusNote(false);
    setPendingStatus(null);
    toast.success(`Order ${order.orderNumber} marked as ${toStatus}`);
  };

  // ── New order submit ────────────────────────────────────────────────────────
  const submitNewOrder = () => {
    if (!selectedCustomer || orderItems.length === 0) {
      toast.error("Add at least one item"); return;
    }
    const items: CustomerOrderItem[] = orderItems.map(({ product, qty }) => {
      const unit = priceForCustomer(product, selectedCustomer);
      const retail = product.retailPrice;
      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        category: product.category,
        quantity: qty,
        unitPrice: unit,
        retailPrice: retail,
        total: unit * qty,
      };
    });
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const savings  = items.reduce((s, i) => s + (i.retailPrice - i.unitPrice) * i.quantity, 0);
    addCustomerOrder({
      orderNumber: genOrderNum(),
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerType: selectedCustomer.type,
      items,
      subtotal,
      totalSavings: Math.max(0, savings),
      total: subtotal,
      status: "pending",
      notes: orderNotes || undefined,
      deliveryAddress: selectedCustomer.address || "",
      paymentMethod: "invoice",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    toast.success("Order created successfully");
    setOrderItems([]);
    setOrderNotes("");
    setView("customer");
    setOrderTab("active");
  };

  // ── Add product to new order ──────────────────────────────────────────────
  const addProduct = (p: Product) => {
    setOrderItems(prev => {
      const ex = prev.find(x => x.product.id === p.id);
      if (ex) return prev.map(x => x.product.id === p.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { product: p, qty: 1 }];
    });
  };
  const updateQty = (pid: string, qty: number) => {
    if (qty <= 0) setOrderItems(prev => prev.filter(x => x.product.id !== pid));
    else setOrderItems(prev => prev.map(x => x.product.id === pid ? { ...x, qty } : x));
  };
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 30);
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)).slice(0, 30);
  }, [products, productSearch]);

  // ─── RENDER: Login ────────────────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 flex items-center justify-center p-4">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }} />

        <div className="relative w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 mb-4">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">BNM Parts</h1>
            <p className="text-blue-300 text-sm mt-1 flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />Staff Portal
            </p>
          </div>

          {/* Login card */}
          <div className="bg-white/[0.06] backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1">Sign In</h2>
            <p className="text-blue-300 text-sm mb-6">Enter your email and 4-digit PIN</p>

            {loginError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-300 text-sm">{loginError}</p>
              </div>
            )}

            {/* Email */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-blue-200 mb-1.5">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  placeholder="your.name@bnmparts.com"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.08] border border-white/20 text-white placeholder-white/30 text-sm outline-none focus:border-blue-400 focus:bg-white/[0.12] transition-all"
                />
              </div>
            </div>

            {/* PIN dots */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-blue-200 mb-3">4-Digit PIN</label>
              <PinInput value={loginPin} onChange={setLoginPin} />
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
                <button
                  key={i}
                  onClick={() => k === "⌫" ? handlePinBackspace() : k ? handlePinKey(k) : null}
                  className={cn(
                    "h-12 rounded-xl text-white font-semibold text-lg transition-all duration-100",
                    k ? "bg-white/10 hover:bg-white/20 active:bg-white/25" : "pointer-events-none",
                    k === "⌫" && "text-red-300 hover:bg-red-500/20"
                  )}
                >
                  {k}
                </button>
              ))}
            </div>

            <button
              onClick={handleLogin}
              disabled={!loginEmail || loginPin.length !== 4}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm hover:from-blue-400 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />Sign In to Portal
            </button>
          </div>

          {/* Demo credentials */}
          <div className="mt-4 bg-white/[0.04] border border-white/10 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Info className="w-3 h-3" />Demo Credentials (PIN: 1234 for all)
            </p>
            <div className="space-y-1.5">
              {[
                { email: "david.anderson@mobilestore.com", role: "Manager", customers: "Wholesalers" },
                { email: "emily.roberts@mobilestore.com",  role: "Cashier", customers: "Traders" },
                { email: "rachel.green@mobilestore.com",   role: "Manager", customers: "All Customers" },
              ].map(d => (
                <button key={d.email}
                  onClick={() => setLoginEmail(d.email)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left group">
                  <div>
                    <p className="text-xs text-white/80 font-medium group-hover:text-white">{d.email}</p>
                    <p className="text-[10px] text-blue-400">{d.role} · {d.customers}</p>
                  </div>
                  <ArrowRight className="w-3 h-3 text-white/30 group-hover:text-white/60" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: Portal ──────────────────────────────────────────────────────
  const staff_ = currentStaff!;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm leading-tight">BNM Parts</h1>
            <p className="text-[10px] text-blue-600 font-medium">Staff Portal</p>
          </div>

          {/* Breadcrumb */}
          <div className="hidden md:flex items-center gap-1.5 ml-4 text-xs text-gray-500">
            <button onClick={() => { setView("overview"); setSelectedCustomer(null); setSelectedOrder(null); }}
              className="hover:text-blue-600 font-medium transition-colors">Overview</button>
            {selectedCustomer && (
              <>
                <ChevronRight className="w-3 h-3" />
                <button onClick={() => { setView("customer"); setSelectedOrder(null); }}
                  className="hover:text-blue-600 font-medium transition-colors truncate max-w-[160px]">
                  {selectedCustomer.name}
                </button>
              </>
            )}
            {view === "new-order" && <><ChevronRight className="w-3 h-3" /><span className="text-blue-600 font-medium">New Order</span></>}
            {selectedOrder && <><ChevronRight className="w-3 h-3" /><span className="text-blue-600 font-medium">{selectedOrder.orderNumber}</span></>}
          </div>
        </div>

        {/* Staff badge + logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br", avatarColor(staff_.name))}>
              {initials(staff_.name)}
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{staff_.name}</p>
              <p className="text-[10px] text-gray-500 capitalize">{staff_.role}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
            <LogOut className="w-3.5 h-3.5" />Sign Out
          </button>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Sidebar: My Customers ─────────────────────────────────── */}
        <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">My Customers</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                placeholder="Search customers…"
                className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-gray-50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Users className="w-7 h-7 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No customers assigned</p>
              </div>
            ) : (
              filteredCustomers.map(customer => {
                const active = customerActiveOrders(customer.id);
                const isSelected = selectedCustomer?.id === customer.id;
                return (
                  <button
                    key={customer.id}
                    onClick={() => { setSelectedCustomer(customer); setSelectedOrder(null); setView("customer"); setOrderTab("active"); }}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-l-2",
                      isSelected ? "bg-blue-50 border-l-blue-500" : "border-l-transparent"
                    )}
                  >
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 bg-gradient-to-br", avatarColor(customer.name))}>
                      {initials(customer.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{customer.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                          customer.type === "wholesaler" ? "bg-blue-100 text-blue-700" :
                          customer.type === "trader"     ? "bg-violet-100 text-violet-700" :
                          "bg-gray-100 text-gray-600"
                        )}>{customer.type}</span>
                        {active.length > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            {active.length} active
                          </span>
                        )}
                      </div>
                    </div>
                    {active.length > 0 && (
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                        {active.length}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">

          {/* ════════ OVERVIEW ════════ */}
          {view === "overview" && (
            <div className="p-6 space-y-6">
              {/* Welcome */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
                <div className="absolute right-12 bottom-0 w-24 h-24 rounded-full bg-white/5 translate-y-1/2" />
                <div className="relative">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-3 bg-gradient-to-br", avatarColor(staff_.name))}>
                    {initials(staff_.name)}
                  </div>
                  <h2 className="text-2xl font-bold">Welcome back, {staff_.name.split(" ")[0]}!</h2>
                  <p className="text-blue-200 mt-0.5 capitalize">{staff_.role} · BNM Parts Staff Portal</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "My Customers",   value: stats.totalCustomers, icon: Users,       color: "blue"   },
                  { label: "Pending Orders", value: stats.pendingOrders,  icon: Clock,       color: "amber"  },
                  { label: "Processing",     value: stats.processing,     icon: RefreshCw,   color: "violet" },
                  { label: "Dispatched",     value: stats.dispatched,     icon: Truck,       color: "emerald"},
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2 text-white",
                      color === "blue" ? "bg-blue-500" : color === "amber" ? "bg-amber-500" :
                      color === "violet" ? "bg-violet-500" : "bg-emerald-500"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* All pending orders across my customers */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Pending Orders Requiring Action
                </h3>
                {myOrders.filter(o => o.status === "pending").length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <p className="font-medium text-gray-700">All caught up!</p>
                    <p className="text-sm text-gray-400">No pending orders</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myOrders.filter(o => o.status === "pending").map(order => (
                      <OrderRowCard
                        key={order.id}
                        order={order}
                        onManage={() => {
                          const cust = customers.find(c => c.id === order.customerId);
                          if (cust) { setSelectedCustomer(cust); setSelectedOrder(order); setView("order"); }
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════ CUSTOMER DETAIL ════════ */}
          {view === "customer" && selectedCustomer && (
            <div className="p-6 space-y-5">
              {/* Customer header */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-bold bg-gradient-to-br", avatarColor(selectedCustomer.name))}>
                      {initials(selectedCustomer.name)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h2>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full capitalize",
                          selectedCustomer.type === "wholesaler" ? "bg-blue-100 text-blue-700" :
                          selectedCustomer.type === "trader"     ? "bg-violet-100 text-violet-700" :
                          "bg-gray-100 text-gray-600"
                        )}>{selectedCustomer.type}</span>
                        <span className="flex items-center gap-1 text-xs text-gray-500"><Phone className="w-3 h-3" />{selectedCustomer.phone}</span>
                        {selectedCustomer.email && <span className="flex items-center gap-1 text-xs text-gray-500"><Mail className="w-3 h-3" />{selectedCustomer.email}</span>}
                      </div>
                      {selectedCustomer.address && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{selectedCustomer.address}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => { setOrderItems([]); setOrderNotes(""); setView("new-order"); }}
                    className="bg-blue-600 hover:bg-blue-700 gap-2">
                    <Plus className="w-4 h-4" />New Order
                  </Button>
                </div>

                {/* Customer quick stats */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
                  {[
                    { label: "Active Orders", value: customerActiveOrders(selectedCustomer.id).length, color: "text-amber-600" },
                    { label: "Total Orders",  value: customerAllOrders(selectedCustomer.id).length, color: "text-blue-600" },
                    { label: "Credit Balance", value: `£${selectedCustomer.creditBalance.toFixed(2)}`, color: "text-emerald-600" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center">
                      <p className={cn("text-xl font-bold", color)}>{value}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Orders tabs */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center border-b border-gray-100">
                  {[
                    { id: "active", label: "Active Orders", count: customerActiveOrders(selectedCustomer.id).length },
                    { id: "all",    label: "All Orders",    count: customerAllOrders(selectedCustomer.id).length },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setOrderTab(tab.id as any)}
                      className={cn(
                        "flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2",
                        orderTab === tab.id ? "border-blue-500 text-blue-600 bg-blue-50/50" : "border-transparent text-gray-500 hover:text-gray-700"
                      )}>
                      {tab.label}
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-bold",
                        orderTab === tab.id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                      )}>{tab.count}</span>
                    </button>
                  ))}
                </div>

                <div className="p-4 space-y-3">
                  {(orderTab === "active" ? customerActiveOrders(selectedCustomer.id) : customerAllOrders(selectedCustomer.id)).length === 0 ? (
                    <div className="py-12 text-center">
                      <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="font-medium text-gray-500">No {orderTab === "active" ? "active " : ""}orders</p>
                      <button onClick={() => { setOrderItems([]); setOrderNotes(""); setView("new-order"); }}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5 mx-auto">
                        <Plus className="w-4 h-4" />Create first order
                      </button>
                    </div>
                  ) : (
                    (orderTab === "active" ? customerActiveOrders(selectedCustomer.id) : customerAllOrders(selectedCustomer.id)).map(order => (
                      <OrderRowCard key={order.id} order={order}
                        onManage={() => { setSelectedOrder(order); setView("order"); }} />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════ ORDER DETAIL ════════ */}
          {view === "order" && selectedOrder && (
            <OrderDetailView
              order={selectedOrder}
              staffName={staff_.name}
              onAdvance={(toStatus) => {
                if (toStatus === "dispatched") { setPendingStatus(toStatus); setShowStatusNote(true); }
                else advanceStatus(selectedOrder, toStatus);
              }}
              onBack={() => setView("customer")}
            />
          )}

          {/* ════════ NEW ORDER ════════ */}
          {view === "new-order" && selectedCustomer && (
            <div className="p-6 space-y-5 max-w-5xl">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setView("customer")} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                  <ChevronRight className="w-4 h-4 rotate-180" />Back
                </button>
                <h2 className="text-xl font-bold text-gray-900">New Order for {selectedCustomer.name}</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Product picker */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-800 text-sm mb-2.5">Add Products</h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        placeholder="Search by name, SKU, category…"
                        className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-gray-50"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[380px] divide-y divide-gray-50">
                    {filteredProducts.map(p => {
                      const price = priceForCustomer(p, selectedCustomer);
                      const inCart = orderItems.find(x => x.product.id === p.id);
                      const outOfStock = p.stock === 0;
                      return (
                        <button key={p.id} onClick={() => !outOfStock && addProduct(p)} disabled={outOfStock}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50/50 transition-colors",
                            inCart && "bg-blue-50",
                            outOfStock && "opacity-50 cursor-not-allowed"
                          )}>
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            {p.image ? <img src={p.image} className="w-9 h-9 object-cover rounded-lg" alt="" /> : <Package className="w-4 h-4 text-gray-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{p.sku} · {p.stock} in stock</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-blue-600">£{price.toFixed(2)}</p>
                            {inCart && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Added</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Order cart */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                      Order Items
                      {orderItems.length > 0 && (
                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{orderItems.length}</span>
                      )}
                    </h3>
                    {orderItems.length > 0 && (
                      <button onClick={() => setOrderItems([])} className="text-xs text-red-500 hover:text-red-700">Clear all</button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-gray-50 min-h-[200px]">
                    {orderItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-12 text-gray-300">
                        <ShoppingCart className="w-10 h-10 mb-2" />
                        <p className="text-sm font-medium">No items added</p>
                        <p className="text-xs">Select products from the left</p>
                      </div>
                    ) : orderItems.map(({ product: p, qty }) => {
                      const price = priceForCustomer(p, selectedCustomer);
                      return (
                        <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                            <p className="text-xs text-gray-400">£{price.toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => updateQty(p.id, qty - 1)}
                              className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-gray-900">{qty}</span>
                            <button onClick={() => updateQty(p.id, qty + 1)}
                              className="w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center text-blue-600 transition-colors">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="w-16 text-right shrink-0">
                            <p className="text-sm font-bold text-gray-900">£{(price * qty).toFixed(2)}</p>
                          </div>
                          <button onClick={() => updateQty(p.id, 0)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Totals + submit */}
                  {orderItems.length > 0 && (
                    <div className="border-t border-gray-100 p-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-bold text-gray-900">
                          £{orderItems.reduce((s, { product: p, qty }) => s + priceForCustomer(p, selectedCustomer) * qty, 0).toFixed(2)}
                        </span>
                      </div>
                      <textarea
                        value={orderNotes}
                        onChange={e => setOrderNotes(e.target.value)}
                        placeholder="Order notes (optional)…"
                        rows={2}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 resize-none placeholder-gray-400"
                      />
                      <button onClick={submitNewOrder}
                        className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                        <SendHorizonal className="w-4 h-4" />Submit Order
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Status note modal */}
      {showStatusNote && pendingStatus && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-1 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />Mark as Dispatched
            </h3>
            <p className="text-sm text-gray-500 mb-4">Add dispatch notes or tracking information</p>
            <textarea
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
              placeholder="Tracking number, carrier, notes… (optional)"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 resize-none mb-4"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowStatusNote(false); setPendingStatus(null); }}>Cancel</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => advanceStatus(selectedOrder, pendingStatus)}>
                <Truck className="w-4 h-4 mr-1.5" />Confirm Dispatch
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Order Row Card ────────────────────────────────────────────────────────────
function OrderRowCard({ order, onManage }: { order: CustomerOrder; onManage: () => void }) {
  const fs = customerOrderStatusToFulfill(order.status as CustomerOrderStatus);
  const s = STATUS_PIPELINE.find(x => x.key === fs)!;
  const Icon = s.icon;
  return (
    <div className={cn("flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-sm", s.bg)}>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.color, "bg-white border", s.bg.split(" ")[1])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-900 text-sm">{order.orderNumber}</span>
          <StatusBadge status={fs} />
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {order.customerName} · {order.items.length} item{order.items.length !== 1 ? "s" : ""} · £{order.total.toFixed(2)}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </p>
      </div>
      <button onClick={onManage}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shrink-0 shadow-sm">
        Manage <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Order Detail View ────────────────────────────────────────────────────────
function OrderDetailView({ order, staffName, onAdvance, onBack }: {
  order: CustomerOrder;
  staffName: string;
  onAdvance: (to: FulfillStatus) => void;
  onBack: () => void;
}) {
  const fulfillStatus = customerOrderStatusToFulfill(order.status as CustomerOrderStatus);
  const currentIdx = STATUS_PIPELINE.findIndex(s => s.key === fulfillStatus);
  const isComplete = fulfillStatus === "dispatched";
  const nextStatus = STATUS_PIPELINE[currentIdx + 1];

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ChevronRight className="w-4 h-4 rotate-180" />Back
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{order.orderNumber}</h2>
          <p className="text-xs text-gray-500">{order.customerName}</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={fulfillStatus} />
        </div>
      </div>

      {/* Status Pipeline */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Order Status Pipeline</h3>
        <div className="flex items-center gap-0">
          {STATUS_PIPELINE.map((step, idx) => {
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all",
                    isDone    ? "bg-emerald-500 border-emerald-500 text-white" :
                    isCurrent ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" :
                                "bg-gray-100 border-gray-200 text-gray-400"
                  )}>
                    {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <p className={cn("text-[10px] font-bold mt-1.5",
                    isDone ? "text-emerald-600" : isCurrent ? "text-blue-600" : "text-gray-400"
                  )}>{step.label}</p>
                </div>
                {idx < STATUS_PIPELINE.length - 1 && (
                  <div className={cn("h-0.5 flex-1 mx-1 rounded-full",
                    idx < currentIdx ? "bg-emerald-400" : "bg-gray-200"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Action button */}
        {!isComplete && nextStatus && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <button
              onClick={() => onAdvance(nextStatus.key)}
              className={cn(
                "w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all",
                nextStatus.key === "processing" ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-200 hover:from-blue-500 hover:to-indigo-500" :
                nextStatus.key === "packed"     ? "bg-gradient-to-r from-violet-600 to-purple-600 shadow-violet-200 hover:from-violet-500 hover:to-purple-500" :
                "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-200 hover:from-emerald-500 hover:to-teal-500"
              )}
            >
              {(() => { const NI = STATUS_NEXT_ICON[fulfillStatus]; return <NI className="w-4 h-4" />; })()}
              {STATUS_NEXT_LABEL[fulfillStatus]}
            </button>
            {nextStatus.key === "packed" && (
              <p className="text-[11px] text-center text-gray-400 mt-2">
                Will record: Packed by {staffName}
              </p>
            )}
          </div>
        )}

        {isComplete && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-semibold text-sm">Order fully dispatched</p>
            {order.dispatchedAt && (
              <span className="text-xs text-gray-400 ml-auto">
                {new Date(order.dispatchedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Order info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-600" />Order Details
          </h3>
          <div className="space-y-2">
            {[
              { label: "Order Number",  value: order.orderNumber },
              { label: "Customer",      value: order.customerName },
              { label: "Payment",       value: order.paymentMethod },
              { label: "Created",       value: new Date(order.createdAt).toLocaleDateString("en-GB", { day:"2-digit",month:"short",year:"numeric" }) },
              order.packedBy ? { label: "Packed By", value: order.packedBy } : null,
              order.trackingNumber ? { label: "Tracking", value: order.trackingNumber } : null,
            ].filter(Boolean).map(({ label, value }: any) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900">{value}</span>
              </div>
            ))}
          </div>
          {order.notes && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{order.notes}</p>
            </div>
          )}
          {order.dispatchNotes && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 mb-1">Dispatch Notes</p>
              <p className="text-sm text-gray-700">{order.dispatchNotes}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />Delivery Address
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed">{order.deliveryAddress || "No address provided"}</p>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            Items ({order.items.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.productName}</p>
                <p className="text-[10px] text-gray-400 font-mono">{item.productSku} · {item.category}</p>
              </div>
              <div className="flex items-center gap-3 text-sm shrink-0">
                <span className="text-gray-500">× {item.quantity}</span>
                <span className="text-gray-700">£{item.unitPrice.toFixed(2)}</span>
                <span className="font-bold text-gray-900 w-20 text-right">£{item.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Order totals */}
        <div className="px-5 py-4 bg-gray-50/60 border-t border-gray-100">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium text-gray-900">£{order.subtotal.toFixed(2)}</span>
          </div>
          {order.totalSavings > 0 && (
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-emerald-600">Savings</span>
              <span className="font-medium text-emerald-600">−£{order.totalSavings.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold mt-2 pt-2 border-t border-gray-200">
            <span className="text-gray-900">Total</span>
            <span className="text-blue-700">£{order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
