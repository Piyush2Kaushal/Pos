import { useState, useMemo } from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  Package, Search, Truck, CheckCircle2, Clock, RefreshCw,
  PackageCheck, X, ChevronDown, ChevronUp, Printer,
  MapPin, User, Weight, Ruler, StickyNote,
  ClipboardList, TrendingUp, AlertCircle,
  Save, ExternalLink, Copy, CheckCheck,
  ArrowUpRight, Layers, Send,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/app/components/ui/select";
import { cn } from "@/app/components/ui/utils";
import { format } from "date-fns";
import { CustomerOrder, CustomerOrderStatus } from "@/app/types";
import { toast } from "sonner";

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<CustomerOrderStatus, {
  label: string; color: string; bg: string; border: string;
  dot: string; icon: React.ElementType; next?: CustomerOrderStatus;
}> = {
  pending:    { label: "Pending",    color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200", dot: "bg-amber-500",   icon: Clock,        next: "confirmed"  },
  confirmed:  { label: "Confirmed",  color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200",  dot: "bg-blue-500",    icon: CheckCircle2, next: "processing" },
  processing: { label: "Processing", color: "text-indigo-700",  bg: "bg-indigo-50",   border: "border-indigo-200",dot: "bg-indigo-500",  icon: RefreshCw,    next: "shipped"    },
  shipped:    { label: "Shipped",    color: "text-purple-700",  bg: "bg-purple-50",   border: "border-purple-200",dot: "bg-purple-500",  icon: Truck,        next: "delivered"  },
  delivered:  { label: "Delivered",  color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200",dot:"bg-emerald-500", icon: PackageCheck, next: undefined    },
  cancelled:  { label: "Cancelled",  color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200",   dot: "bg-red-500",     icon: X,            next: undefined    },
};

const CARRIERS = ["Royal Mail", "DHL", "DPD", "UPS", "FedEx", "Hermes", "ParcelForce", "Yodel", "Amazon Logistics", "Other"];

const TIER_BADGE: Record<string, { bg: string; label: string }> = {
  wholesaler: { bg: "bg-blue-600",    label: "Wholesaler" },
  trader:     { bg: "bg-purple-600",  label: "Trader"     },
  retailer:   { bg: "bg-emerald-600", label: "Retailer"   },
};

// ─── Seed data for demo (a handful of realistic orders) ───────────────────────
const SEED_ORDERS: CustomerOrder[] = [
  {
    id: "seed-1", orderNumber: "ORD-0001", customerId: "1", customerName: "ABC Electronics Wholesale",
    customerType: "wholesaler",
    items: [
      { productId: "p1", productName: "iPhone 15 Screen Assembly",    productSku: "SCR-IP15",  category: "Screens",    quantity: 5, unitPrice: 84.00, retailPrice: 120.00, total: 420.00 },
      { productId: "p2", productName: "USB-C Fast Charging Cable 2m", productSku: "CBL-USBC2", category: "Cables",     quantity: 20,unitPrice: 4.20,  retailPrice: 6.00,   total: 84.00  },
      { productId: "p3", productName: "Tempered Glass Screen Guard",  productSku: "PRO-TG15",  category: "Protection", quantity: 30,unitPrice: 2.80,  retailPrice: 4.00,   total: 84.00  },
    ],
    subtotal: 588.00, totalSavings: 180.00, total: 588.00,
    status: "processing",
    deliveryAddress: "123 Wholesale Ave, Business District, London, E1 6AN",
    paymentMethod: "bank_transfer",
    notes: "Urgent order — please dispatch ASAP",
    packedBy: "Sarah Wilson",
    weight: 4.2,
    dimensions: "45×30×20 cm",
    createdAt: new Date("2026-02-19T09:15:00"), updatedAt: new Date("2026-02-19T11:30:00"),
  },
  {
    id: "seed-2", orderNumber: "ORD-0002", customerId: "2", customerName: "Tech Trading Co.",
    customerType: "trader",
    items: [
      { productId: "p4", productName: "Samsung S24 Battery Replacement", productSku: "BAT-SS24", category: "Batteries", quantity: 3, unitPrice: 25.50, retailPrice: 30.00, total: 76.50 },
      { productId: "p5", productName: "Wireless Charging Pad 15W",       productSku: "CHG-W15",  category: "Charging",  quantity: 5, unitPrice: 21.25, retailPrice: 25.00, total: 106.25},
    ],
    subtotal: 182.75, totalSavings: 29.25, total: 182.75,
    status: "shipped",
    deliveryAddress: "456 Market St, Downtown, London, SW1A 1AA",
    paymentMethod: "credit",
    trackingNumber: "GB123456789GB",
    trackingCarrier: "Royal Mail",
    trackingUrl: "https://royalmail.com/track",
    estimatedDelivery: new Date("2026-02-21"),
    dispatchedAt: new Date("2026-02-20T08:00:00"),
    packedBy: "James Miller",
    labelPrinted: true,
    weight: 1.8,
    dimensions: "30×20×15 cm",
    createdAt: new Date("2026-02-18T14:00:00"), updatedAt: new Date("2026-02-20T08:00:00"),
  },
  {
    id: "seed-3", orderNumber: "ORD-0003", customerId: "3", customerName: "Mobile Plus Store",
    customerType: "retailer",
    items: [
      { productId: "p6", productName: "Premium Phone Case iPhone 15 Pro", productSku: "CAS-IP15P", category: "Cases", quantity: 2, unitPrice: 18.00, retailPrice: 18.00, total: 36.00 },
    ],
    subtotal: 36.00, totalSavings: 0, total: 36.00,
    status: "pending",
    deliveryAddress: "789 High Road, Tottenham, London, N17 8AX",
    paymentMethod: "card",
    createdAt: new Date("2026-02-21T07:45:00"), updatedAt: new Date("2026-02-21T07:45:00"),
  },
  {
    id: "seed-4", orderNumber: "ORD-0004", customerId: "4", customerName: "Gadget World Distributors",
    customerType: "wholesaler",
    items: [
      { productId: "p7", productName: "Bluetooth Earbuds Pro",        productSku: "EAR-BT-P",  category: "Audio",   quantity: 10,unitPrice: 27.30, retailPrice: 39.00, total: 273.00 },
      { productId: "p8", productName: "Power Bank 20000mAh",          productSku: "PBK-20K",   category: "Charging",quantity: 8, unitPrice: 30.80, retailPrice: 44.00, total: 246.40 },
    ],
    subtotal: 519.40, totalSavings: 152.60, total: 519.40,
    status: "confirmed",
    deliveryAddress: "321 Industrial Blvd, Warehouse District, Manchester, M1 1AE",
    paymentMethod: "bank_transfer",
    notes: "Please use reinforced packaging",
    createdAt: new Date("2026-02-20T11:20:00"), updatedAt: new Date("2026-02-20T13:00:00"),
  },
];

const ALL_STATUSES: CustomerOrderStatus[] = ["pending","confirmed","processing","shipped","delivered","cancelled"];

// ─── Component ────────────────────────────────────────────────────────────────
export function CustomerOrdersView() {
  const { customerOrders: contextOrders, updateCustomerOrder } = usePOS();

  // Merge seed data with any real orders from context
  const allOrders = useMemo(() => {
    const realIds = new Set(contextOrders.map(o => o.id));
    return [...contextOrders, ...SEED_ORDERS.filter(s => !realIds.has(s.id))];
  }, [contextOrders]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerOrderStatus | "all">("all");
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [activeTab,    setActiveTab]    = useState<CustomerOrderStatus | "all">("all");

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [trackingOrder,  setTrackingOrder]  = useState<CustomerOrder | null>(null);
  const [labelOrder,     setLabelOrder]     = useState<CustomerOrder | null>(null);
  const [detailOrder,    setDetailOrder]    = useState<CustomerOrder | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // ── Tracking form state ──────────────────────────────────────────────────────
  const [trackingForm, setTrackingForm] = useState({
    trackingNumber: "", trackingCarrier: "", trackingUrl: "",
    estimatedDelivery: "", packedBy: "", weight: "", dimensions: "", dispatchNotes: "",
  });

  // ── Derived ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = allOrders;
    if (activeTab !== "all") list = list.filter(o => o.status === activeTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.trackingNumber?.toLowerCase().includes(q) ||
        o.deliveryAddress.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allOrders, activeTab, search]);

  const stats = useMemo(() => ({
    total:      allOrders.length,
    pending:    allOrders.filter(o => o.status === "pending").length,
    confirmed:  allOrders.filter(o => o.status === "confirmed").length,
    processing: allOrders.filter(o => o.status === "processing").length,
    shipped:    allOrders.filter(o => o.status === "shipped").length,
    delivered:  allOrders.filter(o => o.status === "delivered").length,
    cancelled:  allOrders.filter(o => o.status === "cancelled").length,
    revenue:    allOrders.filter(o => o.status !== "cancelled").reduce((s,o) => s+o.total, 0),
    todayCount: allOrders.filter(o => {
      const d = new Date(o.createdAt); const n = new Date();
      return d.toDateString() === n.toDateString();
    }).length,
    readyToShip:allOrders.filter(o => o.status === "processing").length,
  }), [allOrders]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const updateStatus = (id: string, status: CustomerOrderStatus) => {
    updateCustomerOrder(id, { status });
    toast.success(`Order updated to ${STATUS_CONFIG[status].label}`);
  };

  const advanceStatus = (order: CustomerOrder) => {
    const next = STATUS_CONFIG[order.status].next;
    if (!next) return;
    if (next === "shipped") { openTrackingModal(order); return; }
    updateStatus(order.id, next);
  };

  const openTrackingModal = (order: CustomerOrder) => {
    setTrackingOrder(order);
    setTrackingForm({
      trackingNumber:    order.trackingNumber    || "",
      trackingCarrier:   order.trackingCarrier   || "",
      trackingUrl:       order.trackingUrl       || "",
      estimatedDelivery: order.estimatedDelivery ? format(new Date(order.estimatedDelivery),"yyyy-MM-dd") : "",
      packedBy:          order.packedBy          || "",
      weight:            order.weight?.toString()|| "",
      dimensions:        order.dimensions        || "",
      dispatchNotes:     order.dispatchNotes      || "",
    });
  };

  const saveTracking = () => {
    if (!trackingOrder) return;
    if (!trackingForm.trackingNumber.trim()) { toast.error("Please enter a tracking number"); return; }
    if (!trackingForm.trackingCarrier)       { toast.error("Please select a carrier"); return; }
    updateCustomerOrder(trackingOrder.id, {
      trackingNumber:    trackingForm.trackingNumber.trim(),
      trackingCarrier:   trackingForm.trackingCarrier,
      trackingUrl:       trackingForm.trackingUrl.trim() || undefined,
      estimatedDelivery: trackingForm.estimatedDelivery ? new Date(trackingForm.estimatedDelivery) : undefined,
      packedBy:          trackingForm.packedBy.trim() || undefined,
      weight:            trackingForm.weight ? parseFloat(trackingForm.weight) : undefined,
      dimensions:        trackingForm.dimensions.trim() || undefined,
      dispatchNotes:     trackingForm.dispatchNotes.trim() || undefined,
      status:            "shipped",
      dispatchedAt:      new Date(),
    });
    toast.success("Tracking saved & order marked as Shipped!");
    setTrackingOrder(null);
  };

  const printLabel = (order: CustomerOrder) => {
    setLabelOrder(order);
    // Mark label printed
    updateCustomerOrder(order.id, { labelPrinted: true });
  };

  const handlePrint = () => {
    window.print();
  };

  const copyTracking = (num: string) => {
    navigator.clipboard.writeText(num).then(() => {
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 1500);
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const tabCounts: Record<string, number> = useMemo(() => ({
    all:        allOrders.length,
    pending:    stats.pending,
    confirmed:  stats.confirmed,
    processing: stats.processing,
    shipped:    stats.shipped,
    delivered:  stats.delivered,
    cancelled:  stats.cancelled,
  }), [allOrders, stats]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-full overflow-y-auto bg-gray-50">

      {/* ── Print styles (hidden on screen, shown on print) ── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #dispatch-label-print { display: block !important; }
          @page { margin: 10mm; size: A5; }
        }
        #dispatch-label-print { display: none; }
      `}</style>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                <ClipboardList className="w-5 h-5 text-white"/>
              </div>
              Order Management
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage customer portal orders — track, dispatch and print labels</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/#/customer-portal" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="w-4 h-4"/>Customer Portal
              </Button>
            </a>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label:"Total Orders",   value: stats.total,       icon: Layers,       color: "from-slate-500 to-gray-600",   click: () => setActiveTab("all")       },
            { label:"Pending",        value: stats.pending,     icon: Clock,        color: "from-amber-500 to-orange-500", click: () => setActiveTab("pending")    },
            { label:"Processing",     value: stats.processing,  icon: RefreshCw,    color: "from-indigo-500 to-blue-500",  click: () => setActiveTab("processing") },
            { label:"Shipped",        value: stats.shipped,     icon: Truck,        color: "from-purple-500 to-violet-500",click: () => setActiveTab("shipped")    },
            { label:"Delivered",      value: stats.delivered,   icon: PackageCheck, color: "from-emerald-500 to-teal-500", click: () => setActiveTab("delivered")  },
            { label:"Revenue",        value:`£${stats.revenue.toFixed(0)}`, icon: TrendingUp, color:"from-blue-600 to-cyan-500", click:() => setActiveTab("all") },
          ].map(s => (
            <button key={s.label} onClick={s.click}
              className={cn(
                "bg-white rounded-2xl border p-4 text-left hover:shadow-md transition-all hover:-translate-y-0.5",
                activeTab === (s.label.toLowerCase() as any) && "ring-2 ring-blue-500 ring-offset-1"
              )}>
              <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center mb-2 shadow-sm", s.color)}>
                <s.icon className="w-5 h-5 text-white"/>
              </div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>

        {/* ── Ready-to-ship alert ── */}
        {stats.readyToShip > 0 && (
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
              <Send className="w-4 h-4 text-white"/>
            </div>
            <div className="flex-1">
              <p className="text-indigo-800 font-semibold text-sm">{stats.readyToShip} order{stats.readyToShip > 1 ? "s" : ""} ready to dispatch</p>
              <p className="text-indigo-600 text-xs">Add tracking info and print dispatch labels to ship</p>
            </div>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5 shrink-0" onClick={() => setActiveTab("processing")}>
              <Truck className="w-3.5 h-3.5"/>View
            </Button>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="bg-white rounded-2xl border shadow-sm">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-4 pt-3 border-b overflow-x-auto">
            {(["all", ...ALL_STATUSES] as const).map(tab => {
              const cfg = tab === "all" ? null : STATUS_CONFIG[tab];
              const cnt = tabCounts[tab] || 0;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap",
                    activeTab === tab
                      ? "border-blue-600 text-blue-700 bg-blue-50/50"
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  )}>
                  {cfg && <span className={cn("w-2 h-2 rounded-full", cfg.dot)}/>}
                  {tab === "all" ? "All Orders" : cfg!.label}
                  {cnt > 0 && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center",
                      activeTab === tab ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                    )}>{cnt}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search row */}
          <div className="flex items-center gap-3 p-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
              <Input placeholder="Search order #, customer, tracking…" value={search}
                onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm"/>
            </div>
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4"/>
              </button>
            )}
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} order{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* ── Order List ── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border p-16 text-center text-gray-400">
            <Package className="w-14 h-14 mx-auto mb-3 opacity-20"/>
            <p className="font-medium">No orders found</p>
            <p className="text-sm mt-1">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(order => {
              const scfg   = STATUS_CONFIG[order.status];
              const Icon   = scfg.icon;
              const exp    = expandedId === order.id;
              const tier   = TIER_BADGE[order.customerType];
              const next   = scfg.next;
              const nextCfg = next ? STATUS_CONFIG[next] : null;

              return (
                <div key={order.id}
                  className={cn("bg-white rounded-2xl border shadow-sm overflow-hidden transition-all",
                    exp && "ring-2 ring-blue-200"
                  )}>

                  {/* ── Row header ── */}
                  <div className="flex items-center gap-4 p-4 flex-wrap">
                    {/* Checkbox */}
                    <input type="checkbox" checked={selectedIds.has(order.id)}
                      onChange={() => toggleSelect(order.id)}
                      className="w-4 h-4 rounded border-gray-300 accent-blue-600 shrink-0"
                    />

                    {/* Order number + status */}
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", scfg.bg, scfg.border, "border")}>
                        <Icon className={cn("w-4 h-4", scfg.color)}/>
                      </div>
                      <div>
                        <p className="font-mono font-bold text-gray-900 text-sm">{order.orderNumber}</p>
                        <Badge className={cn("text-[10px] gap-1 px-1.5 py-0", scfg.bg, scfg.color, scfg.border, "border")} variant="outline">
                          <span className={cn("w-1.5 h-1.5 rounded-full inline-block", scfg.dot)}/>
                          {scfg.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Customer */}
                    <div className="flex-1 min-w-[160px]">
                      <p className="font-medium text-gray-900 text-sm truncate">{order.customerName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn("text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full", tier.bg)}>{tier.label}</span>
                        <span className="text-[10px] text-gray-400 capitalize">{order.paymentMethod.replace(/_/g," ")}</span>
                      </div>
                    </div>

                    {/* Items summary */}
                    <div className="hidden sm:block min-w-[90px]">
                      <p className="text-sm font-medium text-gray-700">{order.items.length} item{order.items.length > 1?"s":""}</p>
                      <p className="text-[10px] text-gray-400">{order.items.reduce((s,i) => s+i.quantity,0)} units</p>
                    </div>

                    {/* Tracking */}
                    <div className="hidden md:block min-w-[140px]">
                      {order.trackingNumber ? (
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-purple-500 shrink-0"/>
                          <div>
                            <p className="text-xs font-mono font-bold text-gray-800 truncate max-w-[110px]">{order.trackingNumber}</p>
                            <p className="text-[10px] text-gray-400">{order.trackingCarrier}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">No tracking</span>
                      )}
                    </div>

                    {/* Total */}
                    <div className="min-w-[80px] text-right">
                      <p className="font-bold text-gray-900">£{order.total.toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400">{format(new Date(order.createdAt),"MMM d, HH:mm")}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Advance status */}
                      {next && (
                        <Button size="sm"
                          onClick={() => advanceStatus(order)}
                          className={cn(
                            "h-8 text-xs gap-1 px-2.5",
                            next === "shipped"
                              ? "bg-purple-600 hover:bg-purple-700"
                              : next === "confirmed"
                              ? "bg-blue-600 hover:bg-blue-700"
                              : next === "processing"
                              ? "bg-indigo-600 hover:bg-indigo-700"
                              : "bg-emerald-600 hover:bg-emerald-700"
                          )}>
                          {next === "shipped" ? <Truck className="w-3 h-3"/> : <ArrowUpRight className="w-3 h-3"/>}
                          {next === "shipped" ? "Dispatch" : `→ ${nextCfg?.label}`}
                        </Button>
                      )}

                      {/* Tracking icon */}
                      <button onClick={() => openTrackingModal(order)} title="Manage tracking"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors">
                        <Truck className="w-4 h-4"/>
                      </button>

                      {/* Print label */}
                      <button onClick={() => printLabel(order)} title="Print dispatch label"
                        className={cn("p-1.5 rounded-lg transition-colors",
                          order.labelPrinted
                            ? "text-emerald-500 hover:bg-emerald-50"
                            : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        )}>
                        <Printer className="w-4 h-4"/>
                      </button>

                      {/* Expand */}
                      <button onClick={() => setExpandedId(exp ? null : order.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                        {exp ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                      </button>
                    </div>
                  </div>

                  {/* ── Expanded detail ── */}
                  {exp && (
                    <div className="border-t bg-gray-50 p-5 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Order items */}
                        <div className="md:col-span-2 space-y-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Order Items</p>
                          {order.items.map(item => (
                            <div key={item.productId} className="flex items-center gap-3 bg-white rounded-xl border p-3">
                              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <Package className="w-4 h-4 text-gray-300"/>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{item.productSku} · {item.category}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-gray-900">£{item.total.toFixed(2)}</p>
                                <p className="text-[10px] text-gray-400">{item.quantity} × £{item.unitPrice.toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                          {/* Totals */}
                          <div className="bg-white rounded-xl border p-3 space-y-1.5 text-sm">
                            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>£{order.subtotal.toFixed(2)}</span></div>
                            {order.totalSavings > 0 && <div className="flex justify-between text-green-600"><span>Customer savings</span><span>-£{order.totalSavings.toFixed(2)}</span></div>}
                            <div className="flex justify-between font-bold border-t pt-1.5"><span>Total</span><span>£{order.total.toFixed(2)}</span></div>
                          </div>
                        </div>

                        {/* Right column: address + tracking + actions */}
                        <div className="space-y-3">
                          {/* Delivery address */}
                          <div className="bg-white rounded-xl border p-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1"><MapPin className="w-3 h-3"/>Delivery Address</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{order.deliveryAddress}</p>
                          </div>

                          {/* Tracking summary */}
                          {order.trackingNumber && (
                            <div className="bg-white rounded-xl border p-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1"><Truck className="w-3 h-3"/>Tracking</p>
                              <div className="space-y-1.5 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-500">Carrier</span>
                                  <span className="font-medium">{order.trackingCarrier}</span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-gray-500 shrink-0">Tracking #</span>
                                  <div className="flex items-center gap-1">
                                    <span className="font-mono text-xs truncate max-w-[100px]">{order.trackingNumber}</span>
                                    <button onClick={() => copyTracking(order.trackingNumber!)} className="text-gray-400 hover:text-blue-600">
                                      {copiedTracking ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500"/> : <Copy className="w-3.5 h-3.5"/>}
                                    </button>
                                  </div>
                                </div>
                                {order.estimatedDelivery && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-500">ETA</span>
                                    <span className="font-medium">{format(new Date(order.estimatedDelivery),"MMM d, yyyy")}</span>
                                  </div>
                                )}
                                {order.dispatchedAt && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Dispatched</span>
                                    <span className="font-medium">{format(new Date(order.dispatchedAt),"MMM d, HH:mm")}</span>
                                  </div>
                                )}
                                {order.trackingUrl && (
                                  <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-blue-600 hover:underline text-xs mt-1">
                                    <ExternalLink className="w-3 h-3"/>Track online
                                  </a>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Quick actions */}
                          <div className="space-y-2">
                            <Button size="sm" className="w-full gap-2 bg-purple-600 hover:bg-purple-700 h-9"
                              onClick={() => openTrackingModal(order)}>
                              <Truck className="w-3.5 h-3.5"/>
                              {order.trackingNumber ? "Update Tracking" : "Add Tracking"}
                            </Button>
                            <Button size="sm" variant="outline" className="w-full gap-2 h-9"
                              onClick={() => printLabel(order)}>
                              <Printer className="w-3.5 h-3.5"/>
                              {order.labelPrinted ? "Reprint Label" : "Print Label"}
                              {order.labelPrinted && <Badge className="ml-auto bg-emerald-100 text-emerald-700 text-[9px] px-1">Printed</Badge>}
                            </Button>
                          </div>

                          {/* Notes */}
                          {(order.notes || order.dispatchNotes) && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                              <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1"><StickyNote className="w-3 h-3"/>Notes</p>
                              {order.notes       && <p className="text-xs text-amber-800">{order.notes}</p>}
                              {order.dispatchNotes && <p className="text-xs text-amber-800 mt-1 border-t border-amber-200 pt-1">{order.dispatchNotes}</p>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Packing info row */}
                      {(order.packedBy || order.weight || order.dimensions) && (
                        <div className="flex items-center gap-6 bg-white rounded-xl border p-3 text-sm flex-wrap">
                          {order.packedBy   && <span className="flex items-center gap-1.5 text-gray-600"><User className="w-3.5 h-3.5 text-gray-400"/>Packed by <strong>{order.packedBy}</strong></span>}
                          {order.weight     && <span className="flex items-center gap-1.5 text-gray-600"><Weight className="w-3.5 h-3.5 text-gray-400"/><strong>{order.weight} kg</strong></span>}
                          {order.dimensions && <span className="flex items-center gap-1.5 text-gray-600"><Ruler className="w-3.5 h-3.5 text-gray-400"/><strong>{order.dimensions}</strong></span>}
                        </div>
                      )}

                      {/* Status change bar */}
                      <div className="flex items-center gap-2 bg-white rounded-xl border p-3 flex-wrap">
                        <span className="text-xs text-gray-500 font-medium">Change status:</span>
                        {ALL_STATUSES.filter(s => s !== order.status).map(s => {
                          const c = STATUS_CONFIG[s];
                          return (
                            <button key={s} onClick={() => updateStatus(order.id, s)}
                              className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors", c.bg, c.color, c.border, "hover:opacity-80")}>
                              <c.icon className="w-3 h-3"/>{c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TRACKING MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {trackingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold flex items-center gap-2">
                  <Truck className="w-5 h-5"/>Tracking Management
                </h2>
                <p className="text-purple-200 text-xs mt-0.5">{trackingOrder.orderNumber} · {trackingOrder.customerName}</p>
              </div>
              <button onClick={() => setTrackingOrder(null)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {/* Carrier */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Carrier *</Label>
                  <Select value={trackingForm.trackingCarrier} onValueChange={v => setTrackingForm(f => ({...f, trackingCarrier: v}))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select carrier"/></SelectTrigger>
                    <SelectContent>
                      {CARRIERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Tracking number */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Tracking Number *</Label>
                  <Input placeholder="e.g. GB123456789GB" value={trackingForm.trackingNumber}
                    onChange={e => setTrackingForm(f => ({...f, trackingNumber: e.target.value}))} className="h-9"/>
                </div>
              </div>

              {/* Tracking URL */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Tracking URL <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input placeholder="https://carrier.com/track/..." value={trackingForm.trackingUrl}
                  onChange={e => setTrackingForm(f => ({...f, trackingUrl: e.target.value}))} className="h-9"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* ETA */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Estimated Delivery</Label>
                  <Input type="date" value={trackingForm.estimatedDelivery}
                    onChange={e => setTrackingForm(f => ({...f, estimatedDelivery: e.target.value}))} className="h-9"/>
                </div>
                {/* Packed by */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Packed By</Label>
                  <Input placeholder="Staff name" value={trackingForm.packedBy}
                    onChange={e => setTrackingForm(f => ({...f, packedBy: e.target.value}))} className="h-9"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Weight */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Weight (kg)</Label>
                  <Input type="number" step="0.1" placeholder="e.g. 2.5" value={trackingForm.weight}
                    onChange={e => setTrackingForm(f => ({...f, weight: e.target.value}))} className="h-9"/>
                </div>
                {/* Dimensions */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Dimensions</Label>
                  <Input placeholder="30×20×15 cm" value={trackingForm.dimensions}
                    onChange={e => setTrackingForm(f => ({...f, dimensions: e.target.value}))} className="h-9"/>
                </div>
              </div>

              {/* Dispatch notes */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Dispatch Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Textarea rows={2} placeholder="Any special notes for this dispatch…" value={trackingForm.dispatchNotes}
                  onChange={e => setTrackingForm(f => ({...f, dispatchNotes: e.target.value}))} className="resize-none"/>
              </div>

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 text-xs text-blue-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5"/>
                <span>Saving tracking will automatically update the order status to <strong>Shipped</strong> and record the dispatch timestamp.</span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 flex items-center gap-3 bg-gray-50">
              <Button variant="outline" onClick={() => setTrackingOrder(null)} className="flex-1">Cancel</Button>
              <Button onClick={saveTracking} className="flex-1 bg-purple-600 hover:bg-purple-700 gap-2">
                <Save className="w-4 h-4"/>Save & Mark Shipped
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          DISPATCH LABEL MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {labelOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600"/>Dispatch Label — {labelOrder.orderNumber}
              </h2>
              <button onClick={() => setLabelOrder(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>

            {/* Label preview */}
            <div className="p-6">
              <div id="dispatch-label-print">
                <DispatchLabel order={labelOrder}/>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 flex items-center gap-3 bg-gray-50">
              <Button variant="outline" onClick={() => setLabelOrder(null)} className="flex-1">Close</Button>
              <Button onClick={handlePrint} className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2">
                <Printer className="w-4 h-4"/>Print Label
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dispatch Label Component ─────────────────────────────────────────────────
function DispatchLabel({ order }: { order: CustomerOrder }) {
  const totalUnits = order.items.reduce((s, i) => s + i.quantity, 0);

  // Simple barcode-style visual using thin/thick bars
  const barcodeStr = order.orderNumber.replace(/[^A-Z0-9]/g, "");
  const barPattern = Array.from(barcodeStr).flatMap((c) => {
    const v = c.charCodeAt(0) % 7;
    return [v > 3 ? 3 : 1, v > 5 ? 3 : 2, v > 1 ? 1 : 2];
  });

  return (
    <div className="border-2 border-gray-900 rounded-xl overflow-hidden font-mono text-xs select-none"
      style={{ width: "100%", background: "#fff" }}>

      {/* ── Header band ── */}
      <div className="bg-gray-900 text-white px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Package className="w-4 h-4 text-white"/>
          </div>
          <div>
            <p className="font-bold text-sm tracking-wide leading-none">BNM PARTS</p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">www.bnmparts.com</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400">DISPATCH LABEL</p>
          <p className="font-bold text-lg tracking-widest leading-none text-white">{order.orderNumber}</p>
        </div>
      </div>

      {/* ── From / To ── */}
      <div className="grid grid-cols-2 divide-x border-b border-gray-200">
        <div className="p-3">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">FROM</p>
          <p className="font-bold text-gray-900 text-[11px]">BNM Parts Ltd</p>
          <p className="text-gray-600 text-[10px] leading-relaxed">
            123 Business Park<br/>
            London, EC1A 1BB<br/>
            United Kingdom<br/>
            T: +44 20 1234 5678
          </p>
        </div>
        <div className="p-3">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">SHIP TO</p>
          <p className="font-bold text-gray-900 text-[11px]">{order.customerName}</p>
          <p className="text-gray-600 text-[10px] leading-relaxed">{order.deliveryAddress}</p>
        </div>
      </div>

      {/* ── Order info bar ── */}
      <div className="grid grid-cols-4 divide-x border-b border-gray-200 bg-gray-50">
        {[
          { l:"Date",    v: format(new Date(order.createdAt),"dd/MM/yy") },
          { l:"Items",   v: `${order.items.length} SKU / ${totalUnits} units` },
          { l:"Total",   v: `£${order.total.toFixed(2)}` },
          { l:"Payment", v: order.paymentMethod.replace(/_/g," ") },
        ].map(({l,v}) => (
          <div key={l} className="px-2.5 py-2 text-center">
            <p className="text-[8px] text-gray-400 uppercase tracking-wide">{l}</p>
            <p className="font-bold text-[10px] text-gray-900 capitalize truncate">{v}</p>
          </div>
        ))}
      </div>

      {/* ── Items ── */}
      <div className="px-3 py-2 border-b border-gray-200">
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">ORDER CONTENTS</p>
        <div className="space-y-1">
          {order.items.map(item => (
            <div key={item.productId} className="flex justify-between items-center">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[9px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 shrink-0">{item.productSku}</span>
                <span className="text-[10px] text-gray-800 truncate">{item.productName}</span>
              </div>
              <span className="text-[10px] font-bold text-gray-900 shrink-0 ml-2">×{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tracking info ── */}
      {order.trackingNumber && (
        <div className="grid grid-cols-3 divide-x border-b border-gray-200 bg-purple-50">
          <div className="px-2.5 py-2">
            <p className="text-[8px] text-purple-400 uppercase tracking-wide">CARRIER</p>
            <p className="font-bold text-[10px] text-purple-900">{order.trackingCarrier}</p>
          </div>
          <div className="px-2.5 py-2 col-span-2">
            <p className="text-[8px] text-purple-400 uppercase tracking-wide">TRACKING NUMBER</p>
            <p className="font-bold text-[11px] text-purple-900 tracking-wider">{order.trackingNumber}</p>
          </div>
        </div>
      )}

      {/* ── Packing info ── */}
      {(order.weight || order.dimensions || order.packedBy) && (
        <div className="grid grid-cols-3 divide-x border-b border-gray-200">
          {order.weight     && <div className="px-2.5 py-2"><p className="text-[8px] text-gray-400 uppercase tracking-wide">WEIGHT</p><p className="font-bold text-[10px]">{order.weight} kg</p></div>}
          {order.dimensions && <div className="px-2.5 py-2"><p className="text-[8px] text-gray-400 uppercase tracking-wide">DIMENSIONS</p><p className="font-bold text-[10px]">{order.dimensions}</p></div>}
          {order.packedBy   && <div className="px-2.5 py-2"><p className="text-[8px] text-gray-400 uppercase tracking-wide">PACKED BY</p><p className="font-bold text-[10px]">{order.packedBy}</p></div>}
        </div>
      )}

      {/* ── Barcode visual ── */}
      <div className="px-3 py-3 flex flex-col items-center gap-1.5 bg-white">
        <div className="flex items-end gap-px h-10">
          {barPattern.map((w, i) => (
            <div key={i}
              className={i % 2 === 0 ? "bg-gray-900" : "bg-transparent"}
              style={{ width: `${w * 2}px`, height: i % 3 === 0 ? "100%" : "75%" }}
            />
          ))}
        </div>
        <p className="text-[9px] font-mono tracking-[0.3em] text-gray-600">{order.orderNumber}</p>
      </div>

      {/* ── ETA footer ── */}
      {order.estimatedDelivery && (
        <div className="bg-emerald-600 text-white text-center py-2">
          <p className="text-[9px] uppercase tracking-widest font-bold">Estimated Delivery</p>
          <p className="text-sm font-bold">{format(new Date(order.estimatedDelivery),"EEEE, MMMM d, yyyy")}</p>
        </div>
      )}

      <div className="px-3 py-2 flex items-center justify-between bg-gray-50 border-t border-gray-200">
        <p className="text-[8px] text-gray-400">Printed: {format(new Date(),"dd/MM/yyyy HH:mm")} · BNM Parts Ltd</p>
        <p className="text-[8px] text-gray-400">info@bnmparts.com · +44 20 1234 5678</p>
      </div>
    </div>
  );
}