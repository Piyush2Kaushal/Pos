import { useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/app/components/ui/select";
import {
  CheckCircle2, AlertTriangle, Loader2, Search, Upload, FileText,
  ChevronLeft, ChevronRight, Trash2, Download, Archive, Tag, X, Plus,
  Building2, Hash, DollarSign, CreditCard, ZoomIn, ZoomOut, Scan,
  Inbox, Receipt, Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/app/components/ui/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CapturedLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

type DocStatus = "processing" | "review" | "published" | "failed";

interface CapturedDoc {
  id: string;
  status: DocStatus;
  fileName: string;
  fileUrl?: string;
  fileType?: string;
  // Extracted fields
  supplierName: string;
  supplierColor: string;
  billDate: string;
  dueDate: string;
  invoiceNumber: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  lineItems: CapturedLineItem[];
  notes: string;
  confidence: Record<string, "high" | "medium" | "low">;
  // Publish settings
  publishAs: string;
  publishStatus: string;
  contact: string;
  lineItemsMode: "single" | "multiple";
  accountCode: string;
  department: string;
  description: string;
  paymentMethod: string;
  isArchived: boolean;
  isPaid: boolean;
}

interface Supplier { id: string; name: string; email: string; phone: string; }

interface DocumentCaptureDialogProps {
  open: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  onCreatePO: (data: {
    supplierName: string;
    invoiceNumber: string;
    date: string;
    subtotal: number;
    tax: number;
    total: number;
    lineItems: CapturedLineItem[];
    paymentMethod: string;
    notes: string;
    fileUrl?: string;
    fileType?: string;
    fileName?: string;
  }) => void;
}

// ─── Seed documents ──────────────────────────────────────────────────────────
const SEED_DOCS: CapturedDoc[] = [
  {
    id: "seed1", status: "review", fileName: "tech-parts-inv-0087.pdf",
    supplierName: "Tech Parts Ltd", supplierColor: "from-blue-500 to-indigo-600",
    billDate: "2025-02-10", dueDate: "2025-03-12", invoiceNumber: "INV-TP-2025-0087",
    subtotal: 1247.50, taxRate: 20, taxAmount: 249.50, total: 1497.00, currency: "GBP",
    lineItems: [
      { description: "iPhone 14 Pro Screen Assembly", quantity: 5, unitPrice: 89.99, total: 449.95 },
      { description: "Samsung S23 Battery 4500mAh", quantity: 10, unitPrice: 24.50, total: 245.00 },
      { description: "USB-C Charging Port Module", quantity: 20, unitPrice: 8.75, total: 175.00 },
      { description: "Rear Camera Lens Cover", quantity: 15, unitPrice: 12.50, total: 187.50 },
      { description: "Adhesive Strip Set (100pcs)", quantity: 3, unitPrice: 63.35, total: 190.05 },
    ],
    notes: "Priority shipment. Handle with care.", confidence: { supplierName: "high", total: "high", taxRate: "high", invoiceNumber: "high", billDate: "high" },
    publishAs: "Purchase", publishStatus: "Authorised", contact: "Tech Parts Ltd",
    lineItemsMode: "multiple", accountCode: "200 - Purchases", department: "Operations",
    description: "Mobile parts supply – Feb 2025", paymentMethod: "Bank Transfer",
    isArchived: false, isPaid: false,
  },
  {
    id: "seed2", status: "published", fileName: "fastscreen-bill-feb15.pdf",
    supplierName: "FastScreen Direct", supplierColor: "from-violet-500 to-purple-600",
    billDate: "2025-02-15", dueDate: "2025-02-22", invoiceNumber: "FSD-B-20250215",
    subtotal: 3480.00, taxRate: 20, taxAmount: 696.00, total: 4176.00, currency: "GBP",
    lineItems: [
      { description: "iPhone 13 OLED Display (OEM)", quantity: 12, unitPrice: 145.00, total: 1740.00 },
      { description: "iPhone 12 LCD Assembly", quantity: 8, unitPrice: 95.00, total: 760.00 },
      { description: "Samsung A54 Screen + Digitizer", quantity: 10, unitPrice: 78.00, total: 780.00 },
      { description: "Google Pixel 7 Display Unit", quantity: 4, unitPrice: 50.00, total: 200.00 },
    ],
    notes: "All screens tested before dispatch.", confidence: { supplierName: "high", total: "high", taxRate: "high", invoiceNumber: "high", billDate: "high" },
    publishAs: "Purchase", publishStatus: "Authorised", contact: "FastScreen Direct",
    lineItemsMode: "multiple", accountCode: "200 - Purchases", department: "Inventory",
    description: "Screen panels batch – Feb 2025", paymentMethod: "Bank Transfer",
    isArchived: false, isPaid: true,
  },
  {
    id: "seed3", status: "review", fileName: "mobile-supply-inv-441.pdf",
    supplierName: "Mobile Supply Co", supplierColor: "from-emerald-500 to-teal-600",
    billDate: "2025-02-20", dueDate: "2025-03-06", invoiceNumber: "MSC-INV-2025-441",
    subtotal: 2156.00, taxRate: 20, taxAmount: 431.20, total: 2587.20, currency: "GBP",
    lineItems: [
      { description: "iPhone 15 Battery Replacement", quantity: 20, unitPrice: 38.00, total: 760.00 },
      { description: "Samsung S22 Back Glass Panel", quantity: 15, unitPrice: 22.40, total: 336.00 },
      { description: "OnePlus 11 Charging IC Chip", quantity: 30, unitPrice: 9.00, total: 270.00 },
      { description: "Universal Tempered Glass 6.1\"", quantity: 50, unitPrice: 3.80, total: 190.00 },
      { description: "Type-C Flex Cable 15cm", quantity: 40, unitPrice: 15.00, total: 600.00 },
    ],
    notes: "Bulk order discount applied. Track: MSC-SHIP-881.", confidence: { supplierName: "high", total: "high", taxRate: "high", invoiceNumber: "high", billDate: "medium" },
    publishAs: "Purchase", publishStatus: "Draft", contact: "Mobile Supply Co",
    lineItemsMode: "multiple", accountCode: "200 - Purchases", department: "Operations",
    description: "Bulk components order – Feb 2025", paymentMethod: "Bank Transfer",
    isArchived: false, isPaid: false,
  },
  {
    id: "seed4", status: "published", fileName: "repairkit-rec-329.jpg",
    supplierName: "RepairKit Pro", supplierColor: "from-amber-500 to-orange-600",
    billDate: "2025-02-18", dueDate: "2025-02-18", invoiceNumber: "RKP-REC-00329",
    subtotal: 612.40, taxRate: 20, taxAmount: 122.48, total: 734.88, currency: "GBP",
    lineItems: [
      { description: "Professional Repair Tool Kit 32pc", quantity: 4, unitPrice: 58.50, total: 234.00 },
      { description: "Pry Tool Set (plastic, 10pcs)", quantity: 10, unitPrice: 8.90, total: 89.00 },
      { description: "Suction Cup Handle Large", quantity: 12, unitPrice: 4.95, total: 59.40 },
      { description: "Torx Screwdriver Set T2-T10", quantity: 6, unitPrice: 22.00, total: 132.00 },
    ],
    notes: "Cash on delivery. Signed by: E. Brooks.", confidence: { supplierName: "high", total: "high", taxRate: "medium", invoiceNumber: "high", billDate: "high" },
    publishAs: "Purchase", publishStatus: "Authorised", contact: "RepairKit Pro",
    lineItemsMode: "multiple", accountCode: "210 - Tools & Equipment", department: "Repair",
    description: "Tool kits – Feb 2025", paymentMethod: "Cash",
    isArchived: false, isPaid: true,
  },
  {
    id: "seed5", status: "failed", fileName: "global-elec-unclear-scan.jpg",
    supplierName: "Global Electronics", supplierColor: "from-red-500 to-rose-600",
    billDate: "2025-01-15", dueDate: "2025-03-15", invoiceNumber: "GE-2025-???",
    subtotal: 890.00, taxRate: 20, taxAmount: 178.00, total: 1068.00, currency: "GBP",
    lineItems: [
      { description: "Mixed Accessories Bundle", quantity: 1, unitPrice: 890.00, total: 890.00 },
    ],
    notes: "Document quality too low — please re-upload.", confidence: { supplierName: "medium", total: "low", taxRate: "low", invoiceNumber: "low", billDate: "low" },
    publishAs: "Purchase", publishStatus: "Draft", contact: "",
    lineItemsMode: "single", accountCode: "220 - Accessories", department: "Operations",
    description: "", paymentMethod: "Bank Transfer",
    isArchived: false, isPaid: false,
  },
  {
    id: "seed6", status: "review", fileName: "shenzhen-po-batch.pdf",
    supplierName: "Shenzhen Parts HK", supplierColor: "from-cyan-500 to-sky-600",
    billDate: "2025-01-28", dueDate: "2025-02-18", invoiceNumber: "SZ-PO-25-0114",
    subtotal: 4200.00, taxRate: 0, taxAmount: 0, total: 4200.00, currency: "USD",
    lineItems: [
      { description: "OEM iPhone 14 Battery (50pcs)", quantity: 50, unitPrice: 18.00, total: 900.00 },
      { description: "OLED Flex Cable Ribbon 10cm", quantity: 200, unitPrice: 3.50, total: 700.00 },
      { description: "Samsung A-Series Back Covers", quantity: 100, unitPrice: 12.50, total: 1250.00 },
      { description: "Charging ICs Mixed (500pcs)", quantity: 500, unitPrice: 2.70, total: 1350.00 },
    ],
    notes: "DDP Incoterms. ETA: 21 days from dispatch.", confidence: { supplierName: "high", total: "high", taxRate: "high", invoiceNumber: "high", billDate: "high" },
    publishAs: "Purchase", publishStatus: "Authorised", contact: "Shenzhen Parts HK",
    lineItemsMode: "multiple", accountCode: "200 - Purchases", department: "Import",
    description: "Bulk import batch Jan 2025", paymentMethod: "Bank Transfer",
    isArchived: false, isPaid: false,
  },
  {
    id: "seed7", status: "published", fileName: "parts-universe-invoice.pdf",
    supplierName: "Parts Universe", supplierColor: "from-gray-500 to-slate-600",
    billDate: "2025-01-10", dueDate: "2025-02-09", invoiceNumber: "PU-DE-2025-088",
    subtotal: 720.00, taxRate: 19, taxAmount: 136.80, total: 856.80, currency: "EUR",
    lineItems: [
      { description: "German Market Charger Adapter 10W", quantity: 40, unitPrice: 9.00, total: 360.00 },
      { description: "EU Compliance Label Set (500pcs)", quantity: 2, unitPrice: 180.00, total: 360.00 },
    ],
    notes: "VAT 19% (Germany). IBAN: DE49 …", confidence: { supplierName: "high", total: "high", taxRate: "high", invoiceNumber: "high", billDate: "high" },
    publishAs: "Purchase", publishStatus: "Authorised", contact: "Parts Universe",
    lineItemsMode: "multiple", accountCode: "200 - Purchases", department: "Import",
    description: "EU accessories import", paymentMethod: "Bank Transfer",
    isArchived: false, isPaid: true,
  },
];

// ─── Processing animation steps ───────────────────────────────────────────────
const PROC_STEPS = [
  "Uploading document…",
  "Detecting document type…",
  "Running OCR engine…",
  "Extracting key fields…",
  "Matching supplier records…",
  "Mapping to purchase order…",
];

// ─── Confidence dot ───────────────────────────────────────────────────────────
function ConfDot({ level }: { level?: "high" | "medium" | "low" }) {
  if (!level) return null;
  return (
    <span className={cn("inline-block w-2 h-2 rounded-full shrink-0",
      level === "high" ? "bg-emerald-500" : level === "medium" ? "bg-amber-400" : "bg-red-400"
    )} title={`${level} confidence`} />
  );
}

// ─── Invoice Mockup (center panel) ────────────────────────────────────────────
function InvoiceMockup({ doc }: { doc: CapturedDoc }) {
  return (
    <div className="bg-white shadow-xl rounded-sm border border-gray-200 w-[480px] mx-auto text-[11px] font-mono leading-relaxed select-none">
      {/* Header */}
      <div className="px-8 pt-7 pb-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-black text-lg mb-2", doc.supplierColor)}>
              {doc.supplierName[0]}
            </div>
            <p className="font-bold text-[13px] text-gray-900">{doc.supplierName}</p>
            <p className="text-gray-500 text-[10px]">www.{doc.supplierName.toLowerCase().replace(/\s+/g,"")}.com</p>
          </div>
          <div className="text-right">
            <p className="text-[16px] font-black text-gray-800 tracking-wider">TAX INVOICE</p>
            <p className="text-gray-600 mt-1">Invoice #: <span className="font-bold text-gray-900">{doc.invoiceNumber}</span></p>
            <p className="text-gray-600">Date: <span className="font-semibold">{doc.billDate}</span></p>
            <p className="text-gray-600">Due: <span className="font-semibold">{doc.dueDate}</span></p>
          </div>
        </div>
      </div>

      {/* Bill from / to */}
      <div className="px-8 py-4 grid grid-cols-2 gap-6 border-b border-gray-100 bg-gray-50/60">
        <div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Bill From</p>
          <p className="font-semibold text-gray-900">{doc.supplierName}</p>
          <p className="text-gray-500">supplier@{doc.supplierName.toLowerCase().replace(/\s+/g,"")}.com</p>
          <p className="text-gray-500">VAT Reg: GB{Math.floor(Math.random()*900000000+100000000)}</p>
        </div>
        <div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Bill To</p>
          <p className="font-semibold text-gray-900">BNM Parts Ltd</p>
          <p className="text-gray-500">accounts@bnmparts.com</p>
          <p className="text-gray-500">www.bnmparts.com</p>
        </div>
      </div>

      {/* Line items */}
      <div className="px-8 py-4">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-900 text-[9px] font-black text-gray-500 uppercase tracking-widest">
              <th className="text-left pb-1.5 w-[48%]">Description</th>
              <th className="text-center pb-1.5 w-[10%]">Qty</th>
              <th className="text-right pb-1.5 w-[20%]">Unit Price</th>
              <th className="text-right pb-1.5 w-[22%]">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {doc.lineItems.map((li, i) => (
              <tr key={i}>
                <td className="py-1 text-gray-800">{li.description}</td>
                <td className="py-1 text-center text-gray-700">{li.quantity}</td>
                <td className="py-1 text-right text-gray-700">{doc.currency === "USD" ? "$" : doc.currency === "EUR" ? "€" : "£"}{li.unitPrice.toFixed(2)}</td>
                <td className="py-1 text-right font-semibold text-gray-900">{doc.currency === "USD" ? "$" : doc.currency === "EUR" ? "€" : "£"}{li.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="px-8 pb-4 flex justify-end">
        <div className="w-48 space-y-1">
          <div className="flex justify-between border-t border-gray-200 pt-1.5">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-semibold">{doc.currency === "USD" ? "$" : doc.currency === "EUR" ? "€" : "£"}{doc.subtotal.toFixed(2)}</span>
          </div>
          {doc.taxRate > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Tax ({doc.taxRate}%)</span>
              <span className="font-semibold">{doc.currency === "USD" ? "$" : doc.currency === "EUR" ? "€" : "£"}{doc.taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-gray-900 pt-1.5 text-[13px] font-black">
            <span>TOTAL</span>
            <span className="text-gray-900">{doc.currency === "USD" ? "$" : doc.currency === "EUR" ? "€" : "£"}{doc.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="px-8 pb-4 border-t border-gray-100 pt-3 bg-gray-50/60">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Payment Method</p>
        <p className="text-gray-700">{doc.paymentMethod}</p>
        {doc.notes && <p className="text-gray-500 mt-1 italic">"{doc.notes}"</p>}
      </div>

      {/* Barcode strip */}
      <div className="px-8 pb-5 pt-3">
        <div className="flex gap-px h-8 items-end">
          {Array.from({ length: 80 }).map((_, i) => (
            <div key={i} className="bg-gray-900 flex-1 rounded-sm"
              style={{ height: `${[100,60,80,50,90,70,100,55,75,85][i % 10]}%` }} />
          ))}
        </div>
        <p className="text-center text-[9px] text-gray-400 mt-1 tracking-widest">{doc.invoiceNumber} · {doc.billDate}</p>
      </div>
    </div>
  );
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<DocStatus, { icon: ReactNode; color: string; bg: string; label: string }> = {
  processing: { icon: <Loader2 className="w-4 h-4 animate-spin text-blue-500"/>, color: "text-blue-600", bg: "bg-blue-50", label: "Processing" },
  review:     { icon: <AlertTriangle className="w-4 h-4 text-amber-500"/>,       color: "text-amber-600", bg: "bg-amber-50", label: "Review" },
  published:  { icon: <CheckCircle2 className="w-4 h-4 text-emerald-500"/>,      color: "text-emerald-600", bg: "bg-emerald-50", label: "Published" },
  failed:     { icon: <AlertTriangle className="w-4 h-4 text-red-500"/>,         color: "text-red-600", bg: "bg-red-50", label: "Failed" },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function DocumentCaptureDialog({ open, onClose, suppliers, onCreatePO }: DocumentCaptureDialogProps) {
  const [docs, setDocs] = useState<CapturedDoc[]>(SEED_DOCS);
  const [selectedId, setSelectedId] = useState<string>("seed1");
  const [filter, setFilter] = useState<"all" | DocStatus | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingStepIdx, setProcessingStepIdx] = useState(0);
  const [docZoom, setDocZoom] = useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedDoc = docs.find(d => d.id === selectedId) ?? null;

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filteredDocs = docs.filter(d => {
    if (filter === "archived") return d.isArchived;
    if (filter !== "all" && d.status !== filter) return false;
    if (d.isArchived && filter !== "archived") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return d.supplierName.toLowerCase().includes(q) || d.invoiceNumber.toLowerCase().includes(q);
    }
    return true;
  });

  // ── Filter counts ──────────────────────────────────────────────────────────
  const counts = {
    all: docs.filter(d => !d.isArchived).length,
    processing: docs.filter(d => d.status === "processing" && !d.isArchived).length,
    review: docs.filter(d => d.status === "review" && !d.isArchived).length,
    failed: docs.filter(d => d.status === "failed" && !d.isArchived).length,
    archived: docs.filter(d => d.isArchived).length,
  };

  // ── Navigate prev/next ─────────────────────────────────────────────────────
  const navIdx = filteredDocs.findIndex(d => d.id === selectedId);
  const goPrev = () => { if (navIdx > 0) setSelectedId(filteredDocs[navIdx - 1].id); };
  const goNext = () => { if (navIdx < filteredDocs.length - 1) setSelectedId(filteredDocs[navIdx + 1].id); };

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFileUpload = useCallback((file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) { toast.error("Unsupported file type"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large (max 10 MB)"); return; }

    const newId = `doc-${Date.now()}`;
    const fileUrl = URL.createObjectURL(file);

    // Pick a random mock dataset for extraction simulation
    const mocks = SEED_DOCS;
    const mockBase = mocks[Math.floor(Math.random() * mocks.length)];

    const newDoc: CapturedDoc = {
      ...mockBase,
      id: newId,
      status: "processing",
      fileName: file.name,
      fileUrl,
      fileType: file.type,
      invoiceNumber: `CAP-${Date.now().toString().slice(-6)}`,
    };

    setDocs(prev => [newDoc, ...prev]);
    setSelectedId(newId);
    setFilter("all");
    setProcessingStepIdx(0);

    // Animate processing steps
    let step = 0;
    const durations = [600, 700, 900, 800, 600, 500];
    const advance = () => {
      step++;
      setProcessingStepIdx(step);
      if (step < PROC_STEPS.length) {
        setTimeout(advance, durations[step] ?? 600);
      } else {
        setTimeout(() => {
          setDocs(prev => prev.map(d => d.id === newId ? { ...d, status: "review" } : d));
          toast.success("Document captured!", { description: `${newDoc.supplierName} · £${newDoc.total.toFixed(2)}` });
        }, 400);
      }
    };
    setTimeout(advance, durations[0]);
  }, []);

  const onDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  // ── Update field on selected doc ───────────────────────────────────────────
  const updateDoc = (id: string, patch: Partial<CapturedDoc>) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
  };

  // ── Publish ────────────────────────────────────────────────────────────────
  const handlePublish = () => {
    if (!selectedDoc || selectedDoc.status === "processing") return;
    if (selectedDoc.status === "published") { toast.info("Already published"); return; }
    onCreatePO({
      supplierName: selectedDoc.supplierName,
      invoiceNumber: selectedDoc.invoiceNumber,
      date: selectedDoc.billDate,
      subtotal: selectedDoc.subtotal,
      tax: selectedDoc.taxAmount,
      total: selectedDoc.total,
      lineItems: selectedDoc.lineItems,
      paymentMethod: selectedDoc.paymentMethod,
      notes: selectedDoc.notes,
      fileUrl: selectedDoc.fileUrl,
      fileType: selectedDoc.fileType,
      fileName: selectedDoc.fileName,
    });
    updateDoc(selectedDoc.id, { status: "published", isPaid: selectedDoc.publishStatus === "Authorised" });
    toast.success("Published!", { description: `PO created for ${selectedDoc.supplierName} · £${selectedDoc.total.toFixed(2)}` });
  };

  // ── Mark as paid ───────────────────────────────────────────────────────────
  const handleMarkPaid = () => {
    if (!selectedDoc) return;
    updateDoc(selectedDoc.id, { isPaid: true });
    toast.success("Marked as paid");
  };

  // ── Archive ────────────────────────────────────────────────────────────────
  const handleArchive = () => {
    if (!selectedDoc) return;
    updateDoc(selectedDoc.id, { isArchived: true });
    const next = filteredDocs.find(d => d.id !== selectedId);
    if (next) setSelectedId(next.id);
    toast.success("Archived");
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = () => {
    if (!selectedDoc) return;
    if (!confirm("Delete this document?")) return;
    setDocs(prev => prev.filter(d => d.id !== selectedId));
    const next = filteredDocs.find(d => d.id !== selectedId);
    if (next) setSelectedId(next.id); else setSelectedId("");
    toast.success("Deleted");
  };

  const sym = (d: CapturedDoc) => d.currency === "USD" ? "$" : d.currency === "EUR" ? "€" : "£";

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden flex flex-col"
        style={{ maxWidth: "1200px", width: "96vw", height: "90vh", maxHeight: "90vh" }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Auto Capture — Document Inbox</DialogTitle>
          <DialogDescription>
            Upload and manage supplier invoices, receipts and bills with automated data extraction.
          </DialogDescription>
        </DialogHeader>

        {/* ══════════════════════════════════════════════════════════════════════
            TOP HEADER BAR  (Hubdoc-style dark navy)
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="bg-[#1c3a50] flex items-center gap-3 px-4 py-2.5 shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
              <Scan className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-[15px] tracking-tight">AutoCapture</span>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search documents…"
              className="w-full bg-[#0f2535] border border-[#2a4f6a] rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-400"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Add Receipt / Upload */}
            <button
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="w-4 h-4" />Add Receipt
            </button>
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />

            <div className="text-gray-400 text-xs ml-2">accounts@bnmparts.com</div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors ml-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            THREE-COLUMN BODY
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── LEFT PANEL: Document inbox ──────────────────────────────────── */}
          <div className="w-[240px] shrink-0 border-r border-gray-200 flex flex-col bg-white">
            {/* Filter tabs */}
            <div className="border-b border-gray-200 px-3 pt-2 pb-0">
              <div className="flex flex-wrap gap-x-1">
                {([
                  ["all", "All"],
                  ["processing", "Processing"],
                  ["review", "Review"],
                  ["failed", "Failed"],
                  ["archived", "Archived"],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={cn(
                      "text-[11px] font-semibold px-2 py-1.5 border-b-2 transition-colors whitespace-nowrap",
                      filter === key
                        ? "border-teal-500 text-teal-700"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {label}
                    {(counts as any)[key] > 0 && (
                      <span className={cn("ml-1 text-[10px] rounded-full px-1 font-bold",
                        filter === key ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-500"
                      )}>
                        {(counts as any)[key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Document list */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredDocs.length === 0 && (
                <div className="py-10 text-center text-gray-400 text-xs px-4">
                  <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No documents
                </div>
              )}
              {filteredDocs.map(doc => {
                const cfg = STATUS_CFG[doc.status];
                const isSelected = doc.id === selectedId;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedId(doc.id)}
                    className={cn(
                      "flex items-start gap-2.5 px-3 py-3 cursor-pointer transition-colors group",
                      isSelected ? "bg-[#e8f4f8] border-l-3 border-l-teal-500" : "hover:bg-gray-50 border-l-3 border-l-transparent"
                    )}
                    style={{ borderLeftWidth: 3, borderLeftStyle: "solid", borderLeftColor: isSelected ? "#0d9488" : "transparent" }}
                  >
                    {/* Supplier avatar */}
                    <div className={cn("w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-black text-sm shrink-0 mt-0.5", doc.supplierColor)}>
                      {doc.supplierName[0]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={cn("font-semibold text-[12px] truncate", isSelected ? "text-[#1c3a50]" : "text-gray-800")}>
                          {doc.supplierName}
                        </p>
                        {/* Status icon */}
                        <span className="shrink-0 mt-0.5">{cfg.icon}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 truncate">{doc.invoiceNumber}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-gray-500">
                          {doc.billDate}
                        </span>
                        <span className={cn("text-[12px] font-bold", doc.isPaid ? "text-emerald-600" : "text-gray-800")}>
                          {sym(doc)}{doc.total.toFixed(2)}
                        </span>
                      </div>
                      {doc.isPaid && (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1">PAID</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drop zone at bottom */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={onDropFile}
              className="border-t border-dashed border-gray-300 p-3 text-center text-xs text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mx-auto mb-1 opacity-50" />
              Drop file to upload
            </div>
          </div>

          {/* ── CENTER PANEL: Document preview ──────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 bg-gray-100 border-r border-gray-200">
            {selectedDoc ? (
              <>
                {/* Action toolbar */}
                <div className="bg-white border-b border-gray-200 flex items-center gap-1 px-4 py-2 shrink-0">
                  <Button
                    size="sm" variant="ghost"
                    className={cn("text-xs gap-1 h-7", selectedDoc.isPaid && "text-emerald-600 bg-emerald-50")}
                    onClick={handleMarkPaid}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {selectedDoc.isPaid ? "Paid" : "Mark as Paid"}
                  </Button>
                  <div className="w-px h-4 bg-gray-200 mx-0.5" />
                  <Button size="sm" variant="ghost" className="text-xs gap-1 h-7">
                    <Tag className="w-3.5 h-3.5" />Tags
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs gap-1 h-7">
                    <Receipt className="w-3.5 h-3.5" />Notes
                  </Button>
                  <div className="w-px h-4 bg-gray-200 mx-0.5" />
                  {selectedDoc.fileUrl ? (
                    <a href={selectedDoc.fileUrl} download={selectedDoc.fileName}>
                      <Button size="sm" variant="ghost" className="text-xs gap-1 h-7">
                        <Download className="w-3.5 h-3.5" />Download
                      </Button>
                    </a>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-xs gap-1 h-7 text-gray-400" disabled>
                      <Download className="w-3.5 h-3.5" />Download
                    </Button>
                  )}
                  <button
                    onClick={handleDelete}
                    className="ml-auto text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Zoom (image docs only) */}
                  {selectedDoc.fileUrl && selectedDoc.fileType !== "application/pdf" && (
                    <div className="flex items-center gap-1 border rounded px-1.5 py-0.5 ml-1">
                      <button disabled={docZoom <= 50} onClick={() => setDocZoom(z => Math.max(50, z - 10))} className="text-gray-500 hover:text-gray-900 disabled:opacity-30"><ZoomOut className="w-3.5 h-3.5" /></button>
                      <span className="text-[10px] font-bold text-gray-600 min-w-[34px] text-center">{docZoom}%</span>
                      <button disabled={docZoom >= 200} onClick={() => setDocZoom(z => Math.min(200, z + 10))} className="text-gray-500 hover:text-gray-900 disabled:opacity-30"><ZoomIn className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>

                {/* Document area */}
                <div className="flex-1 overflow-auto">
                  {selectedDoc.status === "processing" ? (
                    // ── Processing animation ──────────────────────────────────
                    <div className="flex flex-col items-center justify-center h-full space-y-6 p-8">
                      <div className="relative w-20 h-20">
                        <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                        <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
                        <div className="absolute inset-3 rounded-full bg-teal-50 flex items-center justify-center">
                          <Scan className="w-7 h-7 text-teal-600" />
                        </div>
                      </div>
                      <div className="space-y-2 w-full max-w-xs">
                        {PROC_STEPS.map((label, i) => {
                          const done = i < processingStepIdx;
                          const active = i === processingStepIdx - 1;
                          return (
                            <div key={i} className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition-all",
                              done ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                              active ? "bg-blue-50 border-blue-300 text-blue-700" :
                              "bg-gray-50 border-gray-200 text-gray-400 opacity-50"
                            )}>
                              {done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> :
                               active ? <Loader2 className="w-4 h-4 text-blue-500 shrink-0 animate-spin" /> :
                               <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />}
                              {label}
                              {done && <span className="ml-auto text-[10px] font-bold text-emerald-500">✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : selectedDoc.fileUrl && selectedDoc.fileType === "application/pdf" ? (
                    // ── PDF iframe ────────────────────────────────────────────
                    <iframe
                      src={`${selectedDoc.fileUrl}#toolbar=1`}
                      title={selectedDoc.fileName}
                      className="w-full h-full border-0"
                    />
                  ) : selectedDoc.fileUrl ? (
                    // ── Uploaded image ────────────────────────────────────────
                    <div className="flex items-center justify-center p-6 min-h-full">
                      <div className="transition-transform duration-150 origin-top" style={{ transform: `scale(${docZoom / 100})` }}>
                        <img src={selectedDoc.fileUrl} alt={selectedDoc.fileName} className="max-w-full rounded-lg shadow-xl border border-gray-300 block" />
                      </div>
                    </div>
                  ) : (
                    // ── Mock invoice ─────────────────────────────────────────
                    <div className="flex items-start justify-center p-8 min-h-full">
                      <InvoiceMockup doc={selectedDoc} />
                    </div>
                  )}
                </div>

                {/* Prev / Next navigation */}
                <div className="bg-white border-t border-gray-200 flex items-center justify-between px-4 py-2 shrink-0 text-xs text-gray-500">
                  <button
                    onClick={goPrev} disabled={navIdx <= 0}
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-900 disabled:opacity-30 font-semibold"
                  >
                    <ChevronLeft className="w-4 h-4" />prev
                  </button>
                  <span className="text-[11px] text-gray-400">{navIdx + 1} / {filteredDocs.length}</span>
                  <button
                    onClick={goNext} disabled={navIdx >= filteredDocs.length - 1}
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-900 disabled:opacity-30 font-semibold"
                  >
                    next<ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <FileText className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-semibold">Select a document to review</p>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL: Publish form ────────────────────────────────────── */}
          <div className="w-[290px] shrink-0 bg-white flex flex-col overflow-y-auto">
            {selectedDoc ? (
              <>
                {/* Publish & Proceed */}
                <div className="px-4 pt-4 pb-3 border-b border-gray-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <button onClick={goPrev} disabled={navIdx <= 0}
                      className="border border-teal-400 text-teal-600 rounded px-2.5 py-1.5 text-xs font-bold hover:bg-teal-50 disabled:opacity-30 flex items-center gap-1">
                      <ChevronLeft className="w-3.5 h-3.5" />prev
                    </button>
                    <Button
                      onClick={handlePublish}
                      disabled={selectedDoc.status === "processing"}
                      className={cn(
                        "flex-1 text-sm font-bold py-2 transition-all",
                        selectedDoc.status === "published"
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-teal-600 hover:bg-teal-500"
                      )}
                    >
                      {selectedDoc.status === "published" ? (
                        <><CheckCircle2 className="w-4 h-4 mr-1" />Published</>
                      ) : selectedDoc.status === "processing" ? (
                        <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Processing…</>
                      ) : (
                        "Publish & Proceed"
                      )}
                    </Button>
                    <button onClick={goNext} disabled={navIdx >= filteredDocs.length - 1}
                      className="border border-teal-400 text-teal-600 rounded px-2.5 py-1.5 text-xs font-bold hover:bg-teal-50 disabled:opacity-30 flex items-center gap-1">
                      next<ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 text-center">
                    Don't want to make changes?{" "}
                    <button onClick={handleArchive} className="text-teal-600 hover:underline font-semibold">Archive instead</button>
                  </p>
                </div>

                {/* DESTINATIONS */}
                <div className="px-4 py-3 border-b border-gray-200">
                </div>

                {/* Extracted fields form */}
                <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto">

                  {/* Confidence summary */}
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <div className="flex gap-2 text-[10px]">
                      {(["high", "medium", "low"] as const).map(lvl => {
                        const cnt = Object.values(selectedDoc.confidence).filter(v => v === lvl).length;
                        return cnt > 0 ? (
                          <span key={lvl} className="flex items-center gap-1">
                            <ConfDot level={lvl} />
                            <span className="text-gray-500">{cnt}</span>
                          </span>
                        ) : null;
                      })}
                      <span className="text-gray-400 ml-1">confidence</span>
                    </div>
                  </div>

                  {/* Publish As */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                      <span className="text-red-400">*</span>Publish As
                    </Label>
                    <Select value={selectedDoc.publishAs} onValueChange={v => updateDoc(selectedDoc.id, { publishAs: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Purchase", "Expense", "Bill", "Credit Note"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                      <span className="text-red-400">*</span>Status
                    </Label>
                    <Select value={selectedDoc.publishStatus} onValueChange={v => updateDoc(selectedDoc.id, { publishStatus: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Authorised", "Draft", "Submitted", "On Hold"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contact */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <ConfDot level={selectedDoc.confidence.supplierName} />Contact
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      value={selectedDoc.contact}
                      onChange={e => updateDoc(selectedDoc.id, { contact: e.target.value })}
                      placeholder="Supplier / Contact name"
                    />
                  </div>

                  {/* Line Items */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Line Items</Label>
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden h-8">
                      {(["single", "multiple"] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => updateDoc(selectedDoc.id, { lineItemsMode: mode })}
                          className={cn(
                            "flex-1 text-xs font-semibold capitalize transition-colors",
                            selectedDoc.lineItemsMode === mode
                              ? "bg-teal-600 text-white"
                              : "bg-white text-gray-500 hover:bg-gray-50"
                          )}
                        >
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Account Code */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Account Code</Label>
                    <Select value={selectedDoc.accountCode} onValueChange={v => updateDoc(selectedDoc.id, { accountCode: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["200 - Purchases", "210 - Tools & Equipment", "220 - Accessories", "230 - Import Costs", "240 - Office Supplies"].map(v => (
                          <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Department */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Department</Label>
                    <Select value={selectedDoc.department} onValueChange={v => updateDoc(selectedDoc.id, { department: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Operations", "Inventory", "Import", "Repair", "Finance", "Admin"].map(v => (
                          <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Description</Label>
                    <Textarea
                      className="text-xs resize-none"
                      rows={2}
                      value={selectedDoc.description}
                      onChange={e => updateDoc(selectedDoc.id, { description: e.target.value })}
                      placeholder="Brief description…"
                    />
                  </div>

                  {/* Invoice details read-only summary */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1.5 text-xs">
                    <p className="font-black text-gray-400 uppercase text-[10px] tracking-widest mb-2">Extracted Data</p>
                    {[
                      { icon: <Hash className="w-3 h-3" />, label: "Invoice #", val: selectedDoc.invoiceNumber, conf: "invoiceNumber" },
                      { icon: <Building2 className="w-3 h-3" />, label: "Supplier", val: selectedDoc.supplierName, conf: "supplierName" },
                      { icon: <CreditCard className="w-3 h-3" />, label: "Bill Date", val: selectedDoc.billDate, conf: "billDate" },
                      { icon: <DollarSign className="w-3 h-3" />, label: "Total", val: `${sym(selectedDoc)}${selectedDoc.total.toFixed(2)}`, conf: "total" },
                    ].map(({ icon, label, val, conf }) => (
                      <div key={label} className="flex items-center gap-2 text-gray-600">
                        <span className="text-gray-400">{icon}</span>
                        <span className="text-gray-400 w-16 shrink-0">{label}</span>
                        <span className="font-semibold text-gray-800 flex-1 truncate">{val}</span>
                        <ConfDot level={selectedDoc.confidence[conf]} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Publish button */}
                <div className="px-4 py-4 border-t border-gray-200 shrink-0">
                  <Button
                    className={cn(
                      "w-full font-bold text-sm",
                      selectedDoc.status === "published"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-teal-600 hover:bg-teal-500"
                    )}
                    disabled={selectedDoc.status === "processing"}
                    onClick={handlePublish}
                  >
                    {selectedDoc.status === "published" ? (
                      <><CheckCircle2 className="w-4 h-4 mr-1.5" />Published to PO</>
                    ) : (
                      "Publish"
                    )}
                  </Button>
                  {selectedDoc.status !== "published" && (
                    <button onClick={handleArchive} className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1.5 py-1">
                      <Archive className="w-3.5 h-3.5" />Archive this document
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                <Receipt className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-semibold">Select a document</p>
                <p className="text-xs mt-1">Choose from the list to review and publish</p>
              </div>
            )}
          </div>

        </div>{/* end three-column */}
      </DialogContent>
    </Dialog>
  );
}