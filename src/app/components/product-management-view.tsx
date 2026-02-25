import { useState, useMemo, useCallback, useRef } from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  Search, Plus, Edit, Trash2, Package, CheckSquare, Square,
  ChevronUp, ChevronDown, ChevronsUpDown, Filter, X, Download,
  Upload, Undo2, Eye, EyeOff, MoreHorizontal, Tag, DollarSign,
  Layers, Hash, RefreshCw, CheckCircle2, AlertTriangle,
  BarChart3, Settings2, FileSpreadsheet, Percent, ArrowUpDown,
  PencilLine, Save, Ban, Wand2, Copy, Clipboard, ImageIcon, Link,
} from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
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
import { cn } from "@/app/components/ui/utils";
import { toast } from "sonner";
import { Product, ProductVariant } from "@/app/types";
import { VariantManagementDialog } from "@/app/components/variant-management-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────
type SortField = "name" | "sku" | "category" | "retailPrice" | "wholesalePrice" | "traderPrice" | "stock";
type SortDir   = "asc" | "desc";
type BulkTab   = "price" | "stock" | "category" | "sku" | "delete";

interface EditingCell {
  productId: string;
  field: "name" | "sku" | "category" | "wholesalePrice" | "traderPrice" | "retailPrice" | "stock";
  value: string;
}

interface BulkPriceForm {
  target: "retail" | "wholesale" | "trader" | "all";
  mode:   "percent_increase" | "percent_decrease" | "fixed_increase" | "fixed_decrease" | "set_value";
  value:  string;
}

interface BulkStockForm {
  mode:  "add" | "subtract" | "set";
  value: string;
}

interface PreviewRow {
  id: string; name: string;
  beforeRetail: number; afterRetail: number;
  beforeWholesale: number; afterWholesale: number;
  beforeTrader: number; afterTrader: number;
  beforeStock: number; afterStock: number;
  beforeCategory: string; afterCategory: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const applyPriceChange = (price: number, form: BulkPriceForm): number => {
  const v = parseFloat(form.value) || 0;
  switch (form.mode) {
    case "percent_increase": return +(price * (1 + v / 100)).toFixed(2);
    case "percent_decrease": return +(Math.max(0, price * (1 - v / 100))).toFixed(2);
    case "fixed_increase":   return +(price + v).toFixed(2);
    case "fixed_decrease":   return +(Math.max(0, price - v)).toFixed(2);
    case "set_value":        return +v.toFixed(2);
    default:                 return price;
  }
};

const applyStockChange = (stock: number, form: BulkStockForm): number => {
  const v = parseInt(form.value) || 0;
  switch (form.mode) {
    case "add":      return stock + v;
    case "subtract": return Math.max(0, stock - v);
    case "set":      return Math.max(0, v);
    default:         return stock;
  }
};

// ─── Component ────────────────────────────────────────────────────────────────
export function ProductManagementView() {
  const { products, addProduct, updateProduct, deleteProduct } = usePOS();

  // ── Search / filter / sort ──
  const [searchTerm,     setSearchTerm]     = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStock,    setFilterStock]    = useState("all");
  const [sortField,      setSortField]      = useState<SortField>("name");
  const [sortDir,        setSortDir]        = useState<SortDir>("asc");
  const [showFilters,    setShowFilters]    = useState(false);
  const [currentPage,    setCurrentPage]    = useState(1);
  const PAGE_SIZE = 25;

  // ── Column visibility ──
  const [visibleCols, setVisibleCols] = useState({
    image: true, sku: true, category: true, wholesale: true, trader: true,
    retail: true, stock: true, value: true,
  });

  // ── Selection ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Inline editing ──
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  // ── Single product dialog ──
  const [isAddDialogOpen,  setIsAddDialogOpen]  = useState(false);
  const [editingProduct,   setEditingProduct]   = useState<Product | null>(null);
  const [formData,         setFormData]         = useState({
    name:"", sku:"", category:"", wholesalePrice:"", traderPrice:"", retailPrice:"", stock:"", image:"",
  });
  const [imageUrlInput, setImageUrlInput] = useState("");
  const imageFileRef = useRef<HTMLInputElement>(null);

  // ── Bulk edit dialog ──
  const [isBulkDialogOpen,  setIsBulkDialogOpen]  = useState(false);
  const [bulkTab,            setBulkTab]            = useState<BulkTab>("price");
  const [isPreviewOpen,      setIsPreviewOpen]      = useState(false);
  const [previewRows,        setPreviewRows]        = useState<PreviewRow[]>([]);

  const [bulkPriceForm, setBulkPriceForm] = useState<BulkPriceForm>({
    target:"retail", mode:"percent_increase", value:"",
  });
  const [bulkStockForm, setBulkStockForm] = useState<BulkStockForm>({
    mode:"add", value:"",
  });
  const [bulkCategory,    setBulkCategory]    = useState("");
  const [bulkSkuPattern,  setBulkSkuPattern]  = useState("{CAT}-{NAME}-{NUM}");

  // ── Undo ──
  const [undoStack, setUndoStack] = useState<Product[][]>([]);

  // ── Import ──
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Variant management ──
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  // ─── Derived ─────────────────────────────────────────────────────────────
  const categories = useMemo(() =>
    [...new Set(products.map(p => p.category))].sort(), [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q));
    }
    if (filterCategory !== "all") list = list.filter(p => p.category === filterCategory);
    if (filterStock === "low")  list = list.filter(p => p.stock > 0 && p.stock <= 10);
    if (filterStock === "out")  list = list.filter(p => p.stock === 0);
    if (filterStock === "ok")   list = list.filter(p => p.stock > 10);

    list.sort((a, b) => {
      let av: string | number = a[sortField] ?? "";
      let bv: string | number = b[sortField] ?? "";
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [products, searchTerm, filterCategory, filterStock, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const allPageSelected = paged.length > 0 && paged.every(p => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;
  const selectedProducts = products.filter(p => selectedIds.has(p.id));

  // Stats
  const totalValue  = products.reduce((s, p) => s + p.retailPrice * p.stock, 0);
  const lowStock    = products.filter(p => p.stock > 0 && p.stock <= 10).length;
  const outOfStock  = products.filter(p => p.stock === 0).length;

  // ─── Sort helper ─────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-gray-400 ml-1"/>;
    return sortDir === "asc"
      ? <ChevronUp   className="w-3 h-3 text-blue-600 ml-1"/>
      : <ChevronDown className="w-3 h-3 text-blue-600 ml-1"/>;
  };

  // ─── Selection ───────────────────────────────────────────────────────────
  const toggleSelect  = (id: string) => setSelectedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll     = () => setSelectedIds(allPageSelected ? new Set() : new Set(paged.map(p => p.id)));
  const selectFiltered= () => setSelectedIds(new Set(filtered.map(p => p.id)));
  const clearSelection= () => setSelectedIds(new Set());

  // ─── Undo ────────────────────────────────────────────────────────────────
  const saveUndo = useCallback(() => setUndoStack(s => [products.map(p => ({...p})), ...s].slice(0, 10)), [products]);

  const handleUndo = () => {
    if (!undoStack.length) return;
    const [snapshot, ...rest] = undoStack;
    snapshot.forEach(p => updateProduct(p.id, p));
    setUndoStack(rest);
    toast.success("Undo applied");
  };

  // ─── Inline cell edit ────────────────────────────────────────────────────
  const startCellEdit = (p: Product, field: EditingCell["field"]) => {
    setEditingCell({ productId: p.id, field, value: String(p[field as keyof Product] ?? "") });
  };

  const commitCellEdit = () => {
    if (!editingCell) return;
    const { productId, field, value } = editingCell;
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const numFields = ["wholesalePrice","traderPrice","retailPrice","stock"];
    const parsed = numFields.includes(field) ? (parseFloat(value) || 0) : value;
    saveUndo();
    updateProduct(productId, { ...product, [field]: parsed });
    toast.success("Cell updated");
    setEditingCell(null);
  };

  const cancelCellEdit = () => setEditingCell(null);

  // ─── Single product form ─────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({ name:"", sku:"", category:"", wholesalePrice:"", traderPrice:"", retailPrice:"", stock:"", image:"" });
    setImageUrlInput("");
    setIsAddDialogOpen(false); setEditingProduct(null);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.category || !formData.retailPrice || !formData.stock) {
      toast.error("Please fill in all required fields"); return;
    }
    const sku = formData.sku ||
      `${formData.category.substring(0,3).toUpperCase()}-${formData.name.substring(0,3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const data = {
      name: formData.name, sku, category: formData.category,
      wholesalePrice: parseFloat(formData.wholesalePrice) || 0,
      traderPrice:    parseFloat(formData.traderPrice)    || 0,
      retailPrice:    parseFloat(formData.retailPrice),
      price:          parseFloat(formData.retailPrice),
      stock:          parseInt(formData.stock),
      image:          formData.image || undefined,
    };
    if (editingProduct) { updateProduct(editingProduct.id, data); toast.success("Product updated"); }
    else                { addProduct(data); toast.success("Product added"); }
    resetForm();
  };

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name, sku: p.sku, category: p.category,
      wholesalePrice: p.wholesalePrice.toString(),
      traderPrice:    p.traderPrice.toString(),
      retailPrice:    p.retailPrice.toString(),
      stock:          p.stock.toString(),
      image:          p.image || "",
    });
    setImageUrlInput(p.image || "");
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this product?")) { deleteProduct(id); toast.success("Deleted"); }
  };

  // ─── Image upload ─────────────────────────────────────────────────────────
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setFormData(f => ({ ...f, image: dataUrl }));
      setImageUrlInput("");
    };
    reader.readAsDataURL(file);
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  };

  const applyImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    setFormData(f => ({ ...f, image: url }));
  };

  // ─── Variant save ─────────────────────────────────────────────────────────
  const saveVariants = (productId: string, variants: ProductVariant[], hasVariants: boolean) => {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    updateProduct(productId, { ...p, variants, hasVariants });
  };

  // ─── Build bulk preview ───────────────────────────────────────────────────
  const buildPreview = (): PreviewRow[] => {
    return selectedProducts.map(p => {
      let aR = p.retailPrice, aW = p.wholesalePrice, aT = p.traderPrice;
      let aSt = p.stock, aCat = p.category;

      if (bulkTab === "price") {
        const f = bulkPriceForm;
        if (f.target === "retail" || f.target === "all") aR = applyPriceChange(p.retailPrice, f);
        if (f.target === "wholesale" || f.target === "all") aW = applyPriceChange(p.wholesalePrice, f);
        if (f.target === "trader"   || f.target === "all") aT = applyPriceChange(p.traderPrice, f);
      } else if (bulkTab === "stock") {
        aSt = applyStockChange(p.stock, bulkStockForm);
      } else if (bulkTab === "category") {
        aCat = bulkCategory || p.category;
      } else if (bulkTab === "sku") {
        // SKU preview handled separately
      }

      return {
        id: p.id, name: p.name,
        beforeRetail: p.retailPrice,    afterRetail: aR,
        beforeWholesale: p.wholesalePrice, afterWholesale: aW,
        beforeTrader: p.traderPrice,    afterTrader: aT,
        beforeStock: p.stock,           afterStock: aSt,
        beforeCategory: p.category,    afterCategory: aCat,
      };
    });
  };

  const openPreview = () => {
    setPreviewRows(buildPreview());
    setIsPreviewOpen(true);
  };

  // ─── Apply bulk changes ───────────────────────────────────────────────────
  const applyBulk = () => {
    if (!selectedIds.size) { toast.error("No products selected"); return; }
    saveUndo();

    if (bulkTab === "price") {
      if (!bulkPriceForm.value) { toast.error("Enter a value"); return; }
      selectedProducts.forEach(p => {
        const f = bulkPriceForm;
        const updates: Partial<Product> = {};
        if (f.target === "retail"    || f.target === "all") updates.retailPrice    = applyPriceChange(p.retailPrice, f);
        if (f.target === "wholesale" || f.target === "all") updates.wholesalePrice = applyPriceChange(p.wholesalePrice, f);
        if (f.target === "trader"    || f.target === "all") updates.traderPrice    = applyPriceChange(p.traderPrice, f);
        updateProduct(p.id, { ...p, ...updates });
      });
      toast.success(`Prices updated for ${selectedIds.size} products`);
    } else if (bulkTab === "stock") {
      if (!bulkStockForm.value) { toast.error("Enter a value"); return; }
      selectedProducts.forEach(p =>
        updateProduct(p.id, { ...p, stock: applyStockChange(p.stock, bulkStockForm) }));
      toast.success(`Stock updated for ${selectedIds.size} products`);
    } else if (bulkTab === "category") {
      if (!bulkCategory) { toast.error("Select or enter a category"); return; }
      selectedProducts.forEach(p => updateProduct(p.id, { ...p, category: bulkCategory }));
      toast.success(`Category changed for ${selectedIds.size} products`);
    } else if (bulkTab === "sku") {
      let counter = 1;
      selectedProducts.forEach(p => {
        const sku = bulkSkuPattern
          .replace("{CAT}",  p.category.substring(0,3).toUpperCase())
          .replace("{NAME}", p.name.substring(0,3).toUpperCase())
          .replace("{NUM}",  String(counter++).padStart(3, "0"))
          .replace("{ID}",   p.id);
        updateProduct(p.id, { ...p, sku });
      });
      toast.success(`SKUs regenerated for ${selectedIds.size} products`);
    } else if (bulkTab === "delete") {
      if (!confirm(`Delete ${selectedIds.size} products? This cannot be undone.`)) return;
      selectedIds.forEach(id => deleteProduct(id));
      toast.success(`${selectedIds.size} products deleted`);
      clearSelection();
    }

    setIsBulkDialogOpen(false);
    setIsPreviewOpen(false);
  };

  // ─── Bulk delete shortcut ─────────────────────────────────────────────────
  const handleBulkDelete = () => {
    if (!confirm(`Delete ${selectedIds.size} selected products?`)) return;
    saveUndo();
    selectedIds.forEach(id => deleteProduct(id));
    toast.success(`${selectedIds.size} products deleted`);
    clearSelection();
  };

  // ─── Export ──────────────────────────────────────────────────────────────
  const exportCSV = (onlySelected = false) => {
    const list = onlySelected ? selectedProducts : filtered;
    const header = "Name,SKU,Category,Wholesale,Trader,Retail,Stock,Value";
    const rows = list.map(p =>
      `"${p.name}","${p.sku}","${p.category}",${p.wholesalePrice},${p.traderPrice},${p.retailPrice},${p.stock},${(p.retailPrice * p.stock).toFixed(2)}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `products-${Date.now()}.csv`; a.click();
    toast.success(`Exported ${list.length} products`);
  };

  const exportJSON = () => {
    const data = JSON.stringify(selectedIds.size ? selectedProducts : filtered, null, 2);
    const blob = new Blob([data], { type:"application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "products.json"; a.click();
    toast.success("Exported as JSON");
  };

  // ─── Import CSV ───────────────────────────────────────────────────────────
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split("\n").filter(Boolean);
        const headers = lines[0].split(",").map(h => h.replace(/"/g,"").trim().toLowerCase());
        let added = 0;
        lines.slice(1).forEach(line => {
          const cols = line.split(",").map(c => c.replace(/"/g,"").trim());
          const row: Record<string,string> = {};
          headers.forEach((h, i) => { row[h] = cols[i] || ""; });
          if (!row.name || !row.category) return;
          addProduct({
            name: row.name, sku: row.sku || "", category: row.category,
            wholesalePrice: parseFloat(row.wholesale||row.wholesaleprice||"0"),
            traderPrice:    parseFloat(row.trader   ||row.traderprice   ||"0"),
            retailPrice:    parseFloat(row.retail   ||row.retailprice   ||"0"),
            price:          parseFloat(row.retail   ||row.retailprice   ||"0"),
            stock:          parseInt  (row.stock    ||"0"),
          });
          added++;
        });
        toast.success(`Imported ${added} products`);
      } catch { toast.error("Invalid CSV file"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ─── Duplicate ────────────────────────────────────────────────────────────
  const handleDuplicate = (p: Product) => {
    addProduct({
      ...p,
      name: `${p.name} (Copy)`,
      sku: `${p.sku}-COPY`,
    });
    toast.success("Product duplicated");
  };

  // ─── Render helpers ───────────────────────────────────────────────────────
  const ColToggle = ({ col, label }: { col: keyof typeof visibleCols; label: string }) => (
    <button
      onClick={() => setVisibleCols(v => ({ ...v, [col]: !v[col] }))}
      className={cn("flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors",
        visibleCols[col] ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-500")}
    >
      {visibleCols[col] ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>}
      {label}
    </button>
  );

  const InlineCell = ({ p, field, display, prefix = "" }: {
    p: Product; field: EditingCell["field"]; display: string; prefix?: string;
  }) => {
    const isEditing = editingCell?.productId === p.id && editingCell?.field === field;
    if (isEditing) {
      return (
        <div className="flex items-center gap-1 min-w-0">
          <Input
            autoFocus
            value={editingCell.value}
            onChange={e => setEditingCell(c => c ? { ...c, value: e.target.value } : null)}
            onKeyDown={e => { if (e.key === "Enter") commitCellEdit(); if (e.key === "Escape") cancelCellEdit(); }}
            className="h-7 text-xs w-28 px-1.5"
          />
          <button onClick={commitCellEdit}   className="text-green-600 hover:text-green-700"><Save className="w-3.5 h-3.5"/></button>
          <button onClick={cancelCellEdit}   className="text-red-500 hover:text-red-700"><Ban className="w-3.5 h-3.5"/></button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 group/cell">
        <span>{prefix}{display}</span>
        <button
          onClick={() => startCellEdit(p, field)}
          className="opacity-0 group-hover/cell:opacity-100 transition-opacity text-gray-400 hover:text-blue-600"
          title="Edit cell"
        >
          <PencilLine className="w-3 h-3"/>
        </button>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600"/>
            Product Management
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Inline editing · advanced bulk operations · import / export · variant management</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {undoStack.length > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50" onClick={handleUndo}>
              <Undo2 className="w-4 h-4"/> Undo
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4"/> Import CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCSV} className="hidden"/>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCSV()}>
            <Download className="w-4 h-4"/> Export CSV
          </Button>
          <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4"/> Add Product
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label:"Total Products",  value:products.length,           color:"blue",   icon:<Package className="w-4 h-4"/>    },
          { label:"Categories",      value:categories.length,         color:"purple", icon:<Tag className="w-4 h-4"/>        },
          { label:"Total Stock",     value:products.reduce((s,p)=>s+p.stock,0), color:"indigo",icon:<Layers className="w-4 h-4"/>  },
          { label:"Inventory Value", value:`£${totalValue.toFixed(0)}`, color:"green", icon:<DollarSign className="w-4 h-4"/>},
          { label:"Low / Out Stock", value:`${lowStock} / ${outOfStock}`, color:"red", icon:<AlertTriangle className="w-4 h-4"/>},
        ].map(({ label, value, color, icon }) => (
          <Card key={label} className={`border-l-4 border-l-${color}-500`}>
            <CardContent className="p-4">
              <div className={`flex items-center gap-1.5 text-xs font-medium text-${color}-600 mb-1`}>{icon}{label}</div>
              <div className={`text-2xl font-bold text-${color}-600`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Filters + Column Toggle */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
              <Input placeholder="Search name, SKU, category…" value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-10"/>
            </div>
            <Button variant="outline" size="sm" className={cn("gap-1.5", showFilters && "bg-blue-50 border-blue-400 text-blue-700")}
              onClick={() => setShowFilters(v => !v)}>
              <Filter className="w-4 h-4"/> Filters {showFilters ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportJSON()}>
              <FileSpreadsheet className="w-4 h-4"/> JSON
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 pt-1 border-t">
              <div className="flex flex-col gap-1 min-w-44">
                <Label className="text-xs text-gray-500">Category</Label>
                <Select value={filterCategory} onValueChange={v => { setFilterCategory(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 min-w-36">
                <Label className="text-xs text-gray-500">Stock Status</Label>
                <Select value={filterStock} onValueChange={v => { setFilterStock(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock</SelectItem>
                    <SelectItem value="ok">In Stock (&gt;10)</SelectItem>
                    <SelectItem value="low">Low Stock (1–10)</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Column toggles */}
          <div className="flex flex-wrap gap-2 pt-1 border-t">
            <span className="text-xs text-gray-400 self-center">Columns:</span>
            <ColToggle col="image"     label="Image"/>
            <ColToggle col="sku"       label="SKU"/>
            <ColToggle col="category"  label="Category"/>
            <ColToggle col="wholesale" label="Wholesale"/>
            <ColToggle col="trader"    label="Trader"/>
            <ColToggle col="retail"    label="Retail"/>
            <ColToggle col="stock"     label="Stock"/>
            <ColToggle col="value"     label="Value"/>
          </div>
        </CardContent>
      </Card>

      {/* Selection bar */}
      {someSelected && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex-wrap">
          <CheckSquare className="w-4 h-4 text-blue-600"/>
          <span className="text-sm font-medium text-blue-700">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={selectFiltered}>
            Select all {filtered.length}
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700" onClick={() => setIsBulkDialogOpen(true)}>
            <Wand2 className="w-3 h-3"/> Bulk Edit
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => exportCSV(true)}>
            <Download className="w-3 h-3"/> Export Selected
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600 border-red-300 hover:bg-red-50"
            onClick={handleBulkDelete}>
            <Trash2 className="w-3 h-3"/> Delete Selected
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 ml-auto text-gray-400 hover:text-gray-600"
            onClick={clearSelection}>
            <X className="w-4 h-4"/>
          </Button>
        </div>
      )}

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                {/* Select all */}
                <TableHead className="w-10">
                  <button onClick={toggleAll} className="flex items-center">
                    {allPageSelected
                      ? <CheckSquare className="w-4 h-4 text-blue-600"/>
                      : <Square className="w-4 h-4 text-gray-400"/>}
                  </button>
                </TableHead>
                {visibleCols.image && <TableHead className="w-16">Image</TableHead>}
                <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort("name")}>
                  <div className="flex items-center">Product Name<SortIcon field="name"/></div>
                </TableHead>
                {visibleCols.sku && (
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort("sku")}>
                    <div className="flex items-center">SKU<SortIcon field="sku"/></div>
                  </TableHead>
                )}
                {visibleCols.category && (
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort("category")}>
                    <div className="flex items-center">Category<SortIcon field="category"/></div>
                  </TableHead>
                )}
                {visibleCols.wholesale && (
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort("wholesalePrice")}>
                    <div className="flex items-center">Wholesale<SortIcon field="wholesalePrice"/></div>
                  </TableHead>
                )}
                {visibleCols.trader && (
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort("traderPrice")}>
                    <div className="flex items-center">Trader<SortIcon field="traderPrice"/></div>
                  </TableHead>
                )}
                {visibleCols.retail && (
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort("retailPrice")}>
                    <div className="flex items-center">Retail<SortIcon field="retailPrice"/></div>
                  </TableHead>
                )}
                {visibleCols.stock && (
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort("stock")}>
                    <div className="flex items-center">Stock<SortIcon field="stock"/></div>
                  </TableHead>
                )}
                {visibleCols.value && <TableHead>Value</TableHead>}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 && (
                <TableRow><TableCell colSpan={12} className="text-center py-12 text-gray-400">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-40"/>No products found
                </TableCell></TableRow>
              )}
              {paged.map(p => {
                const isSelected = selectedIds.has(p.id);
                const isLow = p.stock > 0 && p.stock <= 10;
                const isOut = p.stock === 0;
                const variantCount = p.variants?.length ?? 0;
                return (
                  <TableRow key={p.id} className={cn(
                    "transition-colors",
                    isSelected ? "bg-blue-50 hover:bg-blue-100" : isOut ? "bg-red-50" : isLow ? "bg-amber-50" : "hover:bg-gray-50"
                  )}>
                    {/* Checkbox */}
                    <TableCell>
                      <button onClick={() => toggleSelect(p.id)}>
                        {isSelected
                          ? <CheckSquare className="w-4 h-4 text-blue-600"/>
                          : <Square className="w-4 h-4 text-gray-300"/>}
                      </button>
                    </TableCell>
                    {/* Image thumbnail */}
                    {visibleCols.image && (
                      <TableCell>
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 object-cover rounded-lg border border-gray-200 shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-gray-300"/>
                          </div>
                        )}
                      </TableCell>
                    )}
                    {/* Name */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <InlineCell p={p} field="name" display={p.name}/>
                        {variantCount > 0 && (
                          <button onClick={() => setVariantProduct(p)}
                            className="flex items-center gap-1 bg-violet-50 border border-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold hover:bg-violet-100 transition-colors">
                            <Layers className="w-2.5 h-2.5"/>
                            {variantCount}
                          </button>
                        )}
                      </div>
                    </TableCell>
                    {/* SKU */}
                    {visibleCols.sku && (
                      <TableCell>
                        <InlineCell p={p} field="sku" display={p.sku}/>
                      </TableCell>
                    )}
                    {/* Category */}
                    {visibleCols.category && (
                      <TableCell>
                        <InlineCell p={p} field="category" display={p.category}/>
                      </TableCell>
                    )}
                    {/* Wholesale */}
                    {visibleCols.wholesale && (
                      <TableCell className="text-sm">
                        <InlineCell p={p} field="wholesalePrice" display={p.wholesalePrice.toFixed(2)} prefix="£"/>
                      </TableCell>
                    )}
                    {/* Trader */}
                    {visibleCols.trader && (
                      <TableCell className="text-sm">
                        <InlineCell p={p} field="traderPrice" display={p.traderPrice.toFixed(2)} prefix="£"/>
                      </TableCell>
                    )}
                    {/* Retail */}
                    {visibleCols.retail && (
                      <TableCell>
                        <InlineCell p={p} field="retailPrice" display={p.retailPrice.toFixed(2)} prefix="£"/>
                      </TableCell>
                    )}
                    {/* Stock */}
                    {visibleCols.stock && (
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={isOut ? "destructive" : isLow ? "secondary" : "default"}
                            className={cn(isOut ? "bg-red-500" : isLow ? "bg-amber-500 text-white" : "bg-emerald-500 text-white")}>
                            {p.stock}
                          </Badge>
                          <div className="group/stock">
                            <InlineCell p={p} field="stock" display=""/>
                          </div>
                        </div>
                      </TableCell>
                    )}
                    {/* Value */}
                    {visibleCols.value && (
                      <TableCell className="font-semibold text-sm text-gray-700">
                        £{(p.retailPrice * p.stock).toFixed(2)}
                      </TableCell>
                    )}
                    {/* Actions */}
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(p)} title="Edit product">
                          <Edit className="w-3.5 h-3.5 text-blue-600"/>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setVariantProduct(p)} title="Manage Variants"
                          className="relative">
                          <Layers className="w-3.5 h-3.5 text-violet-500"/>
                          {variantCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-violet-600 text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                              {variantCount}
                            </span>
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDuplicate(p)} title="Duplicate">
                          <Copy className="w-3.5 h-3.5 text-gray-500"/>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} title="Delete" className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <span className="text-xs text-gray-500">
                Showing {(currentPage-1)*PAGE_SIZE+1}–{Math.min(currentPage*PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={currentPage===1} onClick={() => setCurrentPage(p => p-1)}>Prev</Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button key={page} size="sm" variant={currentPage===page?"default":"outline"}
                      className={cn("h-7 w-7 p-0 text-xs", currentPage===page && "bg-blue-600 hover:bg-blue-700")}
                      onClick={() => setCurrentPage(page)}>
                      {page}
                    </Button>
                  );
                })}
                {totalPages > 7 && <span className="text-xs text-gray-400">…{totalPages}</span>}
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={currentPage===totalPages} onClick={() => setCurrentPage(p => p+1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ════ BULK EDIT DIALOG ════════════════════════════════════════ */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-blue-600"/>
              Bulk Edit — {selectedIds.size} Products Selected
            </DialogTitle>
            <DialogDescription>
              Choose an operation below. Preview changes before applying.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={bulkTab} onValueChange={v => setBulkTab(v as BulkTab)}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="price"    className="text-xs gap-1"><DollarSign className="w-3 h-3"/>Price</TabsTrigger>
              <TabsTrigger value="stock"    className="text-xs gap-1"><Layers className="w-3 h-3"/>Stock</TabsTrigger>
              <TabsTrigger value="category" className="text-xs gap-1"><Tag className="w-3 h-3"/>Category</TabsTrigger>
              <TabsTrigger value="sku"      className="text-xs gap-1"><Hash className="w-3 h-3"/>SKU</TabsTrigger>
              <TabsTrigger value="delete"   className="text-xs gap-1 text-red-600"><Trash2 className="w-3 h-3"/>Delete</TabsTrigger>
            </TabsList>

            {/* ── Price Tab ── */}
            <TabsContent value="price" className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Apply To</Label>
                  <Select value={bulkPriceForm.target} onValueChange={v => setBulkPriceForm(f => ({...f, target: v as any}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Retail Price Only</SelectItem>
                      <SelectItem value="wholesale">Wholesale Price Only</SelectItem>
                      <SelectItem value="trader">Trader Price Only</SelectItem>
                      <SelectItem value="all">All Prices</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Operation</Label>
                  <Select value={bulkPriceForm.mode} onValueChange={v => setBulkPriceForm(f => ({...f, mode: v as any}))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent_increase">% Increase</SelectItem>
                      <SelectItem value="percent_decrease">% Decrease</SelectItem>
                      <SelectItem value="fixed_increase">Fixed Increase (£)</SelectItem>
                      <SelectItem value="fixed_decrease">Fixed Decrease (£)</SelectItem>
                      <SelectItem value="set_value">Set Exact Value (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Value</Label>
                <Input type="number" step="0.01" min="0"
                  value={bulkPriceForm.value}
                  onChange={e => setBulkPriceForm(f => ({...f, value: e.target.value}))}
                  placeholder="Enter amount or percentage"/>
              </div>
            </TabsContent>

            {/* ── Stock Tab ── */}
            <TabsContent value="stock" className="space-y-4 pt-3">
              <div className="space-y-1">
                <Label>Operation</Label>
                <Select value={bulkStockForm.mode} onValueChange={v => setBulkStockForm(f => ({...f, mode: v as any}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add Stock</SelectItem>
                    <SelectItem value="subtract">Subtract Stock</SelectItem>
                    <SelectItem value="set">Set Exact Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Quantity</Label>
                <Input type="number" min="0"
                  value={bulkStockForm.value}
                  onChange={e => setBulkStockForm(f => ({...f, value: e.target.value}))}
                  placeholder="Enter quantity"/>
              </div>
            </TabsContent>

            {/* ── Category Tab ── */}
            <TabsContent value="category" className="space-y-4 pt-3">
              <div className="space-y-1">
                <Label>New Category</Label>
                <div className="flex gap-2">
                  <Select value={bulkCategory} onValueChange={setBulkCategory}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Choose existing…"/></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span className="self-center text-xs text-gray-400">or</span>
                  <Input className="flex-1" value={bulkCategory}
                    onChange={e => setBulkCategory(e.target.value)}
                    placeholder="Type new category…"/>
                </div>
              </div>
            </TabsContent>

            {/* ── SKU Tab ── */}
            <TabsContent value="sku" className="space-y-4 pt-3">
              <div className="space-y-1">
                <Label>SKU Pattern</Label>
                <Input value={bulkSkuPattern}
                  onChange={e => setBulkSkuPattern(e.target.value)}
                  placeholder="{CAT}-{NAME}-{NUM}"/>
                <p className="text-xs text-gray-500 mt-1">
                  Variables: <code className="bg-gray-100 px-1 rounded">{"{CAT}"}</code> category prefix,{" "}
                  <code className="bg-gray-100 px-1 rounded">{"{NAME}"}</code> name prefix,{" "}
                  <code className="bg-gray-100 px-1 rounded">{"{NUM}"}</code> counter,{" "}
                  <code className="bg-gray-100 px-1 rounded">{"{ID}"}</code> product ID
                </p>
              </div>
            </TabsContent>

            {/* ── Delete Tab ── */}
            <TabsContent value="delete" className="pt-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                <p className="font-semibold mb-1">⚠ This will permanently delete {selectedIds.size} products</p>
                <p>This action cannot be undone. Consider exporting first.</p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>Cancel</Button>
            {bulkTab !== "delete" && (
              <Button variant="outline" onClick={openPreview}>
                <BarChart3 className="w-4 h-4 mr-1"/> Preview
              </Button>
            )}
            <Button
              onClick={applyBulk}
              className={cn(bulkTab === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700")}>
              {bulkTab === "delete" ? "Delete All Selected" : "Apply Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ BULK PREVIEW DIALOG ════════════════════════════════════════ */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Preview Changes — {previewRows.length} Products</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[50vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  {bulkTab === "price"    && <><TableHead>Retail Before</TableHead><TableHead>Retail After</TableHead><TableHead>Wholesale After</TableHead><TableHead>Trader After</TableHead></>}
                  {bulkTab === "stock"    && <><TableHead>Before</TableHead><TableHead>After</TableHead></>}
                  {bulkTab === "category" && <><TableHead>Before</TableHead><TableHead>After</TableHead></>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    {bulkTab === "price" && (
                      <>
                        <TableCell className="text-gray-400">£{row.beforeRetail.toFixed(2)}</TableCell>
                        <TableCell className={cn("font-semibold", row.afterRetail > row.beforeRetail ? "text-green-600" : "text-red-600")}>£{row.afterRetail.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">£{row.afterWholesale.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">£{row.afterTrader.toFixed(2)}</TableCell>
                      </>
                    )}
                    {bulkTab === "stock" && (
                      <>
                        <TableCell className="text-gray-400">{row.beforeStock}</TableCell>
                        <TableCell className={cn("font-semibold", row.afterStock > row.beforeStock ? "text-green-600" : "text-amber-600")}>{row.afterStock}</TableCell>
                      </>
                    )}
                    {bulkTab === "category" && (
                      <>
                        <TableCell className="text-gray-400">{row.beforeCategory}</TableCell>
                        <TableCell className="font-semibold text-blue-600">{row.afterCategory}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Cancel</Button>
            <Button onClick={applyBulk} className="bg-blue-600 hover:bg-blue-700">Confirm & Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ ADD / EDIT PRODUCT DIALOG ════════════════════════════════════ */}
      <Dialog open={isAddDialogOpen} onOpenChange={v => { if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>
              {editingProduct ? "Update product information." : "Fill in the product details below."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">

            {/* ── Product Image ── */}
            <div className="space-y-2">
              <Label>Product Image</Label>

              {formData.image ? (
                <div className="relative group w-full">
                  <img
                    src={formData.image}
                    alt="Product preview"
                    className="w-full h-44 object-contain rounded-xl border border-gray-200 bg-gray-50"
                  />
                  <button
                    onClick={() => { setFormData(f => ({ ...f, image: "" })); setImageUrlInput(""); }}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5"/>
                  </button>
                  <button
                    onClick={() => imageFileRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-lg px-2.5 py-1 text-xs flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <Upload className="w-3 h-3"/> Change
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleImageDrop}
                  onClick={() => imageFileRef.current?.click()}
                  className="w-full h-36 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-blue-50 hover:border-blue-400 cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500"
                >
                  <ImageIcon className="w-8 h-8"/>
                  <p className="text-sm font-medium">Click to upload or drag & drop</p>
                  <p className="text-xs">PNG, JPG, WEBP · max 5 MB</p>
                </div>
              )}

              <input
                ref={imageFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ""; }}
              />

              {/* URL paste */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
                  <Input
                    className="pl-8 text-sm"
                    placeholder="Or paste image URL…"
                    value={imageUrlInput}
                    onChange={e => setImageUrlInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && applyImageUrl()}
                  />
                </div>
                <Button size="sm" variant="outline" onClick={applyImageUrl} disabled={!imageUrlInput.trim()}>
                  Apply URL
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" value={formData.name}
                  onChange={e => setFormData(f => ({...f, name: e.target.value}))}
                  placeholder="Product name"/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" value={formData.sku}
                  onChange={e => setFormData(f => ({...f, sku: e.target.value}))}
                  placeholder="Auto-generated if blank"/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="category">Category *</Label>
                <div className="flex gap-2">
                  <Select value={formData.category} onValueChange={v => setFormData(f => ({...f, category: v}))}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Pick…"/></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="flex-1" value={formData.category}
                    onChange={e => setFormData(f => ({...f, category: e.target.value}))}
                    placeholder="or type new"/>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="wholesale">Wholesale £</Label>
                <Input id="wholesale" type="number" step="0.01" min="0"
                  value={formData.wholesalePrice}
                  onChange={e => setFormData(f => ({...f, wholesalePrice: e.target.value}))}
                  placeholder="0.00"/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="trader">Trader £</Label>
                <Input id="trader" type="number" step="0.01" min="0"
                  value={formData.traderPrice}
                  onChange={e => setFormData(f => ({...f, traderPrice: e.target.value}))}
                  placeholder="0.00"/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="retail">Retail £ *</Label>
                <Input id="retail" type="number" step="0.01" min="0"
                  value={formData.retailPrice}
                  onChange={e => setFormData(f => ({...f, retailPrice: e.target.value}))}
                  placeholder="0.00"/>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="stock">Stock *</Label>
              <Input id="stock" type="number" min="0"
                value={formData.stock}
                onChange={e => setFormData(f => ({...f, stock: e.target.value}))}
                placeholder="0"/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
              {editingProduct ? "Update" : "Add"} Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ VARIANT MANAGEMENT DIALOG ════════════════════════════════════ */}
      {variantProduct && (
        <VariantManagementDialog
          product={variantProduct}
          onClose={() => setVariantProduct(null)}
          onSave={(productId, variants, hasVariants) => {
            saveVariants(productId, variants, hasVariants);
            setVariantProduct(null);
          }}
        />
      )}
    </div>
  );
}
