import { useState, useRef, useCallback } from "react";
import {
  Printer, Download, Send, X, Upload, Plus, Trash2,
  Edit3, Check, Building2, Phone, Mail, Globe,
  Hash, Calendar, CreditCard, FileSignature, AlignLeft,
  ChevronDown, Palette, Save,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/app/components/ui/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Invoice } from "@/app/types";

// ─── Types ───────────────────────────────────────────────────────────────────
interface BankDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
  ifsc: string;
  accountType: string;
}

interface InvoiceDocState {
  // Company (Billed By)
  billerName: string;
  billerAddress: string;
  billerEmail: string;
  billerPhone: string;
  billerVat: string;
  billerPan: string;
  logoUrl: string;
  // Appearance
  accentColor: string;
  // Bank
  bank: BankDetails;
  // Content
  termsAndConditions: string;
  additionalNotes: string;
  signatureLabel: string;
  forText: string;
  // Footer (editable)
  footerText: string;
  footerSubText: string;
  // Discount
  discountPct: number;
}

const ACCENT_PRESETS = [
  { label: "Violet",  val: "#7c3aed" },
  { label: "Blue",    val: "#2563eb" },
  { label: "Navy",    val: "#1e3a5f" },
  { label: "Teal",    val: "#0d9488" },
  { label: "Rose",    val: "#e11d48" },
  { label: "Slate",   val: "#475569" },
];

interface Props {
  invoice: Invoice;
  onClose: () => void;
  onSendShare?: () => void;
}

// ─── Inline editable field ────────────────────────────────────────────────────
function EditableField({
  value, onChange, className = "", placeholder = "Click to edit",
  multiline = false, rows = 2,
}: {
  value: string; onChange: (v: string) => void;
  className?: string; placeholder?: string;
  multiline?: boolean; rows?: number;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    const props = {
      value, autoFocus: true,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
      onBlur: () => setEditing(false),
      onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" && !multiline) setEditing(false); },
      className: cn("border border-violet-400 rounded px-1 py-0.5 bg-violet-50 outline-none text-inherit w-full", className),
    };
    return multiline
      ? <textarea {...props} rows={rows} style={{ resize: "vertical" }} />
      : <input {...props} />;
  }
  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      className={cn(
        "cursor-text border border-transparent hover:border-violet-300 hover:bg-violet-50 rounded px-0.5 transition-colors inline-block w-full",
        !value && "text-gray-300 italic",
        className
      )}
    >
      {value || placeholder}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function InvoiceDocument({ invoice, onClose, onSendShare }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [doc, setDoc] = useState<InvoiceDocState>({
    billerName: "BNM Parts Ltd",
    billerAddress: "123 Main Street, London, SW1A 1AA",
    billerEmail: "accounts@bnmparts.com",
    billerPhone: "+44 20 7946 0958",
    billerVat: "GB 123 4567 89",
    billerPan: "BNMPT1234K",
    logoUrl: "",
    accentColor: "#7c3aed",
    bank: {
      accountName: "BNM Parts Ltd",
      accountNumber: "45398287987",
      bankName: "HSBC Bank",
      ifsc: "HSBC0018159",
      accountType: "Business Current",
    },
    termsAndConditions:
      "Please pay within 15 days from the date of invoice. Overdue interest @ 14% will be charged on delayed payments.\n\nPlease quote invoice number when remitting funds.",
    additionalNotes:
      "All prices are exclusive of VAT unless otherwise stated. Goods remain the property of BNM Parts Ltd until payment is received in full.",
    signatureLabel: "Authorised Signatory",
    forText: `For BNM Parts Ltd`,
    footerText: "Thank you for your business!",
    footerSubText: "BNM Parts · accounts@bnmparts.com · www.bnmparts.com · +44 20 7946 0958",
    discountPct: 0,
  });

  const upd = useCallback(<K extends keyof InvoiceDocState>(key: K, val: InvoiceDocState[K]) => {
    setDoc(d => ({ ...d, [key]: val }));
  }, []);
  const updBank = (key: keyof BankDetails, val: string) =>
    setDoc(d => ({ ...d, bank: { ...d.bank, [key]: val } }));

  // Logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => upd("logoUrl", ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Computed totals
  const subtotal = invoice.subtotal ?? invoice.lineItems.reduce((s, l) => s + l.amount, 0);
  const discountAmt = subtotal * (doc.discountPct / 100);
  const taxable = subtotal - discountAmt;
  const tax = invoice.taxAmount ?? taxable * 0.2;
  const total = taxable + tax;
  const sym = "£";
  const fmt2 = (n: number) => `${sym}${n.toFixed(2)}`;
  const fmtDate = (d: Date | string) => format(new Date(d), "MMMM d, yyyy");

  // Print
  const handlePrint = () => {
    window.print();
    toast.success("Print dialog opened — choose 'Save as PDF'");
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/80 flex overflow-hidden">
      {/* ── Left: Editor Sidebar ─────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden print:hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] px-4 py-3 flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-white" />
          <span className="text-white font-bold text-sm">Invoice Editor</span>
          <button onClick={onClose} className="ml-auto text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
          {/* Logo */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Business Logo</p>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors",
                doc.logoUrl ? "border-violet-300 bg-violet-50" : "border-gray-200 hover:border-violet-300 hover:bg-violet-50"
              )}
            >
              {doc.logoUrl ? (
                <img src={doc.logoUrl} alt="Logo" className="max-h-16 mx-auto object-contain" />
              ) : (
                <>
                  <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">Click to upload</p>
                  <p className="text-[10px] text-gray-400">PNG or JPG · max 2MB</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            {doc.logoUrl && (
              <button onClick={() => upd("logoUrl", "")} className="text-[10px] text-red-500 hover:underline mt-1 block">
                Remove logo
              </button>
            )}
          </section>

          {/* Accent colour */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Palette className="w-3 h-3" />Accent Colour
            </p>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_PRESETS.map(p => (
                <button
                  key={p.val}
                  title={p.label}
                  onClick={() => upd("accentColor", p.val)}
                  className={cn("w-7 h-7 rounded-full border-2 transition-transform hover:scale-110",
                    doc.accentColor === p.val ? "border-gray-800 scale-110" : "border-transparent")}
                  style={{ background: p.val }}
                />
              ))}
              <input
                type="color" value={doc.accentColor}
                onChange={e => upd("accentColor", e.target.value)}
                className="w-7 h-7 rounded-full border-2 border-gray-200 cursor-pointer"
                title="Custom colour"
              />
            </div>
          </section>

          {/* Billed By */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Your Details</p>
            <div className="space-y-2">
              {([
                { label: "Company Name", key: "billerName" },
                { label: "Address",      key: "billerAddress" },
                { label: "Email",        key: "billerEmail" },
                { label: "Phone",        key: "billerPhone" },
                { label: "VAT Number",   key: "billerVat" },
                { label: "PAN",          key: "billerPan" },
              ] as const).map(f => (
                <div key={f.key}>
                  <p className="text-[10px] text-gray-500 mb-0.5">{f.label}</p>
                  <Input
                    value={doc[f.key]} className="h-7 text-xs"
                    onChange={e => upd(f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Bank Details */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Bank Account</p>
            <div className="space-y-2">
              {([
                { label: "Account Name",   key: "accountName" },
                { label: "Account Number", key: "accountNumber" },
                { label: "Bank Name",      key: "bankName" },
                { label: "IFSC / Sort",    key: "ifsc" },
                { label: "Account Type",   key: "accountType" },
              ] as const).map(f => (
                <div key={f.key}>
                  <p className="text-[10px] text-gray-500 mb-0.5">{f.label}</p>
                  <Input
                    value={doc.bank[f.key]} className="h-7 text-xs"
                    onChange={e => updBank(f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Discount */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Discount</p>
            <div className="flex items-center gap-2">
              <Input
                type="number" min="0" max="100" value={doc.discountPct}
                onChange={e => upd("discountPct", Number(e.target.value))}
                className="h-7 text-xs w-20"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </section>

          {/* Footer */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <AlignLeft className="w-3 h-3" />Footer (Editable)
            </p>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-gray-500 mb-0.5">Main Footer Text</p>
                <Input
                  value={doc.footerText} className="h-7 text-xs"
                  onChange={e => upd("footerText", e.target.value)}
                />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 mb-0.5">Footer Sub-line</p>
                <Input
                  value={doc.footerSubText} className="h-7 text-xs"
                  onChange={e => upd("footerSubText", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Terms */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Terms &amp; Conditions</p>
            <Textarea
              value={doc.termsAndConditions} rows={4}
              className="text-xs resize-none"
              onChange={e => upd("termsAndConditions", e.target.value)}
            />
          </section>

          {/* Additional Notes */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Additional Notes</p>
            <Textarea
              value={doc.additionalNotes} rows={3}
              className="text-xs resize-none"
              onChange={e => upd("additionalNotes", e.target.value)}
            />
          </section>

          {/* Signatory */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Signatory Label</p>
            <Input
              value={doc.signatureLabel} className="h-7 text-xs"
              onChange={e => upd("signatureLabel", e.target.value)}
            />
            <p className="text-[10px] text-gray-500 mt-2 mb-0.5">"For" Text</p>
            <Input
              value={doc.forText} className="h-7 text-xs"
              onChange={e => upd("forText", e.target.value)}
            />
          </section>
        </div>

        {/* Sidebar footer actions */}
        <div className="p-4 border-t space-y-2 shrink-0">
          <Button onClick={handlePrint} className="w-full gap-2" style={{ background: doc.accentColor }}>
            <Printer className="w-4 h-4" />Print / Save PDF
          </Button>
          {onSendShare && (
            <Button onClick={onSendShare} variant="outline" className="w-full gap-2">
              <Send className="w-4 h-4" />Send / Share
            </Button>
          )}
        </div>
      </aside>

      {/* ── Right: Invoice Preview ───────────────────────────────────────── */}
      <main className="flex-1 overflow-auto bg-gray-100 flex flex-col items-center py-8 px-4 print:p-0 print:bg-white print:overflow-visible">
        {/* Toolbar */}
        <div className="w-full max-w-[860px] mb-4 flex items-center gap-2 print:hidden">
          <div className="flex-1" />
          <span className="text-xs text-gray-400 mr-2">Click any field on the document to edit it inline</span>
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" />Print
          </Button>
          <Button size="sm" variant="outline" onClick={onClose} className="gap-1.5">
            <X className="w-3.5 h-3.5" />Close
          </Button>
        </div>

        {/* ═══ INVOICE DOCUMENT ════════════════════════════════════════════ */}
        <div
          id="invoice-doc"
          className="w-full max-w-[860px] bg-white shadow-2xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none"
          style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: "#1a1a2e" }}
        >
          {/* ── Page Top: Title + Address ──────────────────────────────── */}
          <div className="px-8 pt-7 pb-0">
            <div className="flex justify-between items-start">
              {/* Left: Title + address */}
              <div>
                <h1 className="text-xl font-black text-gray-800 mb-1">
                  <EditableField value={doc.forText} onChange={v => upd("forText", v)} className="text-xl font-black" />
                </h1>
                <p className="text-xs text-gray-500">
                  <EditableField value={doc.billerAddress} onChange={v => upd("billerAddress", v)} className="text-xs text-gray-500" />
                </p>
              </div>
              {/* Right: Logo + invoice meta */}
              <div className="text-right space-y-2">
                {/* Logo area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors print:hidden"
                  style={{ minWidth: 120, minHeight: 64, padding: doc.logoUrl ? 4 : 12 }}
                >
                  {doc.logoUrl ? (
                    <img src={doc.logoUrl} alt="Logo" className="max-h-14 max-w-[120px] object-contain" />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-5 h-5 mx-auto text-gray-400 mb-0.5" />
                      <p className="text-[10px] text-gray-400 font-semibold">Add Business Logo</p>
                      <p className="text-[9px] text-gray-300">PNG or JPEG file</p>
                    </div>
                  )}
                </div>
                {doc.logoUrl && (
                  <div className="print:block hidden-normally">
                    <img src={doc.logoUrl} alt="Logo" className="max-h-14 max-w-[120px] object-contain ml-auto" />
                  </div>
                )}
              </div>
            </div>

            {/* Invoice meta row */}
            <div className="flex justify-between items-end mt-5 pb-4 border-b border-gray-200">
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                {[
                  { label: "Invoice #",      val: invoice.invoiceNumber ?? invoice.id },
                  { label: "Invoice Date",   val: fmtDate(invoice.issueDate) },
                  { label: "Due Date",       val: fmtDate(invoice.dueDate) },
                ].map(({ label, val }) => (
                  <div key={label} className="contents">
                    <span className="text-gray-500 font-medium">{label}</span>
                    <span className="font-bold text-gray-800 font-mono">{val}</span>
                  </div>
                ))}
              </div>
              {/* Status pill */}
              <span
                className="text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide"
                style={{ background: `${doc.accentColor}18`, color: doc.accentColor }}
              >
                {invoice.status}
              </span>
            </div>
          </div>

          {/* ── Billed By / Billed To ──────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-6 px-8 py-5">
            {/* Billed By */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: doc.accentColor }}>
                Billed by
              </p>
              <p className="font-bold text-sm text-gray-800">
                <EditableField value={doc.billerName} onChange={v => upd("billerName", v)} className="font-bold text-sm" />
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                <EditableField value={doc.billerAddress} onChange={v => upd("billerAddress", v)} className="text-xs text-gray-500" />
              </p>
              <div className="mt-2 space-y-0.5 text-xs text-gray-600">
                {[
                  { label: "Email", val: doc.billerEmail, upd: (v: string) => upd("billerEmail", v) },
                  { label: "Phone", val: doc.billerPhone, upd: (v: string) => upd("billerPhone", v) },
                  { label: "VAT",   val: doc.billerVat,   upd: (v: string) => upd("billerVat", v) },
                  { label: "PAN",   val: doc.billerPan,   upd: (v: string) => upd("billerPan", v) },
                ].map(f => (
                  <div key={f.label} className="flex gap-1.5">
                    <span className="text-gray-400 w-10 shrink-0">{f.label}</span>
                    <EditableField value={f.val} onChange={f.upd} className="text-xs" />
                  </div>
                ))}
              </div>
            </div>

            {/* Billed To */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: doc.accentColor }}>
                Billed to
              </p>
              <p className="font-bold text-sm text-gray-800">{invoice.customer.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{invoice.customer.address ?? "—"}</p>
              <div className="mt-2 space-y-0.5 text-xs text-gray-600">
                {[
                  { label: "Email", val: invoice.customer.email ?? "—" },
                  { label: "Phone", val: invoice.customer.phone ?? "—" },
                  { label: "Type",  val: invoice.customer.type ?? "—" },
                ].map(f => (
                  <div key={f.label} className="flex gap-1.5">
                    <span className="text-gray-400 w-10 shrink-0">{f.label}</span>
                    <span className="font-medium text-gray-700">{f.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Line Items Table ───────────────────────────────────────── */}
          <div className="px-8 pb-0">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: doc.accentColor }}>
                  <th className="text-white text-left py-2.5 px-3 rounded-tl-lg w-6">#</th>
                  <th className="text-white text-left py-2.5 px-3">Item Name &amp; Description</th>
                  <th className="text-white text-right py-2.5 px-3 w-16">VAT %</th>
                  <th className="text-white text-right py-2.5 px-3 w-20">Price</th>
                  <th className="text-white text-right py-2.5 px-3 w-16">Qty</th>
                  <th className="text-white text-right py-2.5 px-3 rounded-tr-lg w-24">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((li, i) => (
                  <tr key={li.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="py-2.5 px-3 text-gray-400 font-mono">{String(i + 1).padStart(2, "0")}</td>
                    <td className="py-2.5 px-3 font-medium text-gray-800">{li.description}</td>
                    <td className="py-2.5 px-3 text-right text-gray-600">{li.taxRate}%</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{fmt2(li.unitPrice)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{li.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-gray-800">{fmt2(li.amount)}</td>
                  </tr>
                ))}
                {/* Empty rows */}
                {Array.from({ length: Math.max(0, 3 - invoice.lineItems.length) }).map((_, i) => (
                  <tr key={`empty-${i}`} className={((invoice.lineItems.length + i) % 2 === 0) ? "bg-white" : "bg-gray-50"}>
                    <td className="py-2.5 px-3 text-gray-200 font-mono">{String(invoice.lineItems.length + i + 1).padStart(2, "0")}</td>
                    <td className="py-2.5 px-3 text-gray-200 italic">—</td>
                    <td className="py-2.5 px-3 text-right text-gray-200">0%</td>
                    <td className="py-2.5 px-3 text-right text-gray-200">{sym}0</td>
                    <td className="py-2.5 px-3 text-right text-gray-200">0</td>
                    <td className="py-2.5 px-3 text-right text-gray-200">{sym}0</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Bank + Totals ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-6 px-8 py-5">
            {/* Bank Account Details */}
            <div>
              <p
                className="text-[10px] font-black uppercase tracking-widest mb-3 pb-1 border-b"
                style={{ color: doc.accentColor, borderColor: `${doc.accentColor}40` }}
              >
                Bank Account Details
              </p>
              <div className="space-y-1 text-xs text-gray-700">
                {[
                  { label: "Account Name",   val: doc.bank.accountName },
                  { label: "Account Number", val: doc.bank.accountNumber },
                  { label: "Bank Name",      val: doc.bank.bankName },
                  { label: "IFSC / Sort",    val: doc.bank.ifsc },
                  { label: "Account Type",   val: doc.bank.accountType },
                ].map(f => (
                  <div key={f.label} className="flex gap-2">
                    <span className="text-gray-400 w-28 shrink-0">{f.label}</span>
                    <span className="font-semibold">{f.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div>
              <p
                className="text-[10px] font-black uppercase tracking-widest mb-3 pb-1 border-b"
                style={{ color: doc.accentColor, borderColor: `${doc.accentColor}40` }}
              >
                Summary
              </p>
              <div className="space-y-1.5 text-xs">
                {[
                  { label: "Sub Total",       val: fmt2(subtotal),   bold: false },
                  { label: `Discount (${doc.discountPct}%)`, val: `− ${fmt2(discountAmt)}`, bold: false },
                  { label: "Taxable Amount",  val: fmt2(taxable),    bold: false },
                  { label: "Tax / VAT",       val: fmt2(tax),        bold: false },
                ].map(r => (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-gray-500">{r.label}</span>
                    <span className={cn("font-semibold text-gray-700")}>{r.val}</span>
                  </div>
                ))}
                <div
                  className="flex justify-between items-center mt-2 pt-2 border-t-2"
                  style={{ borderColor: doc.accentColor }}
                >
                  <span className="font-black text-sm text-gray-800">Total (GBP)</span>
                  <span className="font-black text-xl" style={{ color: doc.accentColor }}>{fmt2(total)}</span>
                </div>
              </div>

              {/* For text */}
              <div className="mt-4 text-right">
                <p className="text-xs text-gray-500 italic">
                  <EditableField value={doc.forText} onChange={v => upd("forText", v)} className="text-xs italic" />
                </p>
              </div>
            </div>
          </div>

          {/* ── Terms & Conditions ─────────────────────────────────────── */}
          <div className="px-8 pb-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-widest mb-2 pb-1 border-b"
                  style={{ color: doc.accentColor, borderColor: `${doc.accentColor}40` }}
                >
                  Terms and Conditions
                </p>
                <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">
                  <EditableField
                    value={doc.termsAndConditions}
                    onChange={v => upd("termsAndConditions", v)}
                    multiline rows={4}
                    className="text-[11px] leading-relaxed"
                  />
                </p>
              </div>
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-widest mb-2 pb-1 border-b"
                  style={{ color: doc.accentColor, borderColor: `${doc.accentColor}40` }}
                >
                  Additional Notes
                </p>
                <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">
                  <EditableField
                    value={doc.additionalNotes}
                    onChange={v => upd("additionalNotes", v)}
                    multiline rows={4}
                    className="text-[11px] leading-relaxed"
                  />
                </p>
              </div>
            </div>
          </div>

          {/* ── Authorised Signatory ───────────────────────────────────── */}
          <div className="px-8 pb-6 flex justify-between items-end">
            <div />
            <div className="text-right">
              {/* Signature area */}
              <div
                className="w-40 h-14 border-b-2 mb-1 flex items-end justify-center"
                style={{ borderColor: `${doc.accentColor}50` }}
              >
                <span className="text-2xl text-gray-200 italic pb-1" style={{ fontFamily: "'Segoe Script', cursive" }}>
                  BNM
                </span>
              </div>
              <p className="text-xs text-gray-500">
                <EditableField value={doc.signatureLabel} onChange={v => upd("signatureLabel", v)} className="text-xs" />
              </p>
            </div>
          </div>

          {/* ═══ FOOTER ═══════════════════════════════════════════════════ */}
          <div
            className="px-8 py-4 relative group"
            style={{ background: `${doc.accentColor}12`, borderTop: `3px solid ${doc.accentColor}` }}
          >
            {/* Edit hint (print hidden) */}
            <span className="absolute top-2 right-3 text-[9px] text-gray-300 group-hover:text-violet-400 transition-colors print:hidden select-none">
              ✏ click to edit footer
            </span>
            <p className="text-sm font-bold text-center" style={{ color: doc.accentColor }}>
              <EditableField
                value={doc.footerText}
                onChange={v => upd("footerText", v)}
                className="text-sm font-bold text-center"
                placeholder="Footer main text…"
              />
            </p>
            <p className="text-[10px] text-gray-400 text-center mt-0.5">
              <EditableField
                value={doc.footerSubText}
                onChange={v => upd("footerSubText", v)}
                className="text-[10px] text-gray-400"
                placeholder="Contact · website · email…"
              />
            </p>
          </div>
        </div>

        {/* Bottom padding */}
        <div className="h-10 print:hidden" />
      </main>

      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#invoice-print-root) { display: none !important; }
          #invoice-doc { box-shadow: none !important; border-radius: 0 !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
