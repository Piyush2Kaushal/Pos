import { useMemo, ElementType, MouseEvent, useState, useEffect } from "react";
import { Product } from "@/app/types";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/app/components/ui/utils";
import {
  ShoppingCart, Star, Truck, ShieldCheck, Headphones, Zap,
  ArrowRight, Tag, Package, Cpu, Cable, Smartphone,
  ChevronRight, Percent, Clock, Award, Heart, Eye,
  Sparkles, BadgeCheck, Flame, TrendingUp, Search,
  RotateCcw, Gift, ChevronLeft, Gamepad2, Wrench,
} from "lucide-react";

type StorePage = "home" | "products" | "product" | "checkout" | "about" | "contact";
interface StorefrontHomePageProps {
  products: Product[];
  navigate: (page: StorePage, data?: { product?: Product; category?: string }) => void;
  addToCart: (product: Product) => void;
  cartCount: number;
}

// ─── Category config ──────────────────────────────────────────────────────────
const catCfg: Record<string, {
  icon: ElementType; grad: string; light: string; color: string;
  img: string; accent: string;
}> = {
  Cases:             { icon: Smartphone,  grad: "from-violet-600 to-purple-700",  light: "bg-violet-50",  color: "text-violet-600", accent: "#7c3aed", img: "https://images.unsplash.com/photo-1592756086927-9a334c956fd1?w=400&q=70" },
  Cables:            { icon: Cable,       grad: "from-orange-500 to-amber-600",   light: "bg-orange-50",  color: "text-orange-600", accent: "#ea580c", img: "https://images.unsplash.com/photo-1572721546624-05bf65ad7679?w=400&q=70" },
  Chargers:          { icon: Zap,         grad: "from-blue-600 to-cyan-600",      light: "bg-blue-50",    color: "text-blue-600",   accent: "#2563eb", img: "https://images.unsplash.com/photo-1706290134049-c5c72d24146a?w=400&q=70" },
  Headphones:        { icon: Headphones,  grad: "from-teal-600 to-emerald-600",   light: "bg-teal-50",    color: "text-teal-600",   accent: "#0d9488", img: "https://images.unsplash.com/photo-1738920424218-3d28b951740a?w=400&q=70" },
  Accessories:       { icon: Cpu,         grad: "from-indigo-600 to-blue-600",    light: "bg-indigo-50",  color: "text-indigo-600", accent: "#4f46e5", img: "https://images.unsplash.com/photo-1678851836066-dc27614cc56b?w=400&q=70" },
  "Screen Protectors": { icon: ShieldCheck, grad: "from-emerald-600 to-green-600", light: "bg-emerald-50", color: "text-emerald-600", accent: "#059669", img: "https://images.unsplash.com/photo-1653376382671-7788e2c7b310?w=400&q=70" },
  "Game Console Parts": { icon: Gamepad2, grad: "from-rose-600 to-pink-700",      light: "bg-rose-50",    color: "text-rose-600",   accent: "#e11d48", img: "https://images.unsplash.com/photo-1653376382671-7788e2c7b310?w=400&q=70" },
  Tools:             { icon: Wrench,      grad: "from-amber-500 to-orange-600",   light: "bg-amber-50",   color: "text-amber-600",  accent: "#d97706", img: "https://images.unsplash.com/photo-1678851836066-dc27614cc56b?w=400&q=70" },
};
function getCfg(cat: string) {
  return catCfg[cat] ?? { icon: Package, grad: "from-gray-600 to-gray-700", light: "bg-gray-50", color: "text-gray-600", accent: "#4b5563", img: "" };
}

// ─── Ticker messages ──────────────────────────────────────────────────────────
const TICKER = [
  "🚚 Free delivery on orders over £50",
  "⚡ Same day dispatch before 3pm",
  "🏷️ Wholesalers get 30% off — register today",
  "🛡️ 2-Year warranty on all products",
  "📦 100+ products in stock",
  "💳 Buy now, pay later available",
  "🎁 Free gift on orders over £100",
];

// ─── Advanced Product Card ─────────────────────────────────────────────────────
function ProductCard({ product, onClick, onAddToCart, rank }: {
  product: Product; onClick: () => void;
  onAddToCart: (e: MouseEvent) => void; rank?: number;
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
      {/* Image / icon area */}
      <div className={cn("relative aspect-[4/3] overflow-hidden", product.image ? "bg-white" : cfg.light)}>
        {product.image ? (
          <>
            <img 
              src={product.image} 
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </>
        ) : (
          <>
            {/* Decorative gradient overlay on hover */}
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300", cfg.grad)} />
            <Icon className={cn("absolute inset-0 m-auto w-16 h-16 opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500", cfg.color)} />
          </>
        )}

        {/* Badges */}
        {rank && (
          <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
            <span className="text-white text-[10px] font-black">#{rank}</span>
          </div>
        )}
        {isHot && !rank && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            <Flame className="w-2.5 h-2.5" />HOT
          </div>
        )}
        {isLow && !isOut && (
          <div className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            Only {product.stock} left
          </div>
        )}
        {isOut && (
          <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">Out of Stock</span>
          </div>
        )}

        {/* Hover actions overlay */}
        <div className="absolute inset-x-0 bottom-0 flex gap-2 justify-center pb-3 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <button
            onClick={(e) => { e.stopPropagation(); setWished(w => !w); }}
            className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm transition-all",
              wished ? "bg-red-500 text-white" : "bg-white/90 text-gray-600 hover:text-red-500")}
          >
            <Heart className={cn("w-3.5 h-3.5", wished && "fill-current")} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="w-8 h-8 rounded-full bg-white/90 text-gray-600 hover:text-blue-600 flex items-center justify-center shadow-lg backdrop-blur-sm transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-1">
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", cfg.color)}>{product.category}</span>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={cn("w-2.5 h-2.5", i < 4 ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200")} />
            ))}
          </div>
        </div>
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2.5 group-hover:text-blue-600 transition-colors leading-snug">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <span className={cn("font-black", cfg.color)} style={{ fontSize: "1.1rem" }}>
              £{product.retailPrice.toFixed(2)}
            </span>
          </div>
          <button
            onClick={onAddToCart}
            disabled={isOut}
            className={cn(
              "h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200",
              isOut
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : `bg-gradient-to-r ${cfg.grad} text-white hover:shadow-md hover:shadow-current/30 hover:-translate-y-0.5 active:translate-y-0`
            )}
          >
            <ShoppingCart className="w-3 h-3" />Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Compact horizontal product card ─────────────────────────────────────────
function ProductRowCard({ product, rank, onClick, onAddToCart }: {
  product: Product; rank: number; onClick: () => void;
  onAddToCart: (e: MouseEvent) => void;
}) {
  const cfg = getCfg(product.category);
  const Icon = cfg.icon;
  return (
    <div
      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative", cfg.light)}>
        <Icon className={cn("w-5 h-5", cfg.color)} />
        <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[8px] font-black flex items-center justify-center">
          {rank}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">{product.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={cn("w-2 h-2", i < 4 ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200")} />
          ))}
          <span className="text-[10px] text-gray-400 ml-0.5">(4.2)</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={cn("font-black text-sm", cfg.color)}>£{product.retailPrice.toFixed(2)}</p>
        <button
          onClick={onAddToCart}
          disabled={product.stock === 0}
          className={cn("mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all",
            product.stock === 0 ? "bg-gray-100 text-gray-400" : `bg-gradient-to-r ${cfg.grad} text-white hover:shadow-sm`)}
        >
          + Add
        </button>
      </div>
    </div>
  );
}

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown() {
  const [time, setTime] = useState({ h: 5, m: 47, s: 23 });
  useEffect(() => {
    const t = setInterval(() => {
      setTime(prev => {
        let { h, m, s } = prev;
        s--; if (s < 0) { s = 59; m--; } if (m < 0) { m = 59; h--; } if (h < 0) { h = 5; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function StorefrontHomePage({ products, navigate, addToCart }: StorefrontHomePageProps) {
  const [tickerIdx, setTickerIdx] = useState(0);
  const countdown = useCountdown();

  useEffect(() => {
    const t = setInterval(() => setTickerIdx(i => (i + 1) % TICKER.length), 3200);
    return () => clearInterval(t);
  }, []);

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))), [products]);
  const featured   = useMemo(() => [...products].sort((a,b) => b.stock - a.stock).slice(0, 8), [products]);
  const bestSellers = useMemo(() => [...products].filter(p => p.stock > 80).slice(0, 6), [products]);
  const flashDeals  = useMemo(() => [...products].sort((a,b) => a.retailPrice - b.retailPrice).slice(0, 4), [products]);
  const newArrivals = useMemo(() => [...products].slice(20, 28), [products]);
  const heroProduct = bestSellers[0];

  return (
    <div className="bg-white">

      {/* ══ ANNOUNCEMENT TICKER ════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-[#0f172a] via-[#1e3a5f] to-[#1e40af] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <Sparkles className="w-3.5 h-3.5 text-blue-300 shrink-0" />
            <div className="overflow-hidden h-5 flex items-center">
              <p
                key={tickerIdx}
                className="text-xs font-medium text-blue-100 whitespace-nowrap"
                style={{ animation: "fadeSlideIn 0.4s ease" }}
              >
                {TICKER[tickerIdx]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0 text-[11px] text-blue-300">
            <span className="hidden md:block">www.bnmparts.com</span>
            <span>|</span>
            <span>accounts@bnmparts.com</span>
          </div>
        </div>
      </div>

      {/* ══ CINEMATIC HERO ═════════════════════════════════════════════════ */}
      <section className="relative min-h-[88vh] bg-[#080d1a] overflow-hidden flex items-center">
        {/* Background layers */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1653376382671-7788e2c7b310?w=1400&q=60"
            alt=""
            className="w-full h-full object-cover opacity-25"
            style={{ filter: "saturate(1.4)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080d1a] via-[#080d1a]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-transparent to-transparent" />
        </div>

        {/* Floating orbs */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-60 h-60 bg-violet-600/15 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
                <Sparkles className="w-3 h-3" />
                Premium Mobile Accessories — Spring 2026
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-6 tracking-tight">
                Power Up
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
                  Every Device.
                </span>
              </h1>
              <p className="text-gray-300 text-lg mb-8 max-w-lg leading-relaxed">
                Cases, cables, chargers, screen protectors & headphones. Genuine parts, fast dispatch, unbeatable prices.
              </p>

              {/* Search bar */}
              <div className="relative mb-8 max-w-md">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search products, SKUs, categories…"
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder-gray-400 text-sm focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                  onKeyDown={e => { if (e.key === "Enter") navigate("products"); }}
                  onClick={() => navigate("products")}
                  readOnly
                />
                <button
                  className="absolute inset-y-1.5 right-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-bold px-5 rounded-xl hover:from-blue-500 hover:to-blue-400 transition-all"
                  onClick={() => navigate("products")}
                >
                  Search
                </button>
              </div>

              <div className="flex flex-wrap gap-3 mb-8">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white shadow-xl shadow-blue-900/50 gap-2 rounded-2xl px-8"
                  onClick={() => navigate("products")}
                >
                  Shop Now <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/25 text-white hover:bg-white/10 gap-2 rounded-2xl"
                  onClick={() => navigate("about")}
                >
                  Our Story
                </Button>
              </div>

              {/* Trust row */}
              <div className="flex flex-wrap gap-5">
                {[
                  { icon: Truck,      label: "Free over £50"   },
                  { icon: ShieldCheck,label: "2yr Warranty"    },
                  { icon: Clock,      label: "Same Day Dispatch"},
                  { icon: RotateCcw,  label: "Easy Returns"    },
                ].map(({ icon: I, label }) => (
                  <div key={label} className="flex items-center gap-2 text-xs text-gray-400">
                    <I className="w-3.5 h-3.5 text-blue-400 shrink-0" />{label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Floating product showcase */}
            <div className="hidden lg:block">
              <div className="relative">
                {/* Main card */}
                <div className="bg-white/8 backdrop-blur-xl border border-white/15 rounded-3xl p-5 shadow-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-400">Live Stock</span>
                    <span className="ml-auto text-xs text-gray-400">{products.length} products</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {featured.slice(0, 4).map(p => {
                      const c = getCfg(p.category); const I = c.icon;
                      return (
                        <div
                          key={p.id}
                          className="bg-white/10 hover:bg-white/20 rounded-2xl p-3 cursor-pointer transition-all group"
                          onClick={() => navigate("product", { product: p })}
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2", c.light, "bg-opacity-20")}>
                            <I className={cn("w-5 h-5", c.color)} />
                          </div>
                          <p className="text-white text-[11px] font-semibold truncate leading-tight mb-1">{p.name}</p>
                          <p className={cn("font-bold text-sm", c.color)}>£{p.retailPrice.toFixed(2)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Floating stats pill */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl px-4 py-2.5 shadow-xl">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4" />
                    <div>
                      <p className="text-[10px] font-semibold opacity-80">Today's Deals</p>
                      <p className="font-black text-sm">{flashDeals.length} Flash Offers</p>
                    </div>
                  </div>
                </div>

                {/* Floating review pill */}
                <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl px-4 py-2.5 shadow-xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      {["bg-blue-400","bg-purple-400","bg-pink-400"].map((c,i) => (
                        <div key={i} className={cn("w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[8px] font-bold", c)}>
                          {["A","B","C"][i]}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center gap-0.5 mb-0.5">
                        {Array.from({length:5}).map((_,i) => <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />)}
                      </div>
                      <p className="text-[10px] font-semibold text-gray-700">99% positive reviews</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-gray-500">
          <div className="w-0.5 h-8 bg-gradient-to-b from-transparent to-gray-500 rounded-full animate-pulse" />
        </div>
      </section>

      {/* ══ STATS BAND ═════════════════════════════════════════════════════ */}
      <section className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5fa8] text-white">
        <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-white/10">
          {[
            { value: "100+",  label: "Products in Stock",   icon: Package    },
            { value: "25+",   label: "Trusted Customers",   icon: Users      },
            { value: "99%",   label: "Satisfaction Rate",   icon: BadgeCheck },
            { value: "24h",   label: "Dispatch Guarantee",  icon: Truck      },
          ].map(({ value, label, icon: I }) => (
            <div key={label} className="flex items-center justify-center gap-3 px-4 py-2">
              <I className="w-6 h-6 text-blue-300 shrink-0" />
              <div>
                <p className="text-2xl font-black leading-tight">{value}</p>
                <p className="text-xs text-blue-200">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ SHOP BY CATEGORY ═══════════════════════════════════════════════ */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">Explore</p>
              <h2 className="text-3xl font-black text-gray-900">Shop by Category</h2>
            </div>
            <button
              onClick={() => navigate("products")}
              className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              All Products <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map(cat => {
              const c = getCfg(cat); const I = c.icon;
              const count = products.filter(p => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => navigate("products", { category: cat })}
                  className="group relative overflow-hidden rounded-2xl aspect-square flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90 group-hover:opacity-100 transition-opacity", c.grad)} />
                  <img src={c.img} alt={cat} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity group-hover:scale-110 transition-transform duration-500" />
                  <div className="relative z-10 flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      <I className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-white font-bold text-sm text-center leading-tight">{cat}</p>
                    <p className="text-white/70 text-[10px]">{count} items</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ FLASH DEALS ════════════════════════════════════════════════════ */}
      <section className="py-12 bg-[#080d1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Flame className="w-6 h-6 text-orange-500" />
                <h2 className="text-2xl font-black text-white">Flash Deals</h2>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5 border border-white/10">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-semibold text-white font-mono">
                  {String(countdown.h).padStart(2,"0")}:{String(countdown.m).padStart(2,"0")}:{String(countdown.s).padStart(2,"0")}
                </span>
              </div>
            </div>
            <button onClick={() => navigate("products")} className="text-sm font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {flashDeals.map(p => {
              const c = getCfg(p.category); const I = c.icon;
              return (
                <div
                  key={p.id}
                  className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
                  onClick={() => navigate("product", { product: p })}
                >
                  <div className={cn("relative aspect-[4/3] flex items-center justify-center", c.light, "bg-opacity-10")}>
                    <I className={cn("w-14 h-14 opacity-30", c.color)} />
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      DEAL
                    </div>
                  </div>
                  <div className="p-3.5">
                    <p className="text-white text-xs font-semibold truncate mb-1">{p.name}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={cn("font-black text-base", c.color)}>£{p.retailPrice.toFixed(2)}</p>
                        <p className="text-gray-500 text-[10px] line-through">£{(p.retailPrice * 1.2).toFixed(2)}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); addToCart(p); }}
                        className={cn("w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 active:scale-95", c.grad)}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ FEATURED EDITORIAL SECTION ═════════════════════════════════════ */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">Our Picks</p>
              <h2 className="text-3xl font-black text-gray-900">Featured Products</h2>
            </div>
            <button onClick={() => navigate("products")} className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Editorial grid: 1 big + 3 small on left, 4 grid on right */}
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Big hero product */}
            {featured[0] && (() => {
              const c = getCfg(featured[0].category); const I = c.icon;
              return (
                <div
                  className={cn("group relative rounded-3xl overflow-hidden cursor-pointer col-span-1 row-span-2 min-h-[380px] flex flex-col justify-end p-6 bg-gradient-to-br", c.grad)}
                  onClick={() => navigate("product", { product: featured[0] })}
                >
                  <I className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 text-white opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500" />
                  <div>
                    <Badge className="bg-white/20 text-white border-0 text-[11px] mb-3">Featured</Badge>
                    <h3 className="text-white font-black text-xl leading-snug mb-2">{featured[0].name}</h3>
                    <p className="text-white/70 text-sm mb-4">SKU: {featured[0].sku}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-black text-2xl">£{featured[0].retailPrice.toFixed(2)}</span>
                      <button
                        onClick={e => { e.stopPropagation(); addToCart(featured[0]); }}
                        className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition-all"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Grid of 6 */}
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
              {featured.slice(1, 7).map(p => (
                <ProductCard
                  key={p.id} product={p}
                  onClick={() => navigate("product", { product: p })}
                  onAddToCart={e => { e.stopPropagation(); addToCart(p); }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ PROMO BANNERS ══════════════════════════════════════════════════ */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Wide banner */}
            <div
              className="md:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1e3a5f] to-[#2d5fa8] p-8 text-white cursor-pointer group"
              onClick={() => navigate("products", { category: "Chargers" })}
            >
              <div className="absolute right-0 top-0 bottom-0 w-40 flex items-center justify-center opacity-15 group-hover:opacity-25 transition-opacity">
                <Zap className="w-40 h-40" />
              </div>
              <Badge className="bg-white/20 text-white border-0 mb-3 text-xs">⚡ Limited Time</Badge>
              <h3 className="text-2xl font-black mb-2">Fast Charging Collection</h3>
              <p className="text-blue-200 text-sm mb-5 max-w-xs">Up to 65W GaN chargers. Charge your phone to 50% in just 25 minutes.</p>
              <button className="bg-white text-blue-800 font-bold text-sm px-6 py-2 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2">
                Shop Chargers <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Tall banner */}
            <div
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-purple-800 p-6 text-white cursor-pointer group flex flex-col justify-between"
              onClick={() => navigate("products", { category: "Cases" })}
            >
              <div className="absolute right-2 bottom-2 opacity-15 group-hover:opacity-25 transition-opacity">
                <Smartphone className="w-28 h-28" />
              </div>
              <div>
                <Badge className="bg-white/20 text-white border-0 mb-3 text-xs">New In</Badge>
                <h3 className="text-xl font-black mb-2">Military Grade Cases</h3>
                <p className="text-purple-200 text-sm mb-4">Drop-tested up to 3m. Style meets protection.</p>
              </div>
              <button className="bg-white text-purple-800 font-bold text-sm px-5 py-2 rounded-xl hover:bg-purple-50 transition-colors self-start flex items-center gap-2">
                Shop Cases <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ BEST SELLERS + VALUE PROPS ═════════════════════════════════════ */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Best sellers list */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Top Ranked</p>
                  <h2 className="text-2xl font-black text-gray-900">Best Sellers</h2>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {bestSellers.map((p, i) => (
                  <ProductRowCard
                    key={p.id} product={p} rank={i + 1}
                    onClick={() => navigate("product", { product: p })}
                    onAddToCart={e => { e.stopPropagation(); addToCart(p); }}
                  />
                ))}
              </div>
            </div>

            {/* Value propositions */}
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Why BNM Parts</p>
              {[
                { icon: Truck,      title: "Free Delivery",      desc: "On all orders over £50. Same day dispatch before 3pm.",    grad: "from-blue-500 to-cyan-500"    },
                { icon: ShieldCheck,title: "Genuine Products",   desc: "100% authentic parts with manufacturer warranty.",         grad: "from-emerald-500 to-green-600" },
                { icon: Award,      title: "Best Prices",        desc: "Wholesale, trader & retail pricing tiers available.",      grad: "from-amber-500 to-orange-500"  },
                { icon: RotateCcw,  title: "Easy Returns",       desc: "No-hassle 30-day return policy on all products.",          grad: "from-violet-500 to-purple-600" },
                { icon: Headphones, title: "Expert Support",     desc: "Call or email us anytime — real people, real answers.",    grad: "from-rose-500 to-pink-600"     },
              ].map(({ icon: I, title, desc, grad }) => (
                <div key={title} className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                  <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", grad)}>
                    <I className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-500 leading-snug mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ NEW ARRIVALS ═══════════════════════════════════════════════════ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">Just In</p>
              <h2 className="text-3xl font-black text-gray-900">New Arrivals</h2>
            </div>
            <button onClick={() => navigate("products")} className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {newArrivals.map(p => (
              <ProductCard
                key={p.id} product={p}
                onClick={() => navigate("product", { product: p })}
                onAddToCart={e => { e.stopPropagation(); addToCart(p); }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ══ LOYALTY / BULK PRICING CTA ═════════════════════════════════════ */}
      <section className="py-16 bg-[#080d1a] relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { tier: "Retailer",   discount: "0%",  desc: "Full retail price. Perfect for personal use.",        icon: ShoppingCart, grad: "from-blue-600 to-blue-700",    badge: "Standard"  },
              { tier: "Trader",     discount: "15%", desc: "15% discount off retail. For registered traders.",    icon: Tag,          grad: "from-violet-600 to-purple-700", badge: "Popular"   },
              { tier: "Wholesaler", discount: "30%", desc: "30% off retail. Bulk orders & wholesale accounts.",   icon: Percent,      grad: "from-emerald-600 to-teal-700",  badge: "Best Value" },
            ].map(({ tier, discount, desc, icon: I, grad, badge }) => (
              <div key={tier} className={cn("relative rounded-3xl bg-gradient-to-br p-6 text-white overflow-hidden group cursor-pointer hover:scale-105 transition-transform duration-300", grad)}
                onClick={() => navigate("contact")}>
                <div className="absolute top-3 right-3 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                  <I className="w-6 h-6 text-white" />
                </div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">{tier}</p>
                <p className="text-4xl font-black mb-2">{discount} <span className="text-lg font-semibold opacity-70">off</span></p>
                <p className="text-white/70 text-sm leading-relaxed mb-5">{desc}</p>
                <button className="text-xs font-bold flex items-center gap-1.5 text-white/80 hover:text-white transition-colors">
                  Register Now <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ NEWSLETTER ═════════════════════════════════════════════════════ */}
      <section className="py-14 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <Gift className="w-10 h-10 text-white/80 mx-auto mb-4" />
          <h2 className="text-3xl font-black text-white mb-2">Stay in the Loop</h2>
          <p className="text-blue-200 mb-6">Get exclusive deals, new product alerts, and tech tips delivered to your inbox.</p>
          <div className="flex gap-2 max-w-sm mx-auto">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 bg-white/15 border border-white/25 rounded-xl px-4 py-3 text-white placeholder-blue-200 text-sm focus:outline-none focus:border-white/50"
            />
            <button className="bg-white text-blue-700 font-bold text-sm px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors shrink-0">
              Subscribe
            </button>
          </div>
          <p className="text-blue-300 text-xs mt-3">No spam. Unsubscribe anytime. 🔒 Your data is safe.</p>
        </div>
      </section>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
}

// Dummy Users icon used inline
function Users({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}