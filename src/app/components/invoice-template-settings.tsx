import { useState, useEffect } from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  Settings, Plus, Edit, Trash2, Check, Copy, Eye, FileText,
  Palette, Globe, Store, Smartphone, ChevronRight, ChevronLeft, Star,
  MapPin, User, CreditCard, QrCode, Download, Mail, Phone,
  Package, Zap, Shield, X, Save, RefreshCw, Image as ImageIcon,
  ExternalLink, Layers, Hash, PoundSterling, Type, Layout,
  CheckCircle2, AlertCircle, MonitorSmartphone, Wifi, Building2,
  Link, Receipt, LayoutGrid,
} from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/app/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/app/components/ui/select";
import { Switch } from "@/app/components/ui/switch";
import { cn } from "@/app/components/ui/utils";
import { InvoiceTemplate } from "@/app/types";
import { toast } from "sonner";

// ─── Channel types ────────────────────────────────────────────────────────────
type ChannelType = "website" | "offline" | "app";

const CHANNELS: {
  id: ChannelType; label: string; desc: string;
  icon: React.ElementType; grad: string; accentBg: string;
  accentText: string; border: string; prefix: string;
  tagline: string;
}[] = [
  {
    id: "website", label: "Website Order",
    desc: "For orders placed via www.bnmparts.com",
    icon: Globe,
    grad: "from-blue-600 to-indigo-600",
    accentBg: "bg-blue-50", accentText: "text-blue-700",
    border: "border-blue-200",
    prefix: "WEB",
    tagline: "E-commerce · Online Checkout · Storefront",
  },
  {
    id: "offline", label: "Offline Order",
    desc: "For in-store / POS / walk-in sales",
    icon: Store,
    grad: "from-emerald-600 to-teal-600",
    accentBg: "bg-emerald-50", accentText: "text-emerald-700",
    border: "border-emerald-200",
    prefix: "POS",
    tagline: "In-Store · Walk-in · Counter Sales",
  },
  {
    id: "app", label: "App Order",
    desc: "For orders placed through the BNM Parts app",
    icon: Smartphone,
    grad: "from-violet-600 to-purple-600",
    accentBg: "bg-violet-50", accentText: "text-violet-700",
    border: "border-violet-200",
    prefix: "APP",
    tagline: "Mobile App · iOS · Android",
  },
];

// ─── Extended form type ───────────────────────────────────────────────────────
interface ExtendedTemplateForm extends Partial<InvoiceTemplate> {
  channelType?: ChannelType;
  showOrderTracking?: boolean;
  trackingUrl?: string;
  showQRCode?: boolean;
  websiteUrl?: string;
  showDeliveryAddress?: boolean;
  showStoreLocation?: boolean;
  storeLocation?: string;
  showStaffName?: boolean;
  showPaymentMethod?: boolean;
  thermalMode?: boolean;
  showReturnPolicy?: boolean;
  returnPolicyText?: string;
  appName?: string;
  appVersion?: string;
  showAppBadges?: boolean;
  appStoreUrl?: string;
  playStoreUrl?: string;
  showPushReference?: boolean;
  appIconUrl?: string;
}

// ─── Blank form factory ───────────────────────────────────────────────────────
function blankForm(channel: ChannelType): ExtendedTemplateForm {
  const ch = CHANNELS.find(c => c.id === channel)!;
  return {
    channelType: channel,
    name: "",
    isDefault: false,
    companyName: "BNM Parts",
    companyLogoUrl: "",
    companyAddress: "123 Parts Lane, London, E1 6RF",
    companyPhone: "+44 20 1234 5678",
    companyEmail: channel === "website" ? "orders@bnmparts.com" : channel === "app" ? "app@bnmparts.com" : "store@bnmparts.com",
    companyWebsite: "www.bnmparts.com",
    companyTaxId: "GB123456789",
    primaryColor: channel === "website" ? "#2563eb" : channel === "offline" ? "#059669" : "#7c3aed",
    secondaryColor: "#64748b",
    fontFamily: "Arial",
    showLogo: true,
    showCompanyDetails: true,
    showTaxColumn: true,
    showDiscountColumn: true,
    showProductSku: true,
    headerText: "",
    footerText: channel === "website" ? "Thank you for your online order! Track at www.bnmparts.com/track"
      : channel === "offline" ? "Thank you for shopping at BNM Parts. Keep this receipt for returns."
      : "Thank you for ordering via the BNM Parts App. Rated ⭐⭐⭐⭐⭐",
    defaultTermsAndConditions: "Payment is due within the specified period. All sales subject to availability.",
    defaultNotes: "",
    currencySymbol: "£",
    currencyPosition: "before",
    decimalPlaces: 2,
    invoicePrefix: ch.prefix,
    invoiceNumberLength: 6,
    showOrderTracking: channel === "website",
    trackingUrl: "https://www.bnmparts.com/track",
    showQRCode: channel === "website" || channel === "app",
    websiteUrl: "www.bnmparts.com",
    showDeliveryAddress: channel === "website",
    showStoreLocation: channel === "offline",
    storeLocation: "123 Parts Lane, London, E1 6RF",
    showStaffName: channel === "offline",
    showPaymentMethod: channel === "offline",
    thermalMode: false,
    showReturnPolicy: channel === "offline",
    returnPolicyText: "Returns accepted within 30 days with receipt.",
    appName: "BNM Parts App",
    appVersion: "2.4.0",
    showAppBadges: channel === "app",
    appStoreUrl: "https://apps.apple.com/bnmparts",
    playStoreUrl: "https://play.google.com/store/bnmparts",
    showPushReference: channel === "app",
    appIconUrl: "",
  };
}

// ─── Mini invoice preview ─────────────────────────────────────────────────────
function TemplatePreviewCard({ form, channel }: { form: ExtendedTemplateForm; channel: ChannelType }) {
  const ch = CHANNELS.find(c => c.id === channel)!;
  const ChIcon = ch.icon;
  const primary = form.primaryColor || "#2563eb";
  const prefix = form.invoicePrefix || ch.prefix;
  const len = form.invoiceNumberLength || 6;
  const sampleNo = `${prefix}-${"0".repeat(len - 1)}1`;
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm" style={{ fontFamily: form.fontFamily || "Arial" }}>
      <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${primary}18, ${primary}08)`, borderBottom: `2px solid ${primary}30` }}>
        <div className="flex items-start justify-between">
          <div>
            {form.showLogo && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                style={{ background: `linear-gradient(135deg, ${primary}, ${primary}cc)` }}>
                <ChIcon className="w-4 h-4 text-white" />
              </div>
            )}
            <p className="font-bold text-gray-900 text-sm">{form.companyName || "BNM Parts"}</p>
            {form.showCompanyDetails && (
              <p className="text-[10px] text-gray-500 mt-0.5">{form.companyAddress?.split(",")[0]}</p>
            )}
          </div>
          <div className="text-right">
            <p className="font-bold text-sm" style={{ color: primary }}>INVOICE</p>
            <p className="text-[10px] text-gray-500 font-mono">{sampleNo}</p>
            <p className="text-[10px] text-gray-400">{today}</p>
            <div className={cn("inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1", ch.accentBg, ch.accentText)}>
              <ChIcon className="w-2.5 h-2.5" />{ch.label}
            </div>
          </div>
        </div>
      </div>
      {channel === "website" && form.showOrderTracking && (
        <div className="px-5 py-1.5 bg-blue-50 border-b border-blue-100 flex items-center gap-1.5">
          <Globe className="w-2.5 h-2.5 text-blue-500" />
          <span className="text-[9px] text-blue-600">Online order · Track: {form.trackingUrl || "www.bnmparts.com/track"}</span>
        </div>
      )}
      {channel === "offline" && form.showStoreLocation && (
        <div className="px-5 py-1.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-1.5">
          <MapPin className="w-2.5 h-2.5 text-emerald-500" />
          <span className="text-[9px] text-emerald-600">In-store · {form.storeLocation?.split(",")[0]}</span>
        </div>
      )}
      {channel === "app" && form.showPushReference && (
        <div className="px-5 py-1.5 bg-violet-50 border-b border-violet-100 flex items-center gap-1.5">
          <Smartphone className="w-2.5 h-2.5 text-violet-500" />
          <span className="text-[9px] text-violet-600">{form.appName || "BNM Parts App"} · v{form.appVersion || "2.4.0"}</span>
        </div>
      )}
      <div className="px-5 py-3">
        <div className="rounded-lg overflow-hidden border border-gray-100">
          <div className="grid grid-cols-3 gap-0 px-2 py-1 text-[9px] font-bold uppercase text-gray-400"
            style={{ background: `${primary}12` }}>
            <span>Item</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Total</span>
          </div>
          {[["Sample Product", "2", "£29.98"], ["Accessory Pack", "1", "£9.99"]].map(([name, qty, total]) => (
            <div key={name} className="grid grid-cols-3 gap-0 px-2 py-1 border-t border-gray-50 text-[9px] text-gray-700">
              <span className="truncate">{name}</span>
              <span className="text-center">{qty}</span>
              <span className="text-right font-semibold">{total}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 space-y-0.5">
          <div className="flex justify-between text-[9px] text-gray-500"><span>Subtotal</span><span>£39.97</span></div>
          {form.showTaxColumn && <div className="flex justify-between text-[9px] text-gray-500"><span>VAT 20%</span><span>£7.99</span></div>}
          <div className="flex justify-between text-[9px] font-bold mt-1 pt-1 border-t border-gray-200"
            style={{ color: primary }}><span>Total</span><span>£47.96</span></div>
        </div>
      </div>
      {(channel === "website" || channel === "app") && form.showQRCode && (
        <div className="px-5 pb-3 flex items-center gap-2">
          <div className="w-10 h-10 border-2 rounded flex items-center justify-center shrink-0" style={{ borderColor: primary }}>
            <QrCode className="w-6 h-6" style={{ color: primary }} />
          </div>
          <p className="text-[9px] text-gray-400">Scan to {channel === "app" ? "download app" : "track order"}</p>
        </div>
      )}
      <div className="px-5 py-2.5 border-t bg-gray-50">
        <p className="text-[9px] text-gray-400 text-center leading-relaxed line-clamp-2">
          {form.footerText || "Thank you for your business!"}
        </p>
        {channel === "app" && form.showAppBadges && (
          <div className="flex gap-1.5 justify-center mt-1.5">
            {["App Store", "Google Play"].map(s => (
              <div key={s} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-900 text-[8px] text-white">
                <Download className="w-2 h-2" />{s}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { id: "company", label: "Company",  icon: Building2 },
  { id: "design",  label: "Design",   icon: Palette   },
  { id: "layout",  label: "Layout",   icon: LayoutGrid},
  { id: "content", label: "Content",  icon: FileText  },
  { id: "channel", label: "Channel",  icon: Globe     },
] as const;
type StepId = typeof STEPS[number]["id"];

// ─── Colour presets ───────────────────────────────────────────────────────────
const COLOR_PRESETS = [
  { label: "Ocean",   p: "#2563eb", s: "#64748b" },
  { label: "Forest",  p: "#059669", s: "#64748b" },
  { label: "Royal",   p: "#7c3aed", s: "#a78bfa" },
  { label: "Crimson", p: "#e11d48", s: "#64748b" },
  { label: "Amber",   p: "#d97706", s: "#64748b" },
  { label: "Slate",   p: "#334155", s: "#94a3b8" },
  { label: "Navy",    p: "#1e3a5f", s: "#64748b" },
  { label: "Teal",    p: "#0d9488", s: "#64748b" },
];

// ─── Shared section card ──────────────────────────────────────────────────────
function SectionCard({ title, description, icon: Icon, children, accentClass = "bg-gray-50" }: {
  title: string; description?: string; icon?: React.ElementType;
  children: React.ReactNode; accentClass?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className={cn("flex items-center gap-3 px-4 py-3 border-b border-gray-100", accentClass)}>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center shrink-0 border border-white shadow-sm">
            <Icon className="w-3.5 h-3.5 text-gray-600" />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-gray-800 leading-tight">{title}</p>
          {description && <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────
function ToggleRow({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800 leading-tight">{label}</p>
        {description && <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0" />
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, hint, required, children, className }: {
  label: string; hint?: string; required?: boolean;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function InvoiceTemplateSettings() {
  const {
    invoiceTemplates, createInvoiceTemplate, updateInvoiceTemplate,
    deleteInvoiceTemplate, setDefaultTemplate,
  } = usePOS();

  const [activeChannel, setActiveChannel] = useState<ChannelType>("website");
  const [showEditor, setShowEditor]       = useState(false);
  const [isNew, setIsNew]                 = useState(true);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [form, setForm]                   = useState<ExtendedTemplateForm>(blankForm("website"));
  const [editorStep, setEditorStep]       = useState<StepId>("company");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [showPreview, setShowPreview]     = useState(false);
  const [previewForm, setPreviewForm]     = useState<ExtendedTemplateForm | null>(null);
  const [previewChannel, setPreviewChannel] = useState<ChannelType>("website");
  // mobile: toggle between form and preview
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  const F = (key: keyof ExtendedTemplateForm, val: any) =>
    setForm(f => ({ ...f, [key]: val }));

  // ── Init default templates ──────────────────────────────────────────────────
  useEffect(() => {
    if (invoiceTemplates.length === 0) {
      (["website", "offline", "app"] as ChannelType[]).forEach(ch => {
        const f = blankForm(ch);
        const c = CHANNELS.find(x => x.id === ch)!;
        createInvoiceTemplate({
          name: `${c.label} — Default`,
          isDefault: ch === "website",
          companyName: f.companyName!, companyLogoUrl: f.companyLogoUrl!,
          companyAddress: f.companyAddress!, companyPhone: f.companyPhone!,
          companyEmail: f.companyEmail!, companyWebsite: f.companyWebsite!,
          companyTaxId: f.companyTaxId!, primaryColor: f.primaryColor!,
          secondaryColor: f.secondaryColor!, fontFamily: f.fontFamily!,
          showLogo: true, showCompanyDetails: true, showTaxColumn: true,
          showDiscountColumn: true, showProductSku: true,
          headerText: f.headerText!, footerText: f.footerText!,
          defaultTermsAndConditions: f.defaultTermsAndConditions!,
          defaultNotes: "", currencySymbol: "£", currencyPosition: "before",
          decimalPlaces: 2, invoicePrefix: c.prefix, invoiceNumberLength: 6,
        } as any);
      });
    }
  }, []);

  const templatesByChannel = (ch: ChannelType) => {
    const prefix = CHANNELS.find(c => c.id === ch)!.prefix;
    return invoiceTemplates.filter(t => (t.invoicePrefix || "").startsWith(prefix) || (t as any).channelType === ch);
  };

  const activeTemplates = templatesByChannel(activeChannel);
  const activeCh = CHANNELS.find(c => c.id === activeChannel)!;

  const openNew = (ch: ChannelType) => {
    setIsNew(true); setEditingId(null);
    setForm(blankForm(ch)); setEditorStep("company");
    setShowMobilePreview(false); setShowEditor(true);
  };

  const openEdit = (t: InvoiceTemplate) => {
    const ch = CHANNELS.find(c => t.invoicePrefix?.startsWith(c.prefix))?.id ?? activeChannel;
    setIsNew(false); setEditingId(t.id);
    setForm({ ...blankForm(ch as ChannelType), ...t, channelType: ch as ChannelType });
    setEditorStep("company"); setShowMobilePreview(false); setShowEditor(true);
  };

  const handleSave = () => {
    if (!form.name?.trim())        { toast.error("Template name is required"); setEditorStep("company"); return; }
    if (!form.companyName?.trim()) { toast.error("Company name is required");  setEditorStep("company"); return; }
    const payload = { ...form } as any;
    if (isNew) { createInvoiceTemplate(payload); toast.success("Template created"); }
    else       { updateInvoiceTemplate(editingId!, payload); toast.success("Template updated"); }
    setShowEditor(false);
  };

  const confirmDelete = (id: string) => {
    const t = invoiceTemplates.find(x => x.id === id);
    if (t?.isDefault) { toast.error("Cannot delete the default template"); return; }
    setDeleteId(id); setShowDeleteDialog(true);
  };

  const handleDuplicate = (t: InvoiceTemplate) => {
    const ch = CHANNELS.find(c => t.invoicePrefix?.startsWith(c.prefix))?.id ?? activeChannel;
    const dup = { ...t, name: `${t.name} (Copy)`, isDefault: false } as any;
    delete dup.id; delete dup.createdAt; delete dup.updatedAt;
    createInvoiceTemplate(dup);
    toast.success("Template duplicated");
  };

  // ── Step index helpers ────────────────────────────────────────────────────
  const stepIndex = STEPS.findIndex(s => s.id === editorStep);
  const canGoBack = stepIndex > 0;
  const canGoNext = stepIndex < STEPS.length - 1;
  const editorCh  = CHANNELS.find(c => c.id === form.channelType) ?? CHANNELS[0];

  return (
    <div className="p-6 space-y-6 mx-auto">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-blue-600" />
            Invoice Templates
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage separate invoice designs for each sales channel
          </p>
        </div>
        <Button onClick={() => openNew(activeChannel)} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" />New Template
        </Button>
      </div>

      {/* ── Channel cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {CHANNELS.map(ch => {
          const Icon = ch.icon;
          const count = templatesByChannel(ch.id).length;
          const isActive = activeChannel === ch.id;
          const defaultTpl = templatesByChannel(ch.id).find(t => t.isDefault);
          return (
            <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
              className={cn(
                "relative text-left rounded-2xl border-2 p-5 transition-all duration-200 group hover:shadow-md",
                isActive ? `${ch.border} shadow-md bg-white` : "border-gray-200 bg-white hover:border-gray-300"
              )}>
              <div className={cn("absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r", ch.grad)} />
              <div className="flex items-start justify-between mb-3 mt-1">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br text-white", ch.grad)}>
                  <Icon className="w-5 h-5" />
                </div>
                {isActive && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />}
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-0.5">{ch.label}</h3>
              <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">{ch.tagline}</p>
              <div className="flex items-center justify-between">
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", ch.accentBg, ch.accentText)}>
                  {count} template{count !== 1 ? "s" : ""}
                </span>
                {defaultTpl && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />Default set
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Active channel section ───────────────────────────────────────────── */}
      <div>
        <div className={cn("flex items-center justify-between rounded-xl p-4 mb-4 border", activeCh.accentBg, activeCh.border)}>
          <div className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br text-white", activeCh.grad)}>
              <activeCh.icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className={cn("font-bold text-sm", activeCh.accentText)}>{activeCh.label} Templates</h3>
              <p className="text-[11px] text-gray-500">{activeCh.desc} · Prefix: {activeCh.prefix}-XXXXXX</p>
            </div>
          </div>
          <Button size="sm" onClick={() => openNew(activeChannel)}
            className={cn("gap-1.5 text-xs h-8 bg-gradient-to-r text-white border-0", activeCh.grad)}>
            <Plus className="w-3.5 h-3.5" />Add Template
          </Button>
        </div>

        {activeTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white mb-4", activeCh.grad)}>
              <activeCh.icon className="w-7 h-7" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">No {activeCh.label} templates yet</p>
            <p className="text-sm text-gray-400 mb-4">Create your first template for this channel</p>
            <Button size="sm" onClick={() => openNew(activeChannel)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />Create Template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {activeTemplates.map(t => (
              <TemplateCard
                key={t.id} template={t} channel={activeChannel}
                onEdit={() => openEdit(t)}
                onDuplicate={() => handleDuplicate(t)}
                onDelete={() => confirmDelete(t.id)}
                onSetDefault={() => { setDefaultTemplate(t.id); toast.success("Default updated"); }}
                onPreview={() => {
                  const ch = CHANNELS.find(c => t.invoicePrefix?.startsWith(c.prefix))?.id ?? activeChannel;
                  setPreviewForm({ ...blankForm(ch as ChannelType), ...t });
                  setPreviewChannel(ch as ChannelType);
                  setShowPreview(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          EDITOR DIALOG — responsive
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showEditor} onOpenChange={v => !v && setShowEditor(false)}>

        {/* ── ONLY THIS DialogContent changed for responsiveness ── */}
        <DialogContent className={cn(
          // mobile: full screen
          "w-full max-w-none h-[100dvh] rounded-none",
          // desktop: constrained modal
          "sm:max-w-5xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl",
          // shared
          "overflow-hidden flex flex-col p-0 gap-0",
          "[&>button:last-child]:text-white [&>button:last-child]:top-4 [&>button:last-child]:right-5 [&>button:last-child]:opacity-80 [&>button:last-child]:hover:opacity-100",
        )}>

          {/* ── Header bar ─────────────────────────────────────────────────── */}
          <div className={cn(
            "relative flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 shrink-0 bg-gradient-to-r text-white",
            editorCh.grad
          )}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <editorCh.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-sm sm:text-base leading-tight truncate">
                {isNew ? "New Invoice Template" : `Edit: ${form.name || "Untitled"}`}
              </h2>
              <p className="text-xs text-white/70 mt-0.5 hidden sm:block">
                {editorCh.label} Channel · {editorCh.prefix}-XXXXXX
              </p>
            </div>
            {/* Default toggle — keep exactly as you had it, just push left of the X */}
            <label className="mr-7 sm:mr-8 flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 cursor-pointer select-none shrink-0">
              <Switch
                checked={!!form.isDefault}
                onCheckedChange={v => F("isDefault", v)}
                className="data-[state=checked]:bg-yellow-400 data-[state=unchecked]:bg-white/30"
              />
              <span className="text-xs font-semibold text-white whitespace-nowrap hidden sm:inline">
                {form.isDefault ? "✦ Default template" : "Set as default"}
              </span>
            </label>
          </div>

          {/* ── Step nav ───────────────────────────────────────────────────── */}
          <div className="flex items-center border-b border-gray-200 bg-gray-50 px-1 sm:px-2 shrink-0 overflow-x-auto">
            {STEPS.map((s, i) => {
              const Icon   = s.id === "channel"
                ? (form.channelType === "website" ? Globe : form.channelType === "offline" ? Store : Smartphone)
                : s.icon;
              const active = editorStep === s.id;
              const done   = i < stepIndex;
              const label  = s.id === "channel"
                ? (form.channelType === "website" ? "Website" : form.channelType === "offline" ? "In-Store" : "App")
                : s.label;
              return (
                <button key={s.id} onClick={() => setEditorStep(s.id)}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all whitespace-nowrap border-b-2 -mb-px shrink-0",
                    active ? "border-blue-600 text-blue-600 bg-white"
                      : done  ? "border-transparent text-green-600 hover:text-gray-700 hover:border-gray-300"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}>
                  <div className={cn(
                    "w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold border shrink-0 transition-all",
                    active ? "bg-blue-600 border-blue-600 text-white"
                      : done  ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-300 text-gray-400"
                  )}>
                    {done ? <Check className="w-2.5 h-2.5" /> : i + 1}
                  </div>
                  <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  {/* desktop: always show label | mobile: only active */}
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{active ? label : ""}</span>
                </button>
              );
            })}
          </div>

          {/* ── Two-panel body ─────────────────────────────────────────────── */}
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* Left: form — hidden on mobile when preview is shown */}
            <div className={cn(
              "flex-1 overflow-y-auto p-4 sm:p-5 min-w-0 space-y-1",
              showMobilePreview ? "hidden sm:block" : "block",
            )}>

              {/* Step heading */}
              <div className="flex items-center gap-2 mb-4">
                {(() => {
                  const s    = STEPS.find(x => x.id === editorStep)!;
                  const Icon = editorStep === "channel"
                    ? (form.channelType === "website" ? Globe : form.channelType === "offline" ? Store : Smartphone)
                    : s.icon;
                  return (
                    <>
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br text-white shrink-0", editorCh.grad)}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {editorStep === "channel"
                            ? (form.channelType === "website" ? "Website Settings"
                              : form.channelType === "offline" ? "In-Store Settings" : "App Settings")
                            : s.label}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {editorStep === "company"  && "Your business identity shown on every invoice"}
                          {editorStep === "design"   && "Colours, font and visual style"}
                          {editorStep === "layout"   && "Columns, numbering and currency"}
                          {editorStep === "content"  && "Header, footer, notes and terms"}
                          {editorStep === "channel"  && "Settings specific to this sales channel"}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* ── STEP: Company ── */}
              {editorStep === "company" && (
                <div className="space-y-4">
                  <SectionCard title="Template Identity" description="Name this template for easy identification" icon={Receipt}>
                    <Field label="Template Name" required hint="e.g. 'Website — Modern Blue' or 'In-Store Receipt'">
                      <Input value={form.name || ""} onChange={e => F("name", e.target.value)}
                        placeholder="Give this template a descriptive name" className="h-9" />
                    </Field>
                  </SectionCard>

                  <SectionCard title="Business Information" description="Details printed on every invoice header" icon={Building2}>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Company Name" required className="col-span-2">
                        <Input value={form.companyName || ""} onChange={e => F("companyName", e.target.value)}
                          placeholder="BNM Parts Ltd" className="h-9" />
                      </Field>
                      <Field label="Phone">
                        <div className="relative">
                          <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          <Input value={form.companyPhone || ""} onChange={e => F("companyPhone", e.target.value)}
                            placeholder="+44 20 1234 5678" className="h-9 pl-8" />
                        </div>
                      </Field>
                      <Field label="Email">
                        <div className="relative">
                          <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          <Input type="email" value={form.companyEmail || ""} onChange={e => F("companyEmail", e.target.value)}
                            placeholder="orders@bnmparts.com" className="h-9 pl-8" />
                        </div>
                      </Field>
                      <Field label="Website">
                        <div className="relative">
                          <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          <Input value={form.companyWebsite || ""} onChange={e => F("companyWebsite", e.target.value)}
                            placeholder="www.bnmparts.com" className="h-9 pl-8" />
                        </div>
                      </Field>
                      <Field label="VAT / Tax ID">
                        <div className="relative">
                          <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          <Input value={form.companyTaxId || ""} onChange={e => F("companyTaxId", e.target.value)}
                            placeholder="GB123456789" className="h-9 pl-8" />
                        </div>
                      </Field>
                      <Field label="Business Address" className="col-span-2">
                        <div className="relative">
                          <MapPin className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                          <Textarea value={form.companyAddress || ""} onChange={e => F("companyAddress", e.target.value)}
                            placeholder="123 Parts Lane, London, E1 6RF" rows={2} className="pl-8 resize-none text-sm" />
                        </div>
                      </Field>
                    </div>
                  </SectionCard>

                  <SectionCard title="Branding" description="Logo displayed at the top of every invoice" icon={Package}>
                    <Field label="Logo URL" hint="Paste a public image URL (PNG or SVG recommended)">
                      <Input value={form.companyLogoUrl || ""} onChange={e => F("companyLogoUrl", e.target.value)}
                        placeholder="https://example.com/logo.png" className="h-9" />
                    </Field>
                    <ToggleRow label="Show Logo" description="Display company logo at the top of the invoice"
                      checked={!!form.showLogo} onChange={v => F("showLogo", v)} />
                    <ToggleRow label="Show Company Details" description="Print address, phone and email on the invoice"
                      checked={!!form.showCompanyDetails} onChange={v => F("showCompanyDetails", v)} />
                  </SectionCard>
                </div>
              )}

              {/* ── STEP: Design ── */}
              {editorStep === "design" && (
                <div className="space-y-4">
                  <SectionCard title="Brand Colours" description="Choose colours that match your brand identity" icon={Palette}>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Quick Presets</p>
                    <div className="grid grid-cols-4 gap-2">
                      {COLOR_PRESETS.map(preset => {
                        const active = form.primaryColor === preset.p;
                        return (
                          <button key={preset.label}
                            onClick={() => setForm(f => ({ ...f, primaryColor: preset.p, secondaryColor: preset.s }))}
                            className={cn(
                              "relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all text-xs font-medium",
                              active ? "border-gray-800 bg-gray-50 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-white"
                            )}>
                            <div className="w-8 h-8 rounded-lg shadow-sm" style={{ background: preset.p }} />
                            <span className="text-gray-600 text-[10px]">{preset.label}</span>
                            {active && (
                              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-800 rounded-full flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {[
                        { label: "Primary Colour",   key: "primaryColor" as const,   hint: "Headers, totals, accents" },
                        { label: "Secondary Colour", key: "secondaryColor" as const,  hint: "Labels, borders, muted text" },
                      ].map(({ label, key, hint }) => (
                        <Field key={key} label={label} hint={hint}>
                          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <input type="color" value={(form[key] as string) || "#2563eb"}
                              onChange={e => F(key, e.target.value)}
                              className="w-9 h-9 rounded-lg border-2 border-white shadow-sm cursor-pointer p-0.5 shrink-0" />
                            <Input value={(form[key] as string) || ""}
                              onChange={e => F(key, e.target.value)}
                              placeholder="#2563eb"
                              className="h-8 text-xs font-mono border-0 bg-transparent shadow-none focus-visible:ring-0 p-0" />
                          </div>
                        </Field>
                      ))}
                    </div>
                  </SectionCard>

                  <SectionCard title="Typography" description="Font applied to all text on the invoice" icon={Type}>
                    <Field label="Font Family">
                      <Select value={form.fontFamily || "Arial"} onValueChange={v => F("fontFamily", v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white">
                          {[
                            { value: "Arial",           label: "Arial — Clean & modern" },
                            { value: "Helvetica",       label: "Helvetica — Swiss precision" },
                            { value: "Times New Roman", label: "Times New Roman — Traditional" },
                            { value: "Georgia",         label: "Georgia — Elegant serif" },
                            { value: "Verdana",         label: "Verdana — Highly readable" },
                            { value: "Courier",         label: "Courier — Monospace receipt" },
                          ].map(f => (
                            <SelectItem key={f.value} value={f.value}>
                              <span style={{ fontFamily: f.value }}>{f.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </SectionCard>
                </div>
              )}

              {/* ── STEP: Layout ── */}
              {editorStep === "layout" && (
                <div className="space-y-4">
                  <SectionCard title="Line Item Columns"
                    description="Control which columns appear in the products table"
                    icon={LayoutGrid}>
                    <ToggleRow label="Tax Column" description="Show VAT/tax rate as a separate column next to each line item"
                      checked={!!form.showTaxColumn} onChange={v => F("showTaxColumn", v)} />
                    <ToggleRow label="Discount Column" description="Show discount percentage applied to each line item"
                      checked={!!form.showDiscountColumn} onChange={v => F("showDiscountColumn", v)} />
                    <ToggleRow label="Product SKU" description="Print the SKU/reference code below each product name"
                      checked={!!form.showProductSku} onChange={v => F("showProductSku", v)} />
                  </SectionCard>

                  <SectionCard title="Invoice Numbering"
                    description="Configure how invoice numbers are generated and formatted"
                    icon={Hash}>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Number Prefix" hint={`e.g. "WEB" → WEB-000001`}>
                        <Input value={form.invoicePrefix || ""} maxLength={6}
                          onChange={e => F("invoicePrefix", e.target.value.toUpperCase())}
                          placeholder="INV" className="h-9 font-mono uppercase" />
                      </Field>
                      <Field label="Digit Length" hint="Total digits in the number part">
                        <Select value={String(form.invoiceNumberLength || 6)}
                          onValueChange={v => F("invoiceNumberLength", parseInt(v))}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-white">
                            {[4,5,6,7,8].map(n => (
                              <SelectItem key={n} value={String(n)}>
                                <span className="font-mono">{n} digits</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    {/* Live sample */}
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <span className="text-xs text-gray-500">Sample:</span>
                      <code className="text-sm font-bold text-gray-800 font-mono">
                        {form.invoicePrefix || "INV"}-{"0".repeat((form.invoiceNumberLength || 6) - 1)}1
                      </code>
                    </div>
                  </SectionCard>

                  <SectionCard title="Currency & Decimals"
                    description="How monetary values are displayed across the invoice"
                    icon={Receipt}>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Currency Symbol">
                        <Input value={form.currencySymbol || "£"} maxLength={3}
                          onChange={e => F("currencySymbol", e.target.value)}
                          className="h-9 font-mono text-lg text-center" />
                      </Field>
                      <Field label="Decimal Places">
                        <Select value={String(form.decimalPlaces ?? 2)}
                          onValueChange={v => F("decimalPlaces", parseInt(v))}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-white">
                            {[0,1,2,3].map(n => (
                              <SelectItem key={n} value={String(n)}>
                                {n} decimal{n !== 1 ? "s" : ""} — {(form.currencySymbol||"£")}{(1234).toFixed(n)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* ── STEP: Content ── */}
              {editorStep === "content" && (
                <div className="space-y-4">
                  <SectionCard title="Header & Footer Text"
                    description="Optional text blocks at the top and bottom of every invoice"
                    icon={FileText}>
                    <Field label="Header Text" hint="Appears above company details. Leave blank to hide.">
                      <Textarea value={form.headerText || ""} rows={2}
                        onChange={e => F("headerText", e.target.value)}
                        placeholder="e.g. CONFIDENTIAL — For recipient only"
                        className="resize-none text-sm" />
                    </Field>
                    <Field label="Footer Text" hint="Appears at the bottom of every invoice page.">
                      <Textarea value={form.footerText || ""} rows={3}
                        onChange={e => F("footerText", e.target.value)}
                        placeholder="e.g. Thank you for your order! Visit www.bnmparts.com"
                        className="resize-none text-sm" />
                    </Field>
                  </SectionCard>

                  <SectionCard title="Default Terms & Conditions"
                    description="Pre-filled on every new invoice — can be edited per invoice"
                    icon={Shield}>
                    <Field label="Terms & Conditions">
                      <Textarea value={form.defaultTermsAndConditions || ""} rows={4}
                        onChange={e => F("defaultTermsAndConditions", e.target.value)}
                        placeholder="e.g. Payment is due within the specified period. All sales subject to availability."
                        className="resize-none text-sm" />
                    </Field>
                  </SectionCard>

                  <SectionCard title="Default Invoice Notes"
                    description="Pre-filled notes on new invoices — optional"
                    icon={FileText}>
                    <Field label="Notes" hint="Leave blank — editors can add notes per invoice.">
                      <Textarea value={form.defaultNotes || ""} rows={3}
                        onChange={e => F("defaultNotes", e.target.value)}
                        placeholder="e.g. Please include invoice number on your bank transfer reference"
                        className="resize-none text-sm" />
                    </Field>
                  </SectionCard>
                </div>
              )}

              {/* ── STEP: Channel ── */}
              {editorStep === "channel" && (
                <div className="space-y-4">

                  {/* WEBSITE */}
                  {form.channelType === "website" && (
                    <>
                      <SectionCard title="Order Tracking" description="Help customers track their online orders" icon={Globe}
                        accentClass="bg-blue-50">
                        <ToggleRow label="Show Order Tracking Link"
                          description="Print a direct link to the order tracker on the invoice"
                          checked={!!form.showOrderTracking} onChange={v => F("showOrderTracking", v)} />
                        {form.showOrderTracking && (
                          <Field label="Tracking URL" hint="Customers will see this URL on their invoice">
                            <Input value={form.trackingUrl || ""} onChange={e => F("trackingUrl", e.target.value)}
                              placeholder="https://www.bnmparts.com/track" className="h-9" />
                          </Field>
                        )}
                        <ToggleRow label="Show Delivery Address"
                          description="Display the customer's shipping / delivery address"
                          checked={!!form.showDeliveryAddress} onChange={v => F("showDeliveryAddress", v)} />
                      </SectionCard>

                      <SectionCard title="QR Code & Digital" description="QR codes and digital-friendly features" icon={QrCode}
                        accentClass="bg-blue-50">
                        <ToggleRow label="Show QR Code"
                          description="Print a scannable QR code linking to the order tracker"
                          checked={!!form.showQRCode} onChange={v => F("showQRCode", v)} />
                        <Field label="Website URL" hint="Shown on the invoice for customers to visit">
                          <Input value={form.websiteUrl || ""} onChange={e => F("websiteUrl", e.target.value)}
                            placeholder="www.bnmparts.com" className="h-9" />
                        </Field>
                      </SectionCard>
                    </>
                  )}

                  {/* OFFLINE */}
                  {form.channelType === "offline" && (
                    <>
                      <SectionCard title="Store Information" description="In-store and POS-specific details" icon={Store}
                        accentClass="bg-emerald-50">
                        <ToggleRow label="Show Store Location" description="Print the store address on the receipt"
                          checked={!!form.showStoreLocation} onChange={v => F("showStoreLocation", v)} />
                        {form.showStoreLocation && (
                          <Field label="Store Location">
                            <Textarea value={form.storeLocation || ""} onChange={e => F("storeLocation", e.target.value)}
                              placeholder="123 Parts Lane, London, E1 6RF" rows={2} className="resize-none text-sm" />
                          </Field>
                        )}
                        <ToggleRow label="Show Staff Name" description="Print the sales person's name on the invoice"
                          checked={!!form.showStaffName} onChange={v => F("showStaffName", v)} />
                        <ToggleRow label="Show Payment Method" description="Print how the customer paid (Cash / Card / Transfer)"
                          checked={!!form.showPaymentMethod} onChange={v => F("showPaymentMethod", v)} />
                      </SectionCard>

                      <SectionCard title="Receipt Format" description="Layout options for physical printing" icon={Receipt}
                        accentClass="bg-emerald-50">
                        <ToggleRow label="Thermal Receipt Mode"
                          description="Narrow single-column format for thermal receipt printers"
                          checked={!!form.thermalMode} onChange={v => F("thermalMode", v)} />
                        {form.thermalMode && (
                          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700">Thermal mode uses an 80mm compact layout. Preview may differ from the full-width view.</p>
                          </div>
                        )}
                      </SectionCard>

                      <SectionCard title="Returns Policy" description="Customer-facing returns information" icon={Shield}
                        accentClass="bg-emerald-50">
                        <ToggleRow label="Show Return Policy" description="Print returns policy at the bottom of the receipt"
                          checked={!!form.showReturnPolicy} onChange={v => F("showReturnPolicy", v)} />
                        {form.showReturnPolicy && (
                          <Field label="Return Policy Text">
                            <Textarea value={form.returnPolicyText || ""} onChange={e => F("returnPolicyText", e.target.value)}
                              placeholder="Returns accepted within 30 days with receipt." rows={3} className="resize-none text-sm" />
                          </Field>
                        )}
                      </SectionCard>
                    </>
                  )}

                  {/* APP */}
                  {form.channelType === "app" && (
                    <>
                      <SectionCard title="App Identity" description="Details about the mobile app" icon={Smartphone}
                        accentClass="bg-violet-50">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="App Name">
                            <Input value={form.appName || ""} onChange={e => F("appName", e.target.value)}
                              placeholder="BNM Parts App" className="h-9" />
                          </Field>
                          <Field label="App Version" hint="Shown on the invoice for reference">
                            <Input value={form.appVersion || ""} onChange={e => F("appVersion", e.target.value)}
                              placeholder="2.4.0" className="h-9 font-mono" />
                          </Field>
                        </div>
                        <ToggleRow label="Show App Order Reference"
                          description="Print the app order ID and version on the invoice"
                          checked={!!form.showPushReference} onChange={v => F("showPushReference", v)} />
                      </SectionCard>

                      <SectionCard title="App Store Links" description="Help customers download or re-open the app" icon={Download}
                        accentClass="bg-violet-50">
                        <ToggleRow label="Show QR Code" description="Print a QR code linking to the app download page"
                          checked={!!form.showQRCode} onChange={v => F("showQRCode", v)} />
                        <ToggleRow label="Show App Store Badges" description="Print App Store and Google Play buttons at the bottom"
                          checked={!!form.showAppBadges} onChange={v => F("showAppBadges", v)} />
                        <Field label="App Store URL" hint="iOS App Store direct link">
                          <Input value={form.appStoreUrl || ""} onChange={e => F("appStoreUrl", e.target.value)}
                            placeholder="https://apps.apple.com/bnmparts" className="h-9" />
                        </Field>
                        <Field label="Google Play URL" hint="Android Play Store direct link">
                          <Input value={form.playStoreUrl || ""} onChange={e => F("playStoreUrl", e.target.value)}
                            placeholder="https://play.google.com/store/bnmparts" className="h-9" />
                        </Field>
                      </SectionCard>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right: live preview
                Desktop → fixed 256px sidebar always visible
                Mobile  → full-width, shown when showMobilePreview=true     */}
            <div className={cn(
              "border-l border-gray-200 bg-gray-50 flex-col overflow-hidden",
              showMobilePreview ? "flex flex-1" : "hidden",
              "sm:flex sm:w-64 sm:flex-none",
            )}>
              <div className="px-4 pt-4 pb-2 shrink-0 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Preview</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Updates as you type</p>
                </div>
                {/* back to form — mobile only */}
                <button onClick={() => setShowMobilePreview(false)}
                  className="sm:hidden text-xs font-medium text-blue-600">
                  ← Form
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <TemplatePreviewCard form={form} channel={form.channelType ?? "website"} />
              </div>
            </div>
          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-t border-gray-200 bg-white shrink-0 gap-2">

            {/* Left: step dots (desktop) + preview toggle (mobile) */}
            <div className="flex items-center gap-1.5">
              {/* desktop dots */}
              <div className="hidden sm:flex items-center gap-1.5">
                {STEPS.map((s, i) => (
                  <div key={s.id} className={cn(
                    "h-1.5 rounded-full transition-all duration-200",
                    i === stepIndex ? "w-5 bg-blue-500"
                      : i < stepIndex ? "w-1.5 bg-green-400"
                      : "w-1.5 bg-gray-200"
                  )} />
                ))}
                <span className="text-xs text-gray-400 ml-1">{stepIndex + 1} / {STEPS.length}</span>
              </div>
              {/* mobile preview toggle */}
              <button
                onClick={() => setShowMobilePreview(p => !p)}
                className={cn(
                  "sm:hidden flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors",
                  showMobilePreview
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-gray-50 border-gray-200 text-gray-600"
                )}>
                <Eye className="w-3.5 h-3.5" />
                {showMobilePreview ? "Hide" : "Preview"}
              </button>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowEditor(false)}
                className="hidden sm:flex">Cancel</Button>
              {canGoBack && (
                <Button variant="outline" size="sm" onClick={() => setEditorStep(STEPS[stepIndex - 1].id)}
                  className="gap-1 sm:gap-1.5 px-2 sm:px-3">
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              )}
              {canGoNext && (
                <Button size="sm" onClick={() => setEditorStep(STEPS[stepIndex + 1].id)}
                  className={cn("gap-1 sm:gap-1.5 px-2 sm:px-3 text-white bg-gradient-to-r", editorCh.grad)}>
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button size="sm" onClick={handleSave}
                className={cn("gap-1 sm:gap-1.5 px-2.5 sm:px-3 text-white bg-gradient-to-r", editorCh.grad)}>
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isNew ? "Create Template" : "Save Changes"}</span>
                <span className="sm:hidden">Save</span>
              </Button>
            </div>
          </div>

        </DialogContent>
      </Dialog>

      {/* ── Full preview dialog ──────────────────────────────────────────────── */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-sm mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />Invoice Preview
            </DialogTitle>
          </DialogHeader>
          {previewForm && (
            <div className="overflow-y-auto max-h-[70vh]">
              <TemplatePreviewCard form={previewForm} channel={previewChannel} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ───────────────────────────────────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="mx-4 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => {
              if (deleteId) { deleteInvoiceTemplate(deleteId); toast.success("Template deleted"); }
              setShowDeleteDialog(false);
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Template card (unchanged) ────────────────────────────────────────────────
function TemplateCard({ template, channel, onEdit, onDuplicate, onDelete, onSetDefault, onPreview }: {
  template: InvoiceTemplate; channel: ChannelType;
  onEdit: () => void; onDuplicate: () => void; onDelete: () => void;
  onSetDefault: () => void; onPreview: () => void;
}) {
  const ch = CHANNELS.find(c => c.id === channel)!;
  const Icon = ch.icon;
  const primary = template.primaryColor || "#2563eb";

  return (
    <div className={cn("bg-white rounded-2xl border-2 overflow-hidden group hover:shadow-lg transition-all duration-200",
      template.isDefault ? ch.border : "border-gray-200 hover:border-gray-300")}>
      <div className="h-1.5" style={{ background: `linear-gradient(to right, ${primary}, ${primary}88)` }} />
      <div className="p-4 pb-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ background: `linear-gradient(135deg, ${primary}, ${primary}bb)` }}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900 leading-tight">{template.name}</h4>
              <p className="text-[10px] text-gray-400 font-mono">{template.invoicePrefix}-{"0".repeat((template.invoiceNumberLength || 4) - 1)}1</p>
            </div>
          </div>
          {template.isDefault && (
            <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 border flex items-center gap-1 h-5">
              <Check className="w-2.5 h-2.5" />Default
            </Badge>
          )}
        </div>
        <div className="rounded-xl overflow-hidden border border-gray-100 mb-4">
          <TemplatePreviewCard form={{ ...template, channelType: channel }} channel={channel} />
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex gap-1.5 items-center">
            <div className="w-4 h-4 rounded border" style={{ background: template.primaryColor }} />
            <div className="w-4 h-4 rounded border" style={{ background: template.secondaryColor }} />
          </div>
          <span className="text-[11px] text-gray-500">{template.fontFamily}</span>
          <span className="text-[11px] text-gray-400 ml-auto">{template.currencySymbol}100.00</span>
        </div>
      </div>
      <div className="px-4 pb-4 flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={onEdit}>
          <Edit className="w-3 h-3" />Edit
        </Button>
        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={onPreview} title="Preview">
          <Eye className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={onDuplicate} title="Duplicate">
          <Copy className="w-3.5 h-3.5" />
        </Button>
        {!template.isDefault && (
          <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:border-red-300"
            onClick={onDelete} title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      {!template.isDefault && (
        <div className="px-4 pb-4 -mt-1">
          <Button size="sm" variant="secondary" className="w-full h-7 text-xs gap-1" onClick={onSetDefault}>
            <Star className="w-3 h-3" />Set as Default
          </Button>
        </div>
      )}
    </div>
  );
}