import { useState, useEffect, useMemo, ElementType } from "react";
import { Product } from "@/app/types";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import {
  ShoppingCart, Search, Package, Cpu, Cable, Smartphone, Zap,
  Headphones, ShieldCheck, SlidersHorizontal, X, ChevronRight,
  LayoutGrid, LayoutList, Heart, Star, Flame, Eye, Filter,
} from "lucide-react";
import { cn } from "@/app/components/ui/utils";

type StorePage = "home" | "products" | "product" | "checkout" | "about" | "contact";
interface StorefrontProductsPageProps {
  products: Product[];
  navigate: (page: StorePage, data?: { product?: Product; category?: string }) => void;
  addToCart: (product: Product) => void;
  initialCategory?: string | null;
}

const categoryConfig: Record<string, { icon: ElementType; color: string; bg: string; light: string; grad: string }> = {
  Cases:             { icon: Smartphone,  color: "text-violet-600",  bg: "bg-violet-600",  light: "bg-violet-50",  grad: "from-violet-600 to-purple-700"  },
  Cables:            { icon: Cable,       color: "text-orange-600",  bg: "bg-orange-600",  light: "bg-orange-50",  grad: "from-orange-500 to-amber-600"   },
  Chargers:          { icon: Zap,         color: "text-blue-600",    bg: "bg-blue-600",    light: "bg-blue-50",    grad: "from-blue-600 to-cyan-600"      },
  Headphones:        { icon: Headphones,  color: "text-teal-600",    bg: "bg-teal-600",    light: "bg-teal-50",    grad: "from-teal-600 to-emerald-600"   },
  Accessories:       { icon: Cpu,         color: "text-indigo-600",  bg: "bg-indigo-600",  light: "bg-indigo-50",  grad: "from-indigo-600 to-blue-600"    },
  "Screen Protectors": { icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-600", light: "bg-emerald-50", grad: "from-emerald-600 to-green-600" },
};
function getCfg(cat: string) {
  return categoryConfig[cat] ?? { icon: Package, color: "text-gray-600", bg: "bg-gray-600", light: "bg-gray-50", grad: "from-gray-600 to-gray-700" };
}

const ITEMS_PER_PAGE = 12;

// ─── Advanced product card (consistent with home page) ────────────────────────
function ShopProductCard({ product, onClick, onAddToCart }: {
  product: Product; onClick: () => void; onAddToCart: (e: React.MouseEvent) => void;
}) {
  const cfg = getCfg(product.category);
  const Icon = cfg.icon;
  const isLow = product.stock > 0 && product.stock <= 20;
  const isOut = product.stock === 0;
  const isHot = product.stock > 100;
  const [wished, setWished] = useState(false);

  return (
    <div
      className="group relative bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      <div className={cn("relative aspect-[4/3] overflow-hidden", product.image ? "bg-white" : cfg.light)}>
        {product.image ? (
          <>
            <img 
              src={product.image} 
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </>
        ) : (
          <>
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity", cfg.grad)} />
            <Icon className={cn("absolute inset-0 m-auto w-14 h-14 opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500", cfg.color)} />
          </>
        )}

        {isHot && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
            <Flame className="w-2.5 h-2.5" />HOT
          </div>
        )}
        {isLow && !isOut && (
          <div className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shadow-sm">
            {product.stock} left
          </div>
        )}
        {isOut && (
          <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">Out of Stock</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex gap-2 justify-center pb-3 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <button onClick={e => { e.stopPropagation(); setWished(w => !w); }}
            className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm transition-all",
              wished ? "bg-red-500 text-white" : "bg-white/90 text-gray-600 hover:text-red-500")}>
            <Heart className={cn("w-3.5 h-3.5", wished && "fill-current")} />
          </button>
          <button onClick={e => { e.stopPropagation(); onClick(); }}
            className="w-8 h-8 rounded-full bg-white/90 text-gray-600 hover:text-blue-600 flex items-center justify-center shadow-lg backdrop-blur-sm transition-colors">
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3.5">
        <div className="flex items-center justify-between mb-1">
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", cfg.color)}>{product.category}</span>
          <div className="flex items-center gap-0.5">
            {Array.from({length:5}).map((_,i) => (
              <Star key={i} className={cn("w-2.5 h-2.5", i<4?"fill-amber-400 text-amber-400":"fill-gray-200 text-gray-200")} />
            ))}
          </div>
        </div>
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1.5 group-hover:text-blue-600 transition-colors leading-snug">
          {product.name}
        </h3>
        <p className="text-[10px] text-gray-400 mb-2.5 font-mono">SKU: {product.sku}</p>
        <div className="flex items-center justify-between">
          <span className={cn("font-black text-base", cfg.color)}>£{product.retailPrice.toFixed(2)}</span>
          <button
            onClick={onAddToCart}
            disabled={isOut}
            className={cn(
              "h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200",
              isOut ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : `bg-gradient-to-r ${cfg.grad} text-white hover:shadow-md hover:-translate-y-0.5 active:translate-y-0`
            )}
          >
            <ShoppingCart className="w-3 h-3" />Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export function StorefrontProductsPage({ products, navigate, addToCart, initialCategory }: StorefrontProductsPageProps) {
  const [search, setSearch]               = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string|null>(initialCategory ?? null);
  const [sortBy, setSortBy]               = useState("popular");
  const [maxPrice, setMaxPrice]           = useState(200);
  const [viewMode, setViewMode]           = useState<"grid"|"list">("grid");
  const [currentPage, setCurrentPage]     = useState(1);
  const [showFilters, setShowFilters]     = useState(false);

  useEffect(() => { if (initialCategory !== undefined) setSelectedCategory(initialCategory); }, [initialCategory]);

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))), [products]);

  const filtered = useMemo(() => {
    let r = [...products];
    if (search) r = r.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));
    if (selectedCategory) r = r.filter(p => p.category === selectedCategory);
    r = r.filter(p => p.retailPrice <= maxPrice);
    switch (sortBy) {
      case "price-asc":  r.sort((a,b) => a.retailPrice - b.retailPrice); break;
      case "price-desc": r.sort((a,b) => b.retailPrice - a.retailPrice); break;
      case "name":       r.sort((a,b) => a.name.localeCompare(b.name));  break;
      case "stock":      r.sort((a,b) => b.stock - a.stock);             break;
      default:           r.sort((a,b) => b.stock - a.stock);
    }
    return r;
  }, [products, search, selectedCategory, sortBy, maxPrice]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged      = filtered.slice((currentPage-1)*ITEMS_PER_PAGE, currentPage*ITEMS_PER_PAGE);

  const handleCategoryChange = (cat: string|null) => { setSelectedCategory(cat); setCurrentPage(1); };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sub-header ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5fa8] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-300 text-xs mb-1">
                <button className="hover:text-white transition-colors" onClick={() => navigate("home")}>Home</button>
                <ChevronRight className="w-3 h-3" />
                <span className="text-white font-semibold">{selectedCategory ?? "All Products"}</span>
              </div>
              <h1 className="text-2xl font-black">
                {selectedCategory ?? "All Products"}
              </h1>
              <p className="text-blue-200 text-sm mt-0.5">{filtered.length} products available</p>
            </div>
            {/* Category quick-pills (desktop) */}
            <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={() => handleCategoryChange(null)}
                className={cn("text-xs font-semibold px-3 py-1.5 rounded-full transition-all",
                  !selectedCategory ? "bg-white text-blue-800" : "bg-white/15 text-white hover:bg-white/25")}
              >
                All
              </button>
              {categories.map(cat => {
                const c = getCfg(cat); const I = c.icon;
                return (
                  <button key={cat} onClick={() => handleCategoryChange(cat)}
                    className={cn("text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all",
                      selectedCategory === cat ? "bg-white text-blue-800" : "bg-white/15 text-white hover:bg-white/25")}
                  >
                    <I className="w-3 h-3" />{cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* ── Sidebar ──────────────────────────────────────────────── */}
          <aside className={cn("w-60 shrink-0 space-y-4", showFilters ? "block" : "hidden md:block")}>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                placeholder="Search products…"
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Categories */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[#1e3a5f] to-[#2d5fa8]">
                <p className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5" />Categories
                </p>
              </div>
              <div className="p-2">
                <button
                  className={cn("w-full text-left px-3 py-2 rounded-xl text-sm transition-all flex items-center justify-between",
                    !selectedCategory ? "bg-blue-600 text-white font-semibold" : "text-gray-600 hover:bg-gray-50")}
                  onClick={() => handleCategoryChange(null)}
                >
                  <span>All Products</span>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded-full", !selectedCategory ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400")}>{products.length}</span>
                </button>
                {categories.map(cat => {
                  const c = getCfg(cat); const I = c.icon;
                  const count = products.filter(p => p.category === cat).length;
                  const active = selectedCategory === cat;
                  return (
                    <button key={cat} onClick={() => handleCategoryChange(cat)}
                      className={cn("w-full text-left px-3 py-2 rounded-xl text-sm transition-all flex items-center gap-2.5 group",
                        active ? "bg-blue-600 text-white font-semibold" : "text-gray-600 hover:bg-gray-50")}
                    >
                      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                        active ? "bg-white/20" : cn(c.light))}>
                        <I className={cn("w-3.5 h-3.5", active ? "text-white" : c.color)} />
                      </div>
                      <span className="flex-1 truncate">{cat}</span>
                      <span className={cn("text-xs px-1.5 py-0.5 rounded-full shrink-0",
                        active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400")}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3">Max Price</p>
              <input type="range" min={10} max={200} value={maxPrice}
                onChange={e => { setMaxPrice(Number(e.target.value)); setCurrentPage(1); }}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>£10</span>
                <span className="font-bold text-blue-600">£{maxPrice}</span>
                <span>£200</span>
              </div>
            </div>

            {/* Availability */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3">Availability</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full" />In Stock</div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{products.filter(p=>p.stock>0).length}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full" />Out of Stock</div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{products.filter(p=>p.stock===0).length}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full" />Low Stock</div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{products.filter(p=>p.stock>0&&p.stock<=20).length}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Main Content ──────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Sort/view bar */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <div className="flex-1 min-w-0 hidden md:block" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44 bg-white border-gray-200 rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="price-asc">Price: Low → High</SelectItem>
                  <SelectItem value="price-desc">Price: High → Low</SelectItem>
                  <SelectItem value="name">Name A–Z</SelectItem>
                  <SelectItem value="stock">Most Stock</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
                {(["grid","list"] as const).map(m => (
                  <button key={m} onClick={() => setViewMode(m)}
                    className={cn("p-1.5 rounded-lg transition-colors",
                      viewMode === m ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-600")}>
                    {m === "grid" ? <LayoutGrid className="w-4 h-4" /> : <LayoutList className="w-4 h-4" />}
                  </button>
                ))}
              </div>
              <button
                className="md:hidden flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="w-4 h-4" />Filters
              </button>
            </div>

            {/* Active filter chips */}
            {(selectedCategory || search) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
                    {selectedCategory}
                    <button onClick={() => handleCategoryChange(null)} className="hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {search && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200 px-3 py-1 rounded-full">
                    "{search}"
                    <button onClick={() => setSearch("")} className="hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button onClick={() => { setSearch(""); handleCategoryChange(null); setMaxPrice(200); }} className="text-xs text-red-500 hover:underline font-medium">
                  Clear all
                </button>
              </div>
            )}

            {/* Empty */}
            {paged.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-5">
                  <Package className="w-10 h-10 text-gray-300" />
                </div>
                <p className="font-bold text-gray-700 text-lg">No products found</p>
                <p className="text-sm text-gray-400 mt-1 mb-5">Try adjusting your search or filters</p>
                <button
                  onClick={() => { setSearch(""); handleCategoryChange(null); setMaxPrice(200); }}
                  className="bg-blue-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* Grid View */}
            {viewMode === "grid" && paged.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {paged.map(p => (
                  <ShopProductCard key={p.id} product={p}
                    onClick={() => navigate("product", { product: p })}
                    onAddToCart={e => { e.stopPropagation(); addToCart(p); }}
                  />
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === "list" && paged.length > 0 && (
              <div className="space-y-3">
                {paged.map(p => {
                  const c = getCfg(p.category); const I = c.icon;
                  const isOut = p.stock === 0;
                  return (
                    <div key={p.id}
                      className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-blue-200 hover:shadow-md transition-all group"
                      onClick={() => navigate("product", { product: p })}
                    >
                      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 relative", c.light)}>
                        <I className={cn("w-8 h-8 opacity-50 group-hover:opacity-70 transition-opacity", c.color)} />
                        {p.stock > 100 && (
                          <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                            <Flame className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-[10px] font-bold uppercase tracking-wider", c.color)}>{p.category}</span>
                          {isOut && <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded-full font-semibold">Out of Stock</span>}
                          {p.stock > 0 && p.stock <= 20 && <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full font-semibold">Only {p.stock} left</span>}
                        </div>
                        <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors truncate">{p.name}</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5 font-mono">SKU: {p.sku} · Stock: {p.stock}</p>
                        <div className="flex items-center gap-0.5 mt-1">
                          {Array.from({length:5}).map((_,i) => <Star key={i} className={cn("w-2.5 h-2.5", i<4?"fill-amber-400 text-amber-400":"fill-gray-200 text-gray-200")} />)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("font-black text-xl", c.color)}>£{p.retailPrice.toFixed(2)}</p>
                        <button
                          onClick={e => { e.stopPropagation(); addToCart(p); }}
                          disabled={isOut}
                          className={cn("mt-2 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all",
                            isOut ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : `bg-gradient-to-r ${c.grad} text-white hover:shadow-md hover:-translate-y-0.5 active:translate-y-0`)}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />Add to Cart
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p-1)}
                  className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all bg-white"
                >
                  ‹
                </button>
                {Array.from({length: Math.min(totalPages,7)}, (_,i) => i+1).map(p => (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    className={cn("w-9 h-9 rounded-xl text-sm font-bold transition-all",
                      currentPage === p
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                        : "border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 bg-white")}
                  >
                    {p}
                  </button>
                ))}
                {totalPages > 7 && <span className="text-gray-400">…</span>}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p+1)}
                  className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all bg-white"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}