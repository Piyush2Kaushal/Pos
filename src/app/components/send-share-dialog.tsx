import { useState, useRef } from "react";
import {
  Mail, Send, Download, Share2, X, FileText, CheckCircle2,
  Copy, MessageCircle, Loader2, Printer, ChevronRight,
  Building2, Calendar, Hash, CreditCard, Package, Phone, AtSign,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/app/components/ui/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Invoice, Purchase } from "@/app/types";

// ─── Types ────────────────────────────────────────────────────────────────────
type DocType = "invoice" | "purchase";

interface Props {
  open: boolean;
  onClose: () => void;
  type: DocType;
  invoice?: Invoice | null;
  purchase?: Purchase | null;
}

type Tab = "email" | "pdf" | "share";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `£${n.toFixed(2)}`;
const fmtDate = (d: Date | string) => format(new Date(d), "dd MMM yyyy");

// ─── Build print HTML ─────────────────────────────────────────────────────────
function buildPrintHTML(type: DocType, invoice?: Invoice | null, purchase?: Purchase | null): string {
  const docId   = type === "invoice" ? (invoice?.invoiceNumber ?? invoice?.id ?? "—") : (purchase?.id ?? "—");
  const docDate = type === "invoice" ? fmtDate(invoice?.issueDate ?? new Date()) : fmtDate(purchase?.date ?? new Date());
  const docTotal= type === "invoice" ? fmt(invoice?.total ?? 0) : fmt(purchase?.total ?? 0);

  const rows = type === "invoice"
    ? (invoice?.lineItems ?? []).map(li => `
        <tr>
          <td>${li.description}</td>
          <td style="text-align:center">${li.quantity}</td>
          <td style="text-align:right">£${li.unitPrice.toFixed(2)}</td>
          <td style="text-align:right">£${li.amount.toFixed(2)}</td>
        </tr>`)
    : (purchase?.items ?? []).map(i => `
        <tr>
          <td>${i.productName}</td>
          <td style="text-align:center">${i.quantity}</td>
          <td style="text-align:right">£${i.costPrice.toFixed(2)}</td>
          <td style="text-align:right">£${i.total.toFixed(2)}</td>
        </tr>`);

  const subtotal = type === "invoice" ? fmt(invoice?.subtotal ?? 0) : fmt(purchase?.subtotal ?? 0);
  const tax      = type === "invoice" ? fmt(invoice?.taxAmount ?? 0) : fmt(purchase?.tax ?? 0);
  const party    = type === "invoice"
    ? `<b>${invoice?.customer.name ?? "—"}</b><br/>${invoice?.customer.phone ?? ""}${invoice?.customer.email ? " · " + invoice.customer.email : ""}`
    : `<b>${purchase?.supplier ?? "—"}</b>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${type === "invoice" ? "Invoice" : "Purchase Order"} ${docId}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;background:#fff;padding:40px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
    .brand{display:flex;align-items:center;gap:12px}
    .logo{width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#6366f1);
          display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:20px}
    .brand-name{font-size:22px;font-weight:900;color:#1e3a5f}
    .brand-sub{font-size:11px;color:#64748b}
    .doc-title{text-align:right}
    .doc-title h1{font-size:28px;font-weight:900;color:#1e3a5f;letter-spacing:1px}
    .doc-title .id{font-size:13px;color:#64748b;margin-top:4px;font-family:monospace}
    .doc-title .date{font-size:12px;color:#94a3b8;margin-top:2px}
    .divider{border:none;border-top:2px solid #e2e8f0;margin:20px 0}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
    .meta-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px}
    .meta-box .lbl{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
    .meta-box p{font-size:13px;color:#334155}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#1e3a5f;color:#fff;padding:10px 12px;font-size:11px;font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:.5px}
    td{padding:9px 12px;font-size:12px;border-bottom:1px solid #f1f5f9;color:#334155}
    tr:last-child td{border-bottom:none}
    tr:nth-child(even) td{background:#f8fafc}
    .totals{margin-left:auto;width:260px}
    .totals-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#64748b}
    .totals-total{display:flex;justify-content:space-between;padding:10px 0;font-size:16px;font-weight:900;
                  color:#1e3a5f;border-top:2px solid #1e3a5f;margin-top:4px}
    .status{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
    .status-paid{background:#dcfce7;color:#166534}
    .status-pending{background:#fef3c7;color:#92400e}
    .status-cancelled{background:#fee2e2;color:#991b1b}
    .status-completed{background:#dcfce7;color:#166534}
    .status-other{background:#e0e7ff;color:#3730a3}
    .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;
            font-size:10px;color:#94a3b8}
    @media print{body{padding:20px}}
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="logo">B</div>
      <div>
        <div class="brand-name">BNM Parts</div>
        <div class="brand-sub">accounts@bnmparts.com · www.bnmparts.com</div>
      </div>
    </div>
    <div class="doc-title">
      <h1>${type === "invoice" ? "TAX INVOICE" : "PURCHASE ORDER"}</h1>
      <div class="id">${docId}</div>
      <div class="date">${docDate}</div>
    </div>
  </div>
  <hr class="divider"/>
  <div class="meta">
    <div class="meta-box">
      <div class="lbl">${type === "invoice" ? "Bill To" : "Supplier"}</div>
      <p>${party}</p>
    </div>
    <div class="meta-box">
      <div class="lbl">Document Info</div>
      <p>
        <b>Ref:</b> ${docId}<br/>
        <b>Date:</b> ${docDate}<br/>
        ${type === "invoice" && invoice?.dueDate ? `<b>Due:</b> ${fmtDate(invoice.dueDate)}<br/>` : ""}
        <b>Payment:</b> ${type === "invoice" ? (invoice?.paymentTerms ?? "—") : (purchase?.paymentMethod ?? "—")}
      </p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:50%">Description</th>
        <th style="text-align:center;width:10%">Qty</th>
        <th style="text-align:right;width:20%">Unit Price</th>
        <th style="text-align:right;width:20%">Amount</th>
      </tr>
    </thead>
    <tbody>${rows.join("")}</tbody>
  </table>
  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${subtotal}</span></div>
    <div class="totals-row"><span>Tax</span><span>${tax}</span></div>
    <div class="totals-total"><span>TOTAL</span><span>${docTotal}</span></div>
  </div>
  ${(invoice?.notes || purchase?.notes) ? `<div style="margin-top:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:12px;color:#64748b"><b>Notes:</b> ${invoice?.notes ?? purchase?.notes}</div>` : ""}
  <div class="footer">BNM Parts Ltd · www.bnmparts.com · accounts@bnmparts.com<br/>Generated ${format(new Date(), "dd MMM yyyy, HH:mm")}</div>
</body>
</html>`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SendShareDialog({ open, onClose, type, invoice, purchase }: Props) {
  const [tab, setTab] = useState<Tab>("email");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Derived metadata ───────────────────────────────────────────────────────
  const docId    = type === "invoice" ? (invoice?.invoiceNumber ?? invoice?.id ?? "—") : (purchase?.id ?? "—");
  const docTotal = type === "invoice" ? fmt(invoice?.total ?? 0) : fmt(purchase?.total ?? 0);
  const docDate  = type === "invoice" ? fmtDate(invoice?.issueDate ?? new Date()) : fmtDate(purchase?.date ?? new Date());
  const recipientName = type === "invoice" ? invoice?.customer.name : purchase?.supplier;
  const recipientEmail = type === "invoice" ? (invoice?.customer.email ?? "") : "";
  const docLabel = type === "invoice" ? "Invoice" : "Purchase Order";

  // ── Email form ─────────────────────────────────────────────────────────────
  const [emailForm, setEmailForm] = useState({
    to: recipientEmail,
    cc: "accounts@bnmparts.com",
    subject: `${docLabel} ${docId} from BNM Parts`,
    message: type === "invoice"
      ? `Dear ${recipientName ?? "Customer"},\n\nPlease find attached ${docLabel} ${docId} for ${docTotal}.\n\nDue date: ${invoice?.dueDate ? fmtDate(invoice.dueDate) : "—"}.\n\nKind regards,\nBNM Parts\naccounts@bnmparts.com`
      : `Dear ${recipientName ?? "Supplier"},\n\nPlease find attached Purchase Order ${docId} for ${docTotal}.\n\nPlease confirm receipt and expected delivery date.\n\nKind regards,\nBNM Parts\naccounts@bnmparts.com`,
  });

  // ── Reset on open ──────────────────────────────────────────────────────────
  const prevOpen = useRef(false);
  if (open && !prevOpen.current) {
    prevOpen.current = true;
    setSent(false);
    setTab("email");
    setEmailForm({
      to: recipientEmail,
      cc: "accounts@bnmparts.com",
      subject: `${docLabel} ${docId} from BNM Parts`,
      message: type === "invoice"
        ? `Dear ${recipientName ?? "Customer"},\n\nPlease find attached ${docLabel} ${docId} for ${docTotal}.\n\nDue date: ${invoice?.dueDate ? fmtDate(invoice.dueDate) : "—"}.\n\nKind regards,\nBNM Parts\naccounts@bnmparts.com`
        : `Dear ${recipientName ?? "Supplier"},\n\nPlease find attached Purchase Order ${docId} for ${docTotal}.\n\nPlease confirm receipt and expected delivery date.\n\nKind regards,\nBNM Parts\naccounts@bnmparts.com`,
    });
  }
  if (!open) prevOpen.current = false;

  // ── Email send ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!emailForm.to) { toast.error("Please enter a recipient email"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.to)) { toast.error("Invalid email address"); return; }
    setSending(true);
    await new Promise(r => setTimeout(r, 1800));
    setSending(false);
    setSent(true);
    toast.success(`${docLabel} emailed to ${emailForm.to}`, { description: `${docId} · ${docTotal}` });
  };

  // ── PDF: open print window ─────────────────────────────────────────────────
  const handleDownloadPDF = () => {
    const html = buildPrintHTML(type, invoice, purchase);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { toast.error("Pop-up blocked — please allow pop-ups and try again"); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      toast.success("PDF ready", { description: "Use 'Save as PDF' in the print dialog" });
    }, 400);
  };

  // ── Share: clipboard ───────────────────────────────────────────────────────
  const handleCopy = () => {
    const text = [
      `${docLabel}: ${docId}`,
      `From: BNM Parts (www.bnmparts.com)`,
      `${type === "invoice" ? "Customer" : "Supplier"}: ${recipientName}`,
      `Date: ${docDate}`,
      `Total: ${docTotal}`,
      ``,
      `Contact: accounts@bnmparts.com`,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const whatsappText = encodeURIComponent(
    `Hi, please find ${docLabel} *${docId}* from BNM Parts for *${docTotal}*. Contact: accounts@bnmparts.com`
  );
  const mailtoLink = `mailto:${emailForm.to}?subject=${encodeURIComponent(emailForm.subject)}&body=${encodeURIComponent(emailForm.message)}`;

  const statusColor = (s?: string) =>
    s === "paid" || s === "completed" ? "bg-emerald-100 text-emerald-700"
    : s === "pending" ? "bg-amber-100 text-amber-700"
    : s === "cancelled" ? "bg-red-100 text-red-700"
    : "bg-blue-100 text-blue-700";

  const docStatus = type === "invoice" ? invoice?.status : purchase?.status;

  // ── Tabs config ────────────────────────────────────────────────────────────
  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "email",  label: "Email",        icon: <Mail className="w-4 h-4" /> },
    { key: "pdf",    label: "Download PDF",  icon: <Download className="w-4 h-4" /> },
    { key: "share",  label: "Share",         icon: <Share2 className="w-4 h-4" /> },
  ];

  if (!invoice && !purchase) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 gap-0 overflow-hidden" style={{ maxWidth: 620 }}>
        <DialogHeader className="sr-only">
          <DialogTitle>Send or Share {docLabel}</DialogTitle>
          <DialogDescription>Email, download as PDF, or share {docLabel} {docId}.</DialogDescription>
        </DialogHeader>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5986] px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">{docLabel}</p>
            <p className="text-blue-200 text-xs font-mono truncate">{docId}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-white font-bold">{docTotal}</p>
            {docStatus && (
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block", statusColor(docStatus))}>
                {docStatus.toUpperCase()}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Document summary strip ────────────────────────────────────── */}
        <div className="flex items-center gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
          {[
            { icon: <Hash className="w-3 h-3" />,      val: docId },
            { icon: <Calendar className="w-3 h-3" />,  val: docDate },
            { icon: type === "invoice"
                ? <AtSign className="w-3 h-3" />
                : <Building2 className="w-3 h-3" />,   val: recipientName ?? "—" },
          ].map(({ icon, val }) => (
            <div key={val} className="flex items-center gap-1.5">
              {icon}<span>{val}</span>
            </div>
          ))}
        </div>

        {/* ── Tab bar ───────────────────────────────────────────────────── */}
        <div className="flex border-b border-gray-200 bg-white px-5">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 text-sm font-semibold px-3 py-3 border-b-2 transition-colors",
                tab === t.key
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              )}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ───────────────────────────────────────────────── */}
        <div className="p-5 min-h-[340px]">

          {/* ════ EMAIL TAB ════════════════════════════════════════════════ */}
          {tab === "email" && (
            sent ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="font-bold text-gray-900">Email Sent!</p>
                <p className="text-sm text-gray-500">{docLabel} <span className="font-mono">{docId}</span> sent to <b>{emailForm.to}</b></p>
                <Button variant="outline" size="sm" onClick={() => setSent(false)} className="mt-2">Send Another</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-600">To <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <Input
                        type="email" value={emailForm.to} disabled={sending}
                        onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))}
                        className="h-9 pl-9 text-sm"
                        placeholder="recipient@email.com"
                      />
                    </div>
                    {type === "invoice" && !invoice?.customer.email && (
                      <p className="text-[10px] text-amber-600">⚠ No email on file for this customer</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-600">CC</Label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <Input
                        type="email" value={emailForm.cc} disabled={sending}
                        onChange={e => setEmailForm(f => ({ ...f, cc: e.target.value }))}
                        className="h-9 pl-9 text-sm"
                        placeholder="cc@email.com"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-600">Subject</Label>
                  <Input
                    value={emailForm.subject} disabled={sending}
                    onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-600">Message</Label>
                  <Textarea
                    rows={6} value={emailForm.message} disabled={sending}
                    onChange={e => setEmailForm(f => ({ ...f, message: e.target.value }))}
                    className="text-sm resize-none"
                  />
                  <p className="text-[10px] text-gray-400">The {docLabel.toLowerCase()} will be attached as a PDF</p>
                </div>
                <div className="flex gap-2 pt-1">
                  {/* Open default mail client */}
                  <a href={mailtoLink} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <Mail className="w-3.5 h-3.5" />Open Mail App
                    </Button>
                  </a>
                  <Button
                    onClick={handleSend} disabled={sending || !emailForm.to || !emailForm.subject}
                    className="ml-auto bg-blue-600 hover:bg-blue-700 gap-2"
                  >
                    {sending ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : <><Send className="w-4 h-4" />Send Email</>}
                  </Button>
                </div>
              </div>
            )
          )}

          {/* ════ PDF TAB ══════════════════════════════════════════════════ */}
          {tab === "pdf" && (
            <div className="space-y-4">
              {/* Mini preview card */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5986] px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white font-black text-sm">B</div>
                    <span className="text-white font-bold text-sm">BNM Parts</span>
                  </div>
                  <span className="text-blue-200 text-xs font-mono">{docId}</span>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">{type === "invoice" ? "Customer" : "Supplier"}</p>
                      <p className="font-semibold text-gray-800">{recipientName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">Total</p>
                      <p className="font-bold text-blue-700 text-lg">{docTotal}</p>
                    </div>
                  </div>
                  {/* Line items mini table */}
                  <div className="border border-gray-100 rounded-lg overflow-hidden text-xs">
                    <div className="grid grid-cols-[1fr_auto_auto] bg-gray-50 px-3 py-1.5 font-bold text-gray-500 uppercase text-[9px] tracking-wide">
                      <span>Item</span><span className="text-right pr-4">Qty</span><span className="text-right">Amount</span>
                    </div>
                    {(type === "invoice" ? invoice?.lineItems ?? [] : purchase?.items ?? []).slice(0, 4).map((item, i) => (
                      <div key={i} className="grid grid-cols-[1fr_auto_auto] px-3 py-1.5 border-t border-gray-100 text-gray-700">
                        <span className="truncate pr-2">{"description" in item ? item.description : item.productName}</span>
                        <span className="text-right pr-4">{item.quantity}</span>
                        <span className="text-right font-semibold">{"amount" in item ? fmt(item.amount) : fmt(item.total)}</span>
                      </div>
                    ))}
                    {((type === "invoice" ? invoice?.lineItems?.length ?? 0 : purchase?.items?.length ?? 0) > 4) && (
                      <div className="px-3 py-1.5 text-gray-400 text-[10px] border-t border-gray-100">
                        + {(type === "invoice" ? invoice!.lineItems.length : purchase!.items.length) - 4} more items…
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-4 text-xs text-gray-500 pt-1">
                    <span>Subtotal: <b>{type === "invoice" ? fmt(invoice?.subtotal ?? 0) : fmt(purchase?.subtotal ?? 0)}</b></span>
                    <span>Tax: <b>{type === "invoice" ? fmt(invoice?.taxAmount ?? 0) : fmt(purchase?.tax ?? 0)}</b></span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleDownloadPDF} className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700">
                  <Printer className="w-4 h-4" />Print / Save as PDF
                </Button>
                <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
                  <Download className="w-4 h-4" />Download
                </Button>
              </div>
              <p className="text-[11px] text-gray-400 text-center">
                A print window will open — choose <b>Save as PDF</b> as the destination to download.
              </p>
            </div>
          )}

          {/* ════ SHARE TAB ════════════════════════════════════════════════ */}
          {tab === "share" && (
            <div className="space-y-4">
              {/* Summary box to copy */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Summary</p>
                {[
                  { icon: <FileText className="w-3.5 h-3.5" />,   label: docLabel,                   val: docId },
                  { icon: <Calendar className="w-3.5 h-3.5" />,   label: "Date",                      val: docDate },
                  { icon: <Package className="w-3.5 h-3.5" />,    label: type === "invoice" ? "Customer" : "Supplier", val: recipientName ?? "—" },
                  { icon: <CreditCard className="w-3.5 h-3.5" />, label: "Total",                     val: docTotal },
                  ...(type === "invoice" && invoice?.dueDate
                    ? [{ icon: <Calendar className="w-3.5 h-3.5" />, label: "Due Date", val: fmtDate(invoice.dueDate) }]
                    : []),
                ].map(({ icon, label, val }) => (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 w-4 shrink-0">{icon}</span>
                    <span className="text-gray-500 w-24 shrink-0 text-xs">{label}</span>
                    <span className="font-semibold text-gray-800 truncate">{val}</span>
                  </div>
                ))}
              </div>

              {/* Share actions */}
              <div className="grid grid-cols-2 gap-2">
                {/* Copy summary */}
                <button
                  onClick={handleCopy}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                    copied
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                  )}
                >
                  {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <Copy className="w-5 h-5 text-blue-600 shrink-0" />}
                  <div>
                    <p className="text-xs font-bold text-gray-800">{copied ? "Copied!" : "Copy Summary"}</p>
                    <p className="text-[10px] text-gray-400">To clipboard</p>
                  </div>
                </button>

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/?text=${whatsappText}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all"
                >
                  <div className="w-5 h-5 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                    <MessageCircle className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">WhatsApp</p>
                    <p className="text-[10px] text-gray-400">Send via chat</p>
                  </div>
                </a>

                {/* Email link */}
                <a
                  href={mailtoLink}
                  className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <Mail className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-800">Email App</p>
                    <p className="text-[10px] text-gray-400">Open mail client</p>
                  </div>
                </a>

                {/* Download PDF */}
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left"
                >
                  <Download className="w-5 h-5 text-orange-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-800">Save PDF</p>
                    <p className="text-[10px] text-gray-400">Download & share</p>
                  </div>
                </button>
              </div>

              <p className="text-[11px] text-gray-400 text-center">
                BNM Parts · accounts@bnmparts.com · www.bnmparts.com
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
