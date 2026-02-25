import { useState, useEffect } from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  Settings, Plus, Edit, Trash2, Check, Copy, Eye, FileText,
  Palette, Globe, Store, Smartphone, ChevronRight, Star,
  MapPin, User, CreditCard, QrCode, Download, Mail, Phone,
  Package, Zap, Shield, X, Save, RefreshCw, Image as ImageIcon,
  ExternalLink, Layers, Hash, DollarSign, Type, Layout,
  CheckCircle2, AlertCircle, MonitorSmartphone, Wifi,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
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
  // Website extras
  showOrderTracking?: boolean;
  trackingUrl?: string;
  showQRCode?: boolean;
  websiteUrl?: string;
  showDeliveryAddress?: boolean;
  // Offline extras
  showStoreLocation?: boolean;
  storeLocation?: string;
  showStaffName?: boolean;
  showPaymentMethod?: boolean;
  thermalMode?: boolean;
  showReturnPolicy?: boolean;
  returnPolicyText?: string;
  // App extras
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
    // channel-specific defaults
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
      {/* Invoice header */}
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
            {/* Channel badge */}
            <div className={cn("inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1", ch.accentBg, ch.accentText)}>
              <ChIcon className="w-2.5 h-2.5" />{ch.label}
            </div>
          </div>
        </div>
      </div>

      {/* Channel-specific info band */}
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

      {/* Items table stub */}
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
        {/* Totals */}
        <div className="mt-2 space-y-0.5">
          <div className="flex justify-between text-[9px] text-gray-500"><span>Subtotal</span><span>£39.97</span></div>
          {form.showTaxColumn && <div className="flex justify-between text-[9px] text-gray-500"><span>VAT 20%</span><span>£7.99</span></div>}
          <div className="flex justify-between text-[9px] font-bold mt-1 pt-1 border-t border-gray-200"
            style={{ color: primary }}><span>Total</span><span>£47.96</span></div>
        </div>
      </div>

      {/* QR code stub */}
      {(channel === "website" || channel === "app") && form.showQRCode && (
        <div className="px-5 pb-3 flex items-center gap-2">
          <div className="w-10 h-10 border-2 rounded flex items-center justify-center shrink-0" style={{ borderColor: primary }}>
            <QrCode className="w-6 h-6" style={{ color: primary }} />
          </div>
          <p className="text-[9px] text-gray-400">Scan to {channel === "app" ? "download app" : "track order"}</p>
        </div>
      )}

      {/* Footer */}
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

// ─── Main component ───────────────────────────────────────────────────────────
export function InvoiceTemplateSettings() {
  const {
    invoiceTemplates, createInvoiceTemplate, updateInvoiceTemplate,
    deleteInvoiceTemplate, setDefaultTemplate,
  } = usePOS();

  const [activeChannel, setActiveChannel] = useState<ChannelType>("website");
  const [showEditor, setShowEditor]     = useState(false);
  const [isNew, setIsNew]               = useState(true);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [form, setForm]                 = useState<ExtendedTemplateForm>(blankForm("website"));
  const [editorTab, setEditorTab]       = useState("company");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [showPreview, setShowPreview]   = useState(false);
  const [previewForm, setPreviewForm]   = useState<ExtendedTemplateForm | null>(null);
  const [previewChannel, setPreviewChannel] = useState<ChannelType>("website");

  // ── Init default templates ──────────────────────────────────────────────────
  useEffect(() => {
    if (invoiceTemplates.length === 0) {
      (["website", "offline", "app"] as ChannelType[]).forEach(ch => {
        const f = blankForm(ch);
        const c = CHANNELS.find(x => x.id === ch)!;
        createInvoiceTemplate({
          name: `${c.label} — Default`,
          isDefault: ch === "website",
          companyName: f.companyName!,
          companyLogoUrl: f.companyLogoUrl!,
          companyAddress: f.companyAddress!,
          companyPhone: f.companyPhone!,
          companyEmail: f.companyEmail!,
          companyWebsite: f.companyWebsite!,
          companyTaxId: f.companyTaxId!,
          primaryColor: f.primaryColor!,
          secondaryColor: f.secondaryColor!,
          fontFamily: f.fontFamily!,
          showLogo: true,
          showCompanyDetails: true,
          showTaxColumn: true,
          showDiscountColumn: true,
          showProductSku: true,
          headerText: f.headerText!,
          footerText: f.footerText!,
          defaultTermsAndConditions: f.defaultTermsAndConditions!,
          defaultNotes: "",
          currencySymbol: "£",
          currencyPosition: "before",
          decimalPlaces: 2,
          invoicePrefix: c.prefix,
          invoiceNumberLength: 6,
        } as any);
      });
    }
  }, []);

  // ── Filter templates by channel (via invoicePrefix) ─────────────────────────
  const templatesByChannel = (ch: ChannelType) => {
    const prefix = CHANNELS.find(c => c.id === ch)!.prefix;
    return invoiceTemplates.filter(t => (t.invoicePrefix || "").startsWith(prefix) || (t as any).channelType === ch);
  };

  const activeTemplates = templatesByChannel(activeChannel);
  const activeCh = CHANNELS.find(c => c.id === activeChannel)!;

  // ── Open editor ─────────────────────────────────────────────────────────────
  const openNew = (ch: ChannelType) => {
    setIsNew(true);
    setEditingId(null);
    setForm(blankForm(ch));
    setEditorTab("company");
    setShowEditor(true);
  };

  const openEdit = (t: InvoiceTemplate) => {
    const ch = CHANNELS.find(c => t.invoicePrefix?.startsWith(c.prefix))?.id ?? activeChannel;
    setIsNew(false);
    setEditingId(t.id);
    setForm({ ...blankForm(ch as ChannelType), ...t, channelType: ch as ChannelType });
    setEditorTab("company");
    setShowEditor(true);
  };

  const handleSave = () => {
    if (!form.name || !form.companyName) { toast.error("Name and company are required"); return; }
    const payload = { ...form } as any;
    if (isNew) { createInvoiceTemplate(payload); toast.success("Template created"); }
    else { updateInvoiceTemplate(editingId!, payload); toast.success("Template updated"); }
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

  const pf = (v: string) => setForm(f => ({ ...f, ...JSON.parse(v) }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

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
        <Button onClick={() => openNew(activeChannel)}
          className="bg-blue-600 hover:bg-blue-700 gap-2">
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
              {/* Gradient top bar */}
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
        {/* Section header */}
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

        {/* Templates grid */}
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
          EDITOR DIALOG
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showEditor} onOpenChange={v => !v && setShowEditor(false)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">

          {/* Dialog header */}
          <div className={cn("flex items-center justify-between px-6 py-4 bg-gradient-to-r text-white shrink-0",
            form.channelType ? CHANNELS.find(c => c.id === form.channelType)?.grad : "from-blue-600 to-indigo-600")}>
            <div className="flex items-center gap-3">
              {form.channelType && (() => {
                const C = CHANNELS.find(c => c.id === form.channelType)!;
                return <C.icon className="w-5 h-5 text-white/80" />;
              })()}
              <div>
                <h2 className="font-bold text-base">{isNew ? "New Template" : "Edit Template"}</h2>
                <p className="text-xs text-white/70">
                  {form.channelType && CHANNELS.find(c => c.id === form.channelType)?.label} Channel
                </p>
              </div>
            </div>
            <button onClick={() => setShowEditor(false)}
              className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Two-panel body */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left: form */}
            <div className="flex-1 overflow-y-auto p-5">
              <Tabs value={editorTab} onValueChange={setEditorTab}>
                <TabsList className="grid grid-cols-5 w-full mb-4">
                  <TabsTrigger value="company"    className="text-xs gap-1"><User className="w-3 h-3" />Company</TabsTrigger>
                  <TabsTrigger value="styling"    className="text-xs gap-1"><Palette className="w-3 h-3" />Style</TabsTrigger>
                  <TabsTrigger value="layout"     className="text-xs gap-1"><Layout className="w-3 h-3" />Layout</TabsTrigger>
                  <TabsTrigger value="content"    className="text-xs gap-1"><Type className="w-3 h-3" />Content</TabsTrigger>
                  <TabsTrigger value="channel"    className="text-xs gap-1">
                    {form.channelType === "website" ? <Globe className="w-3 h-3" />
                      : form.channelType === "offline" ? <Store className="w-3 h-3" />
                      : <Smartphone className="w-3 h-3" />}
                    {form.channelType === "website" ? "Web" : form.channelType === "offline" ? "Store" : "App"}
                  </TabsTrigger>
                </TabsList>

                {/* ── Company ── */}
                <TabsContent value="company" className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label>Template Name *</Label>
                      <Input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g., Website — Modern Blue" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label>Company Name *</Label>
                      <Input value={form.companyName || ""} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label>Company Address</Label>
                      <Textarea value={form.companyAddress || ""} onChange={e => setForm(f => ({ ...f, companyAddress: e.target.value }))} rows={2} />
                    </div>
                    <div className="space-y-1">
                      <Label>Phone</Label>
                      <Input value={form.companyPhone || ""} onChange={e => setForm(f => ({ ...f, companyPhone: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input type="email" value={form.companyEmail || ""} onChange={e => setForm(f => ({ ...f, companyEmail: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Website</Label>
                      <Input value={form.companyWebsite || ""} onChange={e => setForm(f => ({ ...f, companyWebsite: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>VAT / Tax ID</Label>
                      <Input value={form.companyTaxId || ""} onChange={e => setForm(f => ({ ...f, companyTaxId: e.target.value }))} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label>Logo URL</Label>
                      <Input value={form.companyLogoUrl || ""} onChange={e => setForm(f => ({ ...f, companyLogoUrl: e.target.value }))}
                        placeholder="https://example.com/logo.png" />
                    </div>
                  </div>
                </TabsContent>

                {/* ── Styling ── */}
                <TabsContent value="styling" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Primary Color</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={form.primaryColor || "#2563eb"}
                          onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="w-14 h-10 p-1" />
                        <Input value={form.primaryColor || "#2563eb"}
                          onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="flex-1" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={form.secondaryColor || "#64748b"}
                          onChange={e => setForm(f => ({ ...f, secondaryColor: e.target.value }))} className="w-14 h-10 p-1" />
                        <Input value={form.secondaryColor || "#64748b"}
                          onChange={e => setForm(f => ({ ...f, secondaryColor: e.target.value }))} className="flex-1" />
                      </div>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label>Font Family</Label>
                      <Select value={form.fontFamily || "Arial"} onValueChange={v => setForm(f => ({ ...f, fontFamily: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Arial", "Helvetica", "Times New Roman", "Georgia", "Verdana", "Courier"].map(f => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Color presets */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block">Quick Presets</Label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { label: "Navy", p: "#1e3a5f", s: "#64748b" },
                        { label: "Emerald", p: "#059669", s: "#64748b" },
                        { label: "Violet", p: "#7c3aed", s: "#a78bfa" },
                        { label: "Rose", p: "#e11d48", s: "#64748b" },
                        { label: "Amber", p: "#d97706", s: "#64748b" },
                        { label: "Slate", p: "#334155", s: "#94a3b8" },
                      ].map(p => (
                        <button key={p.label}
                          onClick={() => setForm(f => ({ ...f, primaryColor: p.p, secondaryColor: p.s }))}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 hover:border-gray-300 text-xs font-medium text-gray-700 transition-colors">
                          <div className="w-3 h-3 rounded-full" style={{ background: p.p }} />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* ── Layout ── */}
                <TabsContent value="layout" className="space-y-3">
                  {[
                    { key: "showLogo",           label: "Show Logo",             desc: "Display company logo" },
                    { key: "showCompanyDetails", label: "Show Company Details",  desc: "Address, phone, email" },
                    { key: "showTaxColumn",      label: "Show Tax Column",       desc: "VAT column in line items" },
                    { key: "showDiscountColumn", label: "Show Discount Column",  desc: "Discount in line items" },
                    { key: "showProductSku",     label: "Show Product SKU",      desc: "SKU below product name" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{label}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                      <Switch checked={!!(form as any)[key]}
                        onCheckedChange={v => setForm(f => ({ ...f, [key]: v }))} />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <Label>Invoice Prefix</Label>
                      <Input value={form.invoicePrefix || ""} maxLength={6}
                        onChange={e => setForm(f => ({ ...f, invoicePrefix: e.target.value.toUpperCase() }))} placeholder="INV" />
                    </div>
                    <div className="space-y-1">
                      <Label>Number Length</Label>
                      <Select value={String(form.invoiceNumberLength || 4)}
                        onValueChange={v => setForm(f => ({ ...f, invoiceNumberLength: parseInt(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[4, 5, 6, 7, 8].map(n => <SelectItem key={n} value={String(n)}>{n} digits</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Currency Symbol</Label>
                      <Input value={form.currencySymbol || "£"} maxLength={3}
                        onChange={e => setForm(f => ({ ...f, currencySymbol: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Decimal Places</Label>
                      <Select value={String(form.decimalPlaces ?? 2)}
                        onValueChange={v => setForm(f => ({ ...f, decimalPlaces: parseInt(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* ── Content ── */}
                <TabsContent value="content" className="space-y-3">
                  <div className="space-y-1">
                    <Label>Header Text</Label>
                    <Textarea value={form.headerText || ""} rows={2}
                      onChange={e => setForm(f => ({ ...f, headerText: e.target.value }))}
                      placeholder="Optional header text at top of invoice" />
                  </div>
                  <div className="space-y-1">
                    <Label>Footer Text</Label>
                    <Textarea value={form.footerText || ""} rows={2}
                      onChange={e => setForm(f => ({ ...f, footerText: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Terms & Conditions</Label>
                    <Textarea value={form.defaultTermsAndConditions || ""} rows={3}
                      onChange={e => setForm(f => ({ ...f, defaultTermsAndConditions: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Default Notes</Label>
                    <Textarea value={form.defaultNotes || ""} rows={2}
                      onChange={e => setForm(f => ({ ...f, defaultNotes: e.target.value }))} />
                  </div>
                </TabsContent>

                {/* ── Channel-specific ── */}
                <TabsContent value="channel" className="space-y-4">
                  {/* WEBSITE */}
                  {form.channelType === "website" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100 mb-2">
                        <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                        <p className="text-xs text-blue-700 font-medium">Website-specific settings — for www.bnmparts.com orders</p>
                      </div>
                      {[
                        { key: "showOrderTracking",  label: "Show Order Tracking",   desc: "Display tracking link / number" },
                        { key: "showQRCode",         label: "Show QR Code",          desc: "QR code linking to order tracker" },
                        { key: "showDeliveryAddress",label: "Show Delivery Address", desc: "Customer shipping address block" },
                      ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <div><p className="text-sm font-medium text-gray-800">{label}</p><p className="text-xs text-gray-500">{desc}</p></div>
                          <Switch checked={!!(form as any)[key]} onCheckedChange={v => setForm(f => ({ ...f, [key]: v }))} />
                        </div>
                      ))}
                      <div className="space-y-1">
                        <Label>Order Tracking URL</Label>
                        <Input value={form.trackingUrl || ""} placeholder="https://www.bnmparts.com/track"
                          onChange={e => setForm(f => ({ ...f, trackingUrl: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Website URL (displayed on invoice)</Label>
                        <Input value={form.websiteUrl || ""} placeholder="www.bnmparts.com"
                          onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))} />
                      </div>
                    </div>
                  )}

                  {/* OFFLINE */}
                  {form.channelType === "offline" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 mb-2">
                        <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                        <p className="text-xs text-emerald-700 font-medium">Offline/POS settings — for in-store counter sales</p>
                      </div>
                      {[
                        { key: "showStoreLocation",  label: "Show Store Location",   desc: "Print store address on receipt" },
                        { key: "showStaffName",      label: "Show Staff Name",       desc: "Sales person name on invoice" },
                        { key: "showPaymentMethod",  label: "Show Payment Method",   desc: "Cash / Card / Transfer" },
                        { key: "thermalMode",        label: "Thermal Receipt Mode",  desc: "Narrow single-column format" },
                        { key: "showReturnPolicy",   label: "Show Return Policy",    desc: "Print return policy at bottom" },
                      ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <div><p className="text-sm font-medium text-gray-800">{label}</p><p className="text-xs text-gray-500">{desc}</p></div>
                          <Switch checked={!!(form as any)[key]} onCheckedChange={v => setForm(f => ({ ...f, [key]: v }))} />
                        </div>
                      ))}
                      <div className="space-y-1">
                        <Label>Store Location</Label>
                        <Input value={form.storeLocation || ""} placeholder="123 Parts Lane, London"
                          onChange={e => setForm(f => ({ ...f, storeLocation: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Return Policy Text</Label>
                        <Textarea value={form.returnPolicyText || ""} rows={2}
                          onChange={e => setForm(f => ({ ...f, returnPolicyText: e.target.value }))} />
                      </div>
                    </div>
                  )}

                  {/* APP */}
                  {form.channelType === "app" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-violet-50 rounded-xl border border-violet-100 mb-2">
                        <Smartphone className="w-4 h-4 text-violet-600 shrink-0" />
                        <p className="text-xs text-violet-700 font-medium">App-specific settings — for BNM Parts mobile app orders</p>
                      </div>
                      {[
                        { key: "showQRCode",       label: "Show App Download QR",    desc: "QR code to download the app" },
                        { key: "showAppBadges",    label: "Show App Store Badges",   desc: "App Store / Google Play buttons" },
                        { key: "showPushReference",label: "Show App Order Reference",desc: "App order ID and version" },
                      ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <div><p className="text-sm font-medium text-gray-800">{label}</p><p className="text-xs text-gray-500">{desc}</p></div>
                          <Switch checked={!!(form as any)[key]} onCheckedChange={v => setForm(f => ({ ...f, [key]: v }))} />
                        </div>
                      ))}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>App Name</Label>
                          <Input value={form.appName || ""} placeholder="BNM Parts App"
                            onChange={e => setForm(f => ({ ...f, appName: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label>App Version</Label>
                          <Input value={form.appVersion || ""} placeholder="2.4.0"
                            onChange={e => setForm(f => ({ ...f, appVersion: e.target.value }))} />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label>App Store URL</Label>
                          <Input value={form.appStoreUrl || ""} placeholder="https://apps.apple.com/bnmparts"
                            onChange={e => setForm(f => ({ ...f, appStoreUrl: e.target.value }))} />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label>Google Play URL</Label>
                          <Input value={form.playStoreUrl || ""} placeholder="https://play.google.com/store/bnmparts"
                            onChange={e => setForm(f => ({ ...f, playStoreUrl: e.target.value }))} />
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Right: live preview */}
            <div className="w-72 shrink-0 border-l border-gray-200 bg-gray-50 p-4 overflow-y-auto">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Live Preview</p>
              <TemplatePreviewCard form={form} channel={form.channelType || activeChannel} />
              <p className="text-[10px] text-gray-400 text-center mt-3">Preview updates as you type</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-200 bg-gray-50 shrink-0">
            <div className="flex items-center gap-2">
              <Switch checked={!!form.isDefault} onCheckedChange={v => setForm(f => ({ ...f, isDefault: v }))} />
              <Label className="text-sm cursor-pointer">Set as default for this channel</Label>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowEditor(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave}
                className={cn("gap-1.5 text-white", form.channelType ? `bg-gradient-to-r ${CHANNELS.find(c=>c.id===form.channelType)?.grad}` : "bg-blue-600")}>
                <Save className="w-3.5 h-3.5" />{isNew ? "Create Template" : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          FULL PREVIEW DIALOG
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-sm">
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

      {/* Delete confirm */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
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

// ─── Template card ─────────────────────────────────────────────────────────────
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
      {/* Color bar */}
      <div className="h-1.5" style={{ background: `linear-gradient(to right, ${primary}, ${primary}88)` }} />

      {/* Card header */}
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

        {/* Mini preview */}
        <div className="rounded-xl overflow-hidden border border-gray-100 mb-4">
          <TemplatePreviewCard form={{ ...template, channelType: channel }} channel={channel} />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex gap-1.5 items-center">
            <div className="w-4 h-4 rounded border" style={{ background: template.primaryColor }} />
            <div className="w-4 h-4 rounded border" style={{ background: template.secondaryColor }} />
          </div>
          <span className="text-[11px] text-gray-500">{template.fontFamily}</span>
          <span className="text-[11px] text-gray-400 ml-auto">{template.currencySymbol}100.00</span>
        </div>
      </div>

      {/* Actions */}
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
