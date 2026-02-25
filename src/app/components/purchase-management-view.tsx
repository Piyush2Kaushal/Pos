import { useState, useMemo } from "react";
import React from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  Search, Plus, Eye, Trash2, Package, Building2, Phone, Mail,
  MapPin, Star, TrendingUp, TrendingDown, BarChart3, Clock,
  CheckCircle2, AlertTriangle, Edit, Download, FileText, Truck,
  CreditCard, RefreshCw, Filter, X, ChevronDown, ChevronUp,
  Globe, Hash, Calendar, DollarSign, ShoppingCart, Award,
  ArrowUpRight, Layers, Users, Send, CircleDot, Sparkles,
  Paperclip, FileImage, ZoomIn, ZoomOut, Share2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { cn } from "@/app/components/ui/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { Purchase } from "@/app/types";
import { DocumentCaptureDialog } from "@/app/components/document-capture-dialog";
import { SendShareDialog } from "@/app/components/send-share-dialog";

// ─── Supplier Type ────────────────────────────────────────────────────────────
interface Supplier {
  id: string;
  name: string;
  company: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  website?: string;
  taxNumber?: string;
  paymentTerms: "net_7" | "net_14" | "net_30" | "net_60" | "cod" | "prepaid";
  leadTimeDays: number;
  rating: number; // 1–5
  status: "active" | "inactive" | "blacklisted";
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: Date;
  currency: string;
  bankDetails?: string;
  category: string; // e.g. "Mobile Parts", "Accessories"
}

interface POItem {
  productId: string;
  productName: string;
  quantity: string;
  costPrice: string;
}

const COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899"];

const paymentTermsLabel: Record<string, string> = {
  net_7:"Net 7", net_14:"Net 14", net_30:"Net 30", net_60:"Net 60", cod:"Cash on Delivery", prepaid:"Prepaid",
};

const statusColors: Record<string, string> = {
  active:"bg-emerald-500", inactive:"bg-gray-400", blacklisted:"bg-red-500",
  completed:"bg-green-600", pending:"bg-amber-500", cancelled:"bg-red-500",
  ordered:"bg-blue-500", in_transit:"bg-purple-500", received:"bg-teal-500",
};

// ─── Seed supplier data ───────────────────────────────────────────────────────
const seedSuppliers: Supplier[] = [
  { id:"sup1", name:"Tech Parts Ltd",       company:"Tech Parts Limited",     contactPerson:"James Wilson",   email:"james@techparts.com",     phone:"+44 20 1234 5678", address:"12 Industrial Way",  city:"London",      country:"UK",    website:"www.techparts.com",   taxNumber:"GB123456789", paymentTerms:"net_30",  leadTimeDays:5,  rating:5, status:"active",     totalOrders:24, totalSpent:48500, createdAt:new Date("2023-01-15"), currency:"GBP", category:"Mobile Parts"   },
  { id:"sup2", name:"Mobile Supply Co",     company:"Mobile Supply Co Ltd",   contactPerson:"Sarah Chen",     email:"sarah@mobilesupply.co",   phone:"+44 161 234 5678", address:"45 Commerce St",     city:"Manchester",  country:"UK",    website:"www.mobilesupply.co", taxNumber:"GB987654321", paymentTerms:"net_14",  leadTimeDays:3,  rating:4, status:"active",     totalOrders:18, totalSpent:32000, createdAt:new Date("2023-03-20"), currency:"GBP", category:"Mobile Parts"   },
  { id:"sup3", name:"Global Electronics",   company:"Global Electronics PLC", contactPerson:"Ahmed Hassan",   email:"ahmed@globalelec.com",    phone:"+44 121 345 6789", address:"78 Tech Park",       city:"Birmingham",  country:"UK",    paymentTerms:"net_60",  leadTimeDays:14, rating:3, status:"active",     totalOrders:9,  totalSpent:15000, createdAt:new Date("2023-06-10"), currency:"GBP", category:"Accessories"    },
  { id:"sup4", name:"Shenzhen Parts HK",    company:"Shenzhen Parts HK Ltd",  contactPerson:"Li Wei",         email:"liwei@szparts.hk",        phone:"+852 2345 6789",   address:"Block C, Tech Hub",  city:"Shenzhen",    country:"China", paymentTerms:"prepaid", leadTimeDays:21, rating:4, status:"active",     totalOrders:12, totalSpent:28000, createdAt:new Date("2023-04-05"), currency:"USD", category:"Mobile Parts"   },
  { id:"sup5", name:"RepairKit Pro",        company:"RepairKit Pro Ltd",       contactPerson:"Emily Brooks",   email:"emily@repairkitpro.com",  phone:"+44 113 456 7890", address:"9 Innovation Ave",   city:"Leeds",       country:"UK",    website:"www.repairkitpro.com", paymentTerms:"cod",    leadTimeDays:2,  rating:5, status:"active",     totalOrders:31, totalSpent:62000, createdAt:new Date("2022-11-01"), currency:"GBP", category:"Tools & Kits"   },
  { id:"sup6", name:"Parts Universe",       company:"Parts Universe GmbH",     contactPerson:"Klaus Mueller",  email:"k.mueller@partsuni.de",   phone:"+49 30 1234 5678", address:"Industriestr 22",    city:"Berlin",      country:"Germany",                              paymentTerms:"net_30",  leadTimeDays:10, rating:2, status:"inactive",   totalOrders:4,  totalSpent:7200,  createdAt:new Date("2023-09-01"), currency:"EUR", category:"Accessories"    },
  { id:"sup7", name:"FastScreen Direct",    company:"FastScreen Direct Ltd",   contactPerson:"Priya Sharma",   email:"priya@fastscreen.com",    phone:"+44 20 9876 5432", address:"3 Display Court",    city:"London",      country:"UK",    paymentTerms:"net_7",   leadTimeDays:1,  rating:5, status:"active",     totalOrders:45, totalSpent:91000, createdAt:new Date("2022-08-15"), currency:"GBP", category:"Screens"        },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function PurchaseManagementView() {
  const { purchases, products, addPurchase, updatePurchase, updateProductStock } = usePOS();

  const [activeTab,     setActiveTab]     = useState("orders");
  const [searchTerm,    setSearchTerm]    = useState("");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [supplierFilter,setSupplierFilter]= useState("all");
  const [suppliers,     setSuppliers]     = useState<Supplier[]>(seedSuppliers);

  // Dialogs
  const [isAddPOOpen,      setIsAddPOOpen]      = useState(false);
  const [isViewPOOpen,     setIsViewPOOpen]      = useState(false);
  const [isAddSupOpen,     setIsAddSupOpen]      = useState(false);
  const [isViewSupOpen,    setIsViewSupOpen]     = useState(false);
  const [isEditSupOpen,    setIsEditSupOpen]     = useState(false);
  const [isCaptureOpen,    setIsCaptureOpen]     = useState(false);
  const [isViewDocOpen,    setIsViewDocOpen]     = useState(false);
  const [viewPurchase,     setViewPurchase]      = useState<Purchase | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // ─── Document store: captureId → { url, type, name } ────────────────────
  const [poDocuments, setPoDocuments] = useState<Record<string, { url: string; type: string; name: string }>>({});
  const [viewDocInfo,    setViewDocInfo]    = useState<{ url: string; type: string; name: string } | null>(null);
  const [docZoom,        setDocZoom]        = useState(100);

  // Status change dropdown
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);

  // Send / Share PO
  const [sendSharePO, setSendSharePO] = useState<Purchase | null>(null);
  // Close dropdown on outside click
  React.useEffect(()=>{
    if(!statusDropdownId) return;
    const handler=()=>setStatusDropdownId(null);
    document.addEventListener("click",handler);
    return ()=>document.removeEventListener("click",handler);
  },[statusDropdownId]);

  // PO form
  const [poForm, setPoForm] = useState({
    supplierId:"", paymentMethod:"Bank Transfer", notes:"",
    status:"pending" as "completed"|"pending"|"cancelled",
    expectedDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [poItems, setPoItems] = useState<POItem[]>([]);

  // Supplier form
  const blankSup = (): Omit<Supplier,"id"|"totalOrders"|"totalSpent"|"createdAt"> => ({
    name:"", company:"", contactPerson:"", email:"", phone:"", address:"",
    city:"", country:"UK", website:"", taxNumber:"", paymentTerms:"net_30",
    leadTimeDays:7, rating:4, status:"active", notes:"", currency:"GBP", category:"Mobile Parts",
  });
  const [supForm, setSupForm]= useState(blankSup());
  const [editingSupId, setEditingSupId] = useState<string|null>(null);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const filteredPOs = useMemo(() => purchases.filter(p => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || p.supplier.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    const matchStatus   = statusFilter   === "all" || p.status === statusFilter;
    const matchSupplier = supplierFilter === "all" || p.supplier === supplierFilter;
    return matchSearch && matchStatus && matchSupplier;
  }), [purchases, searchTerm, statusFilter, supplierFilter]);

  const filteredSuppliers = useMemo(() =>
    suppliers.filter(s => !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.city.toLowerCase().includes(searchTerm.toLowerCase())),
    [suppliers, searchTerm]);

  const totalSpent   = purchases.filter(p => p.status==="completed").reduce((s,p)=>s+p.total,0);
  const pendingCount = purchases.filter(p => p.status==="pending").length;
  const poSubtotal   = poItems.reduce((s,i)=>(parseInt(i.quantity)||0)*(parseFloat(i.costPrice)||0)+s,0);

  // Supplier analytics per supplier
  const supplierStats = useMemo(() => {
    const map: Record<string,{orders:number,spent:number}> = {};
    purchases.forEach(p => {
      if (!map[p.supplier]) map[p.supplier] = {orders:0,spent:0};
      map[p.supplier].orders++;
      if (p.status==="completed") map[p.supplier].spent += p.total;
    });
    return map;
  }, [purchases]);

  // Chart data
  const spendChartData = useMemo(() =>
    Object.entries(supplierStats).map(([name,{spent}])=>({name:name.split(" ")[0],spent:Math.round(spent)}))
      .sort((a,b)=>b.spent-a.spent).slice(0,7),
    [supplierStats]);

  const categoryData = useMemo(() => {
    const cats: Record<string,number> = {};
    suppliers.forEach(s=>{ cats[s.category]=(cats[s.category]||0)+1; });
    return Object.entries(cats).map(([name,value])=>({name,value}));
  }, [suppliers]);

  // ─── PO Handlers ─────────────────────────────────────────────────────────
  const resetPO = () => {
    setPoForm({supplierId:"",paymentMethod:"Bank Transfer",notes:"",status:"pending",expectedDate:format(new Date(),"yyyy-MM-dd")});
    setPoItems([]); setIsAddPOOpen(false);
  };

  const addPOItem = () => setPoItems(prev=>[...prev,{productId:"",productName:"",quantity:"",costPrice:""}]);
  const removePOItem = (i:number) => setPoItems(prev=>prev.filter((_,idx)=>idx!==i));
  const updatePOItem = (i:number, field:string, value:string) => {
    setPoItems(prev => {
      const items=[...prev];
      if (field==="productId") {
        const p=products.find(x=>x.id===value);
        items[i]={...items[i],productId:value,productName:p?.name||"",costPrice:p?p.wholesalePrice.toFixed(2):"" };
      } else items[i]={...items[i],[field]:value};
      return items;
    });
  };

  const handleCreatePO = () => {
    const sup = suppliers.find(s=>s.id===poForm.supplierId);
    if (!sup) { toast.error("Select a supplier"); return; }
    if (!poItems.length) { toast.error("Add at least one item"); return; }
    const items = poItems.map(i=>({ productId:i.productId, productName:i.productName, quantity:parseInt(i.quantity)||0, costPrice:parseFloat(i.costPrice)||0, total:(parseInt(i.quantity)||0)*(parseFloat(i.costPrice)||0) }));
    const subtotal=items.reduce((s,x)=>s+x.total,0);
    const tax=subtotal*0.08; const total=subtotal+tax;
    addPurchase({ supplier:sup.name, items, subtotal, tax, total, paymentMethod:poForm.paymentMethod, date:new Date(), status:poForm.status, notes:poForm.notes||undefined });
    if (poForm.status==="completed") items.forEach(item=>{ const p=products.find(x=>x.id===item.productId); if(p) updateProductStock(p.id,p.stock+item.quantity); });
    setSuppliers(prev=>prev.map(s=>s.id===poForm.supplierId?{...s,totalOrders:s.totalOrders+1,totalSpent:s.totalSpent+(poForm.status==="completed"?total:0)}:s));
    toast.success("Purchase order created"); resetPO();
  };

  // ─── Supplier Handlers ────────────────────────────────────────────────────
  const handleSaveSupplier = () => {
    if (!supForm.name||!supForm.email||!supForm.phone) { toast.error("Name, email and phone required"); return; }
    if (editingSupId) {
      setSuppliers(prev=>prev.map(s=>s.id===editingSupId?{...s,...supForm}:s));
      toast.success("Supplier updated");
    } else {
      setSuppliers(prev=>[...prev,{...supForm,id:`sup${Date.now()}`,totalOrders:0,totalSpent:0,createdAt:new Date()}]);
      toast.success("Supplier added");
    }
    setIsAddSupOpen(false); setIsEditSupOpen(false); setEditingSupId(null); setSupForm(blankSup());
  };

  const handleDeleteSupplier = (id:string) => {
    if (!confirm("Delete this supplier?")) return;
    setSuppliers(prev=>prev.filter(s=>s.id!==id));
    toast.success("Supplier deleted");
  };

  const openEditSupplier = (s:Supplier) => {
    setEditingSupId(s.id);
    setSupForm({ name:s.name,company:s.company,contactPerson:s.contactPerson,email:s.email,phone:s.phone,address:s.address,city:s.city,country:s.country,website:s.website||"",taxNumber:s.taxNumber||"",paymentTerms:s.paymentTerms,leadTimeDays:s.leadTimeDays,rating:s.rating,status:s.status,notes:s.notes||"",currency:s.currency,category:s.category });
    setIsEditSupOpen(true);
  };

  const RatingStars = ({ n, editable=false, onChange }:{ n:number; editable?:boolean; onChange?:(v:number)=>void }) => (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i=>(
        <Star key={i} className={cn("w-3.5 h-3.5",i<=n?"fill-amber-400 text-amber-400":"text-gray-300",editable&&"cursor-pointer hover:text-amber-400")}
          onClick={()=>editable&&onChange&&onChange(i)}/>
      ))}
    </div>
  );

  const SupplierForm = () => (
    <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
      {[
        {label:"Supplier Name *",    key:"name",          ph:"Display name"},
        {label:"Company *",          key:"company",       ph:"Legal company name"},
        {label:"Contact Person",     key:"contactPerson", ph:"Primary contact"},
        {label:"Email *",            key:"email",         ph:"supplier@email.com"},
        {label:"Phone *",            key:"phone",         ph:"+44 20 1234 5678"},
        {label:"Address",            key:"address",       ph:"Street address"},
        {label:"City",               key:"city",          ph:"City"},
        {label:"Country",            key:"country",       ph:"UK"},
        {label:"Website",            key:"website",       ph:"www.example.com"},
        {label:"Tax/VAT Number",     key:"taxNumber",     ph:"GB123456789"},
        {label:"Currency",           key:"currency",      ph:"GBP"},
        {label:"Lead Time (days)",   key:"leadTimeDays",  ph:"7", type:"number"},
      ].map(f=>(
        <div key={f.key} className="space-y-1">
          <Label className="text-xs">{f.label}</Label>
          <Input type={f.type||"text"} placeholder={f.ph} value={String((supForm as any)[f.key]||"")}
            onChange={e=>setSupForm(s=>({...s,[f.key]:f.type==="number"?parseInt(e.target.value)||0:e.target.value}))}/>
        </div>
      ))}
      <div className="space-y-1">
        <Label className="text-xs">Category</Label>
        <Select value={supForm.category} onValueChange={v=>setSupForm(s=>({...s,category:v}))}>
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>
            {["Mobile Parts","Screens","Batteries","Accessories","Tools & Kits","Packaging","Other"].map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Payment Terms</Label>
        <Select value={supForm.paymentTerms} onValueChange={v=>setSupForm(s=>({...s,paymentTerms:v as any}))}>
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>
            {Object.entries(paymentTermsLabel).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Status</Label>
        <Select value={supForm.status} onValueChange={v=>setSupForm(s=>({...s,status:v as any}))}>
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="blacklisted">Blacklisted</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Rating</Label>
        <RatingStars n={supForm.rating} editable onChange={v=>setSupForm(s=>({...s,rating:v}))}/>
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Notes</Label>
        <Textarea placeholder="Internal notes about this supplier…" value={supForm.notes||""} rows={2}
          onChange={e=>setSupForm(s=>({...s,notes:e.target.value}))}/>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-blue-600"/>Purchase Management
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Advanced supplier directory, purchase orders & spend analytics</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={()=>{setSupForm(blankSup());setEditingSupId(null);setIsAddSupOpen(true);}}>
            <Building2 className="w-4 h-4 text-purple-600"/>Add Supplier
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50 hover:border-violet-400"
            onClick={()=>setIsCaptureOpen(true)}
          >
            <Sparkles className="w-4 h-4"/>Auto Capture
          </Button>
          <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={()=>setIsAddPOOpen(true)}>
            <Plus className="w-4 h-4"/>New Purchase Order
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label:"Total Orders",      value:purchases.length,   color:"blue",   icon:<FileText className="w-4 h-4"/>      },
          { label:"Total Spent",        value:`£${totalSpent.toFixed(0)}`, color:"red", icon:<DollarSign className="w-4 h-4"/> },
          { label:"Pending",            value:pendingCount,       color:"amber",  icon:<Clock className="w-4 h-4"/>         },
          { label:"Completed",          value:purchases.filter(p=>p.status==="completed").length, color:"green", icon:<CheckCircle2 className="w-4 h-4"/>},
          { label:"Active Suppliers",   value:suppliers.filter(s=>s.status==="active").length, color:"purple", icon:<Building2 className="w-4 h-4"/>},
          { label:"Avg Lead Time",      value:`${Math.round(suppliers.reduce((s,x)=>s+x.leadTimeDays,0)/Math.max(1,suppliers.length))}d`, color:"cyan", icon:<Truck className="w-4 h-4"/>},
        ].map(({label,value,color,icon})=>(
          <Card key={label} className={`border-l-4 border-l-${color}-500`}>
            <CardContent className="p-4">
              <div className={`flex items-center gap-1.5 text-xs font-medium text-${color}-600 mb-1`}>{icon}{label}</div>
              <div className={`text-2xl font-bold text-${color}-600`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="orders"    className="gap-1.5"><FileText className="w-3.5 h-3.5"/>Purchase Orders</TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-1.5"><Building2 className="w-3.5 h-3.5"/>Supplier Directory</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5"/>Analytics</TabsTrigger>
        </TabsList>

        {/* ── Purchase Orders ──────────────────────────────────────── */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-52">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                  <Input placeholder="Search supplier or order ID…" value={searchTerm}
                    onChange={e=>setSearchTerm(e.target.value)} className="pl-10"/>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Status"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Supplier"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliers.map(s=><SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(statusFilter!=="all"||supplierFilter!=="all") && (
                  <Button variant="ghost" size="sm" onClick={()=>{setStatusFilter("all");setSupplierFilter("all");}}>
                    <X className="w-3.5 h-3.5 mr-1"/>Clear
                  </Button>
                )}
                <span className="text-xs text-gray-500 ml-auto">{filteredPOs.length} orders</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>PO ID</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPOs.length===0&&<TableRow><TableCell colSpan={10} className="text-center py-10 text-gray-400"><ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40"/>No purchase orders found</TableCell></TableRow>}
                  {filteredPOs.map(p=>{
                    const sup=suppliers.find(s=>s.name===p.supplier);
                    return(
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-semibold">{p.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">{p.supplier[0]}</div>
                          <div>
                            <div className="font-medium text-sm">{p.supplier}</div>
                            {sup&&<div className="text-xs text-gray-500">{sup.category}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">{format(new Date(p.date),"MMM d, yyyy")}</TableCell>
                      <TableCell><Badge variant="outline">{p.items.length} items</Badge></TableCell>
                      <TableCell className="text-sm">£{p.subtotal.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-gray-500">£{p.tax.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">£{p.total.toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{p.paymentMethod}</TableCell>
                      <TableCell>
                        {/* ── Inline status-change dropdown ── */}
                        <div className="relative">
                          <button
                            onClick={e=>{e.stopPropagation();setStatusDropdownId(statusDropdownId===p.id?null:p.id);}}
                            className={cn(
                              "inline-flex items-center gap-1 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full transition-opacity hover:opacity-80",
                              statusColors[p.status]||"bg-gray-500"
                            )}
                          >
                            {p.status}
                            <ChevronDown className="w-2.5 h-2.5"/>
                          </button>
                          {statusDropdownId===p.id&&(
                            <div
                              className="absolute left-0 top-7 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[160px]"
                              onClick={e=>e.stopPropagation()}
                            >
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 pt-1.5 pb-1">Change Status</p>
                              {([
                                {key:"pending",    label:"Pending",    icon:"🕐", desc:"Awaiting action"},
                                {key:"ordered",    label:"Ordered",    icon:"📦", desc:"PO sent to supplier"},
                                {key:"in_transit", label:"In Transit", icon:"🚚", desc:"Shipment en route"},
                                {key:"received",   label:"Received",   icon:"📬", desc:"Goods arrived"},
                                {key:"completed",  label:"Completed",  icon:"✅", desc:"Fully processed"},
                                {key:"cancelled",  label:"Cancelled",  icon:"❌", desc:"Order cancelled"},
                              ] as const).map(({key,label,icon,desc})=>(
                                <button
                                  key={key}
                                  disabled={p.status===key}
                                  onClick={()=>{
                                    const prev=p.status;
                                    updatePurchase(p.id,{status:key});
                                    // update stock when moving TO completed/received (only once)
                                    if((key==="completed"||key==="received")&&prev!=="completed"&&prev!=="received"){
                                      p.items.forEach(i=>{const pr=products.find(x=>x.id===i.productId);if(pr)updateProductStock(pr.id,pr.stock+i.quantity);});
                                    }
                                    toast.success(`PO ${p.id} → ${label}`,{description:desc});
                                    setStatusDropdownId(null);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs hover:bg-gray-50 transition-colors",
                                    p.status===key?"opacity-40 cursor-not-allowed":""
                                  )}
                                >
                                  <span>{icon}</span>
                                  <div>
                                    <p className={cn("font-semibold",
                                      key==="completed"?"text-emerald-700":
                                      key==="cancelled"?"text-red-600":
                                      key==="in_transit"?"text-purple-700":
                                      key==="received"?"text-teal-700":
                                      key==="ordered"?"text-blue-700":
                                      "text-amber-700"
                                    )}>{label}</p>
                                    <p className="text-[10px] text-gray-400">{desc}</p>
                                  </div>
                                  {p.status===key&&<span className="ml-auto text-[10px] text-gray-400">current</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5 items-center">
                          <Button size="sm" variant="ghost" onClick={()=>{setViewPurchase(p);setIsViewPOOpen(true);}}>
                            <Eye className="w-3.5 h-3.5 text-blue-600"/>
                          </Button>
                          <Button size="sm" variant="ghost" title="Send / Share PO" onClick={()=>setSendSharePO(p)}>
                            <Share2 className="w-3.5 h-3.5 text-indigo-600"/>
                          </Button>
                          {(()=>{
                            const captureId = p.notes?.match(/\[captured:(cap-[0-9]+)\]/)?.[1];
                            const docInfo = captureId ? poDocuments[captureId] : null;
                            return docInfo ? (
                              <Button
                                size="sm" variant="ghost"
                                title="View captured document"
                                onClick={()=>{ setViewDocInfo(docInfo); setDocZoom(100); setIsViewDocOpen(true); }}
                              >
                                <Paperclip className="w-3.5 h-3.5 text-violet-600"/>
                              </Button>
                            ) : null;
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Supplier Directory ───────────────────────────────────── */}
        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
              <Input placeholder="Search suppliers…" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="pl-10"/>
            </div>
            <span className="text-xs text-gray-500">{filteredSuppliers.length} suppliers</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSuppliers.map(s=>{
              const stats=supplierStats[s.name]||{orders:0,spent:0};
              const isActive=s.status==="active";
              return(
              <Card key={s.id} className={cn("border-2 transition-shadow hover:shadow-md",
                s.status==="blacklisted"?"border-red-200":s.status==="inactive"?"border-gray-200":"border-transparent hover:border-blue-200")}>
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white",
                        s.status==="active"?"bg-gradient-to-br from-blue-500 to-indigo-600":"bg-gray-400")}>
                        {s.name[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{s.name}</div>
                        <div className="text-xs text-gray-500">{s.company}</div>
                        <RatingStars n={s.rating}/>
                      </div>
                    </div>
                    <Badge className={cn("text-[10px] text-white",statusColors[s.status]||"bg-gray-500")}>{s.status}</Badge>
                  </div>

                  {/* Contact info */}
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5"><Users className="w-3 h-3 text-gray-400"/>{s.contactPerson}</div>
                    <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-gray-400"/>{s.email}</div>
                    <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-400"/>{s.phone}</div>
                    <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-gray-400"/>{s.city}, {s.country}</div>
                    {s.website&&<div className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-gray-400"/>{s.website}</div>}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">{s.category}</Badge>
                    <Badge variant="outline" className="text-[10px]">{paymentTermsLabel[s.paymentTerms]}</Badge>
                    <Badge variant="outline" className="text-[10px] flex items-center gap-0.5"><Truck className="w-2.5 h-2.5"/>{s.leadTimeDays}d lead</Badge>
                    <Badge variant="outline" className="text-[10px]">{s.currency}</Badge>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 border-t pt-2">
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-blue-600 font-medium">Orders</div>
                      <div className="font-bold text-blue-700">{stats.orders}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-green-600 font-medium">Spent</div>
                      <div className="font-bold text-green-700">£{stats.spent.toFixed(0)}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={()=>{setSelectedSupplier(s);setIsViewSupOpen(true);}}>
                      <Eye className="w-3 h-3"/>View
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={()=>openEditSupplier(s)}>
                      <Edit className="w-3 h-3"/>Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                      onClick={()=>{setPoForm(f=>({...f,supplierId:s.id}));setIsAddPOOpen(true);}}>
                      <Plus className="w-3.5 h-3.5"/>
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                      onClick={()=>handleDeleteSupplier(s.id)}>
                      <Trash2 className="w-3.5 h-3.5"/>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        </TabsContent>

        {/* ── Analytics ────────────────────────────────────────────── */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Spend by supplier */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4 text-blue-600"/>Spend by Supplier</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={spendChartData} margin={{top:5,right:10,left:-10,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="name" tick={{fontSize:11}}/>
                    <YAxis tick={{fontSize:11}} tickFormatter={v=>`£${v}`}/>
                    <Tooltip formatter={(v:number)=>[`£${v}`,""]}/>
                    <Bar dataKey="spent" fill="#3b82f6" radius={[4,4,0,0]} name="Spent"/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Supplier categories */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-600"/>Suppliers by Category</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                      dataKey="value" nameKey="name" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                      labelLine={false} fontSize={10}>
                      {categoryData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Suppliers Table */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="w-4 h-4 text-amber-600"/>Supplier Performance Overview</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow className="bg-gray-50">
                    <TableHead>Supplier</TableHead><TableHead>Category</TableHead>
                    <TableHead>Status</TableHead><TableHead>Rating</TableHead>
                    <TableHead className="text-center">Lead Time</TableHead>
                    <TableHead className="text-center">PO Count</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead>Payment Terms</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {suppliers.sort((a,b)=>(supplierStats[b.name]?.spent||0)-(supplierStats[a.name]?.spent||0)).map(s=>{
                      const st=supplierStats[s.name]||{orders:0,spent:0};
                      return(
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">{s.name[0]}</div>
                            <div>
                              <div className="font-medium text-sm">{s.name}</div>
                              <div className="text-xs text-gray-500">{s.contactPerson}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{s.category}</Badge></TableCell>
                        <TableCell><Badge className={cn("text-white text-[10px]",statusColors[s.status]||"bg-gray-400")}>{s.status}</Badge></TableCell>
                        <TableCell><RatingStars n={s.rating}/></TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Truck className="w-3 h-3 text-gray-400"/><span className="text-sm">{s.leadTimeDays}d</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{st.orders}</TableCell>
                        <TableCell className="text-right font-bold text-green-700">£{st.spent.toFixed(2)}</TableCell>
                        <TableCell className="text-xs">{paymentTermsLabel[s.paymentTerms]}</TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ════ CREATE PO DIALOG ════════════════════════════════════════ */}
      <Dialog open={isAddPOOpen} onOpenChange={resetPO}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-blue-600"/>New Purchase Order</DialogTitle>
            <DialogDescription>Create a purchase order and optionally update stock when completed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Supplier *</Label>
                <Select value={poForm.supplierId} onValueChange={v=>setPoForm(f=>({...f,supplierId:v}))}>
                  <SelectTrigger><SelectValue placeholder="Select supplier…"/></SelectTrigger>
                  <SelectContent>
                    {suppliers.filter(s=>s.status==="active").map(s=>(
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <span>{s.name}</span><span className="text-xs text-gray-400">· {s.leadTimeDays}d lead</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {poForm.supplierId&&(()=>{const s=suppliers.find(x=>x.id===poForm.supplierId);return s?(
                  <div className="mt-1 bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700 space-y-0.5">
                    <div className="flex items-center gap-1"><Mail className="w-3 h-3"/>{s.email}</div>
                    <div className="flex items-center gap-1"><Phone className="w-3 h-3"/>{s.phone}</div>
                    <div className="flex items-center gap-1"><CreditCard className="w-3 h-3"/>{paymentTermsLabel[s.paymentTerms]}</div>
                  </div>
                ):null;})()}
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Payment Method</Label>
                  <Select value={poForm.paymentMethod} onValueChange={v=>setPoForm(f=>({...f,paymentMethod:v}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {["Cash","Card","Bank Transfer","Cheque","Credit","Crypto"].map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={poForm.status} onValueChange={v=>setPoForm(f=>({...f,status:v as any}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed (update stock)</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Purchase Items *</Label>
                <Button size="sm" onClick={addPOItem} className="h-7 text-xs gap-1">
                  <Plus className="w-3 h-3"/>Add Item
                </Button>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {poItems.map((item,i)=>(
                  <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-lg bg-gray-50">
                    <div className="col-span-5 space-y-0.5">
                      <Label className="text-[10px]">Product</Label>
                      <Select value={item.productId} onValueChange={v=>updatePOItem(i,"productId",v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select…"/></SelectTrigger>
                        <SelectContent>{products.map(p=><SelectItem key={p.id} value={p.id}><span className="text-xs">{p.name}</span></SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-0.5">
                      <Label className="text-[10px]">Qty</Label>
                      <Input type="number" className="h-8 text-xs" value={item.quantity} onChange={e=>updatePOItem(i,"quantity",e.target.value)} placeholder="0"/>
                    </div>
                    <div className="col-span-3 space-y-0.5">
                      <Label className="text-[10px]">Cost Price (£)</Label>
                      <Input type="number" step="0.01" className="h-8 text-xs" value={item.costPrice} onChange={e=>updatePOItem(i,"costPrice",e.target.value)} placeholder="0.00"/>
                    </div>
                    <div className="col-span-1 text-xs text-gray-600 font-semibold">
                      £{((parseInt(item.quantity)||0)*(parseFloat(item.costPrice)||0)).toFixed(2)}
                    </div>
                    <div className="col-span-1">
                      <Button size="sm" variant="ghost" onClick={()=>removePOItem(i)} className="h-7 w-7 p-0 text-red-500"><Trash2 className="w-3.5 h-3.5"/></Button>
                    </div>
                  </div>
                ))}
                {!poItems.length&&<div className="text-center py-6 text-gray-400 text-sm border border-dashed rounded-lg">Click "Add Item" to start adding products</div>}
              </div>
            </div>

            {/* Totals */}
            {poItems.length>0&&(
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal:</span><span className="font-semibold">£{poSubtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Tax (8%):</span><span className="font-semibold">£{(poSubtotal*0.08).toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Total:</span><span className="text-blue-700">£{(poSubtotal*1.08).toFixed(2)}</span></div>
              </div>
            )}

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea placeholder="Optional notes…" value={poForm.notes} rows={2} onChange={e=>setPoForm(f=>({...f,notes:e.target.value}))}/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetPO}>Cancel</Button>
            <Button onClick={handleCreatePO} className="bg-blue-600 hover:bg-blue-700">Create Purchase Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ VIEW PO DIALOG ════════════════════════════════════════ */}
      <Dialog open={isViewPOOpen} onOpenChange={()=>setIsViewPOOpen(false)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Purchase Order Details</DialogTitle>
                <DialogDescription>Full purchase order information</DialogDescription>
              </div>
              {viewPurchase && (
                <Button
                  size="sm"
                  onClick={()=>{setSendSharePO(viewPurchase);setIsViewPOOpen(false);}}
                  className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Share2 className="w-3.5 h-3.5"/>Send / Share
                </Button>
              )}
            </div>
          </DialogHeader>
          {viewPurchase&&(
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl grid grid-cols-3 gap-4">
                {[
                  {l:"PO ID",        v:viewPurchase.id},
                  {l:"Supplier",     v:viewPurchase.supplier},
                  {l:"Date",         v:format(new Date(viewPurchase.date),"MMM d, yyyy")},
                  {l:"Payment",      v:viewPurchase.paymentMethod},
                  {l:"Status",       v:null,badge:viewPurchase.status},
                  {l:"Items",        v:`${viewPurchase.items.length} items`},
                ].map(({l,v,badge})=>(
                  <div key={l}><p className="text-xs text-gray-500 mb-0.5">{l}</p>
                    {badge?<Badge className={cn("text-white",statusColors[badge]||"bg-gray-500")}>{badge}</Badge>:<p className="font-semibold text-sm">{v}</p>}
                  </div>
                ))}
              </div>
              {viewPurchase.notes&&<div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-800">{viewPurchase.notes}</div>}
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {viewPurchase.items.map((item,i)=>(
                    <TableRow key={i}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">£{item.costPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">£{item.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>£{viewPurchase.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span>Tax</span><span>£{viewPurchase.tax.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Total</span><span className="text-blue-700">£{viewPurchase.total.toFixed(2)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ════ SUPPLIER VIEW DIALOG ════════════════════════════════════ */}
      <Dialog open={isViewSupOpen} onOpenChange={()=>setIsViewSupOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-600"/>{selectedSupplier?.name}</DialogTitle>
          </DialogHeader>
          {selectedSupplier&&(
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white">{selectedSupplier.name[0]}</div>
                <div>
                  <div className="font-bold">{selectedSupplier.company}</div>
                  <div className="text-sm text-gray-600">{selectedSupplier.category}</div>
                  <RatingStars n={selectedSupplier.rating}/>
                </div>
                <Badge className={cn("ml-auto text-white",statusColors[selectedSupplier.status]||"bg-gray-500")}>{selectedSupplier.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  {icon:<Users className="w-3.5 h-3.5"/>,    label:"Contact",  v:selectedSupplier.contactPerson},
                  {icon:<Mail className="w-3.5 h-3.5"/>,     label:"Email",    v:selectedSupplier.email},
                  {icon:<Phone className="w-3.5 h-3.5"/>,    label:"Phone",    v:selectedSupplier.phone},
                  {icon:<MapPin className="w-3.5 h-3.5"/>,   label:"Location", v:`${selectedSupplier.city}, ${selectedSupplier.country}`},
                  {icon:<Truck className="w-3.5 h-3.5"/>,    label:"Lead Time",v:`${selectedSupplier.leadTimeDays} days`},
                  {icon:<CreditCard className="w-3.5 h-3.5"/>,label:"Payment", v:paymentTermsLabel[selectedSupplier.paymentTerms]},
                  {icon:<Hash className="w-3.5 h-3.5"/>,     label:"Tax No.",  v:selectedSupplier.taxNumber||"—"},
                  {icon:<Globe className="w-3.5 h-3.5"/>,    label:"Website",  v:selectedSupplier.website||"—"},
                ].map(({icon,label,v})=>(
                  <div key={label} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-400 mt-0.5">{icon}</span>
                    <div><div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div><div className="font-medium text-xs">{v}</div></div>
                  </div>
                ))}
              </div>
              {selectedSupplier.notes&&<div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">{selectedSupplier.notes}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-blue-600 font-medium">Total Orders</div>
                  <div className="text-2xl font-bold text-blue-700">{supplierStats[selectedSupplier.name]?.orders||0}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-green-600 font-medium">Total Spent</div>
                  <div className="text-2xl font-bold text-green-700">£{(supplierStats[selectedSupplier.name]?.spent||0).toFixed(0)}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={()=>setIsViewSupOpen(false)}>Close</Button>
            <Button className="gap-1.5" onClick={()=>{setIsViewSupOpen(false);if(selectedSupplier)openEditSupplier(selectedSupplier);}}>
              <Edit className="w-4 h-4"/>Edit Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ ADD / EDIT SUPPLIER DIALOG ══════════════════════════════ */}
      {[{open:isAddSupOpen,setOpen:setIsAddSupOpen,title:"Add New Supplier"},{open:isEditSupOpen,setOpen:setIsEditSupOpen,title:"Edit Supplier"}].map(({open,setOpen,title})=>(
        <Dialog key={title} open={open} onOpenChange={v=>{setOpen(v);if(!v){setEditingSupId(null);setSupForm(blankSup());}}}>
          <DialogContent className="sm:max-w-[620px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-purple-600"/>{title}</DialogTitle>
              <DialogDescription>Fill in supplier details. Fields marked * are required.</DialogDescription>
            </DialogHeader>
            <SupplierForm/>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveSupplier} className="bg-purple-600 hover:bg-purple-700">
                {editingSupId?"Update":"Add"} Supplier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}

      {/* ════ AUTO CAPTURE DIALOG ═══════════════════════════════════════ */}
      <DocumentCaptureDialog
        open={isCaptureOpen}
        onClose={()=>setIsCaptureOpen(false)}
        suppliers={suppliers}
        onCreatePO={(data)=>{
          const captureId = `cap-${Date.now()}`;
          if (data.fileUrl && data.fileName) {
            setPoDocuments(prev => ({
              ...prev,
              [captureId]: { url: data.fileUrl!, type: data.fileType || "image/jpeg", name: data.fileName! },
            }));
          }
          addPurchase({
            supplier: data.supplierName,
            items: data.lineItems.map(li=>({
              productId: "",
              productName: li.description,
              quantity: li.quantity,
              costPrice: li.unitPrice,
              total: li.total,
            })),
            subtotal: data.subtotal,
            tax: data.tax,
            total: data.total,
            paymentMethod: data.paymentMethod,
            date: new Date(data.date || Date.now()),
            status: "pending",
            notes: [
              data.notes,
              data.fileUrl ? `[captured:${captureId}]` : "",
            ].filter(Boolean).join("\n") || undefined,
          });
          toast.success(`Purchase order imported from ${data.supplierName}`, {
            description: `Ref: ${data.invoiceNumber} · Total: £${data.total.toFixed(2)} · ${data.lineItems.length} line items`,
          });
        }}
      />

      {/* ════ VIEW DOCUMENT DIALOG ═══════════════════════════════════════ */}
      <Dialog open={isViewDocOpen} onOpenChange={v=>{ setIsViewDocOpen(v); if(!v) setDocZoom(100); }}>
        <DialogContent className="p-0 gap-0 overflow-hidden flex flex-col" style={{ maxWidth:"860px", height:"90vh", maxHeight:"90vh" }}>
          <DialogHeader className="sr-only">
            <DialogTitle>Document Viewer</DialogTitle>
            <DialogDescription>View the uploaded purchase document.</DialogDescription>
          </DialogHeader>
          {viewDocInfo && (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-3 px-5 py-3 border-b bg-gray-50 shrink-0">
                {viewDocInfo.type === "application/pdf"
                  ? <FileText className="w-5 h-5 text-red-500 shrink-0"/>
                  : <FileImage className="w-5 h-5 text-blue-500 shrink-0"/>
                }
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{viewDocInfo.name}</p>
                  <p className="text-[11px] text-gray-400">{viewDocInfo.type}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {viewDocInfo.type === "application/pdf" ? "PDF" : (viewDocInfo.type.split("/")[1]||"IMG").toUpperCase()}
                </Badge>
                {viewDocInfo.type !== "application/pdf" && (
                  <div className="flex items-center gap-1 border rounded-lg px-2 py-1 bg-white">
                    <button className="text-gray-500 hover:text-gray-900 disabled:opacity-30" disabled={docZoom<=30} onClick={()=>setDocZoom(z=>Math.max(30,z-10))}><ZoomOut className="w-4 h-4"/></button>
                    <span className="text-xs font-semibold text-gray-600 min-w-[38px] text-center">{docZoom}%</span>
                    <button className="text-gray-500 hover:text-gray-900 disabled:opacity-30" disabled={docZoom>=200} onClick={()=>setDocZoom(z=>Math.min(200,z+10))}><ZoomIn className="w-4 h-4"/></button>
                  </div>
                )}
                <a href={viewDocInfo.url} download={viewDocInfo.name} className="shrink-0">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs"><Download className="w-3.5 h-3.5"/>Download</Button>
                </a>
                <button onClick={()=>setIsViewDocOpen(false)} className="text-gray-400 hover:text-gray-700 shrink-0"><X className="w-5 h-5"/></button>
              </div>

              {/* Viewer body */}
              <div className={cn(
                "flex-1 overflow-auto bg-gray-100",
                viewDocInfo.type !== "application/pdf" && "flex items-center justify-center p-6"
              )}>
                {viewDocInfo.type === "application/pdf" ? (
                  <iframe
                    src={`${viewDocInfo.url}#toolbar=1&navpanes=1`}
                    title={viewDocInfo.name}
                    className="w-full h-full border-0 bg-white"
                  />
                ) : (
                  <div className="transition-transform duration-150 origin-center" style={{ transform:`scale(${docZoom/100})` }}>
                    <img
                      src={viewDocInfo.url}
                      alt={viewDocInfo.name}
                      className="max-w-full rounded-xl shadow-lg border border-gray-200 block"
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t bg-gray-50 shrink-0 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5"/>Captured document attached to this purchase order</span>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={()=>setIsViewDocOpen(false)}>Close</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ════ SEND / SHARE PO DIALOG ════════════════════════════════ */}
      <SendShareDialog
        open={sendSharePO !== null}
        onClose={()=>setSendSharePO(null)}
        type="purchase"
        purchase={sendSharePO}
      />
    </div>
  );
}