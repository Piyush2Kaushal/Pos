/**
 * VariantManagementDialog — Shopify-style variant manager
 *
 * Layout mirrors the image exactly:
 *  – "Variants" card header with "+ Add variant" button
 *  – Attribute group rows (drag handle · name · value tags · expand)
 *  – Group-by / search / All-locations toolbar
 *  – Expandable variant table (parent group row → child combo rows)
 *  – Inline price + available inputs
 *  – Total inventory footer
 */
import { useState, useMemo, useCallback } from "react";
import {
  X, Plus, Trash2, Edit2, GripVertical, ChevronUp, ChevronDown,
  Package, Layers, Search, SlidersHorizontal, MapPin, Image as ImageIcon,
  CheckSquare, Square, RefreshCw, Wand2, ArrowRight, Tag, Save,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { cn } from "@/app/components/ui/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/app/components/ui/select";
import { toast } from "sonner";
import { Product, ProductVariant, ProductVariantAttribute } from "@/app/types";

// ── helpers ────────────────────────────────────────────────────────────────────
const genId = () => `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const makeVariantName = (attrs: ProductVariantAttribute[]) =>
  attrs.map(a => a.value).join(" / ") || "Default";
const makeVariantSku = (parentSku: string, attrs: ProductVariantAttribute[]) =>
  `${parentSku}-${attrs.map(a => a.value.substring(0, 3).toUpperCase()).join("-")}`;
function cartesian<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap(combo => arr.map(item => [...combo, item])), [[]]
  );
}

// ── Tag input ──────────────────────────────────────────────────────────────────
function TagInput({ values, onChange, placeholder }: {
  values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap gap-1.5 items-center min-h-[28px]">
      {values.map(v => (
        <span key={v}
          className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 text-gray-700 px-2.5 py-0.5 rounded text-xs font-medium">
          {v}
          <button onClick={() => onChange(values.filter(x => x !== v))} type="button"
            className="text-gray-400 hover:text-red-500 ml-0.5 leading-none">×</button>
        </span>
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
        placeholder={values.length === 0 ? (placeholder || "Add value…") : "Add…"}
        className="flex-1 min-w-[80px] text-xs outline-none bg-transparent placeholder-gray-400"
      />
    </div>
  );
}

// ── Attribute group ────────────────────────────────────────────────────────────
interface AttrGroup { id: string; name: string; values: string[] }

// ── Props ──────────────────────────────────────────────────────────────────────
interface Props {
  product: Product;
  onClose: () => void;
  onSave: (productId: string, variants: ProductVariant[], hasVariants: boolean) => void;
}

export function VariantManagementDialog({ product, onClose, onSave }: Props) {
  // ── Attribute groups ────────────────────────────────────────────────────────
  const [attrGroups, setAttrGroups] = useState<AttrGroup[]>(() => {
    if (!product.variants?.length) return [];
    const map = new Map<string, Set<string>>();
    product.variants.forEach(v => {
      v.attributes.forEach(a => {
        if (!map.has(a.name)) map.set(a.name, new Set());
        map.get(a.name)!.add(a.value);
      });
    });
    return Array.from(map.entries()).map(([name, vals]) => ({
      id: genId(), name, values: Array.from(vals),
    }));
  });

  // ── Variants state ───────────────────────────────────────────────────────────
  const [variants, setVariants] = useState<ProductVariant[]>(
    () => product.variants ?? []
  );

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [groupBy, setGroupBy]               = useState<string>("__first__");
  const [variantSearch, setVariantSearch]   = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["__ALL__"]));
  const [selectedVIds, setSelectedVIds]     = useState<Set<string>>(new Set());
  const [editingAttrId, setEditingAttrId]   = useState<string | null>(null);
  const [editingAttrName, setEditingAttrName] = useState("");
  const [addingAttr, setAddingAttr]         = useState(false);
  const [newAttrName, setNewAttrName]       = useState("");
  const [dirty, setDirty]                   = useState(false);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const totalStock = useMemo(() => variants.reduce((s, v) => s + v.stock, 0), [variants]);
  const activeGroupBy = groupBy === "__first__" ? attrGroups[0]?.name ?? null : groupBy;

  const filteredVariants = useMemo(() => {
    if (!variantSearch) return variants;
    const q = variantSearch.toLowerCase();
    return variants.filter(v =>
      v.name.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q));
  }, [variants, variantSearch]);

  // Group variants
  const grouped = useMemo(() => {
    if (!activeGroupBy) return [{ key: "All variants", items: filteredVariants }];
    const map = new Map<string, ProductVariant[]>();
    filteredVariants.forEach(v => {
      const attr = v.attributes.find(a => a.name === activeGroupBy);
      const key = attr?.value ?? "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    });
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [filteredVariants, activeGroupBy]);

  // ── Attribute group helpers ─────────────────────────────────────────────────
  const addAttrGroup = () => {
    if (!newAttrName.trim()) return;
    setAttrGroups(prev => [...prev, { id: genId(), name: newAttrName.trim(), values: [] }]);
    setNewAttrName("");
    setAddingAttr(false);
    setDirty(true);
  };

  const updateAttrValues = (id: string, values: string[]) => {
    setAttrGroups(prev => prev.map(g => g.id === id ? { ...g, values } : g));
    setDirty(true);
  };

  const updateAttrName = (id: string, name: string) => {
    setAttrGroups(prev => prev.map(g => g.id === id ? { ...g, name } : g));
    setEditingAttrId(null);
    setDirty(true);
  };

  const removeAttrGroup = (id: string) => {
    setAttrGroups(prev => prev.filter(g => g.id !== id));
    setDirty(true);
  };

  // ── Generate variants from attribute groups ─────────────────────────────────
  const generateVariants = useCallback(() => {
    const valid = attrGroups.filter(g => g.name && g.values.length > 0);
    if (valid.length === 0) { toast.error("Add at least one attribute with values"); return; }
    const combos = cartesian(valid.map(g => g.values));
    const newVariants: ProductVariant[] = combos.map(combo => {
      const attrs: ProductVariantAttribute[] = combo.map((val, idx) => ({
        name: valid[idx].name, value: val,
      }));
      const name = makeVariantName(attrs);
      // reuse existing variant data if name matches
      const existing = variants.find(v => v.name === name);
      return existing ?? {
        id: genId(), name, sku: makeVariantSku(product.sku, attrs),
        attributes: attrs, stock: 0, isActive: true, createdAt: new Date(),
        wholesalePrice: product.wholesalePrice,
        traderPrice:    product.traderPrice,
        retailPrice:    product.retailPrice,
      };
    });
    setVariants(newVariants);
    setExpandedGroups(new Set(["__ALL__", ...newVariants.map(v => {
      const a = v.attributes[0];
      return a ? a.value : "All variants";
    })]));
    setDirty(true);
    toast.success(`${newVariants.length} variants generated`);
  }, [attrGroups, variants, product]);

  // ── Variant field update ────────────────────────────────────────────────────
  const updateVariant = (id: string, patch: Partial<ProductVariant>) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v));
    setDirty(true);
  };

  const deleteVariant = (id: string) => {
    setVariants(prev => prev.filter(v => v.id !== id));
    setSelectedVIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    setDirty(true);
  };

  // ── Select helpers ──────────────────────────────────────────────────────────
  const toggleV = (id: string) => setSelectedVIds(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const allSelected = filteredVariants.length > 0 && filteredVariants.every(v => selectedVIds.has(v.id));
  const toggleAll = () => setSelectedVIds(allSelected ? new Set() : new Set(filteredVariants.map(v => v.id)));

  // ── Toggle group expand ─────────────────────────────────────────────────────
  const toggleGroup = (key: string) => setExpandedGroups(prev => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;
  });

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = () => {
    onSave(product.id, variants, variants.length > 0);
    setDirty(false);
    toast.success(`Variants saved for ${product.name}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">

        {/* ── Modal header ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base leading-tight">Variant Management</h2>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{product.name} · {product.sku}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <Button size="sm" onClick={handleSave}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5 h-8 text-xs">
                <Save className="w-3.5 h-3.5" />Save Changes
              </Button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Scroll body ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ══ VARIANTS CARD ══════════════════════════════════════════════ */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Variants</h3>
              <button
                onClick={() => setAddingAttr(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />Add variant
              </button>
            </div>

            {/* Attribute group rows */}
            <div className="divide-y divide-gray-100">
              {attrGroups.map(group => (
                <div key={group.id}
                  className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50/60 transition-colors group/row">
                  {/* Drag handle */}
                  <div className="mt-0.5 text-gray-300 cursor-grab shrink-0">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  {/* Name + values */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {editingAttrId === group.id ? (
                      <input
                        autoFocus
                        value={editingAttrName}
                        onChange={e => setEditingAttrName(e.target.value)}
                        onBlur={() => updateAttrName(group.id, editingAttrName || group.name)}
                        onKeyDown={e => { if (e.key === "Enter") updateAttrName(group.id, editingAttrName || group.name); }}
                        className="text-sm font-semibold text-gray-800 outline-none border-b border-blue-400 bg-transparent pb-0.5"
                      />
                    ) : (
                      <button
                        onClick={() => { setEditingAttrId(group.id); setEditingAttrName(group.name); }}
                        className="text-sm font-semibold text-gray-800 hover:text-blue-600 text-left"
                      >
                        {group.name}
                      </button>
                    )}
                    <TagInput
                      values={group.values}
                      onChange={vals => updateAttrValues(group.id, vals)}
                      placeholder={`Add ${group.name} values…`}
                    />
                  </div>
                  {/* Remove */}
                  <button
                    onClick={() => removeAttrGroup(group.id)}
                    className="opacity-0 group-hover/row:opacity-100 mt-0.5 text-gray-400 hover:text-red-500 transition-all shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Add attribute row */}
              {addingAttr ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-blue-50/50">
                  <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                  <input
                    autoFocus
                    value={newAttrName}
                    onChange={e => setNewAttrName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addAttrGroup(); if (e.key === "Escape") setAddingAttr(false); }}
                    placeholder="Attribute name (e.g. Color, Size)…"
                    className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400 border-b border-blue-400 pb-0.5"
                  />
                  <button onClick={addAttrGroup} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Add</button>
                  <button onClick={() => setAddingAttr(false)} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : attrGroups.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Layers className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">No variant options yet</p>
                  <p className="text-xs text-gray-400 mt-0.5 mb-3">Add attributes like Color, Size, Storage…</p>
                  <button onClick={() => setAddingAttr(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto">
                    <Plus className="w-3.5 h-3.5" />Add first option
                  </button>
                </div>
              ) : null}
            </div>

            {/* Generate button */}
            {attrGroups.some(g => g.values.length > 0) && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60">
                <button
                  onClick={generateVariants}
                  className="flex items-center gap-2 text-xs font-semibold text-violet-700 hover:text-violet-800 transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Generate all combinations ({attrGroups.filter(g=>g.values.length>0).reduce((t,g) => t * g.values.length, 1)} variants)
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* ══ VARIANT TABLE ══════════════════════════════════════════════ */}
          {variants.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

              {/* Toolbar */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-wrap">
                {/* Group by */}
                <div className="flex items-center gap-2 text-xs text-gray-600 shrink-0">
                  <span className="font-medium">Group by</span>
                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger className="h-7 text-xs w-32 border-gray-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__first__">
                        {attrGroups[0]?.name ?? "None"}
                      </SelectItem>
                      {attrGroups.map(g => (
                        <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={variantSearch}
                    onChange={e => setVariantSearch(e.target.value)}
                    placeholder="Search variants…"
                    className="w-full h-7 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:border-blue-400 transition-colors"
                  />
                </div>

                {/* Filters pill */}
                <button className="flex items-center gap-1.5 h-7 px-2.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  <SlidersHorizontal className="w-3 h-3" />Filters
                </button>

                {/* All locations pill */}
                <button className="flex items-center gap-1.5 h-7 px-2.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors shrink-0">
                  <MapPin className="w-3 h-3" />All locations
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[32px_32px_1fr_160px_120px] gap-0 px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center">
                  <button onClick={toggleAll}>
                    {allSelected
                      ? <CheckSquare className="w-4 h-4 text-blue-600" />
                      : <Square className="w-4 h-4 text-gray-300" />}
                  </button>
                </div>
                <div />
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider self-center">
                  Variant · Expand all
                </div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider self-center text-center">Price</div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider self-center text-center">Available</div>
              </div>

              {/* Groups + rows */}
              <div className="divide-y divide-gray-50">
                {grouped.map(({ key, items }) => {
                  const isExpanded = expandedGroups.has(key) || expandedGroups.has("__ALL__");
                  const groupStock = items.reduce((s, v) => s + v.stock, 0);
                  const allGroupSel = items.every(v => selectedVIds.has(v.id));
                  return (
                    <div key={key}>
                      {/* Group header row */}
                      <div
                        className="grid grid-cols-[32px_32px_1fr_160px_120px] gap-0 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => toggleGroup(key)}
                      >
                        <div className="flex items-center" onClick={e => e.stopPropagation()}>
                          <button onClick={() => {
                            if (allGroupSel) setSelectedVIds(s => { const n = new Set(s); items.forEach(v => n.delete(v.id)); return n; });
                            else setSelectedVIds(s => { const n = new Set(s); items.forEach(v => n.add(v.id)); return n; });
                          }}>
                            {allGroupSel
                              ? <CheckSquare className="w-4 h-4 text-blue-600" />
                              : <Square className="w-4 h-4 text-gray-300" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-center">
                          <div className="w-6 h-6 rounded border border-gray-200 bg-gray-50 flex items-center justify-center">
                            <ImageIcon className="w-3 h-3 text-gray-300" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-sm text-gray-800">{key}</span>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {items.length} variant{items.length > 1 ? "s" : ""}
                          </span>
                          {isExpanded
                            ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                        </div>
                        {/* Editable price for parent = blank (batch edit hint) */}
                        <div className="flex items-center justify-center px-2" onClick={e => e.stopPropagation()}>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">£</span>
                            <input
                              type="number"
                              placeholder="—"
                              className="h-8 w-full pl-6 pr-2 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none text-center"
                              onClick={e => e.stopPropagation()}
                              onChange={e => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) items.forEach(v => updateVariant(v.id, { retailPrice: val }));
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-center px-2" onClick={e => e.stopPropagation()}>
                          <input
                            type="number"
                            value={groupStock}
                            readOnly
                            className="h-8 w-full px-2 text-xs border border-gray-200 rounded-lg bg-gray-50 text-center text-gray-500 cursor-default"
                          />
                        </div>
                      </div>

                      {/* Variant rows */}
                      {isExpanded && items.map((variant, idx) => {
                        const isFirst = idx === 0;
                        const isSelected = selectedVIds.has(variant.id);
                        return (
                          <div
                            key={variant.id}
                            className={cn(
                              "grid grid-cols-[32px_32px_1fr_160px_120px] gap-0 px-4 py-2.5 transition-colors group/vrow border-l-2",
                              isSelected
                                ? "bg-blue-50 border-l-blue-500"
                                : isFirst ? "bg-emerald-50/40 border-l-emerald-400 hover:bg-emerald-50" : "border-l-transparent hover:bg-gray-50/60"
                            )}
                          >
                            <div className="flex items-center">
                              <button onClick={() => toggleV(variant.id)}>
                                {isSelected
                                  ? <CheckSquare className="w-4 h-4 text-blue-600" />
                                  : <Square className="w-4 h-4 text-gray-300" />}
                              </button>
                            </div>
                            <div className="flex items-center justify-center">
                              <div className="w-6 h-6 rounded border border-gray-200 bg-gray-50 flex items-center justify-center">
                                <ImageIcon className="w-3 h-3 text-gray-300" />
                              </div>
                            </div>
                            <div className="flex flex-col justify-center min-w-0 pl-2">
                              <span className="text-sm font-medium text-gray-800 truncate">{variant.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono mt-0.5">{variant.sku}</span>
                            </div>
                            <div className="flex items-center px-2">
                              <div className="relative w-full">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">£</span>
                                <input
                                  type="number"
                                  value={variant.retailPrice ?? product.retailPrice}
                                  onChange={e => updateVariant(variant.id, { retailPrice: parseFloat(e.target.value) || 0 })}
                                  className="h-8 w-full pl-6 pr-2 text-xs border border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none bg-white hover:border-gray-300 transition-colors text-right"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 px-2">
                              <input
                                type="number"
                                value={variant.stock}
                                onChange={e => updateVariant(variant.id, { stock: parseInt(e.target.value) || 0 })}
                                className="h-8 flex-1 w-full px-2 text-xs border border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none bg-white hover:border-gray-300 transition-colors text-center"
                              />
                              <button
                                onClick={() => deleteVariant(variant.id)}
                                className="opacity-0 group-hover/vrow:opacity-100 text-gray-300 hover:text-red-500 transition-all shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Footer: total inventory */}
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60">
                <p className="text-xs text-gray-600 text-center">
                  Total inventory across all locations:{" "}
                  <span className="font-bold text-gray-800">{totalStock} available</span>
                </p>
              </div>
            </div>
          )}

          {/* ── Bulk actions bar (when variants selected) ───────────────── */}
          {selectedVIds.size > 0 && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex-wrap">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">{selectedVIds.size} variant{selectedVIds.size > 1 ? "s" : ""} selected</span>
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  onClick={() => {
                    const price = prompt("Set retail price for selected variants:");
                    if (price !== null) {
                      const val = parseFloat(price);
                      if (!isNaN(val)) selectedVIds.forEach(id => updateVariant(id, { retailPrice: val }));
                    }
                  }}
                  className="text-xs font-semibold text-blue-700 bg-white border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Edit prices
                </button>
                <button
                  onClick={() => {
                    const stock = prompt("Set stock for selected variants:");
                    if (stock !== null) {
                      const val = parseInt(stock);
                      if (!isNaN(val)) selectedVIds.forEach(id => updateVariant(id, { stock: Math.max(0, val) }));
                    }
                  }}
                  className="text-xs font-semibold text-blue-700 bg-white border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Edit stock
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${selectedVIds.size} variants?`)) {
                      selectedVIds.forEach(id => deleteVariant(id));
                    }
                  }}
                  className="text-xs font-semibold text-red-600 bg-white border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3 h-3 inline mr-1" />Delete
                </button>
                <button onClick={() => setSelectedVIds(new Set())} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Modal footer ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-t border-gray-200 shrink-0">
          <div className="text-xs text-gray-400">
            {variants.length} variants · {totalStock} total stock
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm"
              className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
              onClick={handleSave}>
              <Save className="w-3.5 h-3.5" />Save Variants
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
