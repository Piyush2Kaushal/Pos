import { useState, useMemo, ElementType } from "react";
import { Product } from "@/app/types";
import {
  ShoppingCart, Star, ChevronRight, Package, Cpu, Cable,
  Smartphone, Zap, Headphones, ShieldCheck, Heart, Eye,
  Flame, ArrowRight, CheckCircle2, Gamepad2, Wrench,
} from "lucide-react";
import { cn } from "@/app/components/ui/utils";

type StorePage = "home" | "products" | "product" | "checkout" | "about" | "contact" | "brand";

export interface BrandInfo {
  id: string;
  label: string;
  tagline: string;
  description: string;
  heroGrad: string;
  accentColor: string;
  textColor: string;
  badgeGrad: string;
  logo: ElementType;
  categories: BrandCategory[];
}

export interface BrandCategory {
  label: string;
  icon: ElementType;
  productCategory: string | null; // maps to existing product category
  description: string;
}

// ─── Category icon map ────────────────────────────────────────────────────────
const catCfg: Record<string, { icon: ElementType; color: string; light: string; grad: string }> = {
  Cases:             { icon: Smartphone,  color: "text-violet-600",  light: "bg-violet-50",  grad: "from-violet-600 to-purple-700"  },
  Cables:            { icon: Cable,       color: "text-orange-600",  light: "bg-orange-50",  grad: "from-orange-500 to-amber-600"   },
  Chargers:          { icon: Zap,         color: "text-blue-600",    light: "bg-blue-50",    grad: "from-blue-600 to-cyan-600"      },
  Headphones:        { icon: Headphones,  color: "text-teal-600",    light: "bg-teal-50",    grad: "from-teal-600 to-emerald-600"   },
  Accessories:       { icon: Cpu,         color: "text-indigo-600",  light: "bg-indigo-50",  grad: "from-indigo-600 to-blue-600"    },
  "Screen Protectors": { icon: ShieldCheck, color: "text-emerald-600", light: "bg-emerald-50", grad: "from-emerald-600 to-green-600" },
  "Game Console Parts": { icon: Gamepad2,  color: "text-rose-600",    light: "bg-rose-50",    grad: "from-rose-600 to-pink-700"     },
  Tools:             { icon: Wrench,      color: "text-amber-600",   light: "bg-amber-50",   grad: "from-amber-500 to-orange-600"  },
};
function getCfg(cat: string) {
  return catCfg[cat] ?? { icon: Package, color: "text-gray-600", light: "bg-gray-50", grad: "from-gray-600 to-gray-700" };
}

// ─── Brand definitions ────────────────────────────────────────────────────────
export const BRANDS: BrandInfo[] = [
  {
    id: "apple",
    label: "Apple Parts",
    tagline: "Premium Parts for Every Apple Device",
    description: "From iPhone cases to AirPods accessories — genuine quality parts for the entire Apple ecosystem.",
    heroGrad: "from-gray-900 via-gray-800 to-slate-900",
    accentColor: "#6b7280",
    textColor: "text-gray-200",
    badgeGrad: "from-gray-600 to-gray-700",
    logo: Smartphone,
    categories: [
      { label: "Cases & Covers",       icon: Smartphone,  productCategory: "Cases",             description: "Military-grade protection for iPhone" },
      { label: "Screen Protectors",    icon: ShieldCheck, productCategory: "Screen Protectors",  description: "Tempered glass for perfect clarity"   },
      { label: "Charging & Cables",    icon: Zap,         productCategory: "Chargers",           description: "Fast charging, MFi certified"         },
      { label: "Cables",               icon: Cable,       productCategory: "Cables",             description: "Lightning & USB-C cables"             },
      { label: "Headphones & Audio",   icon: Headphones,  productCategory: "Headphones",         description: "Premium audio accessories"            },
      { label: "Accessories",          icon: Cpu,         productCategory: "Accessories",        description: "Essential Apple accessories"          },
    ],
  },
  {
    id: "samsung",
    label: "Samsung Parts",
    tagline: "Everything for Your Samsung Galaxy",
    description: "Cases, cables, chargers, and accessories for the full Samsung Galaxy lineup.",
    heroGrad: "from-blue-950 via-blue-900 to-indigo-950",
    accentColor: "#1d4ed8",
    textColor: "text-blue-200",
    badgeGrad: "from-blue-600 to-blue-700",
    logo: Smartphone,
    categories: [
      { label: "Cases & Covers",       icon: Smartphone,  productCategory: "Cases",             description: "Galaxy S & A series protection"       },
      { label: "Screen Protectors",    icon: ShieldCheck, productCategory: "Screen Protectors",  description: "Curved glass screen protection"       },
      { label: "Fast Chargers",        icon: Zap,         productCategory: "Chargers",           description: "25W, 45W Super Fast Charging"         },
      { label: "Cables",               icon: Cable,       productCategory: "Cables",             description: "USB-C cables for all Samsung devices" },
      { label: "Headphones & Buds",    icon: Headphones,  productCategory: "Headphones",         description: "Galaxy Buds compatible accessories"   },
      { label: "Accessories",          icon: Cpu,         productCategory: "Accessories",        description: "Samsung Galaxy accessories"           },
    ],
  },
  {
    id: "huawei",
    label: "Huawei Parts",
    tagline: "Genuine Accessories for Huawei Devices",
    description: "High-quality parts and accessories for Huawei P, Mate, and Nova series devices.",
    heroGrad: "from-red-950 via-red-900 to-rose-950",
    accentColor: "#dc2626",
    textColor: "text-red-200",
    badgeGrad: "from-red-600 to-red-700",
    logo: Smartphone,
    categories: [
      { label: "Cases & Covers",       icon: Smartphone,  productCategory: "Cases",             description: "P60, Mate & Nova protection"          },
      { label: "Screen Protectors",    icon: ShieldCheck, productCategory: "Screen Protectors",  description: "Crystal clear tempered glass"         },
      { label: "Chargers",             icon: Zap,         productCategory: "Chargers",           description: "SuperCharge compatible"               },
      { label: "Cables",               icon: Cable,       productCategory: "Cables",             description: "USB-C & Micro USB cables"             },
      { label: "Audio Accessories",    icon: Headphones,  productCategory: "Headphones",         description: "Huawei audio accessories"             },
      { label: "Accessories",          icon: Cpu,         productCategory: "Accessories",        description: "Huawei device accessories"            },
    ],
  },
  {
    id: "xiaomi",
    label: "Xiaomi Parts",
    tagline: "Parts & Accessories for Mi & Redmi",
    description: "Quality accessories for Xiaomi, Redmi, and POCO smartphones at unbeatable prices.",
    heroGrad: "from-orange-950 via-orange-900 to-amber-950",
    accentColor: "#ea580c",
    textColor: "text-orange-200",
    badgeGrad: "from-orange-600 to-orange-700",
    logo: Smartphone,
    categories: [
      { label: "Cases & Covers",       icon: Smartphone,  productCategory: "Cases",             description: "Xiaomi 14, Redmi & POCO cases"        },
      { label: "Screen Protectors",    icon: ShieldCheck, productCategory: "Screen Protectors",  description: "Full cover protection"                },
      { label: "Chargers",             icon: Zap,         productCategory: "Chargers",           description: "HyperCharge 120W compatible"          },
      { label: "Cables",               icon: Cable,       productCategory: "Cables",             description: "USB-C cables for Xiaomi devices"      },
      { label: "Audio",                icon: Headphones,  productCategory: "Headphones",         description: "Xiaomi audio accessories"             },
      { label: "Accessories",          icon: Cpu,         productCategory: "Accessories",        description: "Xiaomi ecosystem accessories"         },
    ],
  },
  {
    id: "other",
    label: "Other Parts",
    tagline: "Parts for All Other Smartphones",
    description: "OnePlus, Google Pixel, Sony Xperia, Nokia, Motorola and more — we stock parts for every device.",
    heroGrad: "from-slate-900 via-slate-800 to-gray-900",
    accentColor: "#64748b",
    textColor: "text-slate-300",
    badgeGrad: "from-slate-600 to-slate-700",
    logo: Package,
    categories: [
      { label: "Cases",                icon: Smartphone,  productCategory: "Cases",             description: "Multi-brand device protection"        },
      { label: "Screen Protectors",    icon: ShieldCheck, productCategory: "Screen Protectors",  description: "Universal fit protectors"             },
      { label: "Chargers",             icon: Zap,         productCategory: "Chargers",           description: "Universal fast chargers"              },
      { label: "Cables",               icon: Cable,       productCategory: "Cables",             description: "Type-C, Micro USB & more"             },
      { label: "Headphones",           icon: Headphones,  productCategory: "Headphones",         description: "Universal audio accessories"          },
      { label: "Accessories",          icon: Cpu,         productCategory: "Accessories",        description: "Universal smartphone accessories"     },
    ],
  },
  {
    id: "gaming",
    label: "Game Console Parts",
    tagline: "Level Up with Gaming Accessories",
    description: "Controllers, cables, cases and accessories for PlayStation, Xbox, Nintendo Switch and more.",
    heroGrad: "from-purple-950 via-purple-900 to-violet-950",
    accentColor: "#7c3aed",
    textColor: "text-purple-200",
    badgeGrad: "from-purple-600 to-purple-700",
    logo: Gamepad2,
    categories: [
      { label: "Controller Cases",     icon: Smartphone,  productCategory: "Cases",             description: "Protective cases for controllers"     },
      { label: "Charging Stations",    icon: Zap,         productCategory: "Chargers",           description: "Controller & console charging"        },
      { label: "Controller Cables",    icon: Cable,       productCategory: "Cables",             description: "USB & USB-C controller cables"        },
      { label: "Gaming Headsets",      icon: Headphones,  productCategory: "Headphones",         description: "Immersive gaming audio"               },
      { label: "Screen Protectors",    icon: ShieldCheck, productCategory: "Screen Protectors",  description: "Switch & handheld protection"         },
      { label: "Gaming Accessories",   icon: Cpu,         productCategory: "Accessories",        description: "All gaming accessories"               },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    tagline: "Professional Repair & Maintenance Tools",
    description: "Everything a technician needs — screwdrivers, opening tools, soldering kits, and testing equipment.",
    heroGrad: "from-amber-950 via-yellow-900 to-amber-900",
    accentColor: "#d97706",
    textColor: "text-amber-200",
    badgeGrad: "from-amber-600 to-amber-700",
    logo: Wrench,
    categories: [
      { label: "Repair Tool Kits",     icon: Wrench,      productCategory: "Accessories",        description: "Complete repair toolkit sets"         },
      { label: "Opening Tools",        icon: Cpu,         productCategory: "Accessories",        description: "Spudgers, picks & pry tools"          },
      { label: "Screwdriver Sets",     icon: Wrench,      productCategory: "Accessories",        description: "Precision screwdriver kits"           },
      { label: "Screen Separators",    icon: ShieldCheck, productCategory: "Screen Protectors",  description: "Screen removal equipment"             },
      { label: "Cleaning Kits",        icon: Cpu,         productCategory: "Accessories",        description: "Isopropyl, brushes, cloths"           },
      { label: "Cables & Adapters",    icon: Cable,       productCategory: "Cables",             description: "Testing cables & adaptors"            },
    ],
  },
  {
    id: "accessories",
    label: "Accessories",
    tagline: "Smart Accessories for Every Device",
    description: "Wireless chargers, power banks, screen protectors, car mounts and smart home accessories.",
    heroGrad: "from-teal-950 via-teal-900 to-emerald-950",
    accentColor: "#0d9488",
    textColor: "text-teal-200",
    badgeGrad: "from-teal-600 to-teal-700",
    logo: Cpu,
    categories: [
      { label: "Wireless Chargers",    icon: Zap,         productCategory: "Chargers",           description: "Qi & MagSafe wireless charging"       },
      { label: "Cables",               icon: Cable,       productCategory: "Cables",             description: "Braided & standard cables"            },
      { label: "Cases & Covers",       icon: Smartphone,  productCategory: "Cases",              description: "Universal device protection"          },
      { label: "Screen Protectors",    icon: ShieldCheck, productCategory: "Screen Protectors",  description: "Anti-scratch protection"              },
      { label: "Headphones & Earbuds", icon: Headphones,  productCategory: "Headphones",         description: "Wired & wireless audio"               },
      { label: "Smart Accessories",    icon: Cpu,         productCategory: "Accessories",        description: "All smart accessories"                },
    ],
  },
];

// ─── Product card ─────────────────────────────────────────────────────────────
function BrandProductCard({ product, onClick, onAddToCart, brandAccent }: {
  product: Product; onClick: () => void;
  onAddToCart: (e: React.MouseEvent) => void; brandAccent: string;
}) {
  const cfg = getCfg(product.category);
  const Icon = cfg.icon;
  const isOut = product.stock === 0;
  const isLow = product.stock > 0 && product.stock <= 20;
  const [wished, setWished] = useState(false);

  return (
    <div
      className="group bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      <div className={cn("relative aspect-[4/3] overflow-hidden", cfg.light)}>
        <Icon className={cn("absolute inset-0 m-auto w-14 h-14 opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500", cfg.color)} />
        {isOut && <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center"><span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">Out of Stock</span></div>}
        {isLow && !isOut && <div className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">{product.stock} left</div>}
        {product.stock > 100 && <div className="absolute top-2 left-2 flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"><Flame className="w-2.5 h-2.5" />HOT</div>}
        <div className="absolute inset-x-0 bottom-0 flex gap-2 justify-center pb-3 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <button onClick={e=>{e.stopPropagation();setWished(w=>!w);}} className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm",wished?"bg-red-500 text-white":"bg-white/90 text-gray-600 hover:text-red-500")}><Heart className={cn("w-3.5 h-3.5",wished&&"fill-current")} /></button>
          <button onClick={e=>{e.stopPropagation();onClick();}} className="w-8 h-8 rounded-full bg-white/90 text-gray-600 hover:text-blue-600 flex items-center justify-center shadow-lg backdrop-blur-sm"><Eye className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-1">
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", cfg.color)}>{product.category}</span>
          <div className="flex gap-0.5">{Array.from({length:5}).map((_,i)=><Star key={i} className={cn("w-2.5 h-2.5",i<4?"fill-amber-400 text-amber-400":"fill-gray-200 text-gray-200")} />)}</div>
        </div>
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">{product.name}</h3>
        <div className="flex items-center justify-between">
          <span className={cn("font-black text-base", cfg.color)}>£{product.retailPrice.toFixed(2)}</span>
          <button onClick={onAddToCart} disabled={isOut}
            className={cn("h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all",
              isOut?"bg-gray-100 text-gray-400 cursor-not-allowed":`bg-gradient-to-r ${cfg.grad} text-white hover:shadow-md hover:-translate-y-0.5`)}
          >
            <ShoppingCart className="w-3 h-3" />Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Brand Page ───────────────────────────────────────────────────────────────
interface StorefrontBrandPageProps {
  brand: BrandInfo;
  brandCategory: string | null;
  products: Product[];
  navigate: (page: StorePage, data?: any) => void;
  addToCart: (product: Product) => void;
}

export function StorefrontBrandPage({ brand, brandCategory, products, navigate, addToCart }: StorefrontBrandPageProps) {
  const [activeTab, setActiveTab] = useState<string | null>(brandCategory);

  const filteredProducts = useMemo(() => {
    if (!activeTab) return [...products].sort((a,b) => b.stock - a.stock).slice(0, 12);
    return products.filter(p => p.category === activeTab).sort((a,b) => b.stock - a.stock);
  }, [products, activeTab]);

  const LogoIcon = brand.logo;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Brand Hero ─────────────────────────────────────────────────── */}
      <div className={cn("relative overflow-hidden bg-gradient-to-br", brand.heroGrad)}>
        {/* Orbs */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-white/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/50 text-xs mb-5">
            <button onClick={() => navigate("home")} className="hover:text-white transition-colors">Home</button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white font-semibold">{brand.label}</span>
            {activeTab && <><ChevronRight className="w-3 h-3" /><span className="text-white/70">{activeTab}</span></>}
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className={cn("w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center")}>
                  <LogoIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className={cn("inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/15 border border-white/20 mb-1", brand.textColor)}>
                    Genuine Parts
                  </div>
                  <h1 className="text-3xl font-black text-white">{brand.label}</h1>
                </div>
              </div>
              <p className={cn("text-base mb-2", brand.textColor)}>{brand.tagline}</p>
              <p className="text-white/50 text-sm max-w-lg">{brand.description}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 shrink-0">
              {[
                { label: "Products",   val: filteredProducts.length },
                { label: "In Stock",   val: filteredProducts.filter(p=>p.stock>0).length },
                { label: "Categories", val: brand.categories.length },
              ].map(s => (
                <div key={s.label} className="text-center bg-white/10 border border-white/15 rounded-2xl px-4 py-3">
                  <p className="text-2xl font-black text-white">{s.val}</p>
                  <p className={cn("text-[11px] font-semibold", brand.textColor)}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 mt-8">
            <button
              onClick={() => setActiveTab(null)}
              className={cn("text-xs font-semibold px-4 py-2 rounded-xl transition-all",
                !activeTab ? "bg-white text-gray-900 shadow-md" : "bg-white/15 text-white hover:bg-white/25 border border-white/20")}
            >
              All Parts
            </button>
            {brand.categories.map(cat => {
              const I = cat.icon;
              return (
                <button key={cat.label}
                  onClick={() => setActiveTab(cat.productCategory)}
                  className={cn("text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all",
                    activeTab === cat.productCategory ? "bg-white text-gray-900 shadow-md" : "bg-white/15 text-white hover:bg-white/25 border border-white/20")}
                >
                  <I className="w-3.5 h-3.5" />{cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Category Cards ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!activeTab && (
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Browse by Type</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {brand.categories.map(cat => {
                const I = cat.icon;
                const cfg = cat.productCategory ? getCfg(cat.productCategory) : { color: "text-gray-600", light: "bg-gray-50", grad: "from-gray-600 to-gray-700" };
                const count = cat.productCategory ? products.filter(p => p.category === cat.productCategory).length : products.length;
                return (
                  <button key={cat.label}
                    onClick={() => setActiveTab(cat.productCategory)}
                    className="group bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all p-4 text-center"
                  >
                    <div className={cn("w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform", cfg.light)}>
                      <I className={cn("w-6 h-6", cfg.color)} />
                    </div>
                    <p className="text-xs font-bold text-gray-700 leading-tight">{cat.label}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{count} items</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Products grid ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900">
              {activeTab ? `${brand.label} — ${activeTab}` : `All ${brand.label}`}
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">{filteredProducts.length} products found</p>
          </div>
          <button onClick={() => navigate("products", { category: activeTab ?? undefined })}
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
            View all <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.slice(0, 12).map(p => (
              <BrandProductCard key={p.id} product={p} brandAccent={brand.accentColor}
                onClick={() => navigate("product", { product: p })}
                onAddToCart={e => { e.stopPropagation(); addToCart(p); }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <p className="font-bold text-gray-700">No products found</p>
            <p className="text-sm text-gray-400 mt-1">Try another category</p>
          </div>
        )}

        {/* ── Value props ───────────────────────────────────────────────── */}
        <div className={cn("mt-14 rounded-3xl bg-gradient-to-br p-8 text-white relative overflow-hidden", brand.heroGrad)}>
          <div className="absolute right-0 bottom-0 opacity-10"><LogoIcon className="w-48 h-48" /></div>
          <h3 className="text-2xl font-black mb-2">Why choose BNM Parts for {brand.label}?</h3>
          <p className={cn("text-sm mb-6 max-w-lg", brand.textColor)}>{brand.description}</p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: CheckCircle2, title: "Genuine Quality",   desc: "All parts tested and verified" },
              { icon: Flame,        title: "Fast Dispatch",     desc: "Same day for orders before 3pm" },
              { icon: ArrowRight,   title: "Easy Returns",      desc: "30-day no-fuss return policy"   },
            ].map(({icon: I, title, desc}) => (
              <div key={title} className="flex items-start gap-3 bg-white/10 rounded-2xl p-4 border border-white/15">
                <I className="w-5 h-5 text-white shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white text-sm">{title}</p>
                  <p className={cn("text-xs mt-0.5", brand.textColor)}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
