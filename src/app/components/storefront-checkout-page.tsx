import { useState, ElementType } from "react";
import { Product } from "@/app/types";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  Package, Cpu, Cable, Smartphone, Zap, Headphones, ShieldCheck,
  CreditCard, Banknote, ChevronRight, Check, ShoppingBag, Truck, X,
  Plus, Minus,
} from "lucide-react";
import { toast } from "sonner";

type StorePage = "home" | "products" | "product" | "checkout" | "about" | "contact";

interface CartItem {
  product: Product;
  quantity: number;
}

interface StorefrontCheckoutPageProps {
  cart: CartItem[];
  navigate: (page: StorePage, data?: { product?: Product; category?: string }) => void;
  clearCart: () => void;
  updateQuantity: (productId: string, change: number) => void;
  removeFromCart: (productId: string) => void;
}

const categoryConfig: Record<string, { icon: ElementType; light: string; color: string }> = {
  Cases: { icon: Smartphone, light: "bg-purple-50", color: "text-purple-600" },
  Cables: { icon: Cable, light: "bg-orange-50", color: "text-orange-600" },
  Chargers: { icon: Zap, light: "bg-blue-50", color: "text-blue-600" },
  Headphones: { icon: Headphones, light: "bg-teal-50", color: "text-teal-600" },
  Accessories: { icon: Cpu, light: "bg-indigo-50", color: "text-indigo-600" },
  "Screen Protectors": { icon: ShieldCheck, light: "bg-green-50", color: "text-green-600" },
};

function getCfg(cat: string) {
  return categoryConfig[cat] ?? { icon: Package, light: "bg-gray-50", color: "text-gray-600" };
}

type CheckoutStep = "cart" | "info" | "payment" | "confirmation";

export function StorefrontCheckoutPage({ cart, navigate, clearCart, updateQuantity, removeFromCart }: StorefrontCheckoutPageProps) {
  const [step, setStep] = useState<CheckoutStep>("cart");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank" | "cash">("card");
  const [orderNumber] = useState(() => `ORD-${Math.floor(10000 + Math.random() * 90000)}`);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    address: "", city: "", postcode: "", country: "United Kingdom",
    cardNumber: "", cardExpiry: "", cardCvv: "", cardName: "",
  });

  const subtotal = cart.reduce((s, i) => s + i.product.retailPrice * i.quantity, 0);
  const shipping = subtotal >= 50 ? 0 : 4.99;
  const total = subtotal + shipping;

  const steps: { id: CheckoutStep; label: string }[] = [
    { id: "cart", label: "Cart" },
    { id: "info", label: "Details" },
    { id: "payment", label: "Payment" },
    { id: "confirmation", label: "Confirm" },
  ];

  const stepIndex = steps.findIndex((s) => s.id === step);

  const handlePlaceOrder = () => {
    if (!form.firstName || !form.lastName || !form.email || !form.address) {
      toast.error("Please fill in all required fields");
      return;
    }
    clearCart();
    setStep("confirmation");
  };

  if (step === "confirmation") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h1>
          <p className="text-gray-500 mb-1">Thank you for shopping with BNM Parts</p>
          <p className="font-mono font-bold text-blue-600 text-lg mb-6">{orderNumber}</p>
          <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Email confirmation sent to</span>
              <span className="font-medium">{form.email || "your email"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Estimated delivery</span>
              <span className="font-medium">2–4 business days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total paid</span>
              <span className="font-bold text-blue-600">£{total.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => navigate("home")}>
              Back to Home
            </Button>
            <Button className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700" onClick={() => navigate("products")}>
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-sm text-gray-500">
          <button className="hover:text-blue-600" onClick={() => navigate("home")}>Home</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-800 font-medium">Checkout</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step indicator */}
        <div className="flex items-center justify-center mb-8">
          {steps.slice(0, 3).map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center gap-2 ${i <= stepIndex ? "text-blue-600" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i < stepIndex ? "bg-blue-600 text-white" : i === stepIndex ? "bg-blue-100 text-blue-700 border-2 border-blue-600" : "bg-gray-100 text-gray-400"
                }`}>
                  {i < stepIndex ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
              </div>
              {i < 2 && <div className={`w-16 h-0.5 mx-2 ${i < stepIndex ? "bg-blue-600" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Step 1: Cart */}
            {step === "cart" && (
              <Card className="rounded-2xl border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-blue-600" />
                    Your Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Your cart is empty</p>
                      <Button className="mt-4" onClick={() => navigate("products")}>Shop Now</Button>
                    </div>
                  ) : (
                    cart.map((item) => {
                      const cfg = getCfg(item.product.category);
                      const Ico = cfg.icon;
                      return (
                        <div key={item.product.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                          <div className={`w-14 h-14 rounded-xl ${cfg.light} flex items-center justify-center shrink-0`}>
                            <Ico className={`w-7 h-7 ${cfg.color} opacity-60`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{item.product.name}</p>
                            <p className="text-xs text-gray-400">SKU: {item.product.sku}</p>
                            <p className="text-sm font-bold text-blue-600">£{item.product.retailPrice.toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                              onClick={() => updateQuantity(item.product.id, -1)}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                            <button
                              className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                              onClick={() => updateQuantity(item.product.id, 1)}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-gray-800">£{(item.product.retailPrice * item.quantity).toFixed(2)}</p>
                            <button
                              className="text-xs text-red-400 hover:text-red-600 mt-1"
                              onClick={() => removeFromCart(item.product.id)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {cart.length > 0 && (
                    <div className="pt-3 flex justify-end">
                      <Button
                        className="gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl"
                        onClick={() => setStep("info")}
                      >
                        Continue to Details <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Customer Info */}
            {step === "info" && (
              <Card className="rounded-2xl border-gray-200">
                <CardHeader>
                  <CardTitle>Delivery Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">First Name *</Label>
                      <Input className="rounded-xl mt-1" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-sm">Last Name *</Label>
                      <Input className="rounded-xl mt-1" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Email *</Label>
                      <Input className="rounded-xl mt-1" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-sm">Phone</Label>
                      <Input className="rounded-xl mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">Address *</Label>
                    <Input className="rounded-xl mt-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-sm">City *</Label>
                      <Input className="rounded-xl mt-1" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-sm">Postcode *</Label>
                      <Input className="rounded-xl mt-1" value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-sm">Country</Label>
                      <Input className="rounded-xl mt-1" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => setStep("cart")}>Back</Button>
                    <Button
                      className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl"
                      onClick={() => {
                        if (!form.firstName || !form.email || !form.address) {
                          toast.error("Please fill in required fields");
                          return;
                        }
                        setStep("payment");
                      }}
                    >
                      Continue to Payment <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Payment */}
            {step === "payment" && (
              <Card className="rounded-2xl border-gray-200">
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Method Selection */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "card" as const, icon: CreditCard, label: "Credit / Debit Card" },
                      { id: "bank" as const, icon: Banknote, label: "Bank Transfer" },
                      { id: "cash" as const, icon: Banknote, label: "Cash on Delivery" },
                    ].map(({ id, icon: Ico, label }) => (
                      <button
                        key={id}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors text-center ${
                          paymentMethod === id ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setPaymentMethod(id)}
                      >
                        <Ico className={`w-6 h-6 ${paymentMethod === id ? "text-blue-600" : "text-gray-400"}`} />
                        <span className={`text-xs font-medium ${paymentMethod === id ? "text-blue-700" : "text-gray-600"}`}>{label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Card Form */}
                  {paymentMethod === "card" && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <Label className="text-sm">Cardholder Name</Label>
                        <Input className="rounded-xl mt-1" placeholder="As printed on card" value={form.cardName} onChange={(e) => setForm({ ...form, cardName: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-sm">Card Number</Label>
                        <Input className="rounded-xl mt-1" placeholder="1234 5678 9012 3456" value={form.cardNumber} onChange={(e) => setForm({ ...form, cardNumber: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm">Expiry Date</Label>
                          <Input className="rounded-xl mt-1" placeholder="MM/YY" value={form.cardExpiry} onChange={(e) => setForm({ ...form, cardExpiry: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-sm">CVV</Label>
                          <Input className="rounded-xl mt-1" placeholder="123" type="password" value={form.cardCvv} onChange={(e) => setForm({ ...form, cardCvv: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "bank" && (
                    <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 space-y-1">
                      <p className="font-semibold">Bank Transfer Details</p>
                      <p>Account Name: BNM Parts Ltd</p>
                      <p>Sort Code: 20-00-00</p>
                      <p>Account Number: 12345678</p>
                      <p>Reference: {orderNumber}</p>
                    </div>
                  )}

                  {paymentMethod === "cash" && (
                    <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
                      <p className="font-semibold">Cash on Delivery</p>
                      <p className="mt-1">Please have exact change ready. Our driver will collect payment on delivery.</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => setStep("info")}>Back</Button>
                    <Button className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl" onClick={handlePlaceOrder}>
                      Place Order — £{total.toFixed(2)} <Check className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <Card className="rounded-2xl border-gray-200 sticky top-4">
              <CardHeader>
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate mr-2">{item.product.name} × {item.quantity}</span>
                    <span className="font-medium shrink-0">£{(item.product.retailPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>£{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    {shipping === 0 ? (
                      <span className="text-green-600 font-medium">FREE</span>
                    ) : (
                      <span>£{shipping.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2">
                    <span>Total</span>
                    <span className="text-blue-600 text-lg">£{total.toFixed(2)}</span>
                  </div>
                </div>
                {subtotal < 50 && (
                  <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                    <Truck className="w-3.5 h-3.5 inline mr-1" />
                    Add £{(50 - subtotal).toFixed(2)} more for free delivery!
                  </div>
                )}
                {subtotal >= 50 && (
                  <div className="bg-green-50 rounded-xl p-3 text-xs text-green-700">
                    <Truck className="w-3.5 h-3.5 inline mr-1" />
                    You qualify for free delivery!
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}