import { useState, useMemo } from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  Search, Plus, Eye, Check, X, DollarSign, Clock, CheckCircle,
  XCircle, Download, RotateCcw, BarChart3, Microscope, Tag,
  TrendingDown, MessageSquare, Printer, ShieldCheck, Ban,
  ThumbsUp, ThumbsDown, FileText, Package, AlertTriangle,
  Wrench, Archive, Trash2, ChevronRight, CheckCircle2,
  PackageX, ArrowRightLeft, CircleOff, Recycle, BadgeAlert,
  PieChart as PieIcon, History, Filter, Layers, Info,
} from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/app/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/app/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/app/components/ui/select";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { cn } from "@/app/components/ui/utils";
import { format } from "date-fns";
import {
  ReturnNote, ReturnLineItem, ReturnReason, ReturnStatus,
  Invoice, DamagedProduct, DamagedCondition, DamagedDisposition,
} from "@/app/types";
import { toast } from "sonner";

// ─── Local types ──────────────────────────────────────────────────────────────
type ItemCondition = "like_new" | "good" | "fair" | "damaged" | "scrap";
type ResolutionType = "refund" | "exchange" | "store_credit" | "repair" | "credit_note";

interface InspectionEntry {
  id: string;
  returnId: string;
  returnNumber: string;
  productName: string;
  productSku: string;
  productId: string;
  quantity: number;
  condition: ItemCondition;
  inspectionNotes: string;
  inspectorName: string;
  inspectedAt: Date;
  restorable: boolean;
  unitValue: number;
  category: string;
  returnReason: string;
  customerName: string;
  stockUpdated: boolean;
  damagedLogged: boolean;
}

interface ReturnComment {
  id: string;
  returnId: string;
  author: string;
  message: string;
  createdAt: Date;
}

// ─── Config maps ──────────────────────────────────────────────────────────────
const COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899"];

const conditionConfig: Record<ItemCondition,{label:string; color:string; bg:string; stockable:boolean}> = {
  like_new: { label:"Like New", color:"text-emerald-700", bg:"bg-emerald-100 border-emerald-300", stockable:true  },
  good:     { label:"Good",     color:"text-blue-700",    bg:"bg-blue-100 border-blue-300",       stockable:true  },
  fair:     { label:"Fair",     color:"text-amber-700",   bg:"bg-amber-100 border-amber-300",     stockable:true  },
  damaged:  { label:"Damaged",  color:"text-orange-700",  bg:"bg-orange-100 border-orange-300",   stockable:false },
  scrap:    { label:"Scrap",    color:"text-red-700",     bg:"bg-red-100 border-red-300",         stockable:false },
};

const statusConfig: Record<ReturnStatus,{label:string; bg:string; icon:React.ElementType}> = {
  pending:   { label:"Pending",   bg:"bg-amber-500",   icon:Clock       },
  approved:  { label:"Approved",  bg:"bg-blue-500",    icon:ThumbsUp    },
  rejected:  { label:"Rejected",  bg:"bg-red-500",     icon:ThumbsDown  },
  completed: { label:"Completed", bg:"bg-emerald-500", icon:CheckCircle },
  cancelled: { label:"Cancelled", bg:"bg-gray-400",    icon:Ban         },
};

const dispositionConfig: Record<DamagedDisposition,{label:string; bg:string; icon:React.ElementType}> = {
  pending:    { label:"Pending Assessment", bg:"bg-amber-500",  icon:Clock        },
  repair:     { label:"Repaired & Restocked",bg:"bg-blue-500",  icon:Wrench       },
  write_off:  { label:"Written Off",         bg:"bg-red-500",   icon:CircleOff    },
  sell_as_is: { label:"Sold As-Is",          bg:"bg-purple-500",icon:ArrowRightLeft},
  disposed:   { label:"Disposed",            bg:"bg-gray-500",  icon:Recycle      },
};

const reasonLabels: Record<string,string> = {
  defective:"Defective", wrong_item:"Wrong Item", not_as_described:"Not as Described",
  customer_request:"Customer Request", damaged:"Damaged", expired:"Expired", other:"Other",
};

// seed comments
const seedComments: ReturnComment[] = [
  { id:"c1", returnId:"ret1", author:"Admin", message:"Customer confirmed drop damage. Approved for partial refund.", createdAt:new Date("2026-01-18T10:30:00") },
  { id:"c2", returnId:"ret2", author:"Tech B", message:"Screen protector was installed incorrectly.", createdAt:new Date("2026-01-25T14:00:00") },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function ReturnManagementView() {
  const {
    returnNotes, invoices, products,
    createReturnNote, updateReturnNote,
    updateProductStock,
    damagedProducts, addDamagedProduct, updateDamagedProduct, deleteDamagedProduct,
  } = usePOS();

  const [activeTab,      setActiveTab]      = useState("returns");
  const [searchTerm,     setSearchTerm]     = useState("");
  const [statusFilter,   setStatusFilter]   = useState<string>("all");
  const [reasonFilter,   setReasonFilter]   = useState<string>("all");
  const [selectedReturn, setSelectedReturn] = useState<ReturnNote | null>(null);
  const [inspections,    setInspections]    = useState<InspectionEntry[]>([]);
  const [comments,       setComments]       = useState<ReturnComment[]>(seedComments);

  // Dialogs
  const [showCreateDialog,   setShowCreateDialog]   = useState(false);
  const [showDetailDialog,   setShowDetailDialog]   = useState(false);
  const [showInspectDialog,  setShowInspectDialog]  = useState(false);
  const [showRejectDialog,   setShowRejectDialog]   = useState(false);
  const [showDisposalDialog, setShowDisposalDialog] = useState(false);
  const [showRepairDialog,   setShowRepairDialog]   = useState(false);
  const [selectedDamaged,    setSelectedDamaged]    = useState<DamagedProduct | null>(null);

  // Create return form
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [returnLineItems, setReturnLineItems] = useState<ReturnLineItem[]>([]);
  const [returnReason,    setReturnReason]    = useState<ReturnReason>("customer_request");
  const [restockItems,    setRestockItems]    = useState(true);
  const [restockingFee,   setRestockingFee]   = useState(0);
  const [refundMethod,    setRefundMethod]    = useState("original_payment");
  const [resolutionType,  setResolutionType]  = useState<ResolutionType>("refund");
  const [notes,           setNotes]           = useState("");
  const [newComment,      setNewComment]      = useState("");
  const [rejectReason,    setRejectReason]    = useState("");

  // Inspection form
  const [inspectForm, setInspectForm] = useState<{
    returnId:string; returnNumber:string; productName:string; productSku:string;
    productId:string; quantity:number; condition:ItemCondition; inspectionNotes:string;
    inspectorName:string; restorable:boolean; unitValue:number; category:string;
    returnReason:string; customerName:string;
  }>({
    returnId:"", returnNumber:"", productName:"", productSku:"", productId:"",
    quantity:1, condition:"good", inspectionNotes:"", inspectorName:"Admin",
    restorable:true, unitValue:0, category:"", returnReason:"", customerName:"",
  });

  // Disposal / repair form
  const [disposalForm, setDisposalForm] = useState({ disposition:"write_off" as DamagedDisposition, notes:"", salePrice:"" });
  const [repairQty,    setRepairQty]    = useState("1");

  // Damaged stock filters
  const [damSearchTerm,   setDamSearchTerm]   = useState("");
  const [damDispFilter,   setDamDispFilter]   = useState("all");
  const [damCondFilter,   setDamCondFilter]   = useState("all");

  // ─── Derived ──────────────────────────────────────────────────────────────
  const filteredReturns = useMemo(() => returnNotes.filter(r => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || r.returnNumber.toLowerCase().includes(q) ||
      r.invoiceNumber.toLowerCase().includes(q) || r.customer.name.toLowerCase().includes(q);
    return matchSearch &&
      (statusFilter === "all" || r.status === statusFilter) &&
      (reasonFilter === "all" || r.reason === reasonFilter);
  }), [returnNotes, searchTerm, statusFilter, reasonFilter]);

  const filteredDamaged = useMemo(() => damagedProducts.filter(d => {
    const q = damSearchTerm.toLowerCase();
    const matchSearch = !q || d.productName.toLowerCase().includes(q) ||
      d.productSku.toLowerCase().includes(q) || d.sourceReturnNumber.toLowerCase().includes(q);
    return matchSearch &&
      (damDispFilter === "all" || d.disposition === damDispFilter) &&
      (damCondFilter === "all" || d.condition === damCondFilter);
  }), [damagedProducts, damSearchTerm, damDispFilter, damCondFilter]);

  const stats = useMemo(() => ({
    total:       returnNotes.length,
    pending:     returnNotes.filter(r => r.status === "pending").length,
    approved:    returnNotes.filter(r => r.status === "approved").length,
    completed:   returnNotes.filter(r => r.status === "completed").length,
    rejected:    returnNotes.filter(r => r.status === "rejected").length,
    totalRefund: returnNotes.filter(r => r.status === "completed").reduce((s, r) => s + r.netRefund, 0),
  }), [returnNotes]);

  const damStats = useMemo(() => ({
    total:      damagedProducts.length,
    pending:    damagedProducts.filter(d => d.disposition === "pending").length,
    scrap:      damagedProducts.filter(d => d.condition === "scrap").length,
    totalValue: damagedProducts.reduce((s, d) => s + d.totalValue, 0),
    writeOffValue: damagedProducts.filter(d => d.disposition === "write_off").reduce((s, d) => s + d.totalValue, 0),
    repaired:   damagedProducts.filter(d => d.disposition === "repair").length,
  }), [damagedProducts]);

  // Charts
  const reasonChartData = useMemo(() => {
    const counts: Record<string,number> = {};
    returnNotes.forEach(r => { counts[r.reason] = (counts[r.reason] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: reasonLabels[name] || name, value }));
  }, [returnNotes]);

  const damagedByCondition = useMemo(() => {
    const cond = { damaged: 0, scrap: 0 };
    damagedProducts.forEach(d => { cond[d.condition]++; });
    return [
      { name: "Damaged", value: cond.damaged, fill: "#f97316" },
      { name: "Scrap",   value: cond.scrap,   fill: "#ef4444" },
    ].filter(x => x.value > 0);
  }, [damagedProducts]);

  const damagedByDisposition = useMemo(() => {
    const map: Record<string,number> = {};
    damagedProducts.forEach(d => { map[d.disposition] = (map[d.disposition] || 0) + 1; });
    return Object.entries(map).map(([key, value]) => ({
      name: dispositionConfig[key as DamagedDisposition]?.label || key, value,
    }));
  }, [damagedProducts]);

  // Refund calc
  const returnCalc = useMemo(() => {
    const sub = returnLineItems.reduce((s, i) => s + i.totalRefund, 0);
    const tax = sub * 0.20;
    return { sub, tax, total: sub + tax, net: sub + tax - restockingFee };
  }, [returnLineItems, restockingFee]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: ReturnStatus }) => {
    const cfg = statusConfig[status];
    const Icon = cfg.icon;
    return <Badge className={cn("gap-1 text-white text-[10px]", cfg.bg)}><Icon className="w-3 h-3" />{cfg.label}</Badge>;
  };

  const CondBadge = ({ c }: { c: ItemCondition }) => {
    const cfg = conditionConfig[c];
    return <Badge className={cn("border text-xs font-medium", cfg.bg, cfg.color)}>{cfg.label}</Badge>;
  };

  const DispBadge = ({ d }: { d: DamagedDisposition }) => {
    const cfg = dispositionConfig[d];
    const Icon = cfg.icon;
    return <Badge className={cn("gap-1 text-white text-[10px]", cfg.bg)}><Icon className="w-3 h-3" />{cfg.label}</Badge>;
  };

  // ─── Create return ────────────────────────────────────────────────────────
  const openCreate = () => {
    setSelectedInvoice(null); setReturnLineItems([]); setReturnReason("customer_request");
    setRestockItems(true); setRestockingFee(0); setRefundMethod("original_payment");
    setResolutionType("refund"); setNotes(""); setShowCreateDialog(true);
  };

  const selectInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setReturnLineItems(inv.lineItems.map(item => ({
      id: `ri-${Date.now()}-${Math.random()}`,
      invoiceLineItemId: item.id,
      productId: item.productId || "",
      productName: item.description,
      productSku: products.find(p => p.id === item.productId)?.sku || "",
      quantityReturned: 0,
      quantityInvoiced: item.quantity,
      unitPrice: item.unitPrice,
      totalRefund: 0,
      reason: returnReason,
    })));
  };

  const updateLineItem = (idx: number, field: keyof ReturnLineItem, value: any) => {
    setReturnLineItems(prev => {
      const items = [...prev];
      const item = { ...items[idx] };
      if (field === "quantityReturned") item.quantityReturned = Math.min(Math.max(0, value), item.quantityInvoiced);
      else (item as any)[field] = value;
      item.totalRefund = item.quantityReturned * item.unitPrice;
      items[idx] = item;
      return items;
    });
  };

  const handleCreate = () => {
    if (!selectedInvoice) { toast.error("Select an invoice"); return; }
    const items = returnLineItems.filter(i => i.quantityReturned > 0);
    if (!items.length) { toast.error("Add at least one item to return"); return; }
    createReturnNote({
      returnNumber: `RN-${String(returnNotes.length + 1).padStart(4, "0")}`,
      invoiceId: selectedInvoice.id,
      invoiceNumber: selectedInvoice.invoiceNumber,
      customer: selectedInvoice.customer,
      lineItems: items,
      subtotalRefund: returnCalc.sub,
      taxRefund: returnCalc.tax,
      totalRefund: returnCalc.total,
      restockingFee,
      netRefund: returnCalc.net,
      status: "pending",
      reason: returnReason,
      notes,
      refundMethod,
      restockItems,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    toast.success("Return note created"); setShowCreateDialog(false);
  };

  // ─── Workflow ─────────────────────────────────────────────────────────────
  const approveReturn = (r: ReturnNote) => {
    updateReturnNote(r.id, { status: "approved", updatedAt: new Date() });
    toast.success("Return approved — ready for inspection");
  };

  const completeReturn = (r: ReturnNote) => {
    updateReturnNote(r.id, { status: "completed", processedDate: new Date(), updatedAt: new Date() });
    toast.success("Return completed");
  };

  const rejectReturn = () => {
    if (!selectedReturn) return;
    updateReturnNote(selectedReturn.id, { status: "rejected", updatedAt: new Date() });
    addComment(selectedReturn.id, `Rejected: ${rejectReason || "No reason provided"}`);
    setShowRejectDialog(false); setRejectReason("");
    toast.success("Return rejected");
  };

  // ─── Comments ─────────────────────────────────────────────────────────────
  const addComment = (returnId: string, msg: string) => {
    if (!msg.trim()) return;
    setComments(prev => [...prev, { id: `c${Date.now()}`, returnId, author: "Admin", message: msg, createdAt: new Date() }]);
    setNewComment("");
  };
  const returnComments = (returnId: string) => comments.filter(c => c.returnId === returnId);

  // ─── Inspection with smart routing ───────────────────────────────────────
  const openInspect = (r: ReturnNote) => {
    setSelectedReturn(r);
    const firstItem = r.lineItems[0];
    const prod = firstItem ? products.find(p => p.id === firstItem.productId) : null;
    setInspectForm({
      returnId: r.id,
      returnNumber: r.returnNumber,
      productName: firstItem?.productName || "",
      productSku: firstItem?.productSku || "",
      productId: firstItem?.productId || "",
      quantity: firstItem?.quantityReturned || 1,
      condition: "good",
      inspectionNotes: "",
      inspectorName: "Admin",
      restorable: true,
      unitValue: firstItem?.unitPrice || 0,
      category: prod?.category || "",
      returnReason: r.reason,
      customerName: r.customer.name,
    });
    setShowInspectDialog(true);
  };

  /**
   * KEY LOGIC:
   * - Condition is like_new / good / fair  →  restock to main inventory
   * - Condition is damaged / scrap         →  log to Damaged Products database
   * The `restorable` toggle lets staff override: a "fair" item marked not restorable
   * still goes to damaged DB.
   */
  const submitInspection = () => {
    const { condition, restorable, quantity, productId, unitValue } = inspectForm;
    const isGoodCondition = conditionConfig[condition].stockable;
    const goesToStock = isGoodCondition && restorable;

    if (goesToStock) {
      // ── Restock to main inventory ──
      const product = products.find(p => p.id === productId);
      if (product) {
        updateProductStock(product.id, product.stock + quantity);
      }
      const entry: InspectionEntry = {
        ...inspectForm,
        id: `ins${Date.now()}`,
        inspectedAt: new Date(),
        stockUpdated: true,
        damagedLogged: false,
      };
      setInspections(prev => [...prev, entry]);
      toast.success(
        `✅ ${quantity} unit(s) of "${inspectForm.productName}" restocked to main inventory`,
        { description: `Condition: ${conditionConfig[condition].label}` }
      );
    } else {
      // ── Log to Damaged Products database ──
      const damagedEntry: Omit<DamagedProduct, "id"> = {
        productId,
        productName: inspectForm.productName,
        productSku: inspectForm.productSku,
        category: inspectForm.category,
        quantity,
        condition: (condition === "damaged" || condition === "scrap") ? condition : "damaged",
        sourceReturnId: inspectForm.returnId,
        sourceReturnNumber: inspectForm.returnNumber,
        customerName: inspectForm.customerName,
        returnReason: inspectForm.returnReason,
        unitValue,
        totalValue: unitValue * quantity,
        disposition: "pending",
        dispositionNotes: inspectForm.inspectionNotes || undefined,
        damagedAt: new Date(),
      };
      addDamagedProduct(damagedEntry);
      const entry: InspectionEntry = {
        ...inspectForm,
        id: `ins${Date.now()}`,
        inspectedAt: new Date(),
        stockUpdated: false,
        damagedLogged: true,
      };
      setInspections(prev => [...prev, entry]);
      toast.warning(
        `⚠️ ${quantity} unit(s) logged to Damaged Stock database`,
        { description: `Condition: ${conditionConfig[condition].label} — not restocked` }
      );
    }

    setShowInspectDialog(false);
  };

  // ─── Damaged stock actions ────────────────────────────────────────────────
  const openDisposal = (d: DamagedProduct) => {
    setSelectedDamaged(d);
    setDisposalForm({ disposition: "write_off", notes: "", salePrice: "" });
    setShowDisposalDialog(true);
  };

  const openRepair = (d: DamagedProduct) => {
    setSelectedDamaged(d);
    setRepairQty("1");
    setShowRepairDialog(true);
  };

  const applyDisposal = () => {
    if (!selectedDamaged) return;
    updateDamagedProduct(selectedDamaged.id, {
      disposition: disposalForm.disposition,
      dispositionNotes: disposalForm.notes || undefined,
      resolvedAt: new Date(),
      resolvedBy: "Admin",
    });
    const label = dispositionConfig[disposalForm.disposition]?.label;
    toast.success(`Item marked as: ${label}`);
    setShowDisposalDialog(false);
  };

  const applyRepair = () => {
    if (!selectedDamaged) return;
    const qty = parseInt(repairQty) || 0;
    if (qty <= 0 || qty > selectedDamaged.quantity) {
      toast.error(`Enter a valid quantity (1–${selectedDamaged.quantity})`);
      return;
    }
    // Add repaired qty back to main stock
    const product = products.find(p => p.id === selectedDamaged.productId);
    if (product) {
      updateProductStock(product.id, product.stock + qty);
    }
    const remaining = selectedDamaged.quantity - qty;
    if (remaining <= 0) {
      // All repaired — mark as repair
      updateDamagedProduct(selectedDamaged.id, {
        disposition: "repair",
        dispositionNotes: `${qty} unit(s) repaired and restocked`,
        resolvedAt: new Date(), resolvedBy: "Admin",
      });
    } else {
      // Partial repair — update quantity
      updateDamagedProduct(selectedDamaged.id, {
        quantity: remaining,
        totalValue: selectedDamaged.unitValue * remaining,
        dispositionNotes: `${qty} unit(s) repaired and restocked. ${remaining} remaining.`,
      });
    }
    toast.success(`✅ ${qty} unit(s) repaired & restocked to main stock`);
    setShowRepairDialog(false);
  };

  const exportDamagedCSV = () => {
    const header = "ID,Product,SKU,Category,Qty,Condition,Source Return,Customer,Reason,Unit Value,Total Value,Disposition,Date";
    const rows = filteredDamaged.map(d =>
      `"${d.id}","${d.productName}","${d.productSku}","${d.category}",${d.quantity},"${d.condition}","${d.sourceReturnNumber}","${d.customerName}","${d.returnReason}",${d.unitValue.toFixed(2)},${d.totalValue.toFixed(2)},"${d.disposition}","${format(new Date(d.damagedAt), "yyyy-MM-dd")}"`);
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "damaged-stock.csv"; a.click();
    toast.success(`Exported ${filteredDamaged.length} records`);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RotateCcw className="w-7 h-7 text-orange-600" />Return Management
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Smart routing: good returns → stock · damaged/scrap → damage database
          </p>
        </div>
        <Button size="sm" className="gap-1.5 bg-orange-600 hover:bg-orange-700" onClick={openCreate}>
          <Plus className="w-4 h-4" />Create Return
        </Button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label:"Total Returns",  value:stats.total,                        color:"gray",   icon:<RotateCcw className="w-4 h-4"/>   },
          { label:"Pending",        value:stats.pending,                      color:"amber",  icon:<Clock className="w-4 h-4"/>       },
          { label:"Completed",      value:stats.completed,                    color:"green",  icon:<CheckCircle className="w-4 h-4"/> },
          { label:"Total Refunded", value:`£${stats.totalRefund.toFixed(0)}`, color:"red",    icon:<DollarSign className="w-4 h-4"/>  },
          { label:"Damaged Items",  value:damStats.total,                     color:"orange", icon:<PackageX className="w-4 h-4"/>    },
          { label:"Damage Value",   value:`£${damStats.totalValue.toFixed(0)}`,color:"purple",icon:<BadgeAlert className="w-4 h-4"/> },
        ].map(({ label, value, color, icon }) => (
          <Card key={label} className={`border-l-4 border-l-${color}-500`}>
            <CardContent className="p-3">
              <div className={`flex items-center gap-1 text-[10px] font-medium text-${color}-600 mb-1`}>{icon}{label}</div>
              <div className={`text-xl font-bold text-${color}-600`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="returns"    className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" />Returns List</TabsTrigger>
          <TabsTrigger value="inspection" className="gap-1.5 relative">
            <Microscope className="w-3.5 h-3.5" />Inspection Queue
            {stats.approved > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[9px] rounded-full flex items-center justify-center">{stats.approved}</span>}
          </TabsTrigger>
          <TabsTrigger value="damaged"    className="gap-1.5 relative">
            <PackageX className="w-3.5 h-3.5" />Damaged Stock
            {damStats.pending > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[9px] rounded-full flex items-center justify-center">{damStats.pending}</span>}
          </TabsTrigger>
          <TabsTrigger value="analytics"  className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Analytics</TabsTrigger>
          <TabsTrigger value="log"        className="gap-1.5"><History className="w-3.5 h-3.5" />Inspection Log</TabsTrigger>
        </TabsList>

        {/* ──────────── RETURNS LIST ──────────────────────────────── */}
        <TabsContent value="returns" className="space-y-4">
          <Card><CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search return #, invoice, customer…" value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  {Object.entries(reasonLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-500 ml-auto">{filteredReturns.length} results</span>
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Return #</TableHead><TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead><TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead><TableHead className="text-right">Net Refund</TableHead>
                  <TableHead>Status</TableHead><TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-gray-400">
                    <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-40" />No returns found
                  </TableCell></TableRow>
                )}
                {filteredReturns.map(r => (
                  <TableRow key={r.id} className={cn(r.status === "pending" ? "bg-amber-50/40" : r.status === "rejected" ? "bg-red-50/30" : "")}>
                    <TableCell className="font-mono font-bold text-sm">{r.returnNumber}</TableCell>
                    <TableCell className="font-mono text-xs">{r.invoiceNumber}</TableCell>
                    <TableCell className="font-medium text-sm">{r.customer.name}</TableCell>
                    <TableCell className="text-xs text-gray-600">{format(new Date(r.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{reasonLabels[r.reason] || r.reason}</Badge></TableCell>
                    <TableCell className="text-right font-bold text-red-600">£{r.netRefund.toFixed(2)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button size="sm" variant="ghost" title="View" onClick={() => { setSelectedReturn(r); setShowDetailDialog(true); }}>
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                        </Button>
                        {r.status === "pending" && <>
                          <Button size="sm" variant="ghost" title="Approve" onClick={() => approveReturn(r)}>
                            <ThumbsUp className="w-3.5 h-3.5 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Reject" onClick={() => { setSelectedReturn(r); setShowRejectDialog(true); }}>
                            <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </>}
                        {r.status === "approved" && <>
                          <Button size="sm" variant="ghost" title="Inspect & Route" onClick={() => openInspect(r)}>
                            <Microscope className="w-3.5 h-3.5 text-purple-600" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Complete" onClick={() => completeReturn(r)}>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          </Button>
                        </>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ──────────── INSPECTION QUEUE ─────────────────────────── */}
        <TabsContent value="inspection" className="space-y-4">
          {/* Routing explanation banner */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800">
              <strong>Smart Inspection Routing:</strong>
              <span className="ml-1">After inspection, items in <span className="font-semibold text-emerald-700">Like New / Good / Fair</span> condition are automatically restocked to the main inventory. Items in <span className="font-semibold text-red-700">Damaged / Scrap</span> condition (or manually marked non-restorable) are logged to the <span className="font-semibold">Damaged Stock database</span> for further action.</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {returnNotes.filter(r => r.status === "approved").map(r => (
              <Card key={r.id} className="border-2 border-blue-200 hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm font-mono">{r.returnNumber}</div>
                      <div className="text-xs text-gray-500">{r.customer.name}</div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-1.5"><FileText className="w-3 h-3 text-gray-400" />Invoice: <span className="font-mono">{r.invoiceNumber}</span></div>
                    <div className="flex items-center gap-1.5"><Tag className="w-3 h-3 text-gray-400" />Reason: {reasonLabels[r.reason] || r.reason}</div>
                    <div className="flex items-center gap-1.5"><Package className="w-3 h-3 text-gray-400" />{r.lineItems.length} item(s) to inspect</div>
                  </div>
                  <div className="space-y-1.5">
                    {r.lineItems.map(item => {
                      const inspected = inspections.find(x => x.returnId === r.id && x.productSku === item.productSku);
                      return (
                        <div key={item.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg p-2">
                          <span className="truncate font-medium max-w-[140px]">{item.productName}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="outline" className="text-[9px] px-1">{item.quantityReturned} units</Badge>
                            {inspected ? (
                              inspected.stockUpdated
                                ? <Badge className="bg-emerald-500 text-white text-[9px] px-1">Restocked ✓</Badge>
                                : <Badge className="bg-orange-500 text-white text-[9px] px-1">In Damage DB</Badge>
                            ) : <Badge className="bg-amber-400 text-white text-[9px] px-1">Pending</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700" onClick={() => openInspect(r)}>
                      <Microscope className="w-3 h-3" />Inspect & Route
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1 border-green-400 text-green-700 hover:bg-green-50" onClick={() => completeReturn(r)}>
                      <CheckCircle className="w-3 h-3" />Complete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {returnNotes.filter(r => r.status === "approved").length === 0 && (
              <div className="col-span-full text-center py-16 text-gray-400">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No items awaiting inspection</p>
                <p className="text-sm">Approve a return to start the inspection process</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ──────────── DAMAGED STOCK DATABASE ───────────────────── */}
        <TabsContent value="damaged" className="space-y-4">

          {/* Damaged KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label:"Total Damaged",    value:damStats.total,                         color:"orange", icon:<PackageX className="w-4 h-4"/>   },
              { label:"Pending Action",   value:damStats.pending,                       color:"amber",  icon:<Clock className="w-4 h-4"/>      },
              { label:"Scrap Items",      value:damStats.scrap,                         color:"red",    icon:<Trash2 className="w-4 h-4"/>     },
              { label:"Total Value",      value:`£${damStats.totalValue.toFixed(0)}`,   color:"purple", icon:<DollarSign className="w-4 h-4"/> },
              { label:"Written Off",      value:`£${damStats.writeOffValue.toFixed(0)}`,color:"red",    icon:<CircleOff className="w-4 h-4"/>  },
              { label:"Repaired",         value:damStats.repaired,                      color:"green",  icon:<Wrench className="w-4 h-4"/>     },
            ].map(({ label, value, color, icon }) => (
              <Card key={label} className={`border-l-4 border-l-${color}-500`}>
                <CardContent className="p-3">
                  <div className={`flex items-center gap-1 text-[10px] font-medium text-${color}-600 mb-1`}>{icon}{label}</div>
                  <div className={`text-xl font-bold text-${color}-600`}>{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters + Export */}
          <Card><CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search product, SKU, return #…" value={damSearchTerm}
                  onChange={e => setDamSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={damCondFilter} onValueChange={setDamCondFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Condition" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conditions</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="scrap">Scrap</SelectItem>
                </SelectContent>
              </Select>
              <Select value={damDispFilter} onValueChange={setDamDispFilter}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Disposition" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dispositions</SelectItem>
                  {Object.entries(dispositionConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={exportDamagedCSV}>
                <Download className="w-4 h-4" />Export CSV
              </Button>
              <span className="text-xs text-gray-500 ml-auto">{filteredDamaged.length} records</span>
            </div>
          </CardContent></Card>

          {/* Damaged products table */}
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-red-50">
                  <TableHead>Product</TableHead><TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead><TableHead className="text-center">Qty</TableHead>
                  <TableHead>Condition</TableHead><TableHead>Source Return</TableHead>
                  <TableHead>Customer</TableHead><TableHead>Date</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Disposition</TableHead><TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDamaged.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center py-12 text-gray-400">
                    <PackageX className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    No damaged stock records
                    <p className="text-xs mt-1">Items flagged during inspection will appear here</p>
                  </TableCell></TableRow>
                )}
                {filteredDamaged.map(d => (
                  <TableRow key={d.id} className={cn(
                    d.disposition === "pending" ? "bg-orange-50/50" :
                    d.disposition === "write_off" ? "bg-red-50/30" :
                    d.disposition === "repair" ? "bg-green-50/30" : ""
                  )}>
                    <TableCell className="font-medium text-sm">{d.productName}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{d.productSku}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{d.category || "—"}</Badge></TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("text-white", d.condition === "scrap" ? "bg-red-500" : "bg-orange-500")}>{d.quantity}</Badge>
                    </TableCell>
                    <TableCell>
                      <CondBadge c={d.condition as ItemCondition} />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-orange-700">{d.sourceReturnNumber}</TableCell>
                    <TableCell className="text-sm">{d.customerName}</TableCell>
                    <TableCell className="text-xs text-gray-500">{format(new Date(d.damagedAt), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">£{d.totalValue.toFixed(2)}</TableCell>
                    <TableCell><DispBadge d={d.disposition} /></TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        {d.disposition === "pending" && <>
                          <Button size="sm" variant="ghost" title="Repair & Restock" onClick={() => openRepair(d)}
                            className="text-blue-600 hover:bg-blue-50">
                            <Wrench className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Set Disposition" onClick={() => openDisposal(d)}
                            className="text-orange-600 hover:bg-orange-50">
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                        </>}
                        {d.resolvedAt && (
                          <span className="text-[10px] text-gray-400 italic px-1">
                            {format(new Date(d.resolvedAt), "MMM d")}
                          </span>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteDamagedProduct(d.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>

          {/* Damage DB summary cards */}
          {damagedProducts.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><PieIcon className="w-4 h-4 text-orange-600" />Damaged by Condition</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={damagedByCondition} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                        dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false} fontSize={11}>
                        {damagedByCondition.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-purple-600" />Disposition Status</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={damagedByDisposition} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Items">
                        {damagedByDisposition.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ──────────── ANALYTICS ────────────────────────────────── */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Returns by Reason</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={reasonChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                      dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false} fontSize={10}>
                      {reasonChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Returns by Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={Object.entries(statusConfig).map(([k, v]) => ({ name: v.label, count: returnNotes.filter(r => r.status === k).length }))} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Count">
                      {Object.keys(statusConfig).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            {/* Most returned products */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4 text-orange-600" />Most Returned Products</CardTitle></CardHeader>
              <CardContent>
                {(() => {
                  const counts: Record<string, { name: string; count: number }> = {};
                  returnNotes.forEach(r => r.lineItems.forEach(i => {
                    if (!counts[i.productId]) counts[i.productId] = { name: i.productName, count: 0 };
                    counts[i.productId].count += i.quantityReturned;
                  }));
                  const sorted = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 8);
                  if (!sorted.length) return <p className="text-sm text-gray-400 text-center py-4">No data yet</p>;
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      {sorted.map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                            <span className="text-sm font-medium truncate max-w-[200px]">{item.name}</span>
                          </div>
                          <Badge className="bg-orange-500 text-white">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ──────────── INSPECTION LOG ────────────────────────────── */}
        <TabsContent value="log" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="w-5 h-5 text-gray-600" />Inspection Records</CardTitle>
              <CardDescription>All inspections with routing outcome — green = restocked, orange = damage DB</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Return #</TableHead><TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead><TableHead className="text-center">Qty</TableHead>
                    <TableHead>Condition</TableHead><TableHead>Routed To</TableHead>
                    <TableHead>Inspector</TableHead><TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map(ins => (
                    <TableRow key={ins.id} className={ins.stockUpdated ? "bg-emerald-50/40" : "bg-orange-50/40"}>
                      <TableCell className="font-mono font-semibold text-xs">{ins.returnNumber}</TableCell>
                      <TableCell className="font-medium text-sm">{ins.productName}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{ins.productSku}</TableCell>
                      <TableCell className="text-center font-semibold">{ins.quantity}</TableCell>
                      <TableCell><CondBadge c={ins.condition} /></TableCell>
                      <TableCell>
                        {ins.stockUpdated
                          ? <Badge className="bg-emerald-500 text-white gap-1 text-[10px]"><Layers className="w-3 h-3" />Main Stock</Badge>
                          : <Badge className="bg-orange-500 text-white gap-1 text-[10px]"><PackageX className="w-3 h-3" />Damage DB</Badge>}
                      </TableCell>
                      <TableCell className="text-sm">{ins.inspectorName}</TableCell>
                      <TableCell className="text-xs text-gray-500">{format(new Date(ins.inspectedAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-xs text-gray-600 max-w-48 truncate">{ins.inspectionNotes || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {!inspections.length && (
                    <TableRow><TableCell colSpan={9} className="text-center py-10 text-gray-400">No inspection records yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ════ CREATE RETURN DIALOG ════════════════════════════════════ */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-orange-600" />Create Return Note</DialogTitle>
            <DialogDescription>Select an invoice and specify items being returned</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {!selectedInvoice ? (
              <div>
                <Label className="mb-2 block">Select Invoice</Label>
                <div className="border rounded-xl max-h-80 overflow-y-auto">
                  {invoices.filter(inv => ["paid", "partially_paid"].includes(inv.status)).map(inv => (
                    <div key={inv.id} className="p-4 border-b last:border-0 hover:bg-blue-50 cursor-pointer" onClick={() => selectInvoice(inv)}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono font-semibold text-blue-700">{inv.invoiceNumber}</p>
                          <p className="text-sm font-medium">{inv.customer.name}</p>
                          <p className="text-xs text-gray-500">{format(new Date(inv.issueDate), "MMM dd, yyyy")}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">£{inv.total.toFixed(2)}</p>
                          <Badge variant="outline">{inv.lineItems.length} items</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between items-start">
                  <div>
                    <p className="font-mono font-bold text-blue-800">{selectedInvoice.invoiceNumber}</p>
                    <p className="text-sm text-blue-700">{selectedInvoice.customer.name}</p>
                    <p className="text-xs text-blue-600">Total: £{selectedInvoice.total.toFixed(2)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedInvoice(null)}>Change</Button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Return Reason</Label>
                    <Select value={returnReason} onValueChange={v => setReturnReason(v as ReturnReason)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(reasonLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Refund Method</Label>
                    <Select value={refundMethod} onValueChange={setRefundMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["cash","card","store_credit","credit_note","exchange","original_payment"].map(m =>
                          <SelectItem key={m} value={m}>{m.replace(/_/g," ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Resolution</Label>
                    <Select value={resolutionType} onValueChange={v => setResolutionType(v as ResolutionType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[["refund","Cash Refund"],["exchange","Exchange"],["store_credit","Store Credit"],["credit_note","Credit Note"],["repair","Repair & Return"]].map(([k,l]) =>
                          <SelectItem key={k} value={k}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Items to Return</Label>
                  <div className="border rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Product</TableHead><TableHead>SKU</TableHead>
                          <TableHead className="text-center">Invoiced</TableHead>
                          <TableHead className="text-center w-28">Return Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Refund</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {returnLineItems.map((item, i) => (
                          <TableRow key={item.id} className={item.quantityReturned > 0 ? "bg-orange-50" : ""}>
                            <TableCell className="font-medium text-sm">{item.productName}</TableCell>
                            <TableCell className="font-mono text-xs text-gray-500">{item.productSku}</TableCell>
                            <TableCell className="text-center">{item.quantityInvoiced}</TableCell>
                            <TableCell>
                              <Input type="number" min={0} max={item.quantityInvoiced} value={item.quantityReturned}
                                onChange={e => updateLineItem(i, "quantityReturned", parseInt(e.target.value) || 0)}
                                className="w-24 h-8 text-center text-sm" />
                            </TableCell>
                            <TableCell className="text-right text-sm">£{item.unitPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-bold text-orange-600">£{item.totalRefund.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 border rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span><span>£{returnCalc.sub.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">VAT (20%):</span><span>£{returnCalc.tax.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-gray-600">Restocking Fee:</span>
                      <Input type="number" min={0} step={0.01} value={restockingFee}
                        onChange={e => setRestockingFee(parseFloat(e.target.value) || 0)} className="w-28 h-7 text-right text-sm" />
                    </div>
                    <div className="flex justify-between text-base font-bold border-t pt-2">
                      <span>Net Refund:</span><span className="text-orange-600">£{returnCalc.net.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Checkbox id="restock" checked={restockItems} onCheckedChange={v => setRestockItems(!!v)} />
                      <Label htmlFor="restock" className="cursor-pointer text-sm">Restock on completion (via inspection)</Label>
                    </div>
                    <Textarea placeholder="Notes…" value={notes} rows={3} onChange={e => setNotes(e.target.value)} />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            {selectedInvoice && <Button onClick={handleCreate} className="bg-orange-600 hover:bg-orange-700">Create Return Note</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ DETAIL DIALOG ══════════════════════════════════════════ */}
      <Dialog open={showDetailDialog} onOpenChange={() => setShowDetailDialog(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><FileText className="w-5 h-5 text-orange-600" />{selectedReturn?.returnNumber}</span>
              {selectedReturn && <StatusBadge status={selectedReturn.status} />}
            </DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-xl p-4">
                {[
                  { l:"Customer",  v:selectedReturn.customer.name },
                  { l:"Invoice",   v:selectedReturn.invoiceNumber },
                  { l:"Date",      v:format(new Date(selectedReturn.createdAt), "MMM d, yyyy") },
                  { l:"Reason",    v:reasonLabels[selectedReturn.reason] || selectedReturn.reason },
                  { l:"Refund Method", v:selectedReturn.refundMethod?.replace(/_/g," ") || "—" },
                  { l:"Restock",   v:selectedReturn.restockItems ? "Yes" : "No" },
                ].map(({ l, v }) => (
                  <div key={l}><p className="text-xs text-gray-500">{l}</p><p className="font-semibold text-sm">{v}</p></div>
                ))}
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead className="text-center">Returned</TableHead><TableHead className="text-right">Refund</TableHead></TableRow></TableHeader>
                <TableBody>
                  {selectedReturn.lineItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="font-mono text-xs">{item.productSku}</TableCell>
                      <TableCell className="text-center">{item.quantityReturned}</TableCell>
                      <TableCell className="text-right font-semibold text-orange-600">£{item.totalRefund.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>£{selectedReturn.subtotalRefund.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>VAT</span><span>£{selectedReturn.taxRefund.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Restocking Fee</span><span>-£{selectedReturn.restockingFee.toFixed(2)}</span></div>
                <div className="flex justify-between text-base font-bold border-t pt-2"><span>Net Refund</span><span className="text-orange-600">£{selectedReturn.netRefund.toFixed(2)}</span></div>
              </div>
              {/* Comments */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-blue-600" />Comments ({returnComments(selectedReturn.id).length})</Label>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {returnComments(selectedReturn.id).map(c => (
                    <div key={c.id} className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
                      <div className="flex justify-between mb-1"><span className="font-semibold text-blue-800">{c.author}</span><span className="text-xs text-gray-400">{format(new Date(c.createdAt), "MMM d, h:mm a")}</span></div>
                      <p className="text-gray-700">{c.message}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Add a comment…" value={newComment} onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && selectedReturn) addComment(selectedReturn.id, newComment); }}
                    className="h-8 text-sm" />
                  <Button size="sm" className="h-8" onClick={() => selectedReturn && addComment(selectedReturn.id, newComment)} disabled={!newComment.trim()}>
                    <MessageSquare className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Close</Button>
            {selectedReturn?.status === "pending" && <>
              <Button variant="outline" className="gap-1.5 border-green-400 text-green-700" onClick={() => { approveReturn(selectedReturn!); setShowDetailDialog(false); }}>
                <ThumbsUp className="w-4 h-4" />Approve
              </Button>
              <Button variant="outline" className="gap-1.5 border-red-400 text-red-700" onClick={() => { setShowDetailDialog(false); setShowRejectDialog(true); }}>
                <ThumbsDown className="w-4 h-4" />Reject
              </Button>
            </>}
            {selectedReturn?.status === "approved" && <>
              <Button variant="outline" className="gap-1.5 border-purple-400 text-purple-700" onClick={() => { setShowDetailDialog(false); if (selectedReturn) openInspect(selectedReturn); }}>
                <Microscope className="w-4 h-4" />Inspect & Route
              </Button>
              <Button className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => { completeReturn(selectedReturn!); setShowDetailDialog(false); }}>
                <CheckCircle className="w-4 h-4" />Complete
              </Button>
            </>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ REJECT DIALOG ══════════════════════════════════════════ */}
      <Dialog open={showRejectDialog} onOpenChange={() => setShowRejectDialog(false)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2"><ThumbsDown className="w-5 h-5" />Reject Return</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Rejection Reason</Label>
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {["outside_return_window","item_not_eligible","customer_damage","missing_receipt","partial_return_only","other"].map(r =>
                    <SelectItem key={r} value={r}>{r.replace(/_/g," ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Additional notes…" rows={2} value={rejectReason.startsWith("other") ? rejectReason.slice(5) : ""}
              onChange={e => setRejectReason("other: " + e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={rejectReturn}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ INSPECTION DIALOG ══════════════════════════════════════ */}
      <Dialog open={showInspectDialog} onOpenChange={() => setShowInspectDialog(false)}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Microscope className="w-5 h-5 text-purple-600" />Inspect & Route — {inspectForm.returnNumber}</DialogTitle>
            <DialogDescription>Set condition to auto-route: good items go to stock, damaged items go to the Damaged Stock database.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Product Name</Label>
                <Input value={inspectForm.productName} onChange={e => setInspectForm(s => ({ ...s, productName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">SKU</Label>
                <Input value={inspectForm.productSku} onChange={e => setInspectForm(s => ({ ...s, productSku: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quantity Returned</Label>
                <Input type="number" min={1} value={inspectForm.quantity}
                  onChange={e => setInspectForm(s => ({ ...s, quantity: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit Sale Value (£)</Label>
                <Input type="number" step={0.01} min={0} value={inspectForm.unitValue}
                  onChange={e => setInspectForm(s => ({ ...s, unitValue: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Inspector</Label>
                <Input value={inspectForm.inspectorName} onChange={e => setInspectForm(s => ({ ...s, inspectorName: e.target.value }))} />
              </div>
            </div>

            {/* Condition selector with routing hint */}
            <div className="space-y-2">
              <Label className="text-xs">Item Condition</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.entries(conditionConfig) as [ItemCondition, typeof conditionConfig[ItemCondition]][]).map(([key, cfg]) => (
                  <button key={key} type="button"
                    className={cn("p-2 rounded-lg border-2 text-xs font-medium text-center transition-all",
                      inspectForm.condition === key
                        ? cn(cfg.bg, "ring-2 ring-offset-1 ring-purple-500")
                        : "border-gray-200 hover:border-gray-300 bg-white")}
                    onClick={() => setInspectForm(s => ({ ...s, condition: key, restorable: cfg.stockable }))}>
                    {cfg.label}
                  </button>
                ))}
              </div>
              {/* Routing preview */}
              <div className={cn("rounded-lg p-3 text-sm flex items-center gap-2 border",
                conditionConfig[inspectForm.condition].stockable && inspectForm.restorable
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-orange-50 border-orange-300 text-orange-800")}>
                {conditionConfig[inspectForm.condition].stockable && inspectForm.restorable
                  ? <><Layers className="w-4 h-4 shrink-0" /><span><strong>Will be restocked</strong> — added back to main inventory</span></>
                  : <><PackageX className="w-4 h-4 shrink-0" /><span><strong>Will be logged to Damaged Stock database</strong> — not restocked</span></>}
              </div>
            </div>

            {/* Restorable override */}
            <div className={cn("flex items-start gap-3 p-3 rounded-lg border",
              conditionConfig[inspectForm.condition].stockable ? "bg-blue-50 border-blue-200" : "bg-gray-100 border-gray-200 opacity-60")}>
              <Checkbox id="restorable" checked={inspectForm.restorable}
                onCheckedChange={v => setInspectForm(s => ({ ...s, restorable: !!v }))}
                disabled={!conditionConfig[inspectForm.condition].stockable} />
              <div>
                <Label htmlFor="restorable" className="cursor-pointer text-sm font-medium">Item can be restocked</Label>
                <p className="text-xs text-gray-500 mt-0.5">Uncheck to send a "fair" condition item to the damage database instead of stock</p>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Inspection Notes</Label>
              <Textarea placeholder="Describe condition in detail…" rows={2} value={inspectForm.inspectionNotes}
                onChange={e => setInspectForm(s => ({ ...s, inspectionNotes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInspectDialog(false)}>Cancel</Button>
            <Button onClick={submitInspection}
              className={cn("gap-1.5", conditionConfig[inspectForm.condition].stockable && inspectForm.restorable
                ? "bg-emerald-600 hover:bg-emerald-700" : "bg-orange-600 hover:bg-orange-700")}>
              {conditionConfig[inspectForm.condition].stockable && inspectForm.restorable
                ? <><Layers className="w-4 h-4" />Restock to Inventory</>
                : <><PackageX className="w-4 h-4" />Log to Damage Database</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ REPAIR DIALOG ══════════════════════════════════════════ */}
      <Dialog open={showRepairDialog} onOpenChange={() => setShowRepairDialog(false)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700"><Wrench className="w-5 h-5" />Repair & Restock</DialogTitle>
            <DialogDescription>How many units of <strong>{selectedDamaged?.productName}</strong> have been successfully repaired?</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 space-y-1">
              <div className="flex justify-between"><span>In Damage DB:</span><span className="font-bold">{selectedDamaged?.quantity} unit(s)</span></div>
              <div className="flex justify-between"><span>Condition:</span><span className="capitalize">{selectedDamaged?.condition}</span></div>
              <div className="flex justify-between"><span>Unit Value:</span><span>£{selectedDamaged?.unitValue.toFixed(2)}</span></div>
            </div>
            <div className="space-y-1">
              <Label>Units Repaired (max {selectedDamaged?.quantity})</Label>
              <Input type="number" min={1} max={selectedDamaged?.quantity} value={repairQty}
                onChange={e => setRepairQty(e.target.value)} className="text-center text-lg font-bold" />
            </div>
            <p className="text-xs text-gray-500">These units will be added back to the main product stock. Remaining units stay in the damage database.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRepairDialog(false)}>Cancel</Button>
            <Button onClick={applyRepair} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
              <Wrench className="w-4 h-4" />Confirm Repair & Restock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ DISPOSAL DIALOG ════════════════════════════════════════ */}
      <Dialog open={showDisposalDialog} onOpenChange={() => setShowDisposalDialog(false)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700"><Archive className="w-5 h-5" />Set Disposition</DialogTitle>
            <DialogDescription>Decide what happens to <strong>{selectedDamaged?.productName}</strong> ({selectedDamaged?.quantity} unit(s))</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(["write_off","sell_as_is","disposed"] as DamagedDisposition[]).map(d => {
                const cfg = dispositionConfig[d];
                const Icon = cfg.icon;
                return (
                  <button key={d} type="button"
                    className={cn("p-3 rounded-xl border-2 text-sm text-left transition-all flex items-start gap-2",
                      disposalForm.disposition === d
                        ? "border-orange-500 bg-orange-50 text-orange-800"
                        : "border-gray-200 hover:border-gray-300 bg-white text-gray-700")}
                    onClick={() => setDisposalForm(f => ({ ...f, disposition: d }))}>
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="font-medium">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Disposition Notes</Label>
              <Textarea placeholder="Add notes…" rows={2} value={disposalForm.notes}
                onChange={e => setDisposalForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisposalDialog(false)}>Cancel</Button>
            <Button onClick={applyDisposal} className="bg-orange-600 hover:bg-orange-700 gap-1.5">
              <CheckCircle2 className="w-4 h-4" />Apply Disposition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
