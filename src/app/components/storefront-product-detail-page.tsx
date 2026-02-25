import { useState, useMemo, ElementType } from "react";
import { Product } from "@/app/types";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";
import {
  ShoppingCart, ChevronRight, Package, Cpu, Cable, Smartphone,
  Zap, Headphones, ShieldCheck, Plus, Minus, Star, Truck,
  RotateCcw, Check, Share2, Heart,
} from "lucide-react";

type StorePage = "home" | "products" | "product" | "checkout" | "about" | "contact";

interface StorefrontProductDetailPageProps {
  product: Product | null;
  allProducts: Product[];
  navigate: (page: StorePage, data?: { product?: Product; category?: string }) => void;
  addToCart: (product: Product) => void;
}

const categoryConfig: Record<string, { icon: ElementType; color: string; bg: string; light: string; desc: string }> = {
  Cases: { icon: Smartphone, color: "text-purple-600", bg: "bg-purple-600", light: "bg-purple-50", desc: "Protect your device in style. Our cases are designed with precision-fit molds and premium materials for full device protection." },
  Cables: { icon: Cable, color: "text-orange-600", bg: "bg-orange-600", light: "bg-orange-50", desc: "High-quality cables for reliable, fast data transfer and charging. Durable braided design for long-lasting performance." },
  Chargers: { icon: Zap, color: "text-blue-600", bg: "bg-blue-600", light: "bg-blue-50", desc: "Fast-charge your devices safely with our certified chargers. Compatible with multiple standards and device types." },
  Headphones: { icon: Headphones, color: "text-teal-600", bg: "bg-teal-600", light: "bg-teal-50", desc: "Immersive audio experience with crystal-clear sound quality. Designed for all-day comfort and durability." },
  Accessories: { icon: Cpu, color: "text-indigo-600", bg: "bg-indigo-600", light: "bg-indigo-50", desc: "Essential accessories to complement your mobile lifestyle. Carefully selected for quality and compatibility." },
  "Screen Protectors": { icon: ShieldCheck, color: "text-green-600", bg: "bg-green-600", light: "bg-green-50", desc: "Ultra-clear tempered glass protection against scratches, drops, and impact. Easy bubble-free installation." },
};

function getCategoryConfig(cat: string) {
  return categoryConfig[cat] ?? { icon: Package, color: "text-gray-600", bg: "bg-gray-600", light: "bg-gray-50", desc: "Quality product from BNM Parts." };
}

const mockReviews = [
  { id: 1, author: "James T.", rating: 5, date: "Feb 2026", comment: "Excellent quality, exactly as described. Fast delivery too!" },
  { id: 2, author: "Sarah M.", rating: 5, date: "Jan 2026", comment: "Great product at a very reasonable price. Would definitely buy again." },
  { id: 3, author: "Robert K.", rating: 4, date: "Jan 2026", comment: "Good quality, fits perfectly. Shipping was quick." },
];

export function StorefrontProductDetailPage({
  product,
  allProducts,
  navigate,
  addToCart,
}: StorefrontProductDetailPageProps) {
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [wishlist, setWishlist] = useState(false);

  const cfg = getCategoryConfig(product?.category ?? "");
  const Icon = cfg.icon;

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter((p) => p.category === product.category && p.id !== product.id)
      .slice(0, 4);
  }, [product, allProducts]);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Product not found</p>
          <Button className="mt-4" onClick={() => navigate("products")}>Back to Products</Button>
        </div>
      </div>
    );
  }

  const isOut = product.stock === 0;
  const isLow = product.stock > 0 && product.stock <= 20;

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) addToCart(product);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-sm text-gray-500">
          <button className="hover:text-blue-600" onClick={() => navigate("home")}>Home</button>
          <ChevronRight className="w-3 h-3" />
          <button className="hover:text-blue-600" onClick={() => navigate("products", { category: product.category })}>
            {product.category}
          </button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-800 font-medium truncate max-w-xs">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 gap-10 mb-12">
          {/* Product Image */}
          <div>
            <div className={`aspect-square rounded-2xl ${cfg.light} flex items-center justify-center relative overflow-hidden`}>
              <Icon className={`w-40 h-40 ${cfg.color} opacity-25`} />
              {isOut && (
                <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
                  <Badge className="bg-red-600 text-white text-sm px-4 py-2">Out of Stock</Badge>
                </div>
              )}
              {isLow && !isOut && (
                <Badge className="absolute top-4 right-4 bg-amber-500 text-white">Low Stock — {product.stock} left</Badge>
              )}
              {product.stock > 100 && (
                <Badge className="absolute top-4 left-4 bg-blue-600 text-white">Popular Item</Badge>
              )}
            </div>
            {/* Thumbnail grid (decorative) */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`aspect-square rounded-xl ${cfg.light} flex items-center justify-center cursor-pointer border-2 ${i === 1 ? "border-blue-500" : "border-transparent hover:border-blue-300"} transition-colors`}>
                  <Icon className={`w-7 h-7 ${cfg.color} opacity-30`} />
                </div>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={`${cfg.color} border-current`}>{product.category}</Badge>
              {!isOut && <Badge className="bg-green-100 text-green-700 border-0">In Stock</Badge>}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-sm text-gray-500">5.0 (3 reviews)</span>
            </div>

            {/* Price */}
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-blue-700">£{product.retailPrice.toFixed(2)}</span>
                <span className="text-sm text-gray-400 line-through">£{(product.retailPrice * 1.15).toFixed(2)}</span>
                <Badge className="bg-red-100 text-red-700 border-0">Save 13%</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">VAT included · Free delivery on orders over £50</p>
            </div>

            {/* SKU & Details */}
            <div className="space-y-2 mb-6 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">SKU</span>
                <span className="font-medium text-gray-800 font-mono">{product.sku}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Category</span>
                <span className="font-medium text-gray-800">{product.category}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Availability</span>
                <span className={`font-medium ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-green-600"}`}>
                  {isOut ? "Out of Stock" : isLow ? `Only ${product.stock} left` : `${product.stock} in stock`}
                </span>
              </div>
            </div>

            {/* Quantity + Add to Cart */}
            {!isOut && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    className="px-3 py-2 hover:bg-gray-100 transition-colors disabled:opacity-50"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 font-semibold text-gray-800 min-w-[3rem] text-center">{quantity}</span>
                  <button
                    className="px-3 py-2 hover:bg-gray-100 transition-colors disabled:opacity-50"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <Button
                  className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  size="lg"
                  onClick={handleAddToCart}
                >
                  {addedToCart ? (
                    <><Check className="w-5 h-5" /> Added to Cart!</>
                  ) : (
                    <><ShoppingCart className="w-5 h-5" /> Add to Cart — £{(product.retailPrice * quantity).toFixed(2)}</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={`rounded-xl ${wishlist ? "border-red-400 text-red-500 bg-red-50" : "border-gray-200"}`}
                  onClick={() => setWishlist(!wishlist)}
                >
                  <Heart className={`w-5 h-5 ${wishlist ? "fill-red-500" : ""}`} />
                </Button>
              </div>
            )}

            <Button
              variant="outline"
              className="gap-2 rounded-xl border-gray-200 mb-6"
              onClick={() => navigate("checkout")}
            >
              Buy Now — Checkout Directly
            </Button>

            {/* Guarantees */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Truck, label: "Free Delivery", sub: "Orders over £50" },
                { icon: RotateCcw, label: "Easy Returns", sub: "30-day policy" },
                { icon: ShieldCheck, label: "Warranty", sub: "2-year guarantee" },
              ].map(({ icon: Ico, label, sub }) => (
                <div key={label} className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <Ico className="w-5 h-5 text-blue-600 mb-1" />
                  <p className="text-xs font-semibold text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Product Description + Reviews */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Product Description</h2>
                <p className="text-gray-600 leading-relaxed mb-4">{cfg.desc}</p>
                <p className="text-gray-600 leading-relaxed">
                  The <strong>{product.name}</strong> is a premium product designed for compatibility and durability.
                  Manufactured to strict quality standards, this item goes through rigorous testing before reaching our shelves.
                  Perfect for everyday use and compatible with a wide range of devices.
                </p>
                <ul className="mt-4 space-y-2">
                  {["Premium quality materials", "Precision engineered fit", "Certified and tested", "Easy installation", "1-year manufacturer warranty"].map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Customer Reviews</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-sm font-semibold">5.0/5</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {mockReviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-gray-800">{review.author}</span>
                        <span className="text-xs text-gray-400">{review.date}</span>
                      </div>
                      <div className="flex mb-2">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: Share + quick info */}
          <div className="space-y-4">
            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-5">
                <h3 className="font-bold text-gray-800 mb-3">Share This Product</h3>
                <div className="flex gap-2">
                  {["Facebook", "Twitter", "WhatsApp"].map((net) => (
                    <Button key={net} variant="outline" size="sm" className="flex-1 text-xs rounded-lg">
                      {net}
                    </Button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-2 gap-2 text-gray-500 text-xs">
                  <Share2 className="w-4 h-4" /> Copy Link
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-5">
                <h3 className="font-bold text-gray-800 mb-3">Need Help?</h3>
                <p className="text-sm text-gray-500 mb-3">Our team is ready to assist you</p>
                <Button
                  className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-sm"
                  onClick={() => navigate("contact")}
                >
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Related Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((rp) => {
                const rpCfg = getCategoryConfig(rp.category);
                const RpIcon = rpCfg.icon;
                return (
                  <Card
                    key={rp.id}
                    className="group cursor-pointer border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all rounded-xl overflow-hidden"
                    onClick={() => navigate("product", { product: rp })}
                  >
                    <CardContent className="p-0">
                      <div className={`aspect-square ${rpCfg.light} flex items-center justify-center`}>
                        <RpIcon className={`w-12 h-12 ${rpCfg.color} opacity-40 group-hover:scale-110 transition-transform`} />
                      </div>
                      <div className="p-3">
                        <h4 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1 group-hover:text-blue-600">{rp.name}</h4>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-600">£{rp.retailPrice.toFixed(2)}</span>
                          <Button
                            size="sm"
                            className="h-7 w-7 p-0 rounded-full bg-blue-600 hover:bg-blue-700"
                            onClick={(e) => { e.stopPropagation(); addToCart(rp); }}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}