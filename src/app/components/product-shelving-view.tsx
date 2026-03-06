import { useState, useMemo } from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  Archive, Grid3x3, MapPin, Package, Search, Plus, Edit, Trash2,
  Box, Layers, Map, Tag, AlertTriangle, CheckCircle2, LayoutGrid,
  Filter, ArrowRightLeft, Printer, ClipboardList, Bell, History,
  BarChart3, Smartphone, ChevronRight, RefreshCw, Download, Eye,
  Star, Zap, TrendingDown, Move, ScanLine, Info, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/app/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/app/components/ui/utils";

// ─── Types ──────────────────────────────────────────────────────────────────
interface ShelfLocation {
  id: string; aisle: string; rack: string; shelf: string; bin: string;
  fullCode: string; capacity: number; currentOccupancy: number;
  zone: string; temperature?: "ambient" | "cold" | "frozen";
  status: "available" | "occupied" | "reserved" | "maintenance";
}

interface ProductShelfMapping {
  id: string; productId: string; productName: string; productSKU: string;
  shelfLocation: ShelfLocation; quantity: number; isPrimaryLocation: boolean;
  lastRestocked: Date; partType: string; brand: string; model: string;
  minQuantity: number; reorderPoint: number;
}

interface AuditEntry {
  id: string; action: "added" | "removed" | "transferred" | "restocked" | "updated";
  productName: string; productSKU: string;
  fromShelf?: string; toShelf?: string;
  quantity: number; timestamp: Date; user: string; notes?: string;
}

// ─── Static data ─────────────────────────────────────────────────────────────
const PART_TYPES = [
  "Screen / LCD", "Battery", "Back Cover", "Camera Module", "Charging Port",
  "Speaker", "Flex Cable", "Frame / Housing", "Headphone Jack", "Volume Button",
  "Power Button", "SIM Tray", "Screen Protector", "Phone Case",
  "Charger / Adapter", "USB Cable", "Repair Tool", "Adhesive / Glue",
];

const BRANDS = [
  "Apple", "Samsung", "Huawei", "Google", "OnePlus",
  "Xiaomi", "Sony", "Motorola", "Nokia", "Universal",
];

const ZONE_COLORS: Record<string, string> = {
  "Zone A": "blue",   "Zone B": "purple", "Zone C": "green",
  "Zone D": "orange", "Zone E": "pink",   "Zone F": "cyan",
};

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

const initShelves: ShelfLocation[] = [
  { id:"s1",  aisle:"A", rack:"01", shelf:"1", bin:"A", fullCode:"A-01-1-A", capacity:60,  currentOccupancy:55, zone:"Zone A", temperature:"ambient", status:"occupied"  },
  { id:"s2",  aisle:"A", rack:"01", shelf:"2", bin:"B", fullCode:"A-01-2-B", capacity:60,  currentOccupancy:30, zone:"Zone A", temperature:"ambient", status:"occupied"  },
  { id:"s3",  aisle:"A", rack:"02", shelf:"1", bin:"A", fullCode:"A-02-1-A", capacity:60,  currentOccupancy:0,  zone:"Zone A", temperature:"ambient", status:"available" },
  { id:"s4",  aisle:"A", rack:"02", shelf:"2", bin:"B", fullCode:"A-02-2-B", capacity:60,  currentOccupancy:45, zone:"Zone A", temperature:"ambient", status:"occupied"  },
  { id:"s5",  aisle:"B", rack:"01", shelf:"1", bin:"A", fullCode:"B-01-1-A", capacity:80,  currentOccupancy:70, zone:"Zone B", temperature:"ambient", status:"occupied"  },
  { id:"s6",  aisle:"B", rack:"01", shelf:"2", bin:"B", fullCode:"B-01-2-B", capacity:80,  currentOccupancy:25, zone:"Zone B", temperature:"ambient", status:"occupied"  },
  { id:"s7",  aisle:"B", rack:"02", shelf:"1", bin:"A", fullCode:"B-02-1-A", capacity:80,  currentOccupancy:0,  zone:"Zone B", temperature:"ambient", status:"available" },
  { id:"s8",  aisle:"C", rack:"01", shelf:"1", bin:"A", fullCode:"C-01-1-A", capacity:100, currentOccupancy:90, zone:"Zone C", temperature:"ambient", status:"occupied"  },
  { id:"s9",  aisle:"C", rack:"01", shelf:"2", bin:"B", fullCode:"C-01-2-B", capacity:100, currentOccupancy:40, zone:"Zone C", temperature:"ambient", status:"occupied"  },
  { id:"s10", aisle:"C", rack:"02", shelf:"1", bin:"A", fullCode:"C-02-1-A", capacity:100, currentOccupancy:0,  zone:"Zone C", temperature:"ambient", status:"available" },
  { id:"s11", aisle:"D", rack:"01", shelf:"1", bin:"A", fullCode:"D-01-1-A", capacity:50,  currentOccupancy:20, zone:"Zone D", temperature:"ambient", status:"occupied"  },
  { id:"s12", aisle:"D", rack:"01", shelf:"2", bin:"B", fullCode:"D-01-2-B", capacity:50,  currentOccupancy:0,  zone:"Zone D", temperature:"ambient", status:"available" },
  { id:"s13", aisle:"E", rack:"01", shelf:"1", bin:"A", fullCode:"E-01-1-A", capacity:40,  currentOccupancy:15, zone:"Zone E", temperature:"ambient", status:"occupied"  },
  { id:"s14", aisle:"E", rack:"01", shelf:"2", bin:"B", fullCode:"E-01-2-B", capacity:40,  currentOccupancy:0,  zone:"Zone E", temperature:"ambient", status:"maintenance"},
  { id:"s15", aisle:"F", rack:"01", shelf:"1", bin:"A", fullCode:"F-01-1-A", capacity:60,  currentOccupancy:10, zone:"Zone F", temperature:"cold",    status:"occupied"  },
];

const mkMapping = (
  id: string, productId: string, name: string, sku: string,
  shelf: ShelfLocation, qty: number, primary: boolean,
  restocked: string, partType: string, brand: string, model: string,
  minQty: number, reorderPt: number
): ProductShelfMapping => ({
  id, productId, productName: name, productSKU: sku,
  shelfLocation: shelf, quantity: qty, isPrimaryLocation: primary,
  lastRestocked: new Date(restocked), partType, brand, model,
  minQuantity: minQty, reorderPoint: reorderPt,
});

const s = initShelves;
const initMappings: ProductShelfMapping[] = [
  mkMapping("pm1",  "1",  "iPhone 15 Pro Max Screen – OLED",         "SCRN-IP15PM-001", s[0],  55, true,  "2026-01-15", "Screen / LCD",   "Apple",   "iPhone 15 Pro Max", 10, 20),
  mkMapping("pm2",  "2",  "iPhone 15 Battery 4422mAh",               "BATT-IP15-001",   s[1],  30, true,  "2026-01-18", "Battery",        "Apple",   "iPhone 15",         8,  15),
  mkMapping("pm3",  "3",  "Samsung S24 Ultra Screen – AMOLED",       "SCRN-S24U-001",   s[3],  45, true,  "2026-01-20", "Screen / LCD",   "Samsung", "Galaxy S24 Ultra",  10, 18),
  mkMapping("pm4",  "4",  "Samsung S24 Battery 5000mAh",             "BATT-S24-001",    s[4],  70, true,  "2026-01-22", "Battery",        "Samsung", "Galaxy S24",        10, 20),
  mkMapping("pm5",  "5",  "iPhone 14 Pro Back Glass – Black",        "BACK-IP14P-001",  s[4],   5, false, "2025-12-10", "Back Cover",     "Apple",   "iPhone 14 Pro",     5,  10),
  mkMapping("pm6",  "6",  "Samsung S23 Charging Port Flex",          "PORT-S23-001",    s[5],  25, true,  "2026-01-25", "Charging Port",  "Samsung", "Galaxy S23",        5,  12),
  mkMapping("pm7",  "7",  "iPhone 13 Camera Module (Rear)",          "CAM-IP13-001",    s[7],  90, true,  "2026-02-01", "Camera Module",  "Apple",   "iPhone 13",         8,  15),
  mkMapping("pm8",  "8",  "Huawei P60 Pro Screen",                   "SCRN-HWP60-001",  s[7],  15, false, "2026-01-05", "Screen / LCD",   "Huawei",  "P60 Pro",           5,  10),
  mkMapping("pm9",  "9",  "Google Pixel 8 Battery",                  "BATT-PIX8-001",   s[8],  40, true,  "2026-01-30", "Battery",        "Google",  "Pixel 8",           8,  15),
  mkMapping("pm10", "10", "OnePlus 12 Speaker Module",               "SPK-OP12-001",    s[8],   8, true,  "2025-12-20", "Speaker",        "OnePlus", "OnePlus 12",        3,  8),
  mkMapping("pm11", "11", "Xiaomi 14 Pro Charging Port USB-C",       "PORT-MI14-001",   s[10],  0, true,  "2025-11-30", "Charging Port",  "Xiaomi",  "Xiaomi 14 Pro",     5,  10),
  mkMapping("pm12", "12", "iPhone 15 Power Button Flex Cable",       "FLEX-IP15-001",   s[10],  0, true,  "2025-12-05", "Flex Cable",     "Apple",   "iPhone 15",         5,  8),
  mkMapping("pm13", "13", "Samsung S24 Frame / Housing – Black",     "FRAM-S24-001",    s[10], 20, true,  "2026-02-05", "Frame / Housing","Samsung", "Galaxy S24",        5,  10),
  mkMapping("pm14", "14", "Universal Screen Protector 6.7\"",        "PROT-UNI-001",    s[11], 20, true,  "2026-01-28", "Screen Protector","Universal","All Models",     15, 30),
  mkMapping("pm15", "15", "iPhone 14 Volume Button Set",             "VOL-IP14-001",    s[12], 15, true,  "2026-01-10", "Volume Button",  "Apple",   "iPhone 14",         4,  8),
  mkMapping("pm16", "16", "Samsung Foldable Z Fold 5 Hinge",         "HINGE-ZF5-001",   s[12],  3, true,  "2025-12-15", "Frame / Housing","Samsung", "Galaxy Z Fold 5",  3,  6),
  mkMapping("pm17", "17", "iPhone 13 SIM Tray – Midnight",           "SIM-IP13-001",    s[13],  0, false, "2025-11-20", "SIM Tray",       "Apple",   "iPhone 13",         5,  8),
  mkMapping("pm18", "18", "Motorola G84 Screen LCD",                 "SCRN-MOG84-001",  s[13], 10, true,  "2026-01-12", "Screen / LCD",   "Motorola","Moto G84",          5,  10),
];

const initAudit: AuditEntry[] = [
  { id:"a1", action:"added",       productName:"iPhone 15 Pro Max Screen", productSKU:"SCRN-IP15PM-001", toShelf:"A-01-1-A", quantity:55, timestamp:new Date("2026-01-15T09:30:00"), user:"Admin" },
  { id:"a2", action:"restocked",   productName:"Samsung S24 Ultra Screen", productSKU:"SCRN-S24U-001",  toShelf:"A-02-2-B", quantity:20, timestamp:new Date("2026-01-20T11:00:00"), user:"Admin" },
  { id:"a3", action:"transferred", productName:"Huawei P60 Pro Screen",    productSKU:"SCRN-HWP60-001", fromShelf:"B-02-1-A", toShelf:"C-01-1-A", quantity:15, timestamp:new Date("2026-01-22T14:15:00"), user:"Admin" },
  { id:"a4", action:"removed",     productName:"iPhone 14 Pro Back Glass", productSKU:"BACK-IP14P-001", fromShelf:"B-01-1-A", quantity:10, timestamp:new Date("2026-01-25T10:45:00"), user:"Admin", notes:"Sold out – shelf space freed" },
  { id:"a5", action:"added",       productName:"Google Pixel 8 Battery",   productSKU:"BATT-PIX8-001",  toShelf:"C-01-2-B",  quantity:40, timestamp:new Date("2026-01-30T08:00:00"), user:"Admin" },
];

// ─── Status helpers ──────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  available:   "bg-emerald-500 text-white",
  occupied:    "bg-blue-500 text-white",
  reserved:    "bg-amber-500 text-white",
  maintenance: "bg-gray-500 text-white",
};
const zoneColor = (zone: string) => ZONE_COLORS[zone] ?? "gray";

// ─── Component ────────────────────────────────────────────────────────────────
export function ProductShelvingView() {
  const { products } = usePOS();

  // ─ State ─
  const [shelves,         setShelves]         = useState<ShelfLocation[]>(initShelves);
  const [mappings,        setMappings]        = useState<ProductShelfMapping[]>(initMappings);
  const [auditLog,        setAuditLog]        = useState<AuditEntry[]>(initAudit);

  const [searchQuery,     setSearchQuery]     = useState("");
  const [filterZone,      setFilterZone]      = useState("all");
  const [filterBrand,     setFilterBrand]     = useState("all");
  const [filterPartType,  setFilterPartType]  = useState("all");
  const [filterStatus,    setFilterStatus]    = useState("all");
  const [activeTab,       setActiveTab]       = useState("mappings");

  // Dialogs
  const [isShelfDialogOpen,    setIsShelfDialogOpen]    = useState(false);
  const [isMappingDialogOpen,  setIsMappingDialogOpen]  = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isLabelDialogOpen,    setIsLabelDialogOpen]    = useState(false);
  const [isQuickLocateOpen,    setIsQuickLocateOpen]    = useState(false);
  const [isRestockDialogOpen,  setIsRestockDialogOpen]  = useState(false);

  const [selectedShelf,   setSelectedShelf]   = useState<ShelfLocation | null>(null);
  const [selectedMapping, setSelectedMapping] = useState<ProductShelfMapping | null>(null);
  const [highlightShelf,  setHighlightShelf]  = useState<string | null>(null);

  // Forms
  const [shelfForm, setShelfForm] = useState({
    aisle:"", rack:"", shelf:"", bin:"", capacity:50,
    zone:"Zone A", temperature:"ambient" as "ambient"|"cold"|"frozen",
    status:"available" as ShelfLocation["status"],
  });
  const [mappingForm, setMappingForm] = useState({
    productId:"", shelfId:"", quantity:0, isPrimaryLocation:true,
    partType:"", brand:"", model:"", minQuantity:5, reorderPoint:10,
  });
  const [transferForm, setTransferForm] = useState({
    fromShelfId:"", toShelfId:"", quantity:1,
  });
  const [restockQty, setRestockQty] = useState(20);


  // Add these alongside your existing dialog states
const [deleteShelfDialog, setDeleteShelfDialog] = useState<{ open: boolean; shelfId: string; shelfCode: string }>({
  open: false,
  shelfId: "",
  shelfCode: "",
});

const [deleteMappingDialog, setDeleteMappingDialog] = useState<{ open: boolean; mappingId: string; productName: string }>({
  open: false,
  mappingId: "",
  productName: "",
});


const [shelfProductsDialog, setShelfProductsDialog] = useState<{
  open: boolean;
  shelf: ShelfLocation | null;
}>({
  open: false,
  shelf: null,
});
  // ─ Derived / computed ─
  const zones = useMemo(() => Array.from(new Set(shelves.map(s => s.zone))).sort(), [shelves]);
  const allBrands = useMemo(() => Array.from(new Set(mappings.map(m => m.brand))).sort(), [mappings]);
  const allPartTypes = useMemo(() => Array.from(new Set(mappings.map(m => m.partType))).sort(), [mappings]);

  const filteredMappings = useMemo(() => mappings.filter(m => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      m.productName.toLowerCase().includes(q) ||
      m.productSKU.toLowerCase().includes(q) ||
      m.shelfLocation.fullCode.toLowerCase().includes(q) ||
      m.brand.toLowerCase().includes(q) ||
      m.model.toLowerCase().includes(q);
    const matchZone    = filterZone     === "all" || m.shelfLocation.zone === filterZone;
    const matchBrand   = filterBrand    === "all" || m.brand === filterBrand;
    const matchPart    = filterPartType === "all" || m.partType === filterPartType;
    return matchSearch && matchZone && matchBrand && matchPart;
  }), [mappings, searchQuery, filterZone, filterBrand, filterPartType]);

  const filteredShelves = useMemo(() => shelves.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      s.fullCode.toLowerCase().includes(q) ||
      s.zone.toLowerCase().includes(q);
    const matchZone   = filterZone   === "all" || s.zone === filterZone;
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchZone && matchStatus;
  }), [shelves, searchQuery, filterZone, filterStatus]);

  const lowStockMappings = useMemo(() =>
    mappings.filter(m => m.quantity <= m.reorderPoint), [mappings]);

  const criticalMappings = useMemo(() =>
    mappings.filter(m => m.quantity === 0), [mappings]);

  // Stats
  const totalShelves     = shelves.length;
  const availableShelves = shelves.filter(s => s.status === "available").length;
  const occupiedShelves  = shelves.filter(s => s.status === "occupied").length;
  const totalCapacity    = shelves.reduce((s, x) => s + x.capacity, 0);
  const totalOccupancy   = shelves.reduce((s, x) => s + x.currentOccupancy, 0);
  const utilizationRate  = totalCapacity > 0 ? (totalOccupancy / totalCapacity) * 100 : 0;

  // Charts
  const zoneChartData = useMemo(() => zones.map(zone => {
    const zs = shelves.filter(s => s.zone === zone);
    const cap = zs.reduce((a, s) => a + s.capacity, 0);
    const occ = zs.reduce((a, s) => a + s.currentOccupancy, 0);
    return { zone: zone.replace("Zone ", "Z"), capacity: cap, occupancy: occ, utilization: cap > 0 ? Math.round(occ / cap * 100) : 0 };
  }), [zones, shelves]);

  const partTypeChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    mappings.forEach(m => { counts[m.partType] = (counts[m.partType] || 0) + m.quantity; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 8);
  }, [mappings]);

  const brandChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    mappings.forEach(m => { counts[m.brand] = (counts[m.brand] || 0) + m.quantity; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [mappings]);

  // ─ Helpers ─
  const addAudit = (entry: Omit<AuditEntry, "id" | "timestamp" | "user">) => {
    setAuditLog(prev => [{ ...entry, id:`a${Date.now()}`, timestamp:new Date(), user:"Admin" }, ...prev]);
  };

  const resetShelfForm  = () => setShelfForm({ aisle:"", rack:"", shelf:"", bin:"", capacity:50, zone:"Zone A", temperature:"ambient", status:"available" });
  const resetMappingForm = () => setMappingForm({ productId:"", shelfId:"", quantity:0, isPrimaryLocation:true, partType:"", brand:"", model:"", minQuantity:5, reorderPoint:10 });
  const resetTransferForm = () => setTransferForm({ fromShelfId:"", toShelfId:"", quantity:1 });

  // ─ Handlers ─
  const handleAddShelf = () => {
    if (!shelfForm.aisle || !shelfForm.rack || !shelfForm.shelf || !shelfForm.bin) {
      toast.error("Please fill all location fields"); return;
    }
    const fullCode = `${shelfForm.aisle}-${shelfForm.rack}-${shelfForm.shelf}-${shelfForm.bin}`;
    if (shelves.some(s => s.fullCode === fullCode)) { toast.error("This shelf location already exists"); return; }
    setShelves(prev => [...prev, { id:`s${Date.now()}`, ...shelfForm, fullCode, currentOccupancy:0 }]);
    setIsShelfDialogOpen(false); resetShelfForm();
    toast.success(`Shelf ${fullCode} added`);
  };

  const handleUpdateShelf = () => {
    if (!selectedShelf) return;
    const fullCode = `${shelfForm.aisle}-${shelfForm.rack}-${shelfForm.shelf}-${shelfForm.bin}`;
    setShelves(prev => prev.map(s => s.id === selectedShelf.id ? { ...s, ...shelfForm, fullCode } : s));
    setIsShelfDialogOpen(false); setSelectedShelf(null); resetShelfForm();
    toast.success("Shelf updated");
  };

  const handleDeleteShelf = (id: string) => {
    if (mappings.some(m => m.shelfLocation.id === id)) {
      toast.error("Cannot delete shelf with products. Remove products first."); return;
    }
    setShelves(prev => prev.filter(s => s.id !== id));
    toast.success("Shelf deleted");
  };

  const handleAddMapping = () => {
    if (!mappingForm.productId || !mappingForm.shelfId || mappingForm.quantity <= 0) {
      toast.error("Please fill all required fields"); return;
    }
    const product = products.find(p => p.id === mappingForm.productId);
    const shelf   = shelves.find(s => s.id === mappingForm.shelfId);
    if (!product || !shelf) { toast.error("Invalid product or shelf"); return; }
    if (shelf.currentOccupancy + mappingForm.quantity > shelf.capacity) {
      toast.error(`Shelf capacity exceeded (available: ${shelf.capacity - shelf.currentOccupancy})`); return;
    }
    const newM: ProductShelfMapping = {
      id: `pm${Date.now()}`,
      productId: product.id, productName: product.name, productSKU: product.sku,
      shelfLocation: shelf, quantity: mappingForm.quantity,
      isPrimaryLocation: mappingForm.isPrimaryLocation,
      lastRestocked: new Date(),
      partType: mappingForm.partType || "Other",
      brand: mappingForm.brand || "Universal",
      model: mappingForm.model || "—",
      minQuantity: mappingForm.minQuantity,
      reorderPoint: mappingForm.reorderPoint,
    };
    setMappings(prev => [...prev, newM]);
    setShelves(prev => prev.map(s => s.id === shelf.id
      ? { ...s, currentOccupancy: s.currentOccupancy + mappingForm.quantity, status:"occupied" as const }
      : s));
    addAudit({ action:"added", productName:product.name, productSKU:product.sku, toShelf:shelf.fullCode, quantity:mappingForm.quantity });
    setIsMappingDialogOpen(false); resetMappingForm();
    toast.success("Product mapped to shelf");
  };

  const handleRemoveMapping = (id: string) => {
    const m = mappings.find(x => x.id === id);
    if (!m) return;
    setShelves(prev => prev.map(s => s.id === m.shelfLocation.id
      ? { ...s, currentOccupancy: Math.max(0, s.currentOccupancy - m.quantity),
          status: s.currentOccupancy - m.quantity <= 0 ? "available" as const : s.status }
      : s));
    setMappings(prev => prev.filter(x => x.id !== id));
    addAudit({ action:"removed", productName:m.productName, productSKU:m.productSKU, fromShelf:m.shelfLocation.fullCode, quantity:m.quantity });
    toast.success("Mapping removed");
  };

  const handleTransfer = () => {
    if (!selectedMapping || !transferForm.toShelfId) { toast.error("Select a destination shelf"); return; }
    if (transferForm.quantity <= 0 || transferForm.quantity > selectedMapping.quantity) {
      toast.error(`Quantity must be between 1 and ${selectedMapping.quantity}`); return;
    }
    const toShelf = shelves.find(s => s.id === transferForm.toShelfId);
    if (!toShelf) return;
    if (toShelf.currentOccupancy + transferForm.quantity > toShelf.capacity) {
      toast.error("Destination shelf capacity exceeded"); return;
    }
    const fromCode = selectedMapping.shelfLocation.fullCode;
    // Reduce qty at source (or remove if fully transferred)
    setMappings(prev => prev.flatMap(m => {
      if (m.id !== selectedMapping.id) return [m];
      const newQty = m.quantity - transferForm.quantity;
      if (newQty <= 0) return [];
      return [{ ...m, quantity: newQty }];
    }));
    // Add or increase at dest
    const existingDest = mappings.find(m => m.productId === selectedMapping.productId && m.shelfLocation.id === toShelf.id);
    if (existingDest) {
      setMappings(prev => prev.map(m => m.id === existingDest.id ? { ...m, quantity: m.quantity + transferForm.quantity } : m));
    } else {
      setMappings(prev => [...prev, {
        ...selectedMapping,
        id: `pm${Date.now()}`,
        shelfLocation: toShelf,
        quantity: transferForm.quantity,
        isPrimaryLocation: false,
        lastRestocked: new Date(),
      }]);
    }
    // Update shelf occupancies
    setShelves(prev => prev.map(s => {
      if (s.id === selectedMapping.shelfLocation.id) {
        const newOcc = s.currentOccupancy - transferForm.quantity;
        return { ...s, currentOccupancy: Math.max(0, newOcc), status: newOcc <= 0 ? "available" as const : s.status };
      }
      if (s.id === toShelf.id) return { ...s, currentOccupancy: s.currentOccupancy + transferForm.quantity, status:"occupied" as const };
      return s;
    }));
    addAudit({ action:"transferred", productName:selectedMapping.productName, productSKU:selectedMapping.productSKU, fromShelf:fromCode, toShelf:toShelf.fullCode, quantity:transferForm.quantity });
    setIsTransferDialogOpen(false); setSelectedMapping(null); resetTransferForm();
    toast.success(`Transferred ${transferForm.quantity} units to ${toShelf.fullCode}`);
  };

  const handleRestock = () => {
    if (!selectedMapping || restockQty <= 0) return;
    setMappings(prev => prev.map(m => m.id === selectedMapping.id
      ? { ...m, quantity: m.quantity + restockQty, lastRestocked: new Date() }
      : m));
    setShelves(prev => prev.map(s => s.id === selectedMapping.shelfLocation.id
      ? { ...s, currentOccupancy: Math.min(s.capacity, s.currentOccupancy + restockQty) }
      : s));
    addAudit({ action:"restocked", productName:selectedMapping.productName, productSKU:selectedMapping.productSKU, toShelf:selectedMapping.shelfLocation.fullCode, quantity:restockQty });
    setIsRestockDialogOpen(false); setSelectedMapping(null); setRestockQty(20);
    toast.success(`Restocked ${restockQty} units of ${selectedMapping.productName}`);
  };

  const openEditShelf = (shelf: ShelfLocation) => {
    setSelectedShelf(shelf);
    setShelfForm({ aisle:shelf.aisle, rack:shelf.rack, shelf:shelf.shelf, bin:shelf.bin,
      capacity:shelf.capacity, zone:shelf.zone, temperature:shelf.temperature||"ambient", status:shelf.status });
    setIsShelfDialogOpen(true);
  };

  const quickLocate = (mapping: ProductShelfMapping) => {
    setHighlightShelf(mapping.shelfLocation.id);
    setActiveTab("map");
    setIsQuickLocateOpen(false);
    toast.success(`Located at ${mapping.shelfLocation.fullCode}`, { description: mapping.shelfLocation.zone });
    setTimeout(() => setHighlightShelf(null), 4000);
  };

  const exportPickList = () => {
    const rows = ["Product,SKU,Brand,Part Type,Shelf,Zone,Qty"].concat(
      filteredMappings.map(m => `"${m.productName}","${m.productSKU}","${m.brand}","${m.partType}","${m.shelfLocation.fullCode}","${m.shelfLocation.zone}",${m.quantity}`)
    );
    const blob = new Blob([rows.join("\n")], { type:"text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "pick-list.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Pick list exported");
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Archive className="w-7 h-7 text-purple-600" />
            Shelving Management
            <Badge className="bg-purple-100 text-purple-700 border-purple-200 ml-1">Mobile Parts</Badge>
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage shelf locations, mobile part assignments, transfers & restock alerts</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsQuickLocateOpen(true)}>
            <ScanLine className="w-4 h-4 text-indigo-600" /> Quick Locate
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsMappingDialogOpen(true)}>
            <Package className="w-4 h-4 text-blue-600" /> Map Product
          </Button>
          <Button size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-700" onClick={() => { setSelectedShelf(null); resetShelfForm(); setIsShelfDialogOpen(true); }}>
            <Plus className="w-4 h-4" /> Add Shelf
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label:"Total Shelves",     value:totalShelves,              color:"blue",   icon:<Grid3x3 className="w-4 h-4"/>  },
          { label:"Available",         value:availableShelves,          color:"emerald",icon:<CheckCircle2 className="w-4 h-4"/> },
          { label:"Occupied",          value:occupiedShelves,           color:"orange", icon:<Box className="w-4 h-4"/>     },
          { label:"Total Capacity",    value:totalCapacity,             color:"purple", icon:<Layers className="w-4 h-4"/>  },
          { label:"Utilization",       value:`${utilizationRate.toFixed(1)}%`, color:"pink", icon:<BarChart3 className="w-4 h-4"/> },
          { label:"Low Stock Alerts",  value:lowStockMappings.length,   color:"red",    icon:<AlertTriangle className="w-4 h-4"/> },
        ].map(({ label, value, color, icon }) => (
          <Card key={label} className={`border-l-4 border-l-${color}-500`}>
            <CardContent className="p-4">
              <div className={`flex items-center gap-1.5 text-xs font-medium text-${color}-600 mb-1`}>{icon}{label}</div>
              <div className={`text-2xl font-bold text-${color}-600`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="mappings" className="gap-1.5"><Package className="w-3.5 h-3.5"/>Product Locations</TabsTrigger>
          <TabsTrigger value="shelves"  className="gap-1.5"><Grid3x3 className="w-3.5 h-3.5"/>Shelves</TabsTrigger>
          <TabsTrigger value="map"      className="gap-1.5"><Map className="w-3.5 h-3.5"/>Visual Map</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5"/>Analytics</TabsTrigger>
          <TabsTrigger value="picklist" className="gap-1.5"><ClipboardList className="w-3.5 h-3.5"/>Pick List</TabsTrigger>
          <TabsTrigger value="alerts"   className="gap-1.5 relative">
            <Bell className="w-3.5 h-3.5"/>Restock Alerts
            {lowStockMappings.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">{lowStockMappings.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="audit"    className="gap-1.5"><History className="w-3.5 h-3.5"/>Audit Log</TabsTrigger>
        </TabsList>

        {/* ── Product Locations ─────────────────────────────────────── */}
        <TabsContent value="mappings" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 z-10 pointer-events-none" />
                  <Input placeholder="Search product, SKU, shelf, brand…" value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)} className="pl-10"/>
                </div>
                <Select value={filterZone} onValueChange={setFilterZone}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Zone"/></SelectTrigger>
                  <SelectContent className='bg-white'>
                    <SelectItem value="all">All Zones</SelectItem>
                    {zones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterBrand} onValueChange={setFilterBrand}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Brand"/></SelectTrigger>
                  <SelectContent className='bg-white'>
                    <SelectItem value="all">All Brands</SelectItem>
                    {allBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterPartType} onValueChange={setFilterPartType}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Part Type"/></SelectTrigger>
                  <SelectContent className='bg-white'>
                    <SelectItem value="all">All Part Types</SelectItem>
                    {allPartTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(searchQuery || filterZone !== "all" || filterBrand !== "all" || filterPartType !== "all") && (
                  <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setFilterZone("all"); setFilterBrand("all"); setFilterPartType("all"); }}>
                    <X className="w-4 h-4 mr-1"/>Clear
                  </Button>
                )}
                <span className="text-xs text-gray-500 ml-auto">{filteredMappings.length} results</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Product</TableHead>
                    <TableHead>Brand / Model</TableHead>
                    <TableHead>Part Type</TableHead>
                    <TableHead>Shelf</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-center">Min</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Restocked</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMappings.length === 0 && (
                    <TableRow><TableCell colSpan={11} className="text-center py-12 text-gray-400">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-40"/>No products found
                    </TableCell></TableRow>
                  )}
                  {filteredMappings.map(m => {
                    const isLow = m.quantity <= m.reorderPoint && m.quantity > 0;
                    const isOut = m.quantity === 0;
                    return (
                      <TableRow key={m.id} className={cn(isOut ? "bg-red-50" : isLow ? "bg-amber-50" : "")}>
                        <TableCell>
                          <div className="font-medium text-sm">{m.productName}</div>
                          <div className="text-xs text-gray-500 font-mono">{m.productSKU}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{m.brand}</div>
                          <div className="text-xs text-gray-500">{m.model}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{m.partType}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0"/>
                            <span className="font-mono font-semibold text-sm">{m.shelfLocation.fullCode}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{m.shelfLocation.zone}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn("font-bold text-sm", isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-gray-900")}>
                            {m.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-xs text-gray-500">{m.reorderPoint}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {isOut ? <Badge className="bg-red-500 text-white text-[10px] px-1.5">OUT</Badge>
                             : isLow ? <Badge className="bg-amber-500 text-white text-[10px] px-1.5">LOW</Badge>
                             : <Badge className="bg-emerald-500 text-white text-[10px] px-1.5">OK</Badge>}
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", isOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-emerald-500")}
                                style={{ width:`${Math.min(100, m.quantity / Math.max(1, m.minQuantity * 3) * 100)}%` }}/>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">{new Date(m.lastRestocked).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {m.isPrimaryLocation
                            ? <Badge className="bg-blue-500 text-white text-[10px] px-1.5"><Star className="w-2.5 h-2.5 inline mr-0.5"/>Primary</Badge>
                            : <Badge variant="outline" className="text-[10px] px-1.5">Secondary</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            <Button size="sm" variant="ghost" title="Quick Locate" onClick={() => quickLocate(m)}>
                              <MapPin className="w-3.5 h-3.5 text-purple-600"/>
                            </Button>
                            <Button size="sm" variant="ghost" title="Transfer" onClick={() => { setSelectedMapping(m); setTransferForm({ fromShelfId: m.shelfLocation.id, toShelfId:"", quantity:1 }); setIsTransferDialogOpen(true); }}>
                              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600"/>
                            </Button>
                            <Button size="sm" variant="ghost" title="Restock" onClick={() => { setSelectedMapping(m); setRestockQty(20); setIsRestockDialogOpen(true); }}>
                              <RefreshCw className="w-3.5 h-3.5 text-green-600"/>
                            </Button>
                            <Button size="sm" variant="ghost" title="Label" onClick={() => { setSelectedMapping(m); setIsLabelDialogOpen(true); }}>
                              <Printer className="w-3.5 h-3.5 text-gray-500"/>
                            </Button>
                            <Button size="sm" variant="ghost" title="Remove" onClick={() => setDeleteMappingDialog({ open: true, mappingId: m.id, productName: m.productName })} className="text-red-500 hover:text-red-700">
  <Trash2 className="w-3.5 h-3.5"/>
</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Shelves Tab ───────────────────────────────────────────── */}
        <TabsContent value="shelves" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                  <Input placeholder="Search shelf code or zone…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10"/>
                </div>
                <Select value={filterZone} onValueChange={setFilterZone}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Zone"/></SelectTrigger>
                  <SelectContent className='bg-white'>
                    <SelectItem value="all">All Zones</SelectItem>
                    {zones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Status"/></SelectTrigger>
                  <SelectContent className='bg-white'>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Code</TableHead>
                    <TableHead>Aisle</TableHead>
                    <TableHead>Rack</TableHead>
                    <TableHead>Shelf</TableHead>
                    <TableHead>Bin</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Temp</TableHead>
                    <TableHead className="text-right">Cap</TableHead>
                    <TableHead className="text-right">Occ</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShelves.map(shelf => {
                    const util = shelf.capacity > 0 ? (shelf.currentOccupancy / shelf.capacity) * 100 : 0;
                    const prods = mappings.filter(m => m.shelfLocation.id === shelf.id);
                    return (
                      <TableRow key={shelf.id}>
                        <TableCell className="font-mono font-bold text-sm">{shelf.fullCode}</TableCell>
                        <TableCell className="font-semibold">{shelf.aisle}</TableCell>
                        <TableCell>{shelf.rack}</TableCell>
                        <TableCell>{shelf.shelf}</TableCell>
                        <TableCell>{shelf.bin}</TableCell>
                        <TableCell><Badge variant="secondary">{shelf.zone}</Badge></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs",
                            shelf.temperature==="frozen" ? "border-blue-400 text-blue-600"
                            : shelf.temperature==="cold" ? "border-cyan-400 text-cyan-600"
                            : "border-gray-400 text-gray-600")}>
                            {shelf.temperature||"ambient"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{shelf.capacity}</TableCell>
                        <TableCell className="text-right">{shelf.currentOccupancy}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", util===100?"bg-red-500":util>=80?"bg-orange-500":util>=50?"bg-yellow-500":"bg-green-500")}
                                style={{ width:`${util}%` }}/>
                            </div>
                            <span className="text-xs">{util.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[shelf.status] || "bg-gray-400 text-white"}>
                            {shelf.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-0.5">
                          <Button
  size="sm"
  variant="ghost"
  title={`${prods.length} product(s)`}
  onClick={() => setShelfProductsDialog({ open: true, shelf })}
>
  <Package className="w-3.5 h-3.5 text-blue-500"/>
</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedMapping(null); setIsLabelDialogOpen(true); setSelectedShelf(shelf); }}>
                              <Printer className="w-3.5 h-3.5 text-gray-500"/>
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openEditShelf(shelf)}>
                              <Edit className="w-3.5 h-3.5 text-gray-600"/>
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteShelfDialog({ open: true, shelfId: shelf.id, shelfCode: shelf.fullCode })} className="text-red-500 hover:text-red-700">
  <Trash2 className="w-3.5 h-3.5"/>
</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Visual Map Tab ────────────────────────────────────────── */}
        <TabsContent value="map" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map(zone => {
              const zs = shelves.filter(s => s.zone === zone);
              const zoneProds = mappings.filter(m => m.shelfLocation.zone === zone);
              const color = zoneColor(zone);
              return (
                <Card key={zone} className={`border-2 border-${color}-200`}>
                  <CardHeader className={`bg-gradient-to-br from-${color}-50 to-${color}-100 pb-3`}>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Map className={`w-4 h-4 text-${color}-600`}/>
                        {zone}
                      </span>
                      <div className="flex gap-1.5">
                        <Badge className={`bg-${color}-600 text-white text-[10px]`}>{zs.length} shelves</Badge>
                        <Badge variant="outline" className="text-[10px]">{zoneProds.length} parts</Badge>
                      </div>
                    </CardTitle>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div className="bg-white rounded p-1.5 text-center">
                        <div className="font-bold text-emerald-600">{zs.filter(s=>s.status==="available").length}</div>
                        <div className="text-gray-500">Available</div>
                      </div>
                      <div className="bg-white rounded p-1.5 text-center">
                        <div className="font-bold text-blue-600">{zs.filter(s=>s.status==="occupied").length}</div>
                        <div className="text-gray-500">Occupied</div>
                      </div>
                      <div className="bg-white rounded p-1.5 text-center">
                        <div className={`font-bold text-${color}-600`}>
                          {zs.reduce((a,s)=>a+s.capacity,0)>0
                            ? Math.round(zs.reduce((a,s)=>a+s.currentOccupancy,0)/zs.reduce((a,s)=>a+s.capacity,0)*100)
                            : 0}%
                        </div>
                        <div className="text-gray-500">Used</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 pb-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Shelf Grid</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {zs.map(shelf => {
                        const prods = mappings.filter(m => m.shelfLocation.id === shelf.id);
                        const util = shelf.capacity > 0 ? shelf.currentOccupancy / shelf.capacity : 0;
                        const isHighlighted = highlightShelf === shelf.id;
                        return (
                          <div key={shelf.id} title={`${shelf.fullCode} · ${prods.map(p=>p.productName).join(", ") || "Empty"}`}
                            className={cn(
                              "p-2 rounded-lg text-center text-[10px] font-mono font-semibold border-2 transition-all cursor-pointer hover:scale-105",
                              isHighlighted ? "ring-4 ring-yellow-400 border-yellow-500 bg-yellow-100 scale-110 z-10 shadow-lg" :
                              shelf.status === "occupied"    ? "bg-blue-50   border-blue-300   text-blue-700" :
                              shelf.status === "available"   ? "bg-green-50  border-green-300  text-green-700" :
                              shelf.status === "reserved"    ? "bg-amber-50  border-amber-300  text-amber-700" :
                                                               "bg-gray-50   border-gray-300   text-gray-500"
                            )}>
                            <div>{shelf.fullCode}</div>
                            <div className="w-full h-1 mt-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", util>=1?"bg-red-500":util>=0.8?"bg-orange-500":util>=0.5?"bg-yellow-500":"bg-green-500")}
                                style={{width:`${util*100}%`}}/>
                            </div>
                            {prods.length > 0 && <div className="text-[9px] text-gray-500 mt-0.5">{prods.length}p</div>}
                          </div>
                        );
                      })}
                    </div>
                    {/* Products in this zone */}
                    {zoneProds.length > 0 && (
                      <div className="mt-3 border-t pt-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Products</p>
                        <div className="space-y-1 max-h-28 overflow-y-auto">
                          {zoneProds.map(m => (
                            <div key={m.id} className="flex items-center justify-between text-[10px]">
                              <span className="truncate text-gray-700 max-w-[140px]">{m.productName}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="font-mono text-gray-500">{m.shelfLocation.fullCode}</span>
                                <Badge className={cn("text-[9px] px-1 py-0", m.quantity===0?"bg-red-500":m.quantity<=m.reorderPoint?"bg-amber-500":"bg-emerald-500")}>{m.quantity}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {/* Legend */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 text-xs">
                {[
                  { color:"bg-green-100 border-green-300", label:"Available" },
                  { color:"bg-blue-100 border-blue-300",   label:"Occupied" },
                  { color:"bg-amber-100 border-amber-300",  label:"Reserved" },
                  { color:"bg-gray-100 border-gray-300",   label:"Maintenance" },
                  { color:"bg-yellow-100 border-yellow-500 ring-2 ring-yellow-400", label:"Highlighted (Quick Locate)" },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={cn("w-6 h-4 rounded border-2", color)}/>
                    <span className="text-gray-600">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Analytics Tab ─────────────────────────────────────────── */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Zone Utilization */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-600"/>Zone Utilization</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={zoneChartData} margin={{ top:5, right:10, left:-10, bottom:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="zone" tick={{ fontSize:12 }}/>
                    <YAxis tick={{ fontSize:11 }}/>
                    <Tooltip formatter={(v: number, name: string) => [v, name === "capacity" ? "Capacity" : "Occupancy"]}/>
                    <Bar dataKey="capacity"  fill="#e0e7ff" radius={[4,4,0,0]} name="Capacity"/>
                    <Bar dataKey="occupancy" fill="#6366f1" radius={[4,4,0,0]} name="Occupancy"/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Part Type Distribution */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4 text-purple-600"/>Parts by Type</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={partTypeChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                      dataKey="value" nameKey="name" label={({ name, percent }) => `${name.split(" ")[0]} ${(percent*100).toFixed(0)}%`}
                      labelLine={false} fontSize={10}>
                      {partTypeChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                    </Pie>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Brand Distribution */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Smartphone className="w-4 h-4 text-green-600"/>Stock by Brand</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={brandChartData} layout="vertical" margin={{ top:5, right:20, left:60, bottom:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis type="number" tick={{ fontSize:11 }}/>
                    <YAxis type="category" dataKey="name" tick={{ fontSize:11 }}/>
                    <Tooltip/>
                    <Bar dataKey="value" fill="#10b981" radius={[0,4,4,0]} name="Units"/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Zone Utilization % */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="w-4 h-4 text-orange-600"/>Zone Fill Rate</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {zoneChartData.map(z => (
                    <div key={z.zone} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Zone {z.zone}</span>
                        <span className="font-bold text-gray-700">{z.utilization}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", z.utilization>=90?"bg-red-500":z.utilization>=70?"bg-orange-500":z.utilization>=40?"bg-yellow-500":"bg-emerald-500")}
                          style={{width:`${z.utilization}%`}}/>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{z.occupancy} occupied</span><span>{z.capacity} capacity</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Pick List Tab ─────────────────────────────────────────── */}
        <TabsContent value="picklist" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-indigo-600"/>Pick List</CardTitle>
                  <CardDescription>Sorted by shelf location for efficient picking</CardDescription>
                </div>
                <Button onClick={exportPickList} size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                  <Download className="w-4 h-4"/>Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Part Type</TableHead>
                    <TableHead>Shelf Location</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Stock Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...mappings].sort((a, b) => a.shelfLocation.fullCode.localeCompare(b.shelfLocation.fullCode))
                    .map((m, i) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-gray-400 text-sm">{i+1}</TableCell>
                      <TableCell className="font-medium text-sm">{m.productName}</TableCell>
                      <TableCell><span className="font-mono text-xs">{m.productSKU}</span></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{m.brand}</Badge></TableCell>
                      <TableCell className="text-xs text-gray-600">{m.partType}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-purple-500"/>
                          <span className="font-mono font-bold">{m.shelfLocation.fullCode}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{m.shelfLocation.zone}</Badge></TableCell>
                      <TableCell className="text-right font-bold">{m.quantity}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-[10px]", m.quantity===0?"bg-red-500":m.quantity<=m.reorderPoint?"bg-amber-500":"bg-emerald-500")}>
                          {m.quantity===0?"Out":"" || m.quantity<=m.reorderPoint?"Low":"OK"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Restock Alerts Tab ────────────────────────────────────── */}
        <TabsContent value="alerts" className="space-y-4">
          {/* Out of Stock */}
          {criticalMappings.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="bg-red-50 border-b border-red-100">
                <CardTitle className="text-base flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4"/>Out of Stock ({criticalMappings.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow className="bg-red-50/50">
                    <TableHead>Product</TableHead><TableHead>Brand / Model</TableHead>
                    <TableHead>Part Type</TableHead><TableHead>Shelf</TableHead>
                    <TableHead className="text-center">Current</TableHead><TableHead className="text-center">Min</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {criticalMappings.map(m => (
                      <TableRow key={m.id} className="bg-red-50/30">
                        <TableCell className="font-medium text-sm">{m.productName}<div className="text-xs text-gray-500 font-mono">{m.productSKU}</div></TableCell>
                        <TableCell><div className="text-sm">{m.brand}</div><div className="text-xs text-gray-500">{m.model}</div></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{m.partType}</Badge></TableCell>
                        <TableCell><span className="font-mono font-semibold">{m.shelfLocation.fullCode}</span></TableCell>
                        <TableCell className="text-center"><Badge className="bg-red-500">0</Badge></TableCell>
                        <TableCell className="text-center text-sm text-gray-600">{m.minQuantity}</TableCell>
                        <TableCell>
                          <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => { setSelectedMapping(m); setRestockQty(m.minQuantity * 3); setIsRestockDialogOpen(true); }}>
                            <RefreshCw className="w-3.5 h-3.5"/>Restock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          {/* Low Stock */}
          <Card className="border-amber-200">
            <CardHeader className="bg-amber-50 border-b border-amber-100">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                <Bell className="w-4 h-4"/>Low Stock ({lowStockMappings.filter(m=>m.quantity>0).length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {lowStockMappings.filter(m=>m.quantity>0).length === 0
                ? <div className="text-center py-10 text-gray-400"><CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400"/>All parts above reorder level</div>
                : <Table>
                    <TableHeader><TableRow className="bg-amber-50/50">
                      <TableHead>Product</TableHead><TableHead>Brand</TableHead><TableHead>Part Type</TableHead>
                      <TableHead>Shelf</TableHead><TableHead className="text-center">Current</TableHead>
                      <TableHead className="text-center">Reorder</TableHead><TableHead>Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {lowStockMappings.filter(m=>m.quantity>0).map(m => (
                        <TableRow key={m.id} className="bg-amber-50/20">
                          <TableCell className="font-medium text-sm">{m.productName}<div className="text-xs text-gray-500 font-mono">{m.productSKU}</div></TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{m.brand}</Badge></TableCell>
                          <TableCell className="text-xs text-gray-600">{m.partType}</TableCell>
                          <TableCell><span className="font-mono font-semibold">{m.shelfLocation.fullCode}</span></TableCell>
                          <TableCell className="text-center"><Badge className="bg-amber-500">{m.quantity}</Badge></TableCell>
                          <TableCell className="text-center text-sm text-gray-600">{m.reorderPoint}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="gap-1.5 border-green-400 text-green-700 hover:bg-green-50" onClick={() => { setSelectedMapping(m); setRestockQty(m.reorderPoint * 2); setIsRestockDialogOpen(true); }}>
                              <RefreshCw className="w-3.5 h-3.5"/>Restock
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              }
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Audit Log Tab ─────────────────────────────────────────── */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="w-5 h-5 text-gray-600"/>Shelf Activity Log</CardTitle>
              <CardDescription>All shelf movements, restocks, and transfers</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(a.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-[10px]",
                          a.action==="added"       ? "bg-blue-500"   :
                          a.action==="removed"     ? "bg-red-500"    :
                          a.action==="transferred" ? "bg-purple-500" :
                          a.action==="restocked"   ? "bg-green-500"  :
                                                     "bg-gray-500")}>
                          {a.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{a.productName}</TableCell>
                      <TableCell><span className="font-mono text-xs">{a.productSKU}</span></TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{a.fromShelf || "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{a.toShelf || "—"}</TableCell>
                      <TableCell className="text-center font-semibold">{a.quantity}</TableCell>
                      <TableCell className="text-xs">{a.user}</TableCell>
                      <TableCell className="text-xs text-gray-500">{a.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {auditLog.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center py-10 text-gray-400">No audit entries yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ════ DIALOGS ════════════════════════════════════════════════ */}

      {/* Add / Edit Shelf */}
      <Dialog open={isShelfDialogOpen} onOpenChange={setIsShelfDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedShelf ? "Edit Shelf Location" : "Add New Shelf Location"}</DialogTitle>
            <DialogDescription>Configure the shelf address and properties</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {[
              { id:"aisle", label:"Aisle *", val:shelfForm.aisle, ph:"A", maxLen:2, setter:(v:string)=>setShelfForm({...shelfForm, aisle:v.toUpperCase()}) },
              { id:"rack",  label:"Rack *",  val:shelfForm.rack,  ph:"01", maxLen:3, setter:(v:string)=>setShelfForm({...shelfForm, rack:v}) },
              { id:"shelf", label:"Shelf *", val:shelfForm.shelf, ph:"1", maxLen:2, setter:(v:string)=>setShelfForm({...shelfForm, shelf:v}) },
              { id:"bin",   label:"Bin *",   val:shelfForm.bin,   ph:"A", maxLen:2, setter:(v:string)=>setShelfForm({...shelfForm, bin:v.toUpperCase()}) },
            ].map(f => (
              <div key={f.id} className="space-y-1">
                <Label htmlFor={f.id}>{f.label}</Label>
                <Input id={f.id} value={f.val} placeholder={f.ph} maxLength={f.maxLen} onChange={e => f.setter(e.target.value)}/>
              </div>
            ))}
            <div className="space-y-1">
              <Label>Capacity</Label>
              <Input type="number" value={shelfForm.capacity} onChange={e => setShelfForm({...shelfForm, capacity:parseInt(e.target.value)||0})}/>
            </div>
            <div className="space-y-1">
              <Label>Zone</Label>
              <Input value={shelfForm.zone} placeholder="Zone A" onChange={e => setShelfForm({...shelfForm, zone:e.target.value})}/>
            </div>
            <div className="space-y-1">
              <Label>Temperature</Label>
              <Select value={shelfForm.temperature} onValueChange={v => setShelfForm({...shelfForm, temperature:v as any})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent className='bg-white'>
                  <SelectItem value="ambient">Ambient</SelectItem>
                  <SelectItem value="cold">Cold (2–8°C)</SelectItem>
                  <SelectItem value="frozen">Frozen (&lt;-18°C)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={shelfForm.status} onValueChange={v => setShelfForm({...shelfForm, status:v as any})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent className='bg-white'>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-blue-900">
              Preview: <span className="font-mono">{shelfForm.aisle||"?"}-{shelfForm.rack||"?"}-{shelfForm.shelf||"?"}-{shelfForm.bin||"?"}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShelfDialogOpen(false)}>Cancel</Button>
            <Button onClick={selectedShelf ? handleUpdateShelf : handleAddShelf}>
              {selectedShelf ? "Update" : "Add"} Shelf
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Map Product */}
      <Dialog open={isMappingDialogOpen} onOpenChange={setIsMappingDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Map Mobile Part to Shelf</DialogTitle>
            <DialogDescription>Assign a product with part details to a shelf location</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Product *</Label>
              <Select value={mappingForm.productId} onValueChange={v => setMappingForm({...mappingForm, productId:v})}>
                <SelectTrigger><SelectValue placeholder="Select product…"/></SelectTrigger>
                <SelectContent className="max-h-56 bg-white">
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {p.sku}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Brand</Label>
              <Select value={mappingForm.brand} onValueChange={v => setMappingForm({...mappingForm, brand:v})}>
                <SelectTrigger><SelectValue placeholder="Brand…"/></SelectTrigger>
                <SelectContent className='bg-white'>{BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Part Type</Label>
              <Select value={mappingForm.partType} onValueChange={v => setMappingForm({...mappingForm, partType:v})}>
                <SelectTrigger><SelectValue placeholder="Part type…"/></SelectTrigger>
                <SelectContent className='bg-white'>{PART_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Compatible Model</Label>
              <Input placeholder="e.g. iPhone 15 Pro Max" value={mappingForm.model} onChange={e => setMappingForm({...mappingForm, model:e.target.value})}/>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Shelf Location *</Label>
              <Select value={mappingForm.shelfId} onValueChange={v => setMappingForm({...mappingForm, shelfId:v})}>
                <SelectTrigger><SelectValue placeholder="Select shelf…"/></SelectTrigger>
                <SelectContent className='bg-white'>
                  {shelves.filter(s => s.status !== "maintenance").map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.fullCode} · {s.zone} (free: {s.capacity - s.currentOccupancy})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Quantity *</Label>
              <Input type="number" min={1} value={mappingForm.quantity} onChange={e => setMappingForm({...mappingForm, quantity:parseInt(e.target.value)||0})}/>
            </div>
            <div className="space-y-1">
              <Label>Min Quantity</Label>
              <Input type="number" min={1} value={mappingForm.minQuantity} onChange={e => setMappingForm({...mappingForm, minQuantity:parseInt(e.target.value)||0})}/>
            </div>
            <div className="space-y-1">
              <Label>Reorder Point</Label>
              <Input type="number" min={1} value={mappingForm.reorderPoint} onChange={e => setMappingForm({...mappingForm, reorderPoint:parseInt(e.target.value)||0})}/>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="isPrimary" checked={mappingForm.isPrimaryLocation}
                onChange={e => setMappingForm({...mappingForm, isPrimaryLocation:e.target.checked})} className="w-4 h-4 accent-blue-600"/>
              <Label htmlFor="isPrimary" className="cursor-pointer">Primary location</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMappingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMapping} className="bg-blue-600 hover:bg-blue-700">Map Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-blue-600"/>Transfer Stock</DialogTitle>
            <DialogDescription>{selectedMapping?.productName}</DialogDescription>
          </DialogHeader>
          {selectedMapping && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <div className="flex justify-between"><span className="text-blue-700">Current location:</span><span className="font-mono font-bold">{selectedMapping.shelfLocation.fullCode}</span></div>
                <div className="flex justify-between"><span className="text-blue-700">Available qty:</span><span className="font-bold">{selectedMapping.quantity}</span></div>
              </div>
              <div className="space-y-1">
                <Label>Destination Shelf *</Label>
                <Select value={transferForm.toShelfId} onValueChange={v => setTransferForm({...transferForm, toShelfId:v})}>
                  <SelectTrigger><SelectValue placeholder="Select destination…"/></SelectTrigger>
                  <SelectContent className='bg-white '>
                    {shelves.filter(s => s.id !== selectedMapping.shelfLocation.id && s.status !== "maintenance").map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.fullCode} · {s.zone} (free: {s.capacity - s.currentOccupancy})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Quantity to Transfer</Label>
                <Input type="number" min={1} max={selectedMapping.quantity} value={transferForm.quantity}
                  onChange={e => setTransferForm({...transferForm, quantity:parseInt(e.target.value)||1})}/>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleTransfer} className="bg-blue-600 hover:bg-blue-700">Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock */}
      <Dialog open={isRestockDialogOpen} onOpenChange={setIsRestockDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RefreshCw className="w-5 h-5 text-green-600"/>Restock Product</DialogTitle>
            <DialogDescription>{selectedMapping?.productName}</DialogDescription>
          </DialogHeader>
          {selectedMapping && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-3 text-sm">
                <div><span className="text-gray-500">Shelf:</span> <span className="font-mono font-bold">{selectedMapping.shelfLocation.fullCode}</span></div>
                <div><span className="text-gray-500">Current:</span> <span className="font-bold">{selectedMapping.quantity}</span></div>
                <div><span className="text-gray-500">Min Qty:</span> <span className="font-bold">{selectedMapping.minQuantity}</span></div>
                <div><span className="text-gray-500">Reorder At:</span> <span className="font-bold">{selectedMapping.reorderPoint}</span></div>
              </div>
              <div className="space-y-1">
                <Label>Add Quantity</Label>
                <Input type="number" min={1} value={restockQty} onChange={e => setRestockQty(parseInt(e.target.value)||1)}/>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                New total will be: <span className="font-bold">{(selectedMapping.quantity || 0) + restockQty}</span> units
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestockDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRestock} className="bg-green-600 hover:bg-green-700"><RefreshCw className="w-4 h-4 mr-1.5"/>Confirm Restock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Locate */}
      <Dialog open={isQuickLocateOpen} onOpenChange={setIsQuickLocateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ScanLine className="w-5 h-5 text-indigo-600"/>Quick Locate</DialogTitle>
            <DialogDescription>Search for any mobile part and jump to its shelf on the map</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
              <Input autoFocus placeholder="Type product name, SKU, or brand…" value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} className="pl-10"/>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {mappings.filter(m => {
                const q = searchQuery.toLowerCase();
                return !q || m.productName.toLowerCase().includes(q) || m.productSKU.toLowerCase().includes(q)
                  || m.brand.toLowerCase().includes(q) || m.model.toLowerCase().includes(q);
              }).map(m => (
                <div key={m.id} onClick={() => quickLocate(m)}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{m.productName}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono">{m.productSKU}</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1">{m.brand}</Badge>
                      <span>{m.partType}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <div className="text-right">
                      <div className="font-mono font-bold text-indigo-600">{m.shelfLocation.fullCode}</div>
                      <div className="text-xs text-gray-500">{m.shelfLocation.zone}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-indigo-400"/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Label Preview */}
     {/* Label Preview */}
<Dialog open={isLabelDialogOpen} onOpenChange={setIsLabelDialogOpen}>
  <DialogContent className="sm:max-w-[380px]">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Printer className="w-5 h-5" />
        Shelf Label
      </DialogTitle>
      <DialogDescription>Preview of printable shelf label</DialogDescription>
    </DialogHeader>

    {/* ─── Case 1: Product-specific label (from Product Locations tab) ─── */}
    {selectedMapping && (
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center space-y-2 bg-white">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          BNM Parts · Shelf Label
        </div>
        <div className="text-4xl font-black font-mono text-gray-900">
          {selectedMapping.shelfLocation.fullCode}
        </div>
        <div className="text-sm font-semibold text-purple-600">
          {selectedMapping.shelfLocation.zone}
        </div>
        <div className="border-t pt-3 space-y-1">
          <div className="font-semibold text-sm">{selectedMapping.productName}</div>
          <div className="font-mono text-xs text-gray-500">
            {selectedMapping.productSKU}
          </div>
          <div className="flex justify-center gap-2 mt-2">
            <Badge variant="outline">{selectedMapping.brand}</Badge>
            <Badge variant="outline">{selectedMapping.partType}</Badge>
          </div>
        </div>
        <div className="text-xs text-gray-400 pt-1">
          Min: {selectedMapping.minQuantity} · Reorder:{" "}
          {selectedMapping.reorderPoint}
        </div>
        {/* Barcode placeholder */}
        <div className="flex justify-center mt-2">
          <div className="flex gap-px h-10">
            {selectedMapping.productSKU.split("").map((_, i) => (
              <div
                key={i}
                className="bg-gray-900"
                style={{
                  width: i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1,
                }}
              />
            ))}
          </div>
        </div>
        <div className="text-[10px] font-mono text-gray-500">
          {selectedMapping.productSKU}
        </div>
      </div>
    )}

    {/* ─── Case 2: Shelf-only label (from Shelves tab) ─── */}
    {!selectedMapping && selectedShelf && (() => {
      const shelfProducts = mappings.filter(
        (m) => m.shelfLocation.id === selectedShelf.id
      );
      const util =
        selectedShelf.capacity > 0
          ? Math.round(
              (selectedShelf.currentOccupancy / selectedShelf.capacity) * 100
            )
          : 0;
      return (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center space-y-2 bg-white">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            BNM Parts · Shelf Label
          </div>
          <div className="text-4xl font-black font-mono text-gray-900">
            {selectedShelf.fullCode}
          </div>
          <div className="text-sm font-semibold text-purple-600">
            {selectedShelf.zone}
          </div>

          {/* Shelf meta */}
          <div className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
            <div className="bg-gray-50 rounded p-1.5">
              <div className="font-bold text-gray-700">
                {selectedShelf.capacity}
              </div>
              <div className="text-gray-500">Capacity</div>
            </div>
            <div className="bg-gray-50 rounded p-1.5">
              <div className="font-bold text-gray-700">
                {selectedShelf.currentOccupancy}
              </div>
              <div className="text-gray-500">Occupied</div>
            </div>
            <div className="bg-gray-50 rounded p-1.5">
              <div
                className={cn(
                  "font-bold",
                  util >= 90
                    ? "text-red-600"
                    : util >= 70
                    ? "text-orange-600"
                    : "text-emerald-600"
                )}
              >
                {util}%
              </div>
              <div className="text-gray-500">Used</div>
            </div>
          </div>

          {/* Temperature & Status */}
          <div className="flex justify-center gap-2 pt-1">
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                selectedShelf.temperature === "frozen"
                  ? "border-blue-400 text-blue-600"
                  : selectedShelf.temperature === "cold"
                  ? "border-cyan-400 text-cyan-600"
                  : "border-gray-400 text-gray-600"
              )}
            >
              {selectedShelf.temperature || "ambient"}
            </Badge>
            <Badge
              className={
                statusColors[selectedShelf.status] ||
                "bg-gray-400 text-white"
              }
            >
              {selectedShelf.status}
            </Badge>
          </div>

          {/* Products on this shelf */}
          {shelfProducts.length > 0 && (
            <div className="border-t pt-3 space-y-1.5">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Products on shelf ({shelfProducts.length})
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {shelfProducts.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1"
                  >
                    <span className="truncate max-w-[160px] font-medium text-gray-700">
                      {m.productName}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0"
                      >
                        {m.brand}
                      </Badge>
                      <span className="font-mono font-bold text-gray-600">
                        ×{m.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {shelfProducts.length === 0 && (
            <div className="border-t pt-3">
              <div className="text-xs text-gray-400 italic">
                No products assigned
              </div>
            </div>
          )}

          {/* Barcode placeholder — uses shelf fullCode */}
          <div className="flex justify-center mt-2">
            <div className="flex gap-px h-10">
              {selectedShelf.fullCode.split("").map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-900"
                  style={{
                    width: i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="text-[10px] font-mono text-gray-500">
            {selectedShelf.fullCode}
          </div>
        </div>
      );
    })()}

    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => setIsLabelDialogOpen(false)}
      >
        Close
      </Button>
      <Button
        onClick={() => {
          window.print();
          toast.success("Sent to printer");
        }}
        className="gap-1.5"
      >
        <Printer className="w-4 h-4" />
        Print Label
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
      {/* ════ DELETE SHELF CONFIRMATION DIALOG ════ */}
<Dialog open={deleteShelfDialog.open} onOpenChange={(o) => !o && setDeleteShelfDialog({ open: false, shelfId: "", shelfCode: "" })}>
  <DialogContent className="w-[90vw] sm:max-w-[400px]">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="w-5 h-5" />
        Delete Shelf Location
      </DialogTitle>
      <DialogDescription>
        Are you sure you want to delete shelf <strong>"{deleteShelfDialog.shelfCode}"</strong>? This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="gap-2 flex-col sm:flex-row pt-2">
      <Button
        variant="outline"
        className="w-full sm:w-auto"
        onClick={() => setDeleteShelfDialog({ open: false, shelfId: "", shelfCode: "" })}
      >
        Cancel
      </Button>
      <Button
        variant="destructive"
        className="w-full sm:w-auto"
        onClick={() => {
          handleDeleteShelf(deleteShelfDialog.shelfId);
          setDeleteShelfDialog({ open: false, shelfId: "", shelfCode: "" });
        }}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* ════ DELETE PRODUCT MAPPING CONFIRMATION DIALOG ════ */}
<Dialog open={deleteMappingDialog.open} onOpenChange={(o) => !o && setDeleteMappingDialog({ open: false, mappingId: "", productName: "" })}>
  <DialogContent className="w-[90vw] sm:max-w-[400px]">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="w-5 h-5" />
        Remove Product from Shelf
      </DialogTitle>
      <DialogDescription>
        Are you sure you want to remove <strong>"{deleteMappingDialog.productName}"</strong> from its shelf location? This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="gap-2 flex-col sm:flex-row pt-2">
      <Button
        variant="outline"
        className="w-full sm:w-auto"
        onClick={() => setDeleteMappingDialog({ open: false, mappingId: "", productName: "" })}
      >
        Cancel
      </Button>
      <Button
        variant="destructive"
        className="w-full sm:w-auto"
        onClick={() => {
          handleRemoveMapping(deleteMappingDialog.mappingId);
          setDeleteMappingDialog({ open: false, mappingId: "", productName: "" });
        }}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Remove
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
{/* ════ SHELF PRODUCTS DIALOG ════ */}
<Dialog
  open={shelfProductsDialog.open}
  onOpenChange={(o) =>
    !o && setShelfProductsDialog({ open: false, shelf: null })
  }
>
  <DialogContent className="w-[95vw] sm:max-w-[620px] max-h-[85vh] overflow-hidden flex flex-col">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Package className="w-5 h-5 text-blue-600" />
        Products on Shelf
        {shelfProductsDialog.shelf && (
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 ml-1 font-mono">
            {shelfProductsDialog.shelf.fullCode}
          </Badge>
        )}
      </DialogTitle>
      <DialogDescription>
        {shelfProductsDialog.shelf && (
          <span className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{shelfProductsDialog.shelf.zone}</Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                shelfProductsDialog.shelf.temperature === "frozen"
                  ? "border-blue-400 text-blue-600"
                  : shelfProductsDialog.shelf.temperature === "cold"
                  ? "border-cyan-400 text-cyan-600"
                  : "border-gray-400 text-gray-600"
              )}
            >
              {shelfProductsDialog.shelf.temperature || "ambient"}
            </Badge>
            <Badge
              className={
                statusColors[shelfProductsDialog.shelf.status] ||
                "bg-gray-400 text-white"
              }
            >
              {shelfProductsDialog.shelf.status}
            </Badge>
          </span>
        )}
      </DialogDescription>
    </DialogHeader>

    {shelfProductsDialog.shelf && (() => {
      const shelfProds = mappings.filter(
        (m) => m.shelfLocation.id === shelfProductsDialog.shelf!.id
      );
      const shelf = shelfProductsDialog.shelf!;
      const util =
        shelf.capacity > 0
          ? Math.round((shelf.currentOccupancy / shelf.capacity) * 100)
          : 0;

      return (
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Shelf Stats Summary */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-center">
              <div className="font-bold text-blue-700 text-lg">
                {shelfProds.length}
              </div>
              <div className="text-blue-600">Products</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 text-center">
              <div className="font-bold text-purple-700 text-lg">
                {shelf.currentOccupancy}/{shelf.capacity}
              </div>
              <div className="text-purple-600">Occupied</div>
            </div>
            <div
              className={cn(
                "border rounded-lg p-2.5 text-center",
                util >= 90
                  ? "bg-red-50 border-red-200"
                  : util >= 70
                  ? "bg-orange-50 border-orange-200"
                  : "bg-emerald-50 border-emerald-200"
              )}
            >
              <div
                className={cn(
                  "font-bold text-lg",
                  util >= 90
                    ? "text-red-700"
                    : util >= 70
                    ? "text-orange-700"
                    : "text-emerald-700"
                )}
              >
                {util}%
              </div>
              <div
                className={cn(
                  util >= 90
                    ? "text-red-600"
                    : util >= 70
                    ? "text-orange-600"
                    : "text-emerald-600"
                )}
              >
                Utilization
              </div>
            </div>
          </div>

          {/* Products List */}
          {shelfProds.length === 0 ? (
            <div className="text-center py-10">
              <Box className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-gray-400 font-medium">
                No products on this shelf
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Use "Map Product" to assign products here
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[380px] -mx-1 px-1">
              <div className="space-y-2">
                {shelfProds.map((m) => {
                  const isLow =
                    m.quantity <= m.reorderPoint && m.quantity > 0;
                  const isOut = m.quantity === 0;

                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "border rounded-lg p-3 transition-colors",
                        isOut
                          ? "bg-red-50 border-red-200"
                          : isLow
                          ? "bg-amber-50 border-amber-200"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900 truncate">
                              {m.productName}
                            </span>
                            {m.isPrimaryLocation && (
                              <Badge className="bg-blue-500 text-white text-[9px] px-1 py-0 shrink-0">
                                <Star className="w-2 h-2 inline mr-0.5" />
                                Primary
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-mono mb-1.5">
                            {m.productSKU}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {m.brand}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {m.partType}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 text-gray-500"
                            >
                              {m.model}
                            </Badge>
                          </div>
                        </div>

                        {/* Right: Quantity & Status */}
                        <div className="text-right shrink-0">
                          <div
                            className={cn(
                              "text-2xl font-black",
                              isOut
                                ? "text-red-600"
                                : isLow
                                ? "text-amber-600"
                                : "text-gray-900"
                            )}
                          >
                            {m.quantity}
                          </div>
                          <div className="text-[10px] text-gray-500 mb-1">
                            units
                          </div>
                          {isOut ? (
                            <Badge className="bg-red-500 text-white text-[10px] px-1.5">
                              OUT OF STOCK
                            </Badge>
                          ) : isLow ? (
                            <Badge className="bg-amber-500 text-white text-[10px] px-1.5">
                              LOW STOCK
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500 text-white text-[10px] px-1.5">
                              IN STOCK
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Bottom: Meta info */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400">
                        <span>
                          Min: {m.minQuantity} · Reorder: {m.reorderPoint}
                        </span>
                        <span>
                          Restocked:{" "}
                          {new Date(m.lastRestocked).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    })()}

    <DialogFooter className="pt-2 border-t">
      <Button
        variant="outline"
        onClick={() =>
          setShelfProductsDialog({ open: false, shelf: null })
        }
      >
        Close
      </Button>
      {shelfProductsDialog.shelf && mappings.some(
        (m) => m.shelfLocation.id === shelfProductsDialog.shelf!.id
      ) && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
          onClick={() => {
            setShelfProductsDialog({ open: false, shelf: null });
            setSelectedShelf(shelfProductsDialog.shelf);
            setSelectedMapping(null);
            setIsLabelDialogOpen(true);
          }}
        >
          <Printer className="w-3.5 h-3.5" />
          Print Shelf Label
        </Button>
      )}
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  );
}
