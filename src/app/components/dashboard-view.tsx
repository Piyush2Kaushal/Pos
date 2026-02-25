import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { usePOS } from "@/app/context/pos-context";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  FileText,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Smartphone,
  BarChart3,
  Receipt,
  Boxes,
  BadgePoundSterling,
  UserCheck,
  ShoppingBag,
  Zap,
  Star,
  Activity,
} from "lucide-react";
import { format, subDays, isToday, isThisWeek, isThisMonth, startOfMonth, eachDayOfInterval, subMonths, startOfDay } from "date-fns";

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000
    ? `£${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `£${(n / 1_000).toFixed(1)}k`
    : `£${n.toFixed(2)}`;

const pct = (a: number, b: number) =>
  b === 0 ? null : (((a - b) / b) * 100).toFixed(1);

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, gradient, trend, trendLabel, onClick,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; gradient: string;
  trend?: number | null; trendLabel?: string;
  onClick?: () => void;
}) {
  const up = (trend ?? 0) >= 0;
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden text-left rounded-2xl p-5 shadow-sm border border-white/60 bg-white hover:shadow-md transition-all duration-200 group ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      {/* subtle gradient blob */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${up ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
            {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{value}</p>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
      {trendLabel && trend !== undefined && trend !== null && (
        <p className="text-[10px] text-gray-400 mt-1">{trendLabel}</p>
      )}
    </button>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, sub, action, onAction }: { title: string; sub?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="font-bold text-gray-900">{title}</h3>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {action && (
        <button onClick={onAction} className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5 transition-colors">
          {action} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid:           "bg-green-100 text-green-700",
    partially_paid: "bg-yellow-100 text-yellow-700",
    overdue:        "bg-red-100 text-red-600",
    sent:           "bg-blue-100 text-blue-700",
    draft:          "bg-gray-100 text-gray-600",
    cancelled:      "bg-gray-100 text-gray-400",
    pending:        "bg-orange-100 text-orange-600",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl px-3 py-2.5 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="text-xs font-medium">
          {p.name}: <span className="font-bold">£{Number(p.value).toFixed(2)}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DashboardView() {
  const { products, customers, invoices, purchases, returnNotes, staff } = usePOS();
  const navigate = useNavigate();
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── derived metrics ─────────────────────────────────────────────────────────
  const today = useMemo(() => {
    const paidInvoices = invoices.filter(i => i.status !== "draft" && i.status !== "cancelled");
    const todayInvoices = paidInvoices.filter(i => isToday(new Date(i.issueDate)));
    const weekInvoices  = paidInvoices.filter(i => isThisWeek(new Date(i.issueDate)));
    const monthInvoices = paidInvoices.filter(i => isThisMonth(new Date(i.issueDate)));

    const todayRev  = todayInvoices.reduce((s, i) => s + (i.amountPaid ?? 0), 0);
    const weekRev   = weekInvoices.reduce((s, i) => s + (i.amountPaid ?? 0), 0);
    const monthRev  = monthInvoices.reduce((s, i) => s + (i.amountPaid ?? 0), 0);
    const totalRev  = paidInvoices.reduce((s, i) => s + (i.amountPaid ?? 0), 0);

    const prevMonthInvoices = paidInvoices.filter(i => {
      const d = new Date(i.issueDate);
      const pm = subMonths(startOfMonth(new Date()), 1);
      return d >= pm && d < startOfMonth(new Date());
    });
    const prevMonthRev = prevMonthInvoices.reduce((s, i) => s + (i.amountPaid ?? 0), 0);

    const outstanding = invoices.filter(i => (i.amountDue ?? 0) > 0 && i.status !== "cancelled").reduce((s, i) => s + (i.amountDue ?? 0), 0);
    const overdueCount = invoices.filter(i => i.status === "overdue").length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10);
    const outOfStock = products.filter(p => p.stock === 0);

    return {
      todayRev, weekRev, monthRev, totalRev, prevMonthRev,
      todayCount: todayInvoices.length,
      weekCount: weekInvoices.length,
      outstanding, overdueCount,
      lowStock, outOfStock,
    };
  }, [invoices, products]);

  // ── last-30-days daily revenue chart ────────────────────────────────────────
  const dailyRevData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    return days.map(day => {
      const dayStr = format(day, "dd MMM");
      const rev = invoices
        .filter(i => i.status !== "draft" && i.status !== "cancelled" && isToday(day) ? isToday(new Date(i.issueDate)) : format(new Date(i.issueDate), "yyyy-MM-dd") === format(day, "yyyy-MM-dd"))
        .reduce((s, i) => s + (i.amountPaid ?? 0), 0);
      return { day: dayStr, Revenue: rev };
    });
  }, [invoices]);

  // ── monthly revenue (last 6 months) ─────────────────────────────────────────
  const monthlyRevData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(new Date(), 5 - i);
      const start = startOfMonth(month);
      const end = startOfMonth(subMonths(month, -1));
      const rev = invoices
        .filter(inv => inv.status !== "draft" && inv.status !== "cancelled")
        .filter(inv => { const d = new Date(inv.issueDate); return d >= start && d < end; })
        .reduce((s, inv) => s + (inv.amountPaid ?? 0), 0);
      const spend = purchases
        .filter(p => { const d = new Date(p.date); return d >= start && d < end; })
        .reduce((s, p) => s + (p.total ?? 0), 0);
      return { month: format(month, "MMM"), Revenue: rev, Purchases: spend };
    });
  }, [invoices, purchases]);

  // ── customer breakdown ───────────────────────────────────────────────────────
  const customerBreakdown = useMemo(() => {
    const types = ["wholesaler", "trader", "retailer"] as const;
    return types.map(t => ({
      name: t.charAt(0).toUpperCase() + t.slice(1),
      value: customers.filter(c => c.type === t).length,
    }));
  }, [customers]);

  const PIE_COLOURS = ["#8b5cf6", "#3b82f6", "#10b981"];

  // ── top products by invoice line items ──────────────────────────────────────
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; rev: number }> = {};
    invoices.filter(i => i.status !== "draft" && i.status !== "cancelled").forEach(inv => {
      (inv.lineItems ?? []).forEach(li => {
        if (!map[li.productId ?? li.description]) {
          map[li.productId ?? li.description] = { name: li.description, qty: 0, rev: 0 };
        }
        map[li.productId ?? li.description].qty += li.quantity;
        map[li.productId ?? li.description].rev += li.amount;
      });
    });
    return Object.values(map).sort((a, b) => b.rev - a.rev).slice(0, 5);
  }, [invoices]);

  // ── recent invoices ──────────────────────────────────────────────────────────
  const recentInvoices = useMemo(() =>
    [...invoices]
      .filter(i => i.status !== "draft")
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, 7),
    [invoices]);

  // ── recent activity feed ─────────────────────────────────────────────────────
  const activityFeed = useMemo(() => {
    const items: { id: string; type: string; label: string; sub: string; time: Date; colour: string; icon: React.ElementType }[] = [];
    invoices.slice(-5).reverse().forEach(inv => {
      items.push({ id: `inv-${inv.id}`, type: "invoice", label: `Invoice ${inv.invoiceNumber}`, sub: `${inv.customer?.name ?? "Unknown"} · £${(inv.total ?? 0).toFixed(2)}`, time: new Date(inv.issueDate), colour: "bg-blue-100 text-blue-600", icon: FileText });
    });
    returnNotes.slice(-3).reverse().forEach(r => {
      items.push({ id: `ret-${r.id}`, type: "return", label: `Return ${r.returnNumber ?? r.id}`, sub: r.customerName ?? "—", time: new Date(r.createdAt ?? Date.now()), colour: "bg-orange-100 text-orange-600", icon: RotateCcw });
    });
    purchases.slice(-3).reverse().forEach(p => {
      items.push({ id: `pur-${p.id}`, type: "purchase", label: `Purchase Order`, sub: `${p.supplier} · £${p.total.toFixed(2)}`, time: new Date(p.date), colour: "bg-emerald-100 text-emerald-600", icon: ShoppingCart });
    });
    return items.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 8);
  }, [invoices, returnNotes, purchases]);

  // ── payment method breakdown ─────────────────────────────────────────────────
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.filter(i => i.status !== "draft").forEach(inv => {
      (inv.paymentHistory ?? []).forEach(ph => {
        const m = ph.method ?? "other";
        map[m] = (map[m] ?? 0) + ph.amount;
      });
    });
    const labels: Record<string, string> = { cash: "Cash", card: "Card", bank_transfer: "Bank Transfer", cheque: "Cheque", other: "Other" };
    return Object.entries(map).map(([k, v]) => ({ name: labels[k] ?? k, value: v })).sort((a, b) => b.value - a.value);
  }, [invoices]);

  const PAY_COLOURS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

  const monthTrend = pct(today.monthRev, today.prevMonthRev);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30 p-6 space-y-6">

      {/* ══ HERO HEADER ══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {clock.getHours() < 12 ? "morning" : clock.getHours() < 17 ? "afternoon" : "evening"} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(clock, "EEEE, d MMMM yyyy")} &nbsp;·&nbsp;
            <span className="font-mono">{format(clock, "HH:mm:ss")}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Smartphone className="w-4 h-4" /> New Sale
          </button>
          <button
            onClick={() => navigate("/reports")}
            className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl shadow-sm border border-gray-200 hover:border-gray-300 transition-all"
          >
            <BarChart3 className="w-4 h-4 text-purple-500" /> Reports
          </button>
          <button
            onClick={() => navigate("/invoices")}
            className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl shadow-sm border border-gray-200 hover:border-gray-300 transition-all"
          >
            <FileText className="w-4 h-4 text-sky-500" /> Invoices
          </button>
        </div>
      </div>

      {/* ══ KPI CARDS ══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Today's Revenue"
          value={fmt(today.todayRev)}
          sub={`${today.todayCount} invoice${today.todayCount !== 1 ? "s" : ""} today`}
          icon={BadgePoundSterling}
          gradient="from-blue-500 to-blue-700"
          onClick={() => navigate("/invoices")}
        />
        <StatCard
          label="This Month"
          value={fmt(today.monthRev)}
          sub={today.prevMonthRev > 0 ? `vs £${(today.prevMonthRev / 1000).toFixed(1)}k last month` : undefined}
          icon={TrendingUp}
          gradient="from-violet-500 to-purple-700"
          trend={monthTrend !== null ? parseFloat(monthTrend) : null}
          trendLabel="vs last month"
          onClick={() => navigate("/reports")}
        />
        <StatCard
          label="Outstanding"
          value={fmt(today.outstanding)}
          sub={`${today.overdueCount} overdue invoice${today.overdueCount !== 1 ? "s" : ""}`}
          icon={AlertCircle}
          gradient="from-orange-500 to-red-500"
          onClick={() => navigate("/invoices")}
        />
        <StatCard
          label="Total Customers"
          value={customers.length.toString()}
          sub={`${customers.filter(c => c.type === "wholesaler").length} wholesalers`}
          icon={Users}
          gradient="from-rose-500 to-pink-600"
          onClick={() => navigate("/customers")}
        />
        <StatCard
          label="Products"
          value={products.length.toString()}
          sub={`${today.outOfStock.length} out of stock`}
          icon={Boxes}
          gradient="from-emerald-500 to-teal-600"
          onClick={() => navigate("/inventory")}
        />
        <StatCard
          label="Low Stock"
          value={today.lowStock.length.toString()}
          sub="≤ 10 units remaining"
          icon={AlertTriangle}
          gradient="from-amber-500 to-orange-500"
          onClick={() => navigate("/inventory")}
        />
      </div>

      {/* ══ CHARTS ROW ══ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Monthly Revenue vs Purchases */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader title="Revenue vs Purchases" sub="Last 6 months" action="Full Report" onAction={() => navigate("/reports")} />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyRevData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="Revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Purchases" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Customer Type Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader title="Customer Types" sub={`${customers.length} total customers`} action="View All" onAction={() => navigate("/customers")} />
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={customerBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {customerBreakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any, n: any) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2 mt-2">
            {customerBreakdown.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLOURS[i] }} />
                  <span className="text-xs text-gray-600 capitalize">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-800">{item.value}</span>
                  <span className="text-[10px] text-gray-400">{customers.length > 0 ? ((item.value / customers.length) * 100).toFixed(0) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ MIDDLE ROW ══ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Daily Revenue – 30-day sparkline */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader title="Daily Revenue" sub="Last 30 days" />
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={dailyRevData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                interval={Math.floor(dailyRevData.length / 6)} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `£${(v / 1000).toFixed(1)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="Revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "#3b82f6" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader title="Payment Methods" sub="All time revenue by method" />
          {paymentBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-300">
              <Receipt className="w-10 h-10 mb-2" />
              <p className="text-sm">No payment data</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={paymentBreakdown} cx="50%" cy="50%" outerRadius={60} paddingAngle={2} dataKey="value">
                    {paymentBreakdown.map((_, i) => (
                      <Cell key={i} fill={PAY_COLOURS[i % PAY_COLOURS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`£${Number(v).toFixed(2)}`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {paymentBreakdown.map((item, i) => {
                  const total = paymentBreakdown.reduce((s, p) => s + p.value, 0);
                  return (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PAY_COLOURS[i] }} />
                      <span className="text-xs text-gray-600 flex-1">{item.name}</span>
                      <span className="text-xs font-bold text-gray-800">{fmt(item.value)}</span>
                      <span className="text-[10px] text-gray-400 w-8 text-right">{total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══ BOTTOM ROW ══ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Recent Invoices */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader title="Recent Invoices" sub="Latest transactions" action="All Invoices" onAction={() => navigate("/invoices")} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 pb-2.5 uppercase tracking-wide">Invoice</th>
                  <th className="text-left text-xs font-semibold text-gray-400 pb-2.5 uppercase tracking-wide">Customer</th>
                  <th className="text-left text-xs font-semibold text-gray-400 pb-2.5 uppercase tracking-wide hidden sm:table-cell">Date</th>
                  <th className="text-left text-xs font-semibold text-gray-400 pb-2.5 uppercase tracking-wide">Status</th>
                  <th className="text-right text-xs font-semibold text-gray-400 pb-2.5 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50/70 transition-colors cursor-pointer" onClick={() => navigate("/invoices")}>
                    <td className="py-2.5 pr-3">
                      <span className="font-mono text-xs font-semibold text-blue-600">{inv.invoiceNumber}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                          {(inv.customer?.name ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{inv.customer?.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 hidden sm:table-cell">
                      <span className="text-xs text-gray-400">{format(new Date(inv.issueDate), "dd MMM yyyy")}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="font-bold text-sm text-gray-800">£{(inv.total ?? 0).toFixed(2)}</span>
                      {(inv.amountDue ?? 0) > 0 && (
                        <p className="text-[10px] text-red-500 text-right">Due £{inv.amountDue!.toFixed(2)}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side column */}
        <div className="flex flex-col gap-5">

          {/* Top Products */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex-1">
            <SectionHeader title="Top Products" sub="By revenue" action="Inventory" onAction={() => navigate("/inventory")} />
            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-300">
                <ShoppingBag className="w-8 h-8 mb-2" />
                <p className="text-xs">No sales data yet</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topProducts.map((p, i) => {
                  const maxRev = topProducts[0].rev;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-gray-500">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{p.name.length > 28 ? p.name.slice(0, 28) + "…" : p.name}</p>
                        <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" style={{ width: `${(p.rev / maxRev) * 100}%` }} />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-bold text-gray-800">{fmt(p.rev)}</p>
                        <p className="text-[10px] text-gray-400">{p.qty} sold</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ BOTTOM ROW 2 ══ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Activity Feed */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader title="Recent Activity" sub="Latest events" />
          <div className="space-y-3">
            {activityFeed.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${item.colour}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{item.label}</p>
                    <p className="text-[11px] text-gray-400 truncate">{item.sub}</p>
                  </div>
                  <p className="text-[10px] text-gray-400 shrink-0 mt-0.5">{format(item.time, "dd MMM")}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader title="Stock Alerts" sub={`${today.lowStock.length} low · ${today.outOfStock.length} out`} action="Inventory" onAction={() => navigate("/inventory")} />
          {today.lowStock.length === 0 && today.outOfStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-300">
              <CheckCircle className="w-10 h-10 mb-2 text-emerald-300" />
              <p className="text-sm text-gray-400">All products well stocked</p>
            </div>
          ) : (
            <div className="space-y-2">
              {today.outOfStock.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 bg-red-50 border border-red-100 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-red-500 font-medium">Out of stock</p>
                  </div>
                  <span className="text-xs font-bold text-red-600">0</span>
                </div>
              ))}
              {today.lowStock.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-amber-600 font-medium">Low stock</p>
                  </div>
                  <span className="text-xs font-bold text-amber-600">{p.stock}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionHeader title="Quick Actions" sub="Jump to common tasks" />
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "New Sale",      icon: Smartphone,  gradient: "from-blue-500 to-blue-600",     path: "/" },
              { label: "Add Product",   icon: Package,     gradient: "from-emerald-500 to-teal-600",   path: "/products" },
              { label: "Customers",     icon: Users,       gradient: "from-rose-500 to-pink-600",      path: "/customers" },
              { label: "Invoices",      icon: FileText,    gradient: "from-sky-500 to-blue-600",       path: "/invoices" },
              { label: "Purchases",     icon: ShoppingCart,gradient: "from-indigo-500 to-violet-600",  path: "/purchases" },
              { label: "Returns",       icon: RotateCcw,   gradient: "from-orange-500 to-red-500",     path: "/returns" },
              { label: "Staff",         icon: UserCheck,   gradient: "from-violet-500 to-purple-600",  path: "/staff" },
              { label: "Reports",       icon: BarChart3,   gradient: "from-fuchsia-500 to-purple-600", path: "/reports" },
            ].map(({ label, icon: Icon, gradient, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200 transition-all group text-center"
              >
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4.5 h-4.5 text-white w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-gray-600 group-hover:text-gray-800">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ SUMMARY STRIP ══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Invoices",   value: invoices.filter(i => i.status !== "draft").length, icon: FileText,     colour: "text-blue-600 bg-blue-50" },
          { label: "Total Staff",      value: staff.length,                                       icon: Users,        colour: "text-purple-600 bg-purple-50" },
          { label: "Return Notes",     value: returnNotes.length,                                 icon: RotateCcw,    colour: "text-orange-600 bg-orange-50" },
          { label: "Purchase Orders",  value: purchases.length,                                   icon: ShoppingCart, colour: "text-emerald-600 bg-emerald-50" },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.colour}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{item.value}</p>
                <p className="text-xs text-gray-400 font-medium">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
