import { useState } from "react";
import { usePOS } from "@/app/context/pos-context";
import { Search, ShoppingCart, Trash2, Plus, Minus, User, X } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { toast } from "sonner";

export function SalesView() {
  const {
    products,
    cart,
    customers,
    selectedCustomer,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    completeSale,
    setSelectedCustomer,
    getProductPrice,
  } = usePOS();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const categories = ["All", ...new Set(products.map((p) => p.category))];

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const subtotal = cart.reduce(
    (sum, item) => sum + getProductPrice(item.product) * item.quantity,
    0
  );
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setCheckoutOpen(true);
  };

  const handleCompleteSale = () => {
    completeSale(paymentMethod);
    setCheckoutOpen(false);
    setPaymentMethod("cash");
    toast.success("Sale completed successfully!");
  };

  return (
    <div className="h-full flex">
      {/* Products Section */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Products</h2>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const price = getProductPrice(product);
            return (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-4">
                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.category}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-blue-600">
                        £{price.toFixed(2)}
                      </span>
                      {selectedCustomer && price !== product.retailPrice && (
                        <p className="text-xs text-gray-400 line-through">
                          £{product.retailPrice.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <Badge variant={product.stock > 10 ? "default" : "destructive"}>
                      {product.stock} in stock
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">Cart</h2>
            <Badge className="ml-auto">{cart.length}</Badge>
          </div>

          {/* Customer Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Customer</label>
            {selectedCustomer ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <User className="w-4 h-4 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{selectedCustomer.name}</p>
                  <p className="text-xs text-gray-600 capitalize">
                    {selectedCustomer.type}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedCustomer(null)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Select
                value=""
                onValueChange={(customerId) => {
                  const customer = customers.find((c) => c.id === customerId);
                  if (customer) setSelectedCustomer(customer);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} - {customer.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => {
                const price = getProductPrice(item.product);
                return (
                  <Card key={item.product.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-gray-900">
                            {item.product.name}
                          </h4>
                          <p className="text-sm text-gray-500">£{price.toFixed(2)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateCartQuantity(item.product.id, item.quantity - 1)
                          }
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-12 text-center font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateCartQuantity(item.product.id, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.product.stock}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <span className="ml-auto font-semibold">
                          £{(price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">£{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax (8%)</span>
              <span className="font-medium">£{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span className="text-blue-600">£{total.toFixed(2)}</span>
            </div>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={cart.length === 0}
          >
            Checkout
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
            <DialogDescription>Review and complete the transaction.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCustomer && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Customer</p>
                <p className="text-sm text-blue-700">{selectedCustomer.name}</p>
                <p className="text-xs text-blue-600 capitalize">
                  {selectedCustomer.type} pricing applied
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600 mb-2">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("cash")}
                >
                  Cash
                </Button>
                <Button
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("card")}
                >
                  Card
                </Button>
                <Button
                  variant={paymentMethod === "digital" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("digital")}
                >
                  Digital
                </Button>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Items</span>
                <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>£{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>£{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span className="text-blue-600">£{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteSale}>Complete Sale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}