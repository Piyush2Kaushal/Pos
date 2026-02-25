import { useState, useMemo } from "react";
import { usePOS } from "@/app/context/pos-context";
import { Customer, Invoice, Product } from "@/app/types";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card } from "@/app/components/ui/card";
import {
  Package, Heart, Clock, CheckCircle2, XCircle, Truck,
  ShoppingBag, User, Mail, Phone, MapPin, CreditCard,
  Calendar, Trash2, ArrowRight, Eye
} from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import { format } from "date-fns";

interface StorefrontAccountPageProps {
  customer: Customer;
  onViewProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onRemoveFromWishlist: (productId: string) => void;
  onViewOrderDetails: (invoice: Invoice) => void;
}

export function StorefrontAccountPage({
  customer,
  onViewProduct,
  onAddToCart,
  onRemoveFromWishlist,
  onViewOrderDetails,
}: StorefrontAccountPageProps) {
  const { products, invoices } = usePOS();
  const [activeTab, setActiveTab] = useState<"orders" | "history" | "wishlist">("orders");

  // Get customer's orders
  const customerOrders = useMemo(() => {
    return invoices
      .filter(inv => inv.customer.id === customer.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [invoices, customer.id]);

  // Split orders into current and history
  const currentOrders = useMemo(() => {
    return customerOrders.filter(order => 
      order.status === "draft" || 
      order.status === "sent" || 
      order.status === "partially_paid"
    );
  }, [customerOrders]);

  const orderHistory = useMemo(() => {
    return customerOrders.filter(order => 
      order.status === "paid" || 
      order.status === "cancelled"
    );
  }, [customerOrders]);

  // Get wishlist products
  const wishlistProducts = useMemo(() => {
    if (!customer.wishlist || customer.wishlist.length === 0) return [];
    return products.filter(p => customer.wishlist?.includes(p.id));
  }, [products, customer.wishlist]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-700 border-green-200";
      case "sent": return "bg-blue-100 text-blue-700 border-blue-200";
      case "draft": return "bg-gray-100 text-gray-700 border-gray-200";
      case "overdue": return "bg-red-100 text-red-700 border-red-200";
      case "partially_paid": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "cancelled": return "bg-gray-100 text-gray-600 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle2 className="w-4 h-4" />;
      case "sent": return <Truck className="w-4 h-4" />;
      case "cancelled": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Customer Info Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{customer.name}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {customer.email}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {customer.phone}
                </div>
                {customer.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {customer.address}
                  </div>
                )}
              </div>
              <div className="mt-3">
                <Badge className={cn(
                  "px-3 py-1",
                  customer.type === "wholesaler" ? "bg-purple-100 text-purple-700" :
                  customer.type === "trader" ? "bg-blue-100 text-blue-700" :
                  "bg-green-100 text-green-700"
                )}>
                  {customer.type.charAt(0).toUpperCase() + customer.type.slice(1)}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Credit Balance</div>
              <div className={cn(
                "text-2xl font-bold",
                customer.creditBalance > 0 ? "text-green-600" : "text-gray-900"
              )}>
                £{customer.creditBalance.toFixed(2)}
              </div>
              {customer.creditLimit && (
                <div className="text-xs text-gray-500 mt-1">
                  Limit: £{customer.creditLimit.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("orders")}
              className={cn(
                "px-4 py-4 text-sm font-semibold border-b-2 transition-colors",
                activeTab === "orders"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              )}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Current Orders
                {currentOrders.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{currentOrders.length}</Badge>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "px-4 py-4 text-sm font-semibold border-b-2 transition-colors",
                activeTab === "history"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              )}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Order History
                <Badge variant="secondary" className="ml-1">{orderHistory.length}</Badge>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("wishlist")}
              className={cn(
                "px-4 py-4 text-sm font-semibold border-b-2 transition-colors",
                activeTab === "wishlist"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              )}
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Wishlist
                {wishlistProducts.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{wishlistProducts.length}</Badge>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Orders */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {currentOrders.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Current Orders</h3>
                <p className="text-gray-500">You don't have any active orders at the moment.</p>
              </div>
            ) : (
              currentOrders.map(order => (
                <Card key={order.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.invoiceNumber}
                        </h3>
                        <Badge className={cn("flex items-center gap-1", getStatusColor(order.status))}>
                          {getStatusIcon(order.status)}
                          {order.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(order.createdAt, "MMM dd, yyyy")}
                        </div>
                        <div className="flex items-center gap-1">
                          <ShoppingBag className="w-4 h-4" />
                          {order.lineItems.length} item{order.lineItems.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        £{order.total.toFixed(2)}
                      </div>
                      {order.amountDue > 0 && (
                        <div className="text-sm text-red-600 font-medium mt-1">
                          Due: £{order.amountDue.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <div className="space-y-2">
                      {order.lineItems.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{item.description}</span>
                          <span className="text-gray-500">×{item.quantity}</span>
                        </div>
                      ))}
                      {order.lineItems.length > 3 && (
                        <div className="text-sm text-gray-500">
                          +{order.lineItems.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    <Button
                      onClick={() => onViewOrderDetails(order)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Order History */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {orderHistory.length === 0 ? (
              <div className="text-center py-16">
                <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Order History</h3>
                <p className="text-gray-500">Your completed orders will appear here.</p>
              </div>
            ) : (
              orderHistory.map(order => (
                <Card key={order.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.invoiceNumber}
                        </h3>
                        <Badge className={cn("flex items-center gap-1", getStatusColor(order.status))}>
                          {getStatusIcon(order.status)}
                          {order.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(order.createdAt, "MMM dd, yyyy")}
                        </div>
                        <div className="flex items-center gap-1">
                          <ShoppingBag className="w-4 h-4" />
                          {order.lineItems.length} item{order.lineItems.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        £{order.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => onViewOrderDetails(order)}
                    variant="ghost"
                    size="sm"
                    className="mt-4 w-full"
                  >
                    View Details
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Wishlist */}
        {activeTab === "wishlist" && (
          <div>
            {wishlistProducts.length === 0 ? (
              <div className="text-center py-16">
                <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Wishlist is Empty</h3>
                <p className="text-gray-500">Save your favorite products to buy them later.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistProducts.map(product => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                    <div className="relative aspect-square bg-gray-100">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-16 h-16 text-gray-300" />
                        </div>
                      )}
                      <button
                        onClick={() => onRemoveFromWishlist(product.id)}
                        className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500 mb-3">{product.category}</p>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-2xl font-bold text-gray-900">
                          £{product.retailPrice.toFixed(2)}
                        </div>
                        {product.stock > 0 ? (
                          <Badge className="bg-green-100 text-green-700">In Stock</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">Out of Stock</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => onViewProduct(product)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          View
                        </Button>
                        <Button
                          onClick={() => onAddToCart(product)}
                          disabled={product.stock === 0}
                          size="sm"
                          className="flex-1"
                        >
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
