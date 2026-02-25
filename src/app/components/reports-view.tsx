import { useState } from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  DollarSign, ShoppingBag, TrendingUp, TrendingDown, Calendar,
  FileText, BarChart3, Package, Users, Receipt, Printer, Filter,
  FileSpreadsheet, FileJson, PieChart, Activity, CreditCard,
  Box, AlertCircle, CheckCircle2, ArrowUpRight, Banknote,
  Tag, Layers, Store, ChevronDown, Star, Percent,
  ReceiptText, Wallet, BadgeDollarSign, ShoppingCart,
  BarChart2, BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { cn } from "@/app/components/ui/utils";
import {
  format, startOfDay, endOfDay, startOfMonth, endOfMonth,
  startOfYear, endOfYear, subDays, subMonths, subYears,
} from "date-fns";
import { toast } from "sonner";

// ─── Status config ────────────────────────────────────────────────────────────
const INV_STATUS: Record<string, { bg: string; text: string; border: string }> = {
  paid:           { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200" },
  pending:        { bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200"   },
  overdue:        { bg: "bg-red-50",      text: "text-red-700",     border: "border-red-200"     },
  draft:          { bg: "bg-gray-50",     text: "text-gray-600",    border: "border-gray-200"    },
  sent:           { bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200"    },
  partially_paid: { bg: "bg-violet-50",   text: "text-violet-700",  border: "border-violet-200"  },
  cancelled:      { bg: "bg-rose-50",     text: "text-rose-700",    border: "border-rose-200"    },
};
const PO_STATUS: Record<string, { bg: string; text: string; border: string }> = {
  completed:  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  pending:    { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"   },
  received:   { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200"    },
  cancelled:  { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200"     },
  ordered:    { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200"  },
  in_transit: { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200"     },
};
const CUST_TYPE: Record<string, { bg: string; text: string }> = {
  wholesaler: { bg: "bg-indigo-100", text: "text-indigo-700" },
  trader:     { bg: "bg-violet-100", text: "text-violet-700" },
  retailer:   { bg: "bg-sky-100",    text: "text-sky-700"    },
};

const invCfg  = (s: string) => INV_STATUS[s]  ?? INV_STATUS.draft;
const poCfg   = (s: string) => PO_STATUS[s]   ?? PO_STATUS.pending;

// ─── Tab definition ───────────────────────────────────────────────────────────
const TABS = [
  { id: "sales",      label: "Sales",      icon: ShoppingCart },
  { id: "products",   label: "Products",   icon: Package },
  { id: "inventory",  label: "Inventory",  icon: Layers },
  { id: "customers",  label: "Customers",  icon: Users },
  { id: "invoices",   label: "Invoices",   icon: ReceiptText },
  { id: "financial",  label: "Financial",  icon: Wallet },
  { id: "tax",        label: "Tax",        icon: Percent },
] as const;
type TabId = typeof TABS[number]["id"];

// ─── Small reusable KPI card ──────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, gradient, iconBg,
}: {
  label: string; value: string; sub?: string;
  icon: React.FC<{ className?: string }>;
  gradient: string; iconBg: string;
}) {
  return (
    <div className={cn("rounded-xl p-4 flex items-center gap-4 border", gradient)}>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-500 truncate">{label}</p>
        <p className="font-bold text-gray-900 truncate">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  icon: Icon, title, description, children,
}: {
  icon: React.FC<{ className?: string }>;
  title: string; description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-100 bg-gray-50/70">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1e3a5f] to-[#2d5fa8] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-800 text-sm">{title}</p>
          <p className="text-[11px] text-gray-400">{description}</p>
        </div>
      </div>
      {children && <div className="flex gap-2 shrink-0">{children}</div>}
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status, cfg }: { status: string; cfg: { bg: string; text: string; border: string } }) {
  return (
    <span className={cn("inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize", cfg.bg, cfg.text, cfg.border)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Download helpers ─────────────────────────────────────────────────────────
function dlCSV(data: Record<string, unknown>[], filename: string, headers: string[]) {
  const csv = [headers.join(","), ...data.map(r => headers.map(h => r[h] ?? "").join(","))].join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`,
    style: "display:none",
  });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  toast.success("CSV downloaded");
}
function dlJSON(data: unknown, filename: string) {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })),
    download: `${filename}_${format(new Date(), "yyyy-MM-dd")}.json`,
    style: "display:none",
  });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  toast.success("JSON downloaded");
}

// ─── Main component ────────────────────────���──────────────────────────────────
export function ReportsView() {
  const { sales, products, customers, invoices, purchases, staff } = usePOS();
  const [dateRange, setDateRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("sales");

  // ── Date range ──────────────────────────────────────────────────────────────
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "today":      return { start: startOfDay(now),              end: endOfDay(now) };
      case "yesterday":  return { start: startOfDay(subDays(now,1)),   end: endOfDay(subDays(now,1)) };
      case "last7days":  return { start: startOfDay(subDays(now,7)),   end: endOfDay(now) };
      case "last30days": return { start: startOfDay(subDays(now,30)),  end: endOfDay(now) };
      case "thisMonth":  return { start: startOfMonth(now),            end: endOfMonth(now) };
      case "lastMonth":  return { start: startOfMonth(subMonths(now,1)), end: endOfMonth(subMonths(now,1)) };
      case "thisYear":   return { start: startOfYear(now),             end: endOfYear(now) };
      case "lastYear":   return { start: startOfYear(subYears(now,1)), end: endOfYear(subYears(now,1)) };
      case "custom":
        return startDate && endDate
          ? { start: new Date(startDate), end: new Date(endDate) }
          : { start: new Date(0), end: now };
      default: return { start: new Date(0), end: now };
    }
  };
  const { start, end } = getDateRange();

  // ── Filtered data ───────────────────────────────────────────────────────────
  const filteredSales     = sales.filter(s => new Date(s.date) >= start && new Date(s.date) <= end);
  const filteredInvoices  = invoices.filter(i => new Date(i.issueDate) >= start && new Date(i.issueDate) <= end);
  const filteredPurchases = purchases.filter(p => new Date(p.date) >= start && new Date(p.date) <= end);

  // ── Metrics ─────────────────────────────────────────────────────────────────
  const totalRevenue        = filteredSales.reduce((s, x) => s + x.total, 0);
  const totalTransactions   = filteredSales.length;
  const averageTransaction  = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const totalItems          = filteredSales.reduce((s, x) => s + x.items.reduce((a, i) => a + i.quantity, 0), 0);
  const totalInvoiceRevenue = filteredInvoices.reduce((s, x) => s + x.total, 0);
  const paidInvoices        = filteredInvoices.filter(i => i.status === "paid");
  const pendingInvoices     = filteredInvoices.filter(i => i.status !== "paid");
  const totalPaid           = paidInvoices.reduce((s, i) => s + i.total, 0);
  const totalPending        = pendingInvoices.reduce((s, i) => s + i.total, 0);
  const totalPurchaseCost   = filteredPurchases.reduce((s, p) => s + p.total, 0);
  const grossProfit         = totalRevenue + totalInvoiceRevenue - totalPurchaseCost;
  const profitMargin        = totalRevenue + totalInvoiceRevenue > 0
    ? (grossProfit / (totalRevenue + totalInvoiceRevenue)) * 100 : 0;
  const totalVatCollected   = filteredInvoices.reduce((s, i) => s + i.taxAmount, 0);

  // ── Product performance ──────────────────────────────────────────────────────
  const productSalesMap = filteredSales.reduce((acc, sale) => {
    sale.items.forEach(item => {
      const k = item.product.id;
      if (!acc[k]) acc[k] = { product: item.product, quantity: 0, revenue: 0 };
      acc[k].quantity += item.quantity;
      acc[k].revenue  += item.product.price * item.quantity;
    });
    return acc;
  }, {} as Record<string, { product: any; quantity: number; revenue: number }>);
  const topProducts = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const categoryPerf = filteredSales.reduce((acc, sale) => {
    sale.items.forEach(item => {
      const c = item.product.category;
      if (!acc[c]) acc[c] = { revenue: 0, quantity: 0 };
      acc[c].revenue  += item.product.price * item.quantity;
      acc[c].quantity += item.quantity;
    });
    return acc;
  }, {} as Record<string, { revenue: number; quantity: number }>);

  const lowStockProducts   = products.filter(p => p.stock < 10 && p.stock > 0);
  const outOfStockProducts = products.filter(p => p.stock === 0);
  const totalStockValue    = products.reduce((s, p) => s + p.stock * p.retailPrice, 0);

  // ── Customer analytics ───────────────────────────────────────────────────────
  const customerPurchaseMap = filteredSales.reduce((acc, sale) => {
    if (sale.customer) {
      const k = sale.customer.id;
      if (!acc[k]) acc[k] = { customer: sale.customer, purchases: 0, totalSpent: 0 };
      acc[k].purchases  += 1;
      acc[k].totalSpent += sale.total;
    }
    return acc;
  }, {} as Record<string, { customer: any; purchases: number; totalSpent: number }>);
  const topCustomers = Object.values(customerPurchaseMap).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);
  const totalCredits = customers.reduce((s, c) => s + (c.creditBalance || 0), 0);

  // ── Payment methods ──────────────────────────────────────────────────────────
  const pmtBreakdown = filteredSales.reduce((acc, s) => {
    acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const PMT_COLORS: Record<string, string> = {
    cash: "bg-emerald-50 border-emerald-200 text-emerald-700",
    card: "bg-blue-50 border-blue-200 text-blue-700",
    bank_transfer: "bg-indigo-50 border-indigo-200 text-indigo-700",
    credit: "bg-violet-50 border-violet-200 text-violet-700",
  };

  // ── CSV helpers ──────────────────────────────────────────────────────────────
  const dlSales     = () => dlCSV(filteredSales.map(s => ({ Date: format(new Date(s.date),"yyyy-MM-dd HH:mm"), Customer: s.customer?.name||"Walk-in", Items: s.items.length, Total: s.total.toFixed(2), PaymentMethod: s.paymentMethod })), "sales_report", ["Date","Customer","Items","Total","PaymentMethod"]);
  const dlProducts  = () => dlCSV(topProducts.map(i => ({ Product: i.product.name, SKU: i.product.sku, Category: i.product.category, QuantitySold: i.quantity, Revenue: i.revenue.toFixed(2), CurrentStock: i.product.stock })), "product_report", ["Product","SKU","Category","QuantitySold","Revenue","CurrentStock"]);
  const dlInventory = () => dlCSV(products.map(p => ({ Name: p.name, SKU: p.sku, Category: p.category, Stock: p.stock, RetailPrice: p.retailPrice.toFixed(2), WholesalePrice: p.wholesalePrice.toFixed(2), Status: p.stock===0?"Out of Stock":p.stock<10?"Low Stock":"In Stock" })), "inventory_report", ["Name","SKU","Category","Stock","RetailPrice","WholesalePrice","Status"]);
  const dlCustomers = () => dlCSV(topCustomers.map(i => ({ Customer: i.customer.name, Type: i.customer.type, Phone: i.customer.phone, Email: i.customer.email||"", Purchases: i.purchases, TotalSpent: i.totalSpent.toFixed(2) })), "customer_report", ["Customer","Type","Phone","Email","Purchases","TotalSpent"]);
  const dlInvoices  = () => dlCSV(filteredInvoices.map(i => ({ InvoiceNumber: i.invoiceNumber, Customer: i.customer.name, IssueDate: format(new Date(i.issueDate),"yyyy-MM-dd"), DueDate: format(new Date(i.dueDate),"yyyy-MM-dd"), Total: i.total.toFixed(2), AmountPaid: i.amountPaid.toFixed(2), AmountDue: i.amountDue.toFixed(2), Status: i.status })), "invoice_report", ["InvoiceNumber","Customer","IssueDate","DueDate","Total","AmountPaid","AmountDue","Status"]);
  const dlFinancial = () => dlCSV([{ Period:`${format(start,"yyyy-MM-dd")} to ${format(end,"yyyy-MM-dd")}`, TotalRevenue:(totalRevenue+totalInvoiceRevenue).toFixed(2), TotalCosts:totalPurchaseCost.toFixed(2), GrossProfit:grossProfit.toFixed(2), ProfitMargin:profitMargin.toFixed(2)+"%", Transactions:totalTransactions, Invoices:filteredInvoices.length }], "financial_report", ["Period","TotalRevenue","TotalCosts","GrossProfit","ProfitMargin","Transactions","Invoices"]);
  const dlTax       = () => dlCSV([{ Period:`${format(start,"yyyy-MM-dd")} to ${format(end,"yyyy-MM-dd")}`, TotalSales:(totalRevenue+totalInvoiceRevenue).toFixed(2), VATCollected:totalVatCollected.toFixed(2), NetSales:((totalRevenue+totalInvoiceRevenue)-totalVatCollected).toFixed(2) }], "tax_report", ["Period","TotalSales","VATCollected","NetSales"]);

  return (
    <div className="flex flex-col min-h-full bg-gray-50/40">

      {/* ══ HERO HEADER ══════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-[#1e3a5f] via-[#1e4080] to-[#2d5fa8] px-6 pt-6 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-tight">Advanced Reports & Analytics</h1>
              <p className="text-blue-200 text-sm mt-0.5">Comprehensive business insights and downloadable reports</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { window.print(); toast.success("Print dialog opened"); }}
            className="border-white/30 text-white bg-white/10 hover:bg-white/20 gap-2 shrink-0"
          >
            <Printer className="w-4 h-4" />Print
          </Button>
        </div>

        {/* Date range bar */}
        <div className="mt-5 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <p className="text-[11px] text-blue-300 font-semibold uppercase tracking-widest mb-1.5">Date Range</p>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white h-9 text-sm [&>svg]:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[["all","All Time"],["today","Today"],["yesterday","Yesterday"],["last7days","Last 7 Days"],["last30days","Last 30 Days"],["thisMonth","This Month"],["lastMonth","Last Month"],["thisYear","This Year"],["lastYear","Last Year"],["custom","Custom Range"]].map(([v,l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dateRange === "custom" && (
            <>
              <div className="flex-1 min-w-[140px]">
                <p className="text-[11px] text-blue-300 font-semibold uppercase tracking-widest mb-1.5">From</p>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="bg-white/10 border-white/20 text-white h-9 text-sm [&::-webkit-calendar-picker-indicator]:invert" />
              </div>
              <div className="flex-1 min-w-[140px]">
                <p className="text-[11px] text-blue-300 font-semibold uppercase tracking-widest mb-1.5">To</p>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="bg-white/10 border-white/20 text-white h-9 text-sm [&::-webkit-calendar-picker-indicator]:invert" />
              </div>
            </>
          )}
          <div className="text-[11px] text-blue-200 self-end pb-2">
            <Calendar className="w-3.5 h-3.5 inline mr-1 opacity-70" />
            {format(start, "MMM d, yyyy")} — {format(end, "MMM d, yyyy")}
          </div>
        </div>

        {/* Global KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            { label: "Total Revenue",   val: `£${(totalRevenue+totalInvoiceRevenue).toFixed(2)}`, sub: `POS £${totalRevenue.toFixed(0)} · Inv £${totalInvoiceRevenue.toFixed(0)}`, icon: DollarSign, bg: "bg-white/15", border: "border-white/20" },
            { label: "Transactions",    val: String(totalTransactions + filteredInvoices.length),  sub: `${totalTransactions} sales · ${filteredInvoices.length} invoices`,           icon: ShoppingBag, bg: "bg-white/15", border: "border-white/20" },
            { label: "Gross Profit",    val: `£${grossProfit.toFixed(2)}`,                         sub: `Margin: ${profitMargin.toFixed(1)}%`,                                        icon: TrendingUp,  bg: "bg-white/15", border: "border-white/20" },
            { label: "Items Sold",      val: String(totalItems),                                   sub: `Avg ${(totalItems/(totalTransactions||1)).toFixed(1)} per sale`,              icon: Package,     bg: "bg-white/15", border: "border-white/20" },
          ].map(k => (
            <div key={k.label} className={cn("rounded-xl p-3.5 border backdrop-blur-sm", k.bg, k.border)}>
              <div className="flex items-center gap-2 mb-1">
                <k.icon className="w-3.5 h-3.5 text-blue-200" />
                <p className="text-[11px] text-blue-200 font-medium">{k.label}</p>
              </div>
              <p className="text-white font-bold text-lg leading-tight">{k.val}</p>
              <p className="text-blue-300 text-[10px] mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Tab bar (attached to bottom of header) */}
        <div className="flex gap-1 mt-5 overflow-x-auto pb-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg whitespace-nowrap transition-all shrink-0",
                activeTab === t.id
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-blue-200 hover:text-white hover:bg-white/10"
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ TAB CONTENT ══════════════════════════════════════════════════════ */}
      <div className="flex-1 p-5 space-y-5">

        {/* ── SALES ─────────────────────────────────────────────────────── */}
        {activeTab === "sales" && (
          <>
            {/* Mini KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Total Transactions" value={String(totalTransactions)} sub="This period"                   icon={ShoppingCart}    gradient="bg-blue-50 border-blue-100"    iconBg="bg-blue-600" />
              <KpiCard label="Revenue"            value={`£${totalRevenue.toFixed(2)}`} sub="From POS sales"           icon={DollarSign}      gradient="bg-emerald-50 border-emerald-100" iconBg="bg-emerald-600" />
              <KpiCard label="Avg Transaction"    value={`£${averageTransaction.toFixed(2)}`} sub="Per sale"           icon={BarChart2}       gradient="bg-violet-50 border-violet-100"  iconBg="bg-violet-600" />
              <KpiCard label="Items Sold"         value={String(totalItems)} sub={`${(totalItems/(totalTransactions||1)).toFixed(1)} per txn`} icon={Package} gradient="bg-amber-50 border-amber-100" iconBg="bg-amber-500" />
            </div>

            {/* Payment methods */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader icon={CreditCard} title="Payment Methods Breakdown" description="Distribution of payment methods used" />
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.keys(pmtBreakdown).length > 0 ? Object.entries(pmtBreakdown).map(([method, count]) => (
                    <div key={method} className={cn("rounded-xl border px-4 py-3 flex items-center justify-between", PMT_COLORS[method] ?? "bg-gray-50 border-gray-200 text-gray-700")}>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{method.replace(/_/g," ")}</p>
                        <p className="font-bold text-2xl">{count}</p>
                        <p className="text-[10px] opacity-60">{((count/totalTransactions)*100).toFixed(1)}% of total</p>
                      </div>
                      <CreditCard className="w-5 h-5 opacity-40" />
                    </div>
                  )) : (
                    <p className="col-span-4 text-sm text-gray-400 text-center py-4">No sales in this period</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sales table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader icon={ShoppingCart} title="Sales Transactions" description="Recent sales in the selected period">
                <Button onClick={dlSales} size="sm" className="gap-1.5 h-7 text-xs bg-gradient-to-r from-[#1e3a5f] to-[#2d5fa8]">
                  <FileSpreadsheet className="w-3 h-3" />CSV
                </Button>
                <Button onClick={() => dlJSON(filteredSales, "sales_report")} size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
                  <FileJson className="w-3 h-3" />JSON
                </Button>
              </SectionHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Date & Time","Customer","Items","Payment","Total"].map((h,i) => (
                        <th key={h} className={cn("text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-2.5", i>2?"text-right":"text-left")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredSales.slice(0,20).map(sale => (
                      <tr key={sale.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{format(new Date(sale.date),"MMM d, yyyy")}</p>
                          <p className="text-[11px] text-gray-400">{format(new Date(sale.date),"h:mm a")}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-medium">{sale.customer?.name || "Walk-in Customer"}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{sale.items.length} items</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize", PMT_COLORS[sale.paymentMethod] ?? "bg-gray-50 border-gray-200 text-gray-600")}>
                            {sale.paymentMethod.replace(/_/g," ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">£{sale.total.toFixed(2)}</td>
                      </tr>
                    ))}
                    {filteredSales.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-10 text-gray-400">No sales in this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── PRODUCTS ──────────────────────────────────────────────────── */}
        {activeTab === "products" && (
          <>
            {/* Category cards */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader icon={Tag} title="Category Performance" description="Revenue and units sold by category" />
              <div className="p-5">
                {Object.keys(categoryPerf).length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(categoryPerf)
                      .sort(([,a],[,b]) => b.revenue - a.revenue)
                      .map(([cat, data]) => (
                      <div key={cat} className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-100 p-3">
                        <p className="text-[11px] font-bold text-gray-500 truncate">{cat}</p>
                        <p className="font-bold text-blue-700 mt-1">£{data.revenue.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{data.quantity} units sold</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No product sales in this period</p>
                )}
              </div>
            </div>

            {/* Top products table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader icon={Star} title="Top Performing Products" description="Best selling products by revenue">
                <Button onClick={dlProducts} size="sm" className="gap-1.5 h-7 text-xs bg-gradient-to-r from-[#1e3a5f] to-[#2d5fa8]">
                  <FileSpreadsheet className="w-3 h-3" />CSV
                </Button>
              </SectionHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["#","Product Name","SKU","Category","Qty Sold","Revenue","Stock"].map((h,i) => (
                        <th key={h} className={cn("text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-2.5", i>3?"text-right":"text-left")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {topProducts.map((item,idx) => (
                      <tr key={item.product.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{String(idx+1).padStart(2,"0")}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{item.product.name}</td>
                        <td className="px-4 py-3"><span className="text-[11px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{item.product.sku}</span></td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{item.product.category}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">£{item.revenue.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", item.product.stock === 0 ? "bg-red-50 text-red-700 border-red-200" : item.product.stock < 10 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                            {item.product.stock}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {topProducts.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-10 text-gray-400">No product sales in this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── INVENTORY ─────────────────────────────────────────────────── */}
        {activeTab === "inventory" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Total Products"    value={String(products.length)}        sub="In catalogue"            icon={Package}      gradient="bg-blue-50 border-blue-100"     iconBg="bg-blue-600"   />
              <KpiCard label="Stock Value"       value={`£${totalStockValue.toFixed(0)}`} sub="At retail prices"      icon={Wallet}       gradient="bg-emerald-50 border-emerald-100" iconBg="bg-emerald-600" />
              <KpiCard label="Low Stock"         value={String(lowStockProducts.length)} sub="Below 10 units"         icon={AlertCircle}  gradient="bg-amber-50 border-amber-100"   iconBg="bg-amber-500"  />
              <KpiCard label="Out of Stock"      value={String(outOfStockProducts.length)} sub="Needs restocking"     icon={TrendingDown} gradient="bg-red-50 border-red-100"       iconBg="bg-red-500"    />
            </div>

            {/* Out of stock */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader icon={TrendingDown} title="Out of Stock Products" description="Products that require immediate restocking">
                <Button onClick={dlInventory} size="sm" className="gap-1.5 h-7 text-xs bg-gradient-to-r from-[#1e3a5f] to-[#2d5fa8]">
                  <FileSpreadsheet className="w-3 h-3" />Full Report
                </Button>
              </SectionHeader>
              {outOfStockProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Product","SKU","Category","Retail Price","Wholesale"].map((h,i) => (
                          <th key={h} className={cn("text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-2.5", i>2?"text-right":"text-left")}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {outOfStockProducts.map(p => (
                        <tr key={p.id} className="hover:bg-red-50/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-800">{p.name}</td>
                          <td className="px-4 py-3"><span className="text-[11px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{p.sku}</span></td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{p.category}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800">£{p.retailPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">£{p.wholesalePrice.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-5 py-6">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <p className="text-sm text-emerald-600 font-medium">All products are in stock</p>
                </div>
              )}
            </div>

            {/* Low stock */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader icon={AlertCircle} title="Low Stock Products" description="Products with fewer than 10 units remaining" />
              {lowStockProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Product","SKU","Category","Stock","Retail Price"].map((h,i) => (
                          <th key={h} className={cn("text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-2.5", i>2?"text-right":"text-left")}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lowStockProducts.map(p => (
                        <tr key={p.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-800">{p.name}</td>
                          <td className="px-4 py-3"><span className="text-[11px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{p.sku}</span></td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{p.category}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{p.stock} left</span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800">£{p.retailPrice.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-5 py-6">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <p className="text-sm text-emerald-600 font-medium">No low stock alerts</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── CUSTOMERS ─────────────────────────────────────────────────── */}
        {activeTab === "customers" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Total Customers"   value={String(customers.length)}              sub="Registered"                    icon={Users}    gradient="bg-blue-50 border-blue-100"     iconBg="bg-blue-600"    />
              <KpiCard label="Active Customers"  value={String(Object.keys(customerPurchaseMap).length)} sub="Made a purchase"     icon={Activity} gradient="bg-emerald-50 border-emerald-100" iconBg="bg-emerald-600" />
              <KpiCard label="Avg Customer Value" value={`£${topCustomers.length>0?(topCustomers.reduce((s,c)=>s+c.totalSpent,0)/topCustomers.length).toFixed(2):"0.00"}`} sub="Per active customer" icon={TrendingUp} gradient="bg-violet-50 border-violet-100" iconBg="bg-violet-600" />
              <KpiCard label="Total Credits"     value={`£${totalCredits.toFixed(2)}`}         sub="Outstanding balances"         icon={Wallet}   gradient="bg-amber-50 border-amber-100"   iconBg="bg-amber-500"   />
            </div>

            {/* Customer type breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader icon={Users} title="Customer Type Breakdown" description="Distribution across pricing tiers" />
              <div className="p-5 grid grid-cols-3 gap-4">
                {(["wholesaler","trader","retailer"] as const).map(type => {
                  const count = customers.filter(c => c.type === type).length;
                  const cfg = CUST_TYPE[type];
                  return (
                    <div key={type} className={cn("rounded-xl border p-4 text-center", cfg.bg, "border-current/20")}>
                      <p className={cn("font-black text-3xl", cfg.text)}>{count}</p>
                      <p className={cn("text-sm font-semibold capitalize mt-1", cfg.text)}>{type}s</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {type === "wholesaler" ? "30% discount" : type === "trader" ? "15% discount" : "Full price"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top customers table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader icon={Star} title="Top Customers by Spend" description="Highest value customers in the period">
                <Button onClick={dlCustomers} size="sm" className="gap-1.5 h-7 text-xs bg-gradient-to-r from-[#1e3a5f] to-[#2d5fa8]">
                  <FileSpreadsheet className="w-3 h-3" />CSV
                </Button>
              </SectionHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["#","Customer","Type","Phone","Purchases","Total Spent","Avg Order"].map((h,i) => (
                        <th key={h} className={cn("text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-2.5", i>3?"text-right":"text-left")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {topCustomers.map((item,idx) => {
                      const cfg = CUST_TYPE[item.customer.type] ?? { bg:"bg-gray-100", text:"text-gray-600" };
                      return (
                        <tr key={item.customer.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-gray-400">{String(idx+1).padStart(2,"0")}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-800">{item.customer.name}</p>
                            <p className="text-[11px] text-gray-400">{item.customer.email || "—"}</p>
                          </td>
                          <td className="px-4 py-3"><span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full capitalize", cfg.bg, cfg.text)}>{item.customer.type}</span></td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{item.customer.phone}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800">{item.purchases}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-700">£{item.totalSpent.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">£{(item.totalSpent/item.purchases).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    {topCustomers.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-10 text-gray-400">No customer purchases in this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── INVOICES ──────────────────────────────────────────────────── */}
        {activeTab === "invoices" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Total Invoices"    value={String(filteredInvoices.length)}   sub="In period"                          icon={ReceiptText} gradient="bg-blue-50 border-blue-100"     iconBg="bg-blue-600"   />
              <KpiCard label="Paid"              value={`£${totalPaid.toFixed(2)}`}        sub={`${paidInvoices.length} invoices`}  icon={CheckCircle2} gradient="bg-emerald-50 border-emerald-100" iconBg="bg-emerald-600" />
              <KpiCard label="Outstanding"       value={`£${totalPending.toFixed(2)}`}     sub={`${pendingInvoices.length} invoices`} icon={AlertCircle} gradient="bg-amber-50 border-amber-100" iconBg="bg-amber-500"  />
              <KpiCard label="Collection Rate"   value={filteredInvoices.length > 0 ? `${((paidInvoices.length/filteredInvoices.length)*100).toFixed(1)}%` : "—"} sub="Paid / Total" icon={TrendingUp} gradient="bg-violet-50 border-violet-100" iconBg="bg-violet-600" />
            </div>

            {/* Invoices table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader icon={ReceiptText} title="Invoice Ledger" description="All invoices in the selected period">
                <Button onClick={dlInvoices} size="sm" className="gap-1.5 h-7 text-xs bg-gradient-to-r from-[#1e3a5f] to-[#2d5fa8]">
                  <FileSpreadsheet className="w-3 h-3" />CSV
                </Button>
              </SectionHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Invoice #","Customer","Issue Date","Due Date","Total","Paid","Due","Status"].map((h,i) => (
                        <th key={h} className={cn("text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-2.5", i>3?"text-right":i===7?"text-center":"text-left")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredInvoices.slice(0,20).map(inv => {
                      const cfg = invCfg(inv.status);
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 font-mono font-semibold text-gray-800 text-xs">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{inv.customer.name}</p>
                            <span className={cn("text-[10px] font-bold", CUST_TYPE[inv.customer.type]?.text ?? "text-gray-500")}>
                              {inv.customer.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{format(new Date(inv.issueDate),"MMM d, yyyy")}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{format(new Date(inv.dueDate),"MMM d, yyyy")}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800">£{inv.total.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">£{inv.amountPaid.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-rose-600">£{inv.amountDue.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center"><StatusPill status={inv.status} cfg={cfg} /></td>
                        </tr>
                      );
                    })}
                    {filteredInvoices.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-10 text-gray-400">No invoices in this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── FINANCIAL ─────────────────────────────────────────────────── */}
        {activeTab === "financial" && (
          <>
            {/* P&L Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Revenue */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 px-4 py-3 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-white" />
                  <p className="text-white font-bold text-sm">Revenue</p>
                </div>
                <div className="p-4 space-y-2">
                  {[
                    { label: "POS Sales",   val: `£${totalRevenue.toFixed(2)}` },
                    { label: "Invoices",    val: `£${totalInvoiceRevenue.toFixed(2)}` },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{r.label}</span>
                      <span className="font-semibold text-gray-800">{r.val}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    <span className="font-bold text-gray-800">Total Revenue</span>
                    <span className="font-bold text-emerald-700">£{(totalRevenue+totalInvoiceRevenue).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Costs */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-rose-500 to-red-600 px-4 py-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-white" />
                  <p className="text-white font-bold text-sm">Costs</p>
                </div>
                <div className="p-4 space-y-2">
                  {[
                    { label: "Purchases",   val: `£${totalPurchaseCost.toFixed(2)}` },
                    { label: "Other",       val: "£0.00" },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{r.label}</span>
                      <span className="font-semibold text-gray-800">{r.val}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    <span className="font-bold text-gray-800">Total Costs</span>
                    <span className="font-bold text-rose-700">£{totalPurchaseCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Profit */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5fa8] px-4 py-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-white" />
                  <p className="text-white font-bold text-sm">Profit Analysis</p>
                </div>
                <div className="p-4 space-y-2">
                  {[
                    { label: "Gross Profit", val: `£${grossProfit.toFixed(2)}`, highlight: true },
                    { label: "Margin",       val: `${profitMargin.toFixed(2)}%`, highlight: false },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{r.label}</span>
                      <span className={cn("font-semibold", r.highlight ? (grossProfit >= 0 ? "text-emerald-700" : "text-rose-700") : "text-gray-800")}>{r.val}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="font-bold text-gray-800">Net Profit</span>
                    <span className={cn("font-black text-xl", grossProfit >= 0 ? "text-emerald-700" : "text-rose-700")}>£{grossProfit.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Purchases table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader icon={ShoppingBag} title="Purchase Orders Summary" description="Supplier purchases in the selected period">
                <Button onClick={dlFinancial} size="sm" className="gap-1.5 h-7 text-xs bg-gradient-to-r from-[#1e3a5f] to-[#2d5fa8]">
                  <FileSpreadsheet className="w-3 h-3" />CSV
                </Button>
              </SectionHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Date","Supplier","Items","Amount","Status"].map((h,i) => (
                        <th key={h} className={cn("text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-2.5", i===3?"text-right":i===4?"text-center":"text-left")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredPurchases.slice(0,10).map(po => {
                      const cfg = poCfg(po.status);
                      return (
                        <tr key={po.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 text-gray-600 text-xs">{format(new Date(po.date),"MMM d, yyyy")}</td>
                          <td className="px-4 py-3 font-semibold text-gray-800">{po.supplier}</td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{po.items.length} items</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-rose-700">£{po.total.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center"><StatusPill status={po.status} cfg={cfg} /></td>
                        </tr>
                      );
                    })}
                    {filteredPurchases.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-10 text-gray-400">No purchases in this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── TAX ───────────────────────────────────────────────────────── */}
        {activeTab === "tax" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard label="Total Sales (inc. VAT)"  value={`£${(totalRevenue+totalInvoiceRevenue).toFixed(2)}`} sub="Gross revenue" icon={DollarSign} gradient="bg-blue-50 border-blue-100"   iconBg="bg-blue-600"   />
              <KpiCard label="VAT Collected"           value={`£${totalVatCollected.toFixed(2)}`} sub="From invoices"                  icon={Percent}    gradient="bg-emerald-50 border-emerald-100" iconBg="bg-emerald-600" />
              <KpiCard label="Net Sales (ex. VAT)"     value={`£${((totalRevenue+totalInvoiceRevenue)-totalVatCollected).toFixed(2)}`} sub="After VAT deduction" icon={BadgeDollarSign} gradient="bg-violet-50 border-violet-100" iconBg="bg-violet-600" />
            </div>

            {/* VAT Rate breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader icon={Percent} title="VAT Breakdown by Invoice" description="VAT collected per invoice in the period">
                <Button onClick={dlTax} size="sm" className="gap-1.5 h-7 text-xs bg-gradient-to-r from-[#1e3a5f] to-[#2d5fa8]">
                  <FileSpreadsheet className="w-3 h-3" />CSV
                </Button>
              </SectionHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Invoice #","Customer","Date","Subtotal","VAT","Total"].map((h,i) => (
                        <th key={h} className={cn("text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-2.5", i>2?"text-right":"text-left")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredInvoices.slice(0,20).map(inv => (
                      <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-gray-800 text-xs">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{inv.customer.name}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{format(new Date(inv.issueDate),"MMM d, yyyy")}</td>
                        <td className="px-4 py-3 text-right text-gray-700">£{inv.subtotal.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">£{inv.taxAmount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">£{inv.total.toFixed(2)}</td>
                      </tr>
                    ))}
                    {filteredInvoices.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-10 text-gray-400">No invoices in this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* VAT Summary footer */}
              {filteredInvoices.length > 0 && (
                <div className="border-t border-gray-100 bg-emerald-50/50 px-5 py-3 grid grid-cols-3 gap-4">
                  {[
                    { label: "Total Gross",  val: `£${(totalRevenue+totalInvoiceRevenue).toFixed(2)}`, color: "text-gray-800" },
                    { label: "Total VAT",    val: `£${totalVatCollected.toFixed(2)}`,                  color: "text-emerald-700" },
                    { label: "Total Net",    val: `£${((totalRevenue+totalInvoiceRevenue)-totalVatCollected).toFixed(2)}`, color: "text-blue-700" },
                  ].map(r => (
                    <div key={r.label} className="text-center">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{r.label}</p>
                      <p className={cn("font-bold text-base mt-0.5", r.color)}>{r.val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
