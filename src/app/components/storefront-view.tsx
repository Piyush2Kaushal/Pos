import { useState, useMemo, useRef, useEffect, ElementType, FormEvent } from "react";
import { usePOS } from "@/app/context/pos-context";
import { Product } from "@/app/types";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetFooter,
} from "@/app/components/ui/sheet";
import {
  ShoppingCart, Search, Menu, X, Plus, Minus, Trash2,
  Package, Cpu, Cable, Smartphone, Zap, Headphones, ShieldCheck,
  ChevronRight, ChevronDown, Mail, Phone, MapPin,
  Facebook, Twitter, Instagram, Youtube, Linkedin,
  Gamepad2, Wrench, LayoutDashboard, User,
} from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { toast } from "sonner";
import { Link } from "react-router";
import { StorefrontHomePage } from "@/app/components/storefront-home-page";
import { StorefrontProductsPage } from "@/app/components/storefront-products-page";
import { StorefrontProductDetailPage } from "@/app/components/storefront-product-detail-page";
import { StorefrontCheckoutPage } from "@/app/components/storefront-checkout-page";
import { StorefrontAboutPage, StorefrontContactPage } from "@/app/components/storefront-static-pages";
import { StorefrontBrandPage, BRANDS, BrandInfo } from "@/app/components/storefront-brand-page";
import { StorefrontAccountPage } from "@/app/components/storefront-account-page";
import { Customer, Invoice } from "@/app/types";

export type StorePage = "home" | "products" | "product" | "checkout" | "about" | "contact" | "brand" | "account";

interface CartItem { product: Product; quantity: number; }

const legacyCatCfg: Record<string, { icon: ElementType; light: string; color: string }> = {
  Cases:               { icon: Smartphone,  light: "bg-purple-50",  color: "text-purple-600" },
  Cables:              { icon: Cable,       light: "bg-orange-50",  color: "text-orange-600" },
  Chargers:            { icon: Zap,         light: "bg-blue-50",    color: "text-blue-600"   },
  Headphones:          { icon: Headphones,  light: "bg-teal-50",    color: "text-teal-600"   },
  Accessories:         { icon: Cpu,         light: "bg-indigo-50",  color: "text-indigo-600" },
  "Screen Protectors": { icon: ShieldCheck, light: "bg-green-50",   color: "text-green-600"  },
};
function getCfg(cat: string) {
  return legacyCatCfg[cat] ?? { icon: Package, light: "bg-gray-50", color: "text-gray-600" };
}

// ─── Mega Nav definitions (matching image exactly) ────────────────────────────
const MEGA_NAV = BRANDS.map(b => ({
  label: b.label,
  brandId: b.id,
  categories: b.categories,
}));

export function StorefrontView() {
  const { products, customers, updateCustomer, invoices } = usePOS();

  const [page, setPage]               = useState<StorePage>("home");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory]   = useState<string | null>(null);
  const [activeBrand, setActiveBrand]         = useState<BrandInfo | null>(null);
  const [activeBrandCat, setActiveBrandCat]   = useState<string | null>(null);
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen]   = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileBrandExpanded, setMobileBrandExpanded] = useState<string | null>(null);
  const [headerSearch, setHeaderSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Customer state - simulate logged in customer (first customer for demo)
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(customers[0] || null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const navigate = (newPage: StorePage, data?: { product?: Product; category?: string; brand?: BrandInfo; brandCategory?: string | null }) => {
    if (data?.product)  setSelectedProduct(data.product);
    if (newPage === "products") setActiveCategory(data?.category ?? null);
    if (newPage === "brand" && data?.brand) {
      setActiveBrand(data.brand);
      setActiveBrandCat(data.brandCategory ?? null);
    }
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsMobileMenuOpen(false);
    setOpenDropdown(null);
  };

  // Wishlist functions
  const addToWishlist = (productId: string) => {
    if (!currentCustomer) {
      toast.error("Please log in to add to wishlist");
      return;
    }
    const wishlist = currentCustomer.wishlist || [];
    if (wishlist.includes(productId)) {
      toast.info("Already in wishlist");
      return;
    }
    updateCustomer(currentCustomer.id, { wishlist: [...wishlist, productId] });
    setCurrentCustomer(prev => prev ? { ...prev, wishlist: [...wishlist, productId] } : null);
    toast.success("Added to wishlist");
  };

  const removeFromWishlist = (productId: string) => {
    if (!currentCustomer) return;
    const wishlist = (currentCustomer.wishlist || []).filter(id => id !== productId);
    updateCustomer(currentCustomer.id, { wishlist });
    setCurrentCustomer(prev => prev ? { ...prev, wishlist } : null);
    toast.success("Removed from wishlist");
  };

  const handleViewOrderDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    // You could open a modal here or navigate to order details page
    toast.info(`Viewing order #${invoice.invoiceNumber}`);
  };

  // ── Cart ops ────────────────────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    if (product.stock === 0) { toast.error("Out of stock"); return; }
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) {
        if (ex.quantity >= product.stock) { toast.error("Maximum stock reached"); return prev; }
        toast.success(`${product.name} — quantity increased`);
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      toast.success(`${product.name} added to cart`);
      return [...prev, { product, quantity: 1 }];
    });
  };
  const updateQuantity = (productId: string, change: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id !== productId) return item;
      const newQty = item.quantity + change;
      if (newQty > item.product.stock) { toast.error("Max stock reached"); return item; }
      if (newQty < 1) return item;
      return { ...item, quantity: newQty };
    }));
  };
  const removeFromCart = (productId: string) => { setCart(prev => prev.filter(i => i.product.id !== productId)); toast.success("Item removed"); };
  const clearCart = () => setCart([]);

  const cartCount = useMemo(() => cart.reduce((s,i) => s + i.quantity, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((s,i) => s + i.product.retailPrice * i.quantity, 0), [cart]);

  const handleHeaderSearch = (e: FormEvent) => {
    e.preventDefault();
    if (headerSearch.trim()) { navigate("products", { category: undefined }); setIsSearchOpen(false); setHeaderSearch(""); }
  };

  // ── Dropdown hover helpers ──────────────────────────────────────────────────
  const openMenu   = (id: string) => { if (dropdownTimer.current) clearTimeout(dropdownTimer.current); setOpenDropdown(id); };
  const closeMenu  = ()            => { dropdownTimer.current = setTimeout(() => setOpenDropdown(null), 120); };
  const keepOpen   = ()            => { if (dropdownTimer.current) clearTimeout(dropdownTimer.current); };

  const navLinks: { label: string; page: StorePage }[] = [
    { label: "Home", page: "home" },
    { label: "All Products", page: "products" },
    { label: "About", page: "about" },
    { label: "Contact", page: "contact" },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ══ TOP INFO BAR ════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white text-xs py-1.5 text-center hidden sm:block">
        🚀 Free delivery on orders over £50 · UK shipping · &nbsp;
        <a href="mailto:accounts@bnmparts.com" className="underline hover:text-blue-200">accounts@bnmparts.com</a>
        &nbsp;· &nbsp;<span>www.bnmparts.com</span>
      </div>

      {/* ══ MAIN HEADER ═════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <button className="flex items-center gap-2.5 shrink-0" onClick={() => navigate("home")}>
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-lg bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">BNM Parts</span>
                <p className="text-[10px] text-gray-400 -mt-0.5 leading-none">www.bnmparts.com</p>
              </div>
            </button>

            {/* Desktop simple nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ label, page: pg }) => (
                <button key={pg} onClick={() => navigate(pg)}
                  className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                    page === pg ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* Search */}
            <form onSubmit={handleHeaderSearch} className="hidden lg:flex flex-1 max-w-72">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search products..." value={headerSearch} onChange={e => setHeaderSearch(e.target.value)}
                  className="pl-9 rounded-xl border-gray-200 bg-gray-50 focus:bg-white" />
              </div>
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {currentCustomer && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 hidden sm:flex hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                  onClick={() => navigate("account")}
                >
                  <User className="w-4 h-4" />
                  My Account
                </Button>
              )}
              <Link to="/">
                <Button variant="outline" size="sm" className="gap-2 hidden sm:flex hover:bg-blue-50 hover:border-blue-300 transition-colors">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSearchOpen(!isSearchOpen)}>
                <Search className="w-5 h-5 text-gray-600" />
              </Button>
              <Button variant="ghost" size="icon" className="relative" onClick={() => setIsCartOpen(true)}>
                <ShoppingCart className="w-5 h-5 text-gray-600" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-blue-600 text-white">
                    {cartCount > 9 ? "9+" : cartCount}
                  </Badge>
                )}
              </Button>
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile search */}
          {isSearchOpen && (
            <div className="pb-3 lg:hidden">
              <form onSubmit={handleHeaderSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search products..." value={headerSearch} onChange={e => setHeaderSearch(e.target.value)}
                    className="pl-9 rounded-xl" autoFocus />
                </div>
              </form>
            </div>
          )}

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-100 py-3 max-h-[70vh] overflow-y-auto">
              {/* Simple pages */}
              <div className="space-y-1 mb-3">
                {navLinks.map(({ label, page: pg }) => (
                  <button key={pg} onClick={() => navigate(pg)}
                    className={cn("flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-medium",
                      page === pg ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50")}
                  >
                    {label} <ChevronRight className="w-4 h-4 opacity-40" />
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 mb-2">Shop by Brand</p>
                {MEGA_NAV.map(item => (
                  <div key={item.brandId}>
                    <button
                      onClick={() => setMobileBrandExpanded(mobileBrandExpanded === item.brandId ? null : item.brandId)}
                      className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      {item.label}
                      <ChevronDown className={cn("w-4 h-4 transition-transform text-gray-400", mobileBrandExpanded === item.brandId && "rotate-180")} />
                    </button>
                    {mobileBrandExpanded === item.brandId && (
                      <div className="ml-4 mb-1 space-y-0.5">
                        <button
                          onClick={() => { const b = BRANDS.find(b=>b.id===item.brandId)!; navigate("brand",{brand:b,brandCategory:null}); }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg"
                        >All {item.label}</button>
                        {item.categories.map(cat => (
                          <button key={cat.label}
                            onClick={() => { const b = BRANDS.find(b=>b.id===item.brandId)!; navigate("brand",{brand:b,brandCategory:cat.productCategory}); }}
                            className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-lg flex items-center gap-2"
                          >
                            <cat.icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />{cat.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ══ MEGA NAVIGATION BAR ═════════════════════════════════════════════ */}
      <nav className="hidden md:block sticky top-16 z-40 bg-[#111827] border-b border-[#1f2937]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-stretch">
            {MEGA_NAV.map(item => {
              const brand = BRANDS.find(b => b.id === item.brandId)!;
              const isOpen = openDropdown === item.brandId;
              return (
                <div key={item.brandId} className="relative"
                  onMouseEnter={() => openMenu(item.brandId)}
                  onMouseLeave={closeMenu}
                >
                  {/* Nav item */}
                  <button
                    onClick={() => navigate("brand", { brand, brandCategory: null })}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-all duration-150 border-b-2",
                      isOpen
                        ? "text-white bg-white/10 border-blue-400"
                        : "text-gray-300 hover:text-white hover:bg-white/8 border-transparent"
                    )}
                  >
                    {item.label}
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 opacity-70", isOpen && "rotate-180 opacity-100")} />
                  </button>

                  {/* Dropdown panel */}
                  {isOpen && (
                    <div
                      className="absolute top-full left-0 w-72 bg-white rounded-b-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                      onMouseEnter={keepOpen}
                      onMouseLeave={closeMenu}
                      style={{ animation: "dropIn 0.18s ease" }}
                    >
                      {/* Brand header */}
                      <div className={cn("px-4 py-3 bg-gradient-to-r", brand.heroGrad)}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <brand.logo className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">{brand.label}</p>
                            <p className={cn("text-[10px]", brand.textColor)}>{brand.tagline}</p>
                          </div>
                        </div>
                      </div>

                      {/* All link */}
                      <button
                        onClick={() => navigate("brand", { brand, brandCategory: null })}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors border-b border-gray-100 group"
                      >
                        <span>All {brand.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>

                      {/* Sub-categories */}
                      <div className="py-1.5">
                        {brand.categories.map(cat => {
                          const I = cat.icon;
                          return (
                            <button
                              key={cat.label}
                              onClick={() => navigate("brand", { brand, brandCategory: cat.productCategory })}
                              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors group text-left"
                            >
                              <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-blue-50 flex items-center justify-center shrink-0 transition-colors">
                                <I className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-600 transition-colors" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors">{cat.label}</p>
                                <p className="text-[10px] text-gray-400 truncate">{cat.description}</p>
                              </div>
                              <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-blue-500 shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                            </button>
                          );
                        })}
                      </div>

                      {/* Footer */}
                      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                        <button
                          onClick={() => navigate("products")}
                          className="text-xs text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1"
                        >
                          Browse all products <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ══ MAIN CONTENT ════════════════════════════════════════════════════ */}
      <main className="flex-1">
        {page === "home" && (
          <StorefrontHomePage products={products} navigate={navigate as any} addToCart={addToCart} cartCount={cartCount} />
        )}
        {page === "products" && (
          <StorefrontProductsPage products={products} navigate={navigate as any} addToCart={addToCart} initialCategory={activeCategory} />
        )}
        {page === "product" && (
          <StorefrontProductDetailPage product={selectedProduct} allProducts={products} navigate={navigate as any} addToCart={addToCart} />
        )}
        {page === "checkout" && (
          <StorefrontCheckoutPage cart={cart} navigate={navigate as any} clearCart={clearCart} updateQuantity={updateQuantity} removeFromCart={removeFromCart} />
        )}
        {page === "about"   && <StorefrontAboutPage navigate={navigate as any} />}
        {page === "contact" && <StorefrontContactPage navigate={navigate as any} />}
        {page === "brand" && activeBrand && (
          <StorefrontBrandPage
            brand={activeBrand}
            brandCategory={activeBrandCat}
            products={products}
            navigate={navigate as any}
            addToCart={addToCart}
          />
        )}
        {page === "account" && currentCustomer && (
          <StorefrontAccountPage
            customer={currentCustomer}
            onViewProduct={(product) => navigate("product", { product })}
            onAddToCart={addToCart}
            onRemoveFromWishlist={removeFromWishlist}
            onViewOrderDetails={handleViewOrderDetails}
          />
        )}
      </main>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer className="bg-gray-900 text-white">
        <div className="border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-lg font-bold mb-1">Stay in the loop</h3>
                <p className="text-gray-400 text-sm">Exclusive deals, new products, and tech tips</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Input placeholder="your@email.com"
                  className="rounded-xl bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 md:w-64" />
                <Button className="bg-blue-600 hover:bg-blue-500 rounded-xl shrink-0">Subscribe</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-5 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">BNM Parts</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Premium mobile accessories for consumers, retailers & wholesalers across the UK. Apple, Samsung, Huawei, Xiaomi and more.
              </p>
              <div className="flex gap-2">
                {[Facebook, Twitter, Instagram, Linkedin, Youtube].map((Icon, i) => (
                  <button key={i} className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Shop by Brand */}
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-widest text-gray-400">By Brand</h4>
              <ul className="space-y-2">
                {BRANDS.slice(0,6).map(b => (
                  <li key={b.id}>
                    <button onClick={() => navigate("brand", { brand: b, brandCategory: null })}
                      className="text-sm text-gray-400 hover:text-white transition-colors">
                      {b.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-widest text-gray-400">Quick Links</h4>
              <ul className="space-y-2">
                {navLinks.map(({ label, page: pg }) => (
                  <li key={pg}>
                    <button onClick={() => navigate(pg)} className="text-sm text-gray-400 hover:text-white transition-colors">{label}</button>
                  </li>
                ))}
                {["Cases", "Cables", "Chargers"].map(cat => (
                  <li key={cat}>
                    <button onClick={() => navigate("products", { category: cat })} className="text-sm text-gray-400 hover:text-white transition-colors">{cat}</button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-widest text-gray-400">Contact</h4>
              <ul className="space-y-3">
                {[
                  { icon: Mail, text: "accounts@bnmparts.com" },
                  { icon: Phone, text: "+44 20 1234 5678"      },
                  { icon: MapPin, text: "123 Parts Lane, London, E1 6RF" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2 text-sm text-gray-400">
                    <Icon className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />{text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-gray-500">
            <p>© 2026 BNM Parts Ltd. All rights reserved.</p>
            <div className="flex gap-4">
              {["Privacy Policy", "Terms & Conditions", "Cookie Policy"].map(link => (
                <button key={link} className="hover:text-white transition-colors">{link}</button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ══ CART SHEET ══════════════════════════════════════════════════════ */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              Shopping Cart
            </SheetTitle>
            <SheetDescription>
              {cartCount === 0 ? "Your cart is empty" : `${cartCount} item${cartCount > 1 ? "s" : ""} — £${cartTotal.toFixed(2)}`}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
                <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-medium text-gray-600">Your cart is empty</p>
                <p className="text-sm mt-1">Add some products to get started</p>
                <Button className="mt-6 bg-blue-600 hover:bg-blue-700"
                  onClick={() => { setIsCartOpen(false); navigate("products"); }}>
                  Browse Products
                </Button>
              </div>
            ) : (
              cart.map(item => {
                const cfg = getCfg(item.product.category);
                const Ico = cfg.icon;
                return (
                  <div key={item.product.id} className="flex gap-3 p-3 bg-gray-50 rounded-2xl">
                    <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center shrink-0", cfg.light)}>
                      <Ico className={cn("w-7 h-7 opacity-60", cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-400">{item.product.category}</p>
                      <p className="text-sm font-bold text-blue-600 mt-0.5">£{item.product.retailPrice.toFixed(2)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => removeFromCart(item.product.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1">
                        <button className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-gray-600"
                          onClick={() => updateQuantity(item.product.id, -1)}>
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                        <button className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-gray-600"
                          onClick={() => updateQuantity(item.product.id, 1)}>
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs font-bold text-gray-700">£{(item.product.retailPrice * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {cart.length > 0 && (
            <SheetFooter className="border-t pt-4 space-y-3">
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>£{cartTotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  {cartTotal >= 50 ? <span className="text-green-600 font-medium">FREE</span> : <span>£4.99</span>}
                </div>
                <div className="flex justify-between font-bold text-gray-900 border-t pt-2">
                  <span>Total</span>
                  <span className="text-blue-600 text-lg">£{(cartTotal + (cartTotal >= 50 ? 0 : 4.99)).toFixed(2)}</span>
                </div>
              </div>
              {cartTotal < 50 && (
                <p className="text-xs text-blue-600 bg-blue-50 rounded-xl px-3 py-2 w-full text-center">
                  Add £{(50 - cartTotal).toFixed(2)} more for free delivery!
                </p>
              )}
              <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2 rounded-xl" size="lg"
                onClick={() => { setIsCartOpen(false); navigate("checkout"); }}>
                Checkout <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full rounded-xl"
                onClick={() => { setIsCartOpen(false); navigate("products"); }}>
                Continue Shopping
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}