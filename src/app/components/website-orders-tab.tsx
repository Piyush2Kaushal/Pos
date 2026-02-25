/**
 * WebsiteOrdersTab
 * Full online-order management panel embedded inside the Website Management view.
 * Features:
 *   - Stats dashboard
 *   - Status-tab filtering + full-text search
 *   - Per-order expand with items, address, tracking summary
 *   - Tracking Management modal (carrier, number, URL, ETA, packing info)
 *   - Dispatch Label modal with browser print (CSS @media print isolation)
 */
import { useState, useMemo } from "react";
import {
  ShoppingBag, Search, Truck, CheckCircle2, Clock, RefreshCw,
  PackageCheck, X, ChevronDown, ChevronUp, Printer,
  MapPin, User, Weight, Ruler, StickyNote, Tag,
  TrendingUp, AlertCircle, Save, ExternalLink, Copy,
  CheckCheck, ArrowUpRight, Layers, Send, Globe,
  CreditCard, Banknote, Package, Mail, Phone,
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
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────────
type OnlineOrderStatus =
  | "new" | "confirmed" | "processing" | "shipped" | "delivered"
  | "cancelled" | "refunded";

interface OnlineOrderItem {
  id: string;
  productName: string;
  sku: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface OnlineOrder {
  id: string;
  orderNumber: string;          // e.g. "WEB-0001"
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OnlineOrderItem[];
  subtotal: number;
  shippingFee: number;
  tax: number;
  total: number;
  status: OnlineOrderStatus;
  shippingAddress: string;      // formatted multiline
  paymentMethod: "card" | "paypal" | "bank_transfer" | "apple_pay";
  paymentStatus: "paid" | "pending" | "refunded";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Tracking & dispatch
  trackingNumber?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
  estimatedDelivery?: Date;
  dispatchedAt?: Date;
  dispatchNotes?: string;
  packedBy?: string;
  labelPrinted?: boolean;
  weight?: number;
  dimensions?: string;
}

// ─── Config ────────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<OnlineOrderStatus, {
  label: string; color: string; bg: string; border: string;
  dot: string; icon: React.ElementType; next?: OnlineOrderStatus;
}> = {
  new:        { label: "New",        color: "text-sky-700",     bg: "bg-sky-50",      border: "border-sky-200",     dot: "bg-sky-500",     icon: ShoppingBag,  next: "confirmed"  },
  confirmed:  { label: "Confirmed",  color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200",    dot: "bg-blue-500",    icon: CheckCircle2, next: "processing" },
  processing: { label: "Processing", color: "text-indigo-700",  bg: "bg-indigo-50",   border: "border-indigo-200",  dot: "bg-indigo-500",  icon: RefreshCw,    next: "shipped"    },
  shipped:    { label: "Shipped",    color: "text-purple-700",  bg: "bg-purple-50",   border: "border-purple-200",  dot: "bg-purple-500",  icon: Truck,        next: "delivered"  },
  delivered:  { label: "Delivered",  color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", dot: "bg-emerald-500", icon: PackageCheck, next: undefined    },
  cancelled:  { label: "Cancelled",  color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200",     dot: "bg-red-500",     icon: X,            next: undefined    },
  refunded:   { label: "Refunded",   color: "text-orange-700",  bg: "bg-orange-50",   border: "border-orange-200",  dot: "bg-orange-500",  icon: Banknote,     next: undefined    },
};

const PAYMENT_ICONS: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  card:          { icon: CreditCard, label: "Card",          color: "text-blue-600"   },
  paypal:        { icon: Globe,      label: "PayPal",        color: "text-sky-600"    },
  bank_transfer: { icon: Banknote,   label: "Bank Transfer", color: "text-green-600"  },
  apple_pay:     { icon: CreditCard, label: "Apple Pay",     color: "text-gray-700"   },
};

const CARRIERS = [
  "Royal Mail","DHL","DPD","UPS","FedEx",
  "Hermes","ParcelForce","Yodel","Amazon Logistics","Evri","Other",
];

const ALL_STATUSES: OnlineOrderStatus[] = [
  "new","confirmed","processing","shipped","delivered","cancelled","refunded",
];

// ─── Seed Data ─────────────────────────────────────────────────────────────────
const SEED: OnlineOrder[] = [
  {
    id:"wo-1", orderNumber:"WEB-0001",
    customerName:"James Harrison", customerEmail:"james.harrison@email.co.uk", customerPhone:"+44 7700 900123",
    items:[
      { id:"i1", productName:"iPhone 15 Screen Assembly",     sku:"SCR-IP15",   category:"Screens",    quantity:1, unitPrice:120.00, total:120.00 },
      { id:"i2", productName:"Tempered Glass Screen Guard",    sku:"PRO-TG15",   category:"Protection", quantity:2, unitPrice:4.00,   total:8.00   },
      { id:"i3", productName:"USB-C Fast Charging Cable 2m",  sku:"CBL-USBC2",  category:"Cables",     quantity:1, unitPrice:6.00,   total:6.00   },
    ],
    subtotal:134.00, shippingFee:0, tax:26.80, total:160.80,
    status:"processing",
    shippingAddress:"42 Maple Drive\nSurbiton\nKingston upon Thames\nKT6 4PL\nUnited Kingdom",
    paymentMethod:"card", paymentStatus:"paid",
    notes:"Please pack items carefully — gift order.",
    packedBy:"Sarah Wilson", weight:0.9, dimensions:"25×18×8 cm",
    createdAt:new Date("2026-02-20T09:10:00"), updatedAt:new Date("2026-02-20T11:00:00"),
  },
  {
    id:"wo-2", orderNumber:"WEB-0002",
    customerName:"Priya Sharma", customerEmail:"priya.s@webmail.com", customerPhone:"+44 7800 200456",
    items:[
      { id:"i4", productName:"Wireless Charging Pad 15W",  sku:"CHG-W15",   category:"Charging", quantity:1, unitPrice:25.00, total:25.00 },
      { id:"i5", productName:"Premium Phone Case Samsung", sku:"CAS-SS24P", category:"Cases",    quantity:1, unitPrice:18.00, total:18.00 },
    ],
    subtotal:43.00, shippingFee:5.99, tax:9.80, total:58.79,
    status:"shipped",
    shippingAddress:"7 Rosewood Close\nBristol\nBS8 2QR\nUnited Kingdom",
    paymentMethod:"paypal", paymentStatus:"paid",
    trackingNumber:"RM987654321GB", trackingCarrier:"Royal Mail",
    trackingUrl:"https://royalmail.com/track",
    estimatedDelivery:new Date("2026-02-22"),
    dispatchedAt:new Date("2026-02-20T14:30:00"),
    packedBy:"Tom Blake", labelPrinted:true, weight:0.6, dimensions:"22×15×6 cm",
    createdAt:new Date("2026-02-19T16:45:00"), updatedAt:new Date("2026-02-20T14:30:00"),
  },
  {
    id:"wo-3", orderNumber:"WEB-0003",
    customerName:"Oliver Chen", customerEmail:"o.chen@outlook.com", customerPhone:"+44 7911 100789",
    items:[
      { id:"i6", productName:"Power Bank 20000mAh", sku:"PBK-20K", category:"Charging", quantity:1, unitPrice:44.00, total:44.00 },
    ],
    subtotal:44.00, shippingFee:5.99, tax:9.60, total:59.59,
    status:"new",
    shippingAddress:"19 Birchwood Lane\nLeeds\nLS4 2HN\nUnited Kingdom",
    paymentMethod:"card", paymentStatus:"paid",
    createdAt:new Date("2026-02-21T07:22:00"), updatedAt:new Date("2026-02-21T07:22:00"),
  },
  {
    id:"wo-4", orderNumber:"WEB-0004",
    customerName:"Amelia Watson", customerEmail:"amelia.w@gmail.com", customerPhone:"+44 7700 444321",
    items:[
      { id:"i7", productName:"Bluetooth Earbuds Pro",  sku:"EAR-BT-P", category:"Audio",    quantity:1, unitPrice:39.00, total:39.00 },
      { id:"i8", productName:"Screen Cleaning Kit Pro",sku:"CLN-KIT-P",category:"Cleaning", quantity:1, unitPrice:5.00,  total:5.00  },
    ],
    subtotal:44.00, shippingFee:0, tax:8.80, total:52.80,
    status:"confirmed",
    shippingAddress:"88 Victoria Road\nManchester\nM14 5XP\nUnited Kingdom",
    paymentMethod:"apple_pay", paymentStatus:"paid",
    notes:"Leave with neighbour if not home.",
    createdAt:new Date("2026-02-20T13:55:00"), updatedAt:new Date("2026-02-20T14:10:00"),
  },
  {
    id:"wo-5", orderNumber:"WEB-0005",
    customerName:"Liam Foster", customerEmail:"liam.foster@hotmail.co.uk", customerPhone:"+44 7500 333666",
    items:[
      { id:"i9",  productName:"Car Phone Mount Universal",   sku:"MNT-CAR-U", category:"Mounts",  quantity:2, unitPrice:15.00, total:30.00 },
      { id:"i10", productName:"Samsung S24 Battery",         sku:"BAT-SS24",  category:"Batteries",quantity:1, unitPrice:30.00, total:30.00 },
    ],
    subtotal:60.00, shippingFee:5.99, tax:13.20, total:79.19,
    status:"delivered",
    shippingAddress:"3 Elmwood Grove\nEdinburgh\nEH6 7RQ\nUnited Kingdom",
    paymentMethod:"card", paymentStatus:"paid",
    trackingNumber:"DPD5678901234",trackingCarrier:"DPD",
    estimatedDelivery:new Date("2026-02-18"),
    dispatchedAt:new Date("2026-02-16T09:00:00"),
    labelPrinted:true, weight:1.2, dimensions:"28×20×10 cm",
    createdAt:new Date("2026-02-14T10:30:00"), updatedAt:new Date("2026-02-18T16:00:00"),
  },
  {
    id:"wo-6", orderNumber:"WEB-0006",
    customerName:"Sophie Turner", customerEmail:"sophie.t@icloud.com", customerPhone:"+44 7600 555888",
    items:[
      { id:"i11", productName:"iPhone 15 Pro Leather Case",  sku:"CAS-IP15P-L", category:"Cases",      quantity:1, unitPrice:28.00, total:28.00 },
      { id:"i12", productName:"MagSafe Charger Compatible",  sku:"CHG-MAGS",    category:"Charging",   quantity:1, unitPrice:22.00, total:22.00 },
    ],
    subtotal:50.00, shippingFee:0, tax:10.00, total:60.00,
    status:"processing",
    shippingAddress:"15 Harbour View\nCardiff\nCF10 5LP\nUnited Kingdom",
    paymentMethod:"paypal", paymentStatus:"paid",
    weight:0.5, dimensions:"20×14×5 cm",
    createdAt:new Date("2026-02-21T06:05:00"), updatedAt:new Date("2026-02-21T08:30:00"),
  },
  {
    id:"wo-7", orderNumber:"WEB-0007",
    customerName:"Noah Williams", customerEmail:"noah.w@email.com", customerPhone:"+44 7400 222999",
    items:[
      { id:"i13", productName:"Gaming Controller Phone Clip", sku:"ACC-GCP", category:"Gaming",   quantity:1, unitPrice:16.00, total:16.00 },
    ],
    subtotal:16.00, shippingFee:5.99, tax:4.40, total:26.39,
    status:"cancelled",
    shippingAddress:"67 Oak Street\nNottingham\nNG1 4BA\nUnited Kingdom",
    paymentMethod:"card", paymentStatus:"refunded",
    notes:"Customer requested cancellation.",
    createdAt:new Date("2026-02-18T15:20:00"), updatedAt:new Date("2026-02-19T09:00:00"),
  },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export function WebsiteOrdersTab() {
  const [orders, setOrders]                   = useState<OnlineOrder[]>(SEED);
  const [search, setSearch]                   = useState("");
  const [activeTab, setActiveTab]             = useState<OnlineOrderStatus | "all">("all");
  const [expandedId, setExpandedId]           = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder]     = useState<OnlineOrder | null>(null);
  const [labelOrder, setLabelOrder]           = useState<OnlineOrder | null>(null);
  const [copiedTracking, setCopiedTracking]   = useState(false);

  const [trackingForm, setTrackingForm] = useState({
    trackingNumber:"", trackingCarrier:"", trackingUrl:"",
    estimatedDelivery:"", packedBy:"", weight:"", dimensions:"", dispatchNotes:"",
  });

  // ── Derived ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:      orders.length,
    newOrders:  orders.filter(o => o.status === "new").length,
    processing: orders.filter(o => o.status === "processing").length,
    shipped:    orders.filter(o => o.status === "shipped").length,
    delivered:  orders.filter(o => o.status === "delivered").length,
    cancelled:  orders.filter(o => o.status === "cancelled" || o.status === "refunded").length,
    revenue:    orders.filter(o => !["cancelled","refunded"].includes(o.status)).reduce((s,o)=>s+o.total,0),
    readyToShip:orders.filter(o => o.status === "processing").length,
    todayRevenue: orders.filter(o => {
      const d = new Date(o.createdAt); const n = new Date();
      return d.toDateString() === n.toDateString() && !["cancelled","refunded"].includes(o.status);
    }).reduce((s,o)=>s+o.total,0),
  }), [orders]);

  const filtered = useMemo(() => {
    let list = orders;
    if (activeTab !== "all") list = list.filter(o => o.status === activeTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.trackingNumber?.toLowerCase().includes(q) ||
        o.shippingAddress.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, activeTab, search]);

  const tabCounts = useMemo(() => {
    const m: Record<string, number> = { all: orders.length };
    ALL_STATUSES.forEach(s => { m[s] = orders.filter(o => o.status === s).length; });
    return m;
  }, [orders]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const updateOrder = (id: string, patch: Partial<OnlineOrder>) =>
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...patch, updatedAt: new Date() } : o));

  const setStatus = (id: string, status: OnlineOrderStatus) => {
    updateOrder(id, { status });
    toast.success(`Order updated to ${STATUS_CFG[status].label}`);
  };

  const advanceStatus = (order: OnlineOrder) => {
    const next = STATUS_CFG[order.status].next;
    if (!next) return;
    if (next === "shipped") { openTrackingModal(order); return; }
    setStatus(order.id, next);
  };

  const openTrackingModal = (order: OnlineOrder) => {
    setTrackingOrder(order);
    setTrackingForm({
      trackingNumber:    order.trackingNumber    || "",
      trackingCarrier:   order.trackingCarrier   || "",
      trackingUrl:       order.trackingUrl       || "",
      estimatedDelivery: order.estimatedDelivery ? format(new Date(order.estimatedDelivery),"yyyy-MM-dd") : "",
      packedBy:          order.packedBy          || "",
      weight:            order.weight?.toString()|| "",
      dimensions:        order.dimensions        || "",
      dispatchNotes:     order.dispatchNotes     || "",
    });
  };

  const saveTracking = () => {
    if (!trackingOrder) return;
    if (!trackingForm.trackingNumber.trim()) { toast.error("Please enter a tracking number"); return; }
    if (!trackingForm.trackingCarrier)       { toast.error("Please select a carrier"); return; }
    updateOrder(trackingOrder.id, {
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
    toast.success("Tracking saved — order marked as Shipped!");
    setTrackingOrder(null);
  };

  const openLabelModal = (order: OnlineOrder) => {
    setLabelOrder(order);
    updateOrder(order.id, { labelPrinted: true });
  };

  const copyTracking = (num: string) => {
    navigator.clipboard.writeText(num).then(() => {
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 1500);
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">

      {/* Print isolation styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #web-dispatch-label { display: block !important; }
          @page { margin: 8mm; size: A5; }
        }
        #web-dispatch-label { display: none; }
      `}</style>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label:"Total",      value:stats.total,              icon:Layers,       grad:"from-slate-500 to-gray-600",   tab:"all"        },
          { label:"New",        value:stats.newOrders,          icon:ShoppingBag,  grad:"from-sky-500 to-cyan-500",     tab:"new"        },
          { label:"Processing", value:stats.processing,         icon:RefreshCw,    grad:"from-indigo-500 to-blue-500",  tab:"processing" },
          { label:"Shipped",    value:stats.shipped,            icon:Truck,        grad:"from-purple-500 to-violet-500",tab:"shipped"    },
          { label:"Delivered",  value:stats.delivered,          icon:PackageCheck, grad:"from-emerald-500 to-teal-500", tab:"delivered"  },
          { label:"Cancelled",  value:stats.cancelled,          icon:X,            grad:"from-red-500 to-rose-500",     tab:"cancelled"  },
          { label:"Revenue",    value:`£${stats.revenue.toFixed(0)}`, icon:TrendingUp, grad:"from-blue-600 to-cyan-500", tab:"all" },
        ].map(s => (
          <button key={s.label} onClick={() => setActiveTab(s.tab as any)}
            className={cn(
              "bg-white rounded-2xl border p-3.5 text-left hover:shadow-md transition-all hover:-translate-y-0.5",
              activeTab === s.tab && "ring-2 ring-blue-500 ring-offset-1"
            )}>
            <div className={cn("w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center mb-2 shadow-sm", s.grad)}>
              <s.icon className="w-4 h-4 text-white"/>
            </div>
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{s.label}</p>
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
            <p className="text-indigo-800 font-semibold text-sm">
              {stats.readyToShip} online order{stats.readyToShip > 1 ? "s" : ""} ready to dispatch
            </p>
            <p className="text-indigo-600 text-xs">Add tracking info and print dispatch labels to ship them</p>
          </div>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-1.5 shrink-0"
            onClick={() => setActiveTab("processing")}>
            <Truck className="w-3.5 h-3.5"/>View
          </Button>
        </div>
      )}

      {/* ── Tab bar + Search ── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center gap-0.5 px-3 pt-3 border-b overflow-x-auto">
          {(["all", ...ALL_STATUSES] as const).map(tab => {
            const cfg = tab === "all" ? null : STATUS_CFG[tab];
            const cnt = tabCounts[tab] || 0;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap",
                  activeTab === tab
                    ? "border-blue-600 text-blue-700 bg-blue-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                )}>
                {cfg && <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)}/>}
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

        {/* Search */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
            <Input placeholder="Search order #, customer, tracking…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"/>
          </div>
          {search && (
            <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4"/>
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">
            {filtered.length} order{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Orders ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-16 text-center text-gray-400">
          <Globe className="w-14 h-14 mx-auto mb-3 opacity-20"/>
          <p className="font-medium">No online orders found</p>
          <p className="text-sm mt-1">Try adjusting your search or status filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => {
            const scfg   = STATUS_CFG[order.status];
            const Icon   = scfg.icon;
            const exp    = expandedId === order.id;
            const next   = scfg.next;
            const nextCfg = next ? STATUS_CFG[next] : null;
            const pmInfo = PAYMENT_ICONS[order.paymentMethod] ?? PAYMENT_ICONS["card"];

            return (
              <div key={order.id}
                className={cn(
                  "bg-white rounded-2xl border shadow-sm overflow-hidden transition-all",
                  exp && "ring-2 ring-blue-200"
                )}>

                {/* ── Row ── */}
                <div className="flex items-center gap-3 p-4 flex-wrap">

                  {/* Status icon + order # */}
                  <div className="flex items-center gap-2 min-w-[150px]">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", scfg.bg, scfg.border, "border")}>
                      <Icon className={cn("w-4 h-4", scfg.color)}/>
                    </div>
                    <div>
                      <p className="font-mono font-bold text-gray-900 text-sm">{order.orderNumber}</p>
                      <Badge variant="outline"
                        className={cn("text-[10px] gap-1 px-1.5 py-0 mt-0.5", scfg.bg, scfg.color, scfg.border)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full inline-block", scfg.dot)}/>
                        {scfg.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Customer */}
                  <div className="flex-1 min-w-[160px]">
                    <p className="font-medium text-gray-900 text-sm">{order.customerName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400 truncate max-w-[160px]">{order.customerEmail}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="hidden sm:block min-w-[80px]">
                    <p className="text-sm font-medium text-gray-700">{order.items.length} item{order.items.length > 1?"s":""}</p>
                    <p className="text-[10px] text-gray-400">{order.items.reduce((s,i)=>s+i.quantity,0)} units</p>
                  </div>

                  {/* Payment */}
                  <div className="hidden md:flex items-center gap-1.5 min-w-[110px]">
                    <pmInfo.icon className={cn("w-3.5 h-3.5 shrink-0", pmInfo.color)}/>
                    <div>
                      <p className="text-xs font-medium text-gray-700">{pmInfo.label}</p>
                      <Badge className={cn("text-[9px] px-1.5 py-0 mt-0.5",
                        order.paymentStatus === "paid"     ? "bg-emerald-100 text-emerald-700" :
                        order.paymentStatus === "refunded" ? "bg-orange-100 text-orange-700"   :
                        "bg-amber-100 text-amber-700"
                      )}>{order.paymentStatus}</Badge>
                    </div>
                  </div>

                  {/* Tracking */}
                  <div className="hidden lg:block min-w-[140px]">
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

                  {/* Total + date */}
                  <div className="min-w-[80px] text-right">
                    <p className="font-bold text-gray-900">£{order.total.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400">{format(new Date(order.createdAt),"MMM d, HH:mm")}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Advance */}
                    {next && (
                      <Button size="sm" onClick={() => advanceStatus(order)}
                        className={cn(
                          "h-8 text-xs gap-1 px-2.5",
                          next === "shipped"    ? "bg-purple-600 hover:bg-purple-700" :
                          next === "confirmed"  ? "bg-blue-600 hover:bg-blue-700"     :
                          next === "processing" ? "bg-indigo-600 hover:bg-indigo-700" :
                          "bg-emerald-600 hover:bg-emerald-700"
                        )}>
                        {next === "shipped" ? <Truck className="w-3 h-3"/> : <ArrowUpRight className="w-3 h-3"/>}
                        {next === "shipped" ? "Dispatch" : `→ ${nextCfg?.label}`}
                      </Button>
                    )}

                    {/* Tracking */}
                    <button onClick={() => openTrackingModal(order)} title="Manage tracking"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors">
                      <Truck className="w-4 h-4"/>
                    </button>

                    {/* Label */}
                    <button onClick={() => openLabelModal(order)} title="Print dispatch label"
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
                  <div className="border-t bg-gray-50/80 p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                      {/* Items + totals */}
                      <div className="md:col-span-2 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Items</p>
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl border p-3">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-gray-300"/>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{item.sku} · {item.category}</p>
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
                          {order.shippingFee > 0
                            ? <div className="flex justify-between text-gray-600"><span>Shipping</span><span>£{order.shippingFee.toFixed(2)}</span></div>
                            : <div className="flex justify-between text-emerald-600"><span>Shipping</span><span>FREE</span></div>
                          }
                          <div className="flex justify-between text-gray-600"><span>VAT (20%)</span><span>£{order.tax.toFixed(2)}</span></div>
                          <div className="flex justify-between font-bold border-t pt-1.5 text-base"><span>Total</span><span>£{order.total.toFixed(2)}</span></div>
                        </div>
                      </div>

                      {/* Right column */}
                      <div className="space-y-3">
                        {/* Customer info */}
                        <div className="bg-white rounded-xl border p-3 space-y-1.5">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customer</p>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0"/>{order.customerName}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0"/>
                            <span className="truncate text-xs">{order.customerEmail}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0"/>{order.customerPhone}
                          </div>
                        </div>

                        {/* Delivery address */}
                        <div className="bg-white rounded-xl border p-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <MapPin className="w-3 h-3"/>Delivery Address
                          </p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{order.shippingAddress}</p>
                        </div>

                        {/* Tracking summary */}
                        {order.trackingNumber && (
                          <div className="bg-white rounded-xl border p-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                              <Truck className="w-3 h-3"/>Tracking
                            </p>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex justify-between"><span className="text-gray-500">Carrier</span><span className="font-medium">{order.trackingCarrier}</span></div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-gray-500 shrink-0">Number</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-xs truncate max-w-[100px]">{order.trackingNumber}</span>
                                  <button onClick={() => copyTracking(order.trackingNumber!)} className="text-gray-400 hover:text-blue-600">
                                    {copiedTracking ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500"/> : <Copy className="w-3.5 h-3.5"/>}
                                  </button>
                                </div>
                              </div>
                              {order.estimatedDelivery && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">ETA</span>
                                  <span className="font-medium">{format(new Date(order.estimatedDelivery),"MMM d, yyyy")}</span>
                                </div>
                              )}
                              {order.dispatchedAt && (
                                <div className="flex justify-between">
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
                            onClick={() => openLabelModal(order)}>
                            <Printer className="w-3.5 h-3.5"/>
                            {order.labelPrinted ? "Reprint Label" : "Print Dispatch Label"}
                            {order.labelPrinted && (
                              <Badge className="ml-auto bg-emerald-100 text-emerald-700 text-[9px] px-1">Printed</Badge>
                            )}
                          </Button>
                        </div>

                        {/* Notes */}
                        {(order.notes || order.dispatchNotes) && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                              <StickyNote className="w-3 h-3"/>Notes
                            </p>
                            {order.notes       && <p className="text-xs text-amber-800">{order.notes}</p>}
                            {order.dispatchNotes && (
                              <p className="text-xs text-amber-800 mt-1 border-t border-amber-200 pt-1">{order.dispatchNotes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Packing info */}
                    {(order.packedBy || order.weight || order.dimensions) && (
                      <div className="flex items-center gap-6 bg-white rounded-xl border p-3 text-sm flex-wrap">
                        {order.packedBy   && <span className="flex items-center gap-1.5 text-gray-600"><User className="w-3.5 h-3.5 text-gray-400"/>Packed by <strong>{order.packedBy}</strong></span>}
                        {order.weight     && <span className="flex items-center gap-1.5 text-gray-600"><Weight className="w-3.5 h-3.5 text-gray-400"/><strong>{order.weight} kg</strong></span>}
                        {order.dimensions && <span className="flex items-center gap-1.5 text-gray-600"><Ruler className="w-3.5 h-3.5 text-gray-400"/><strong>{order.dimensions}</strong></span>}
                      </div>
                    )}

                    {/* Status change bar */}
                    <div className="flex items-center gap-2 bg-white rounded-xl border p-3 flex-wrap">
                      <span className="text-xs text-gray-500 font-medium shrink-0">Change status:</span>
                      {ALL_STATUSES.filter(s => s !== order.status).map(s => {
                        const c = STATUS_CFG[s];
                        return (
                          <button key={s} onClick={() => setStatus(order.id, s)}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                              c.bg, c.color, c.border, "hover:opacity-80"
                            )}>
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
                <p className="text-purple-200 text-xs mt-0.5">
                  {trackingOrder.orderNumber} · {trackingOrder.customerName}
                </p>
              </div>
              <button onClick={() => setTrackingOrder(null)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Carrier *</Label>
                  <Select value={trackingForm.trackingCarrier}
                    onValueChange={v => setTrackingForm(f => ({...f, trackingCarrier: v}))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select carrier"/></SelectTrigger>
                    <SelectContent>
                      {CARRIERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Tracking Number *</Label>
                  <Input placeholder="e.g. RM123456789GB" value={trackingForm.trackingNumber}
                    onChange={e => setTrackingForm(f => ({...f, trackingNumber: e.target.value}))}
                    className="h-9"/>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Tracking URL <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input placeholder="https://carrier.com/track/..." value={trackingForm.trackingUrl}
                  onChange={e => setTrackingForm(f => ({...f, trackingUrl: e.target.value}))}
                  className="h-9"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Estimated Delivery</Label>
                  <Input type="date" value={trackingForm.estimatedDelivery}
                    onChange={e => setTrackingForm(f => ({...f, estimatedDelivery: e.target.value}))}
                    className="h-9"/>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Packed By</Label>
                  <Input placeholder="Staff name" value={trackingForm.packedBy}
                    onChange={e => setTrackingForm(f => ({...f, packedBy: e.target.value}))}
                    className="h-9"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Weight (kg)</Label>
                  <Input type="number" step="0.1" placeholder="e.g. 1.5" value={trackingForm.weight}
                    onChange={e => setTrackingForm(f => ({...f, weight: e.target.value}))}
                    className="h-9"/>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Dimensions</Label>
                  <Input placeholder="30×20×10 cm" value={trackingForm.dimensions}
                    onChange={e => setTrackingForm(f => ({...f, dimensions: e.target.value}))}
                    className="h-9"/>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Dispatch Notes <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Textarea rows={2} placeholder="Any special notes for dispatch…"
                  value={trackingForm.dispatchNotes}
                  onChange={e => setTrackingForm(f => ({...f, dispatchNotes: e.target.value}))}
                  className="resize-none"/>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 text-xs text-blue-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5"/>
                <span>Saving tracking will automatically mark the order as <strong>Shipped</strong> and record the dispatch timestamp.</span>
              </div>
            </div>

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
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600"/>
                Dispatch Label — {labelOrder.orderNumber}
              </h2>
              <button onClick={() => setLabelOrder(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {/* Screen preview */}
              <div id="web-dispatch-label">
                <WebDispatchLabel order={labelOrder}/>
              </div>
            </div>

            <div className="border-t px-6 py-4 flex items-center gap-3 bg-gray-50">
              <Button variant="outline" onClick={() => setLabelOrder(null)} className="flex-1">Close</Button>
              <Button onClick={() => window.print()} className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2">
                <Printer className="w-4 h-4"/>Print Label
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dispatch Label ────────────────────────────────────────────────────────────
function WebDispatchLabel({ order }: { order: OnlineOrder }) {
  const totalUnits = order.items.reduce((s,i) => s + i.quantity, 0);

  // Simple visual barcode from order number
  const barcodeStr = order.orderNumber.replace(/[^A-Z0-9]/g, "");
  const barPattern = Array.from(barcodeStr).flatMap(c => {
    const v = c.charCodeAt(0) % 7;
    return [v > 3 ? 3 : 1, v > 5 ? 3 : 2, v > 1 ? 1 : 2];
  });

  return (
    <div className="border-2 border-gray-900 rounded-xl overflow-hidden font-mono text-xs" style={{ background:"#fff" }}>

      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Globe className="w-4 h-4 text-white"/>
          </div>
          <div>
            <p className="font-bold text-sm tracking-wide leading-none">BNM PARTS</p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">www.bnmparts.com · Online Store</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-gray-400 uppercase tracking-widest">DISPATCH LABEL</p>
          <p className="font-bold text-lg tracking-widest leading-none">{order.orderNumber}</p>
        </div>
      </div>

      {/* From / To */}
      <div className="grid grid-cols-2 divide-x border-b border-gray-200">
        <div className="p-3">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">FROM</p>
          <p className="font-bold text-gray-900 text-[11px]">BNM Parts Ltd</p>
          <p className="text-gray-600 text-[10px] leading-relaxed">
            123 Business Park<br/>London, EC1A 1BB<br/>United Kingdom<br/>info@bnmparts.com
          </p>
        </div>
        <div className="p-3">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">SHIP TO</p>
          <p className="font-bold text-gray-900 text-[11px]">{order.customerName}</p>
          <p className="text-gray-600 text-[10px] leading-relaxed whitespace-pre-wrap">{order.shippingAddress}</p>
          <p className="text-gray-500 text-[10px] mt-1">{order.customerPhone}</p>
        </div>
      </div>

      {/* Order info grid */}
      <div className="grid grid-cols-4 divide-x border-b bg-gray-50">
        {[
          { l:"Order Date",  v: format(new Date(order.createdAt),"dd/MM/yy")                    },
          { l:"Items",       v: `${order.items.length} SKU / ${totalUnits} units`                },
          { l:"Order Total", v: `£${order.total.toFixed(2)}`                                     },
          { l:"Payment",     v: PAYMENT_ICONS[order.paymentMethod]?.label ?? order.paymentMethod },
        ].map(({l,v}) => (
          <div key={l} className="px-2.5 py-2 text-center">
            <p className="text-[8px] text-gray-400 uppercase tracking-wide">{l}</p>
            <p className="font-bold text-[10px] text-gray-900 capitalize truncate">{v}</p>
          </div>
        ))}
      </div>

      {/* Items */}
      <div className="px-3 py-2.5 border-b">
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">ORDER CONTENTS</p>
        <div className="space-y-1">
          {order.items.map(item => (
            <div key={item.id} className="flex justify-between items-center">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[9px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 shrink-0">{item.sku}</span>
                <span className="text-[10px] text-gray-800 truncate">{item.productName}</span>
              </div>
              <span className="text-[10px] font-bold text-gray-900 shrink-0 ml-2">×{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tracking band */}
      {order.trackingNumber && (
        <div className="grid grid-cols-3 divide-x border-b bg-purple-50">
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

      {/* Packing row */}
      {(order.weight || order.dimensions || order.packedBy) && (
        <div className="grid grid-cols-3 divide-x border-b">
          {order.weight     && <div className="px-2.5 py-2"><p className="text-[8px] text-gray-400 uppercase">WEIGHT</p><p className="font-bold text-[10px]">{order.weight} kg</p></div>}
          {order.dimensions && <div className="px-2.5 py-2"><p className="text-[8px] text-gray-400 uppercase">DIMENSIONS</p><p className="font-bold text-[10px]">{order.dimensions}</p></div>}
          {order.packedBy   && <div className="px-2.5 py-2"><p className="text-[8px] text-gray-400 uppercase">PACKED BY</p><p className="font-bold text-[10px]">{order.packedBy}</p></div>}
        </div>
      )}

      {/* Barcode visual */}
      <div className="px-3 py-3 flex flex-col items-center gap-1.5 bg-white">
        <div className="flex items-end gap-px h-10">
          {barPattern.map((w, i) => (
            <div key={i}
              className={i % 2 === 0 ? "bg-gray-900" : "bg-transparent"}
              style={{ width:`${w * 2}px`, height: i % 3 === 0 ? "100%" : "72%" }}
            />
          ))}
        </div>
        <p className="text-[9px] font-mono tracking-[0.3em] text-gray-600">{order.orderNumber}</p>
      </div>

      {/* ETA footer */}
      {order.estimatedDelivery && (
        <div className="bg-emerald-600 text-white text-center py-2">
          <p className="text-[9px] uppercase tracking-widest font-bold">Estimated Delivery</p>
          <p className="text-sm font-bold">{format(new Date(order.estimatedDelivery),"EEEE, MMMM d, yyyy")}</p>
        </div>
      )}

      {/* Footer strip */}
      <div className="px-3 py-2 flex items-center justify-between bg-gray-50 border-t">
        <p className="text-[8px] text-gray-400">Printed: {format(new Date(),"dd/MM/yyyy HH:mm")} · BNM Parts Ltd</p>
        <p className="text-[8px] text-gray-400">www.bnmparts.com · +44 20 1234 5678</p>
      </div>
    </div>
  );
}
