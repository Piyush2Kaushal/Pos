import { useState } from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  Search, FileText, Eye, Send, Layout,
  User, Mail, Phone, MapPin, Calendar, Hash, CreditCard,
  CheckCircle2, Clock, AlertCircle, XCircle, ChevronRight,
  Banknote, TrendingUp, Package, ReceiptText, ArrowUpRight,
  StickyNote, History,
} from "lucide-react";
import { SendShareDialog } from "@/app/components/send-share-dialog";
import { InvoiceDocument } from "@/app/components/invoice-document";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/app/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/app/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/app/components/ui/select";
import { format } from "date-fns";
import { Invoice } from "@/app/types";
import { cn } from "@/app/components/ui/utils";

// ─── Status config ────────────────���────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  paid:            { label: "Paid",           icon: <CheckCircle2 className="w-3.5 h-3.5" />, bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200" },
  pending:         { label: "Pending",        icon: <Clock className="w-3.5 h-3.5" />,        bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200"   },
  overdue:         { label: "Overdue",        icon: <AlertCircle className="w-3.5 h-3.5" />,  bg: "bg-red-50",      text: "text-red-700",     border: "border-red-200"     },
  draft:           { label: "Draft",          icon: <FileText className="w-3.5 h-3.5" />,     bg: "bg-gray-50",     text: "text-gray-600",    border: "border-gray-200"    },
  sent:            { label: "Sent",           icon: <Send className="w-3.5 h-3.5" />,         bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200"    },
  partially_paid:  { label: "Partial",        icon: <TrendingUp className="w-3.5 h-3.5" />,   bg: "bg-violet-50",   text: "text-violet-700",  border: "border-violet-200"  },
  cancelled:       { label: "Cancelled",      icon: <XCircle className="w-3.5 h-3.5" />,      bg: "bg-rose-50",     text: "text-rose-700",    border: "border-rose-200"    },
};

const CUSTOMER_TYPE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  wholesaler: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Wholesaler" },
  trader:     { bg: "bg-violet-100", text: "text-violet-700", label: "Trader"     },
  retailer:   { bg: "bg-sky-100",    text: "text-sky-700",    label: "Retailer"   },
};

export function InvoicesView() {
  const { invoices, updateInvoiceStatus } = usePOS();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "payments">("details");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sendShareInvoice, setSendShareInvoice] = useState<Invoice | null>(null);
  const [designInvoice, setDesignInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const pendingAmount = invoices.filter(i => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.total, 0);

  const statusCfg = (s: string) => STATUS_CONFIG[s] ?? STATUS_CONFIG.draft;

  const handleStatusChange = (invoiceId: string, newStatus: Invoice["status"]) => {
    updateInvoiceStatus(invoiceId, newStatus);
    setSelectedInvoice(prev => prev?.id === invoiceId ? { ...prev, status: newStatus } : prev);
  };

  const openDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setActiveTab("details");
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Invoice History</h2>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                <ReceiptText className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-green-100">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-emerald-700 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-700">£{totalRevenue.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-100">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-amber-700 font-medium">Pending / Overdue</p>
                <p className="text-2xl font-bold text-amber-700">£{pendingAmount.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 z-10 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by invoice ID or customer…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='bg-white'>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Invoices Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {filteredInvoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="font-semibold">Invoice</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Total</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const cfg = statusCfg(invoice.status);
                  return (
                    <TableRow key={invoice.id} className="hover:bg-gray-50/60 transition-colors">
                      <TableCell>
                        <p className="font-mono font-semibold text-sm text-gray-800">{invoice.invoiceNumber ?? invoice.id}</p>
                        <p className="text-xs text-gray-400">{invoice.id !== (invoice.invoiceNumber ?? invoice.id) ? invoice.id : ""}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-gray-800 text-sm">{invoice.customer.name}</p>
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                          CUSTOMER_TYPE_CONFIG[invoice.customer.type]?.bg,
                          CUSTOMER_TYPE_CONFIG[invoice.customer.type]?.text
                        )}>
                          {CUSTOMER_TYPE_CONFIG[invoice.customer.type]?.label ?? invoice.customer.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(new Date(invoice.issueDate ?? invoice.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-gray-900">£{invoice.total.toFixed(2)}</p>
                        {(invoice.amountDue ?? 0) > 0 && (
                          <p className="text-[10px] text-rose-500 font-medium">Due: £{(invoice.amountDue ?? 0).toFixed(2)}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border",
                          cfg.bg, cfg.text, cfg.border
                        )}>
                          {cfg.icon}{cfg.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" title="View Details"
                            onClick={() => openDetail(invoice)}
                            className="h-7 w-7 p-0 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" title="Invoice Designer"
                            onClick={() => setDesignInvoice(invoice)}
                            className="h-7 w-7 p-0 text-violet-600 border-violet-200 hover:bg-violet-50">
                            <Layout className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" title="Send / Share"
                            onClick={() => setSendShareInvoice(invoice)}
                            className="h-7 w-7 p-0 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-gray-500">No invoices found</p>
              <p className="text-sm mt-1">Try adjusting your search or filter</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════
          REDESIGNED INVOICE DETAIL DIALOG
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={selectedInvoice !== null} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="p-0 gap-0 overflow-hidden max-w-2xl max-h-[92vh] flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>Invoice {selectedInvoice?.invoiceNumber ?? selectedInvoice?.id}</DialogTitle>
            <DialogDescription>View and manage invoice details.</DialogDescription>
          </DialogHeader>

          {selectedInvoice && (() => {
            const cfg = statusCfg(selectedInvoice.status);
            const custCfg = CUSTOMER_TYPE_CONFIG[selectedInvoice.customer.type] ?? { bg: "bg-gray-100", text: "text-gray-600", label: selectedInvoice.customer.type };
            const subtotal = selectedInvoice.subtotal ?? 0;
            const tax = selectedInvoice.taxAmount ?? 0;
            const total = selectedInvoice.total ?? 0;
            const amountPaid = selectedInvoice.amountPaid ?? 0;
            const amountDue = selectedInvoice.amountDue ?? 0;

            return (
              <>
                {/* ── Gradient Header ─────────────────────────────────── */}
                <div className="bg-gradient-to-br from-[#1e3a5f] via-[#1e4080] to-[#2d5fa8] px-6 pt-5 pb-0 shrink-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                        <ReceiptText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-base leading-tight">
                          Invoice {selectedInvoice.invoiceNumber ?? selectedInvoice.id}
                        </p>
                        <p className="text-blue-200 text-xs mt-0.5">View and manage invoice details</p>
                      </div>
                    </div>
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border",
                      cfg.bg, cfg.text, cfg.border
                    )}>
                      {cfg.icon}{cfg.label}
                    </span>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1">
                    {(["details", "payments"] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={cn(
                          "px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all capitalize",
                          activeTab === t
                            ? "bg-white text-gray-800 shadow-sm"
                            : "text-blue-200 hover:text-white hover:bg-white/10"
                        )}
                      >
                        {t === "details" ? "Details" : "Payments"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Tab Content ──────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto bg-gray-50/50">
                  {activeTab === "details" ? (
                    <div className="p-5 space-y-4">

                      {/* Invoice Meta Strip */}
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { label: "Invoice Number", val: selectedInvoice.invoiceNumber ?? selectedInvoice.id, mono: true },
                            { label: "Issue Date",     val: format(new Date(selectedInvoice.issueDate ?? selectedInvoice.createdAt), "MMM d, yyyy") },
                            { label: "Due Date",       val: format(new Date(selectedInvoice.dueDate ?? selectedInvoice.createdAt), "MMM d, yyyy") },
                          ].map(f => (
                            <div key={f.label}>
                              <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-widest mb-1">{f.label}</p>
                              <p className={cn("text-sm font-bold text-gray-800", f.mono && "font-mono")}>{f.val}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Customer Information */}
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/70">
                          <User className="w-4 h-4 text-gray-500" />
                          <p className="text-sm font-bold text-gray-700">Customer Information</p>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                          <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Name</p>
                            <p className="font-bold text-gray-800 text-sm">{selectedInvoice.customer.name}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Type</p>
                            <span className={cn("inline-flex text-xs font-bold px-2.5 py-1 rounded-full", custCfg.bg, custCfg.text)}>
                              {custCfg.label}
                            </span>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Email</p>
                            <div className="flex items-center gap-1.5 text-sm text-gray-700">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              <span>{selectedInvoice.customer.email ?? "—"}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Phone</p>
                            <div className="flex items-center gap-1.5 text-sm text-gray-700">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span>{selectedInvoice.customer.phone ?? "—"}</span>
                            </div>
                          </div>
                          {selectedInvoice.customer.address && (
                            <div className="col-span-2">
                              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Address</p>
                              <div className="flex items-start gap-1.5 text-sm text-gray-700">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                                <span>{selectedInvoice.customer.address}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Line Items */}
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/70">
                          <Package className="w-4 h-4 text-gray-500" />
                          <p className="text-sm font-bold text-gray-700">Line Items</p>
                          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                            {selectedInvoice.lineItems?.length ?? 0} items
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100">
                                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-2.5">Description</th>
                                <th className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2.5 w-14">Qty</th>
                                <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2.5 w-24">Unit Price</th>
                                <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-2.5 w-24">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {(selectedInvoice.lineItems ?? []).map((item, i) => (
                                <tr key={item.id ?? i} className="hover:bg-gray-50/60 transition-colors">
                                  <td className="px-4 py-3 text-gray-800 font-medium">{item.description}</td>
                                  <td className="px-3 py-3 text-center text-gray-600">{item.quantity}</td>
                                  <td className="px-3 py-3 text-right text-gray-600">£{(item.unitPrice ?? 0).toFixed(2)}</td>
                                  <td className="px-4 py-3 text-right font-semibold text-gray-800">£{(item.amount ?? 0).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Totals section inside the card */}
                        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-1.5">
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>Subtotal</span>
                            <span className="font-medium text-gray-700">£{subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>Tax / VAT</span>
                            <span className="font-medium text-gray-700">£{tax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-200">
                            <span className="font-bold text-gray-800">Total</span>
                            <span className="font-bold text-gray-900 text-base">£{total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-emerald-600">
                            <span className="font-medium">Amount Paid</span>
                            <span className="font-semibold">£{amountPaid.toFixed(2)}</span>
                          </div>
                          {amountDue > 0 && (
                            <div className="flex justify-between pt-1.5 border-t border-rose-100 bg-rose-50 -mx-4 px-4 -mb-3 pb-3 mt-1 rounded-b-xl">
                              <span className="font-bold text-rose-700">Amount Due</span>
                              <span className="font-bold text-rose-700 text-base">£{amountDue.toFixed(2)}</span>
                            </div>
                          )}
                          {amountDue === 0 && (
                            <div className="flex items-center gap-2 pt-1.5 border-t border-emerald-100 bg-emerald-50 -mx-4 px-4 -mb-3 pb-3 mt-1 rounded-b-xl">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span className="font-bold text-emerald-700 text-sm">Fully Paid</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      {selectedInvoice.notes && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/70">
                            <StickyNote className="w-4 h-4 text-gray-500" />
                            <p className="text-sm font-bold text-gray-700">Notes</p>
                          </div>
                          <p className="px-4 py-3 text-sm text-gray-600 leading-relaxed">{selectedInvoice.notes}</p>
                        </div>
                      )}

                      {/* Status Update */}
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                        <p className="text-sm font-semibold text-gray-700 shrink-0">Update Status</p>
                        <Select
                          value={selectedInvoice.status}
                          onValueChange={(value: Invoice["status"]) => handleStatusChange(selectedInvoice.id, value)}
                        >
                          <SelectTrigger className="flex-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className='bg-white'>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                            <SelectItem value="partially_paid">Partially Paid</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    /* ── Payments Tab ───────────────────────────────────── */
                    <div className="p-5 space-y-4">
                      {/* Summary */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Total",  val: `£${total.toFixed(2)}`,      bg: "bg-blue-50 border-blue-100",   text: "text-blue-700"   },
                          { label: "Paid",   val: `£${amountPaid.toFixed(2)}`, bg: "bg-emerald-50 border-emerald-100", text: "text-emerald-700" },
                          { label: "Due",    val: `£${amountDue.toFixed(2)}`,  bg: amountDue > 0 ? "bg-rose-50 border-rose-100" : "bg-gray-50 border-gray-100", text: amountDue > 0 ? "text-rose-700" : "text-gray-500" },
                        ].map(c => (
                          <div key={c.label} className={cn("rounded-xl border p-3 text-center", c.bg)}>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{c.label}</p>
                            <p className={cn("font-bold text-base", c.text)}>{c.val}</p>
                          </div>
                        ))}
                      </div>

                      {/* Payment History */}
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/70">
                          <History className="w-4 h-4 text-gray-500" />
                          <p className="text-sm font-bold text-gray-700">Payment History</p>
                        </div>
                        {(selectedInvoice.paymentHistory ?? []).length > 0 ? (
                          <div className="divide-y divide-gray-50">
                            {(selectedInvoice.paymentHistory ?? []).map((pmt, i) => (
                              <div key={pmt.id ?? i} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50/60">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                  <Banknote className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-800">£{(pmt.amount ?? 0).toFixed(2)}</p>
                                  <p className="text-xs text-gray-400">
                                    {pmt.method ?? "—"}{pmt.reference ? ` · ${pmt.reference}` : ""}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-medium text-gray-600">
                                    {format(new Date(pmt.date ?? new Date()), "MMM d, yyyy")}
                                  </p>
                                  {pmt.notes && <p className="text-[10px] text-gray-400 mt-0.5 max-w-[120px] truncate">{pmt.notes}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="px-4 py-10 text-center">
                            <Banknote className="w-10 h-10 mx-auto text-gray-200 mb-2" />
                            <p className="text-sm text-gray-400 font-medium">No payments recorded</p>
                          </div>
                        )}
                      </div>

                      {/* Payment terms */}
                      {selectedInvoice.paymentTerms && (
                        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
                          <CreditCard className="w-4 h-4 text-gray-400 shrink-0" />
                          <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Payment Terms</p>
                            <p className="text-sm font-semibold text-gray-700 capitalize">
                              {selectedInvoice.paymentTerms.replace(/_/g, " ")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Bottom Actions ───────────────────────────────────── */}
                <div className="px-5 py-4 border-t border-gray-100 bg-white flex gap-2 shrink-0">
                  <Button variant="outline"
                    onClick={() => { setSelectedInvoice(null); setDesignInvoice(selectedInvoice); }}
                    className="flex-1 gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
                  >
                    <Layout className="w-4 h-4" />Designer
                  </Button>
                  <Button
                    onClick={() => { setSelectedInvoice(null); setSendShareInvoice(selectedInvoice); }}
                    className="flex-1 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
                  >
                    <Send className="w-4 h-4" />Send / Share
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Send/Share Invoice Dialog */}
      <SendShareDialog
        open={sendShareInvoice !== null}
        onClose={() => setSendShareInvoice(null)}
        type="invoice"
        invoice={sendShareInvoice}
      />

      {/* Invoice Designer */}
      {designInvoice && (
        <InvoiceDocument
          invoice={designInvoice}
          onClose={() => setDesignInvoice(null)}
          onSendShare={() => { setDesignInvoice(null); setSendShareInvoice(designInvoice); }}
        />
      )}
    </div>
  );
}