import { useState, useEffect } from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  Search,
  X,
  User,
  FileText,
  Package,
  CreditCard,
  ChevronRight,
  Filter,
  Calendar,
  PoundSterling,
  TrendingUp,
  ShoppingCart,
} from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Customer, Invoice, Product } from "@/app/types";
import { format } from "date-fns";

interface SearchResult {
  type: "customer" | "invoice" | "product" | "payment";
  id: string;
  title: string;
  subtitle: string;
  metadata: string;
  data: any;
}

interface AdvancedSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (type: string, id: string) => void;
}

export function AdvancedSearch({ open, onOpenChange, onNavigate }: AdvancedSearchProps) {
  const { customers, invoices, products } = usePOS();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  // Perform search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search Customers
    customers.forEach((customer) => {
      if (
        customer.name.toLowerCase().includes(query) ||
        customer.phone.includes(query) ||
        customer.email?.toLowerCase().includes(query)
      ) {
        searchResults.push({
          type: "customer",
          id: customer.id,
          title: customer.name,
          subtitle: customer.phone,
          metadata: `${customer.type} • Joined ${format(new Date(customer.createdAt), "MMM yyyy")}`,
          data: customer,
        });
      }
    });

    // Search Invoices
    invoices.forEach((invoice) => {
      if (
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.customer.name.toLowerCase().includes(query) ||
        invoice.id.toLowerCase().includes(query)
      ) {
        searchResults.push({
          type: "invoice",
          id: invoice.id,
          title: invoice.invoiceNumber,
          subtitle: invoice.customer.name,
          metadata: `£${invoice.total.toFixed(2)} • ${invoice.status} • ${format(new Date(invoice.issueDate), "MMM d, yyyy")}`,
          data: invoice,
        });
      }
    });

    // Search Products
    products.forEach((product) => {
      if (
        product.name.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      ) {
        searchResults.push({
          type: "product",
          id: product.id,
          title: product.name,
          subtitle: product.category,
          metadata: `£${product.price.toFixed(2)} • Stock: ${product.stock} • ${product.sku || "No SKU"}`,
          data: product,
        });
      }
    });

    // Search Payments (from invoices)
    invoices.forEach((invoice) => {
      const hasPayments = invoice.paymentHistory && invoice.paymentHistory.length > 0;
      if (hasPayments) {
        const latestPayment = invoice.paymentHistory[invoice.paymentHistory.length - 1];
        if (
          latestPayment.method.toLowerCase().includes(query) ||
          invoice.invoiceNumber.toLowerCase().includes(query)
        ) {
          searchResults.push({
            type: "payment",
            id: invoice.id,
            title: `Payment - ${invoice.invoiceNumber}`,
            subtitle: invoice.customer.name,
            metadata: `£${latestPayment.amount.toFixed(2)} • ${latestPayment.method} • ${format(new Date(latestPayment.date), "MMM d, yyyy")}`,
            data: { ...invoice, latestPayment },
          });
        }
      }
    });

    setResults(searchResults);
  }, [searchQuery, customers, invoices, products]);

  // Filter results based on active tab
  const filteredResults =
    activeTab === "all"
      ? results
      : results.filter((result) => result.type === activeTab);

  // Count results by type
  const resultCounts = {
    all: results.length,
    customer: results.filter((r) => r.type === "customer").length,
    invoice: results.filter((r) => r.type === "invoice").length,
    product: results.filter((r) => r.type === "product").length,
    payment: results.filter((r) => r.type === "payment").length,
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "customer":
        return <User className="w-5 h-5 text-blue-600" />;
      case "invoice":
        return <FileText className="w-5 h-5 text-green-600" />;
      case "product":
        return <Package className="w-5 h-5 text-purple-600" />;
      case "payment":
        return <CreditCard className="w-5 h-5 text-orange-600" />;
      default:
        return <Search className="w-5 h-5 text-gray-600" />;
    }
  };

  const getResultBadgeColor = (type: string) => {
    switch (type) {
      case "customer":
        return "bg-blue-100 text-blue-700";
      case "invoice":
        return "bg-green-100 text-green-700";
      case "product":
        return "bg-purple-100 text-purple-700";
      case "payment":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setSelectedResult(result);
  };

  const handleNavigate = (result: SearchResult) => {
    if (onNavigate) {
      onNavigate(result.type, result.id);
    }
    onOpenChange(false);
    setSearchQuery("");
    setSelectedResult(null);
  };

  const closeSearch = () => {
    onOpenChange(false);
    setSearchQuery("");
    setResults([]);
    setSelectedResult(null);
    setActiveTab("all");
  };

  return (
    <Dialog open={open} onOpenChange={closeSearch}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Search Header */}
          <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Search className="w-6 h-6 text-blue-600" />
                Advanced Search
              </DialogTitle>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search customers, invoices, products, payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-10 h-12 text-base"
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          {searchQuery && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="border-b bg-gray-50 px-6">
                <TabsList className="bg-transparent h-12">
                  <TabsTrigger value="all" className="data-[state=active]:bg-white">
                    All Results
                    {resultCounts.all > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {resultCounts.all}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="customer" className="data-[state=active]:bg-white">
                    <User className="w-4 h-4 mr-1" />
                    Customers
                    {resultCounts.customer > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {resultCounts.customer}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="invoice" className="data-[state=active]:bg-white">
                    <FileText className="w-4 h-4 mr-1" />
                    Invoices
                    {resultCounts.invoice > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {resultCounts.invoice}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="product" className="data-[state=active]:bg-white">
                    <Package className="w-4 h-4 mr-1" />
                    Products
                    {resultCounts.product > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {resultCounts.product}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="payment" className="data-[state=active]:bg-white">
                    <CreditCard className="w-4 h-4 mr-1" />
                    Payments
                    {resultCounts.payment > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {resultCounts.payment}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto p-6">
                <TabsContent value={activeTab} className="mt-0">
                  {filteredResults.length > 0 ? (
                    <div className="space-y-2">
                      {filteredResults.map((result) => (
                        <Card
                          key={`${result.type}-${result.id}`}
                          className="cursor-pointer hover:shadow-md transition-all hover:border-blue-300"
                          onClick={() => handleResultClick(result)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="mt-1">{getResultIcon(result.type)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <h3 className="font-semibold text-gray-900 truncate">
                                    {result.title}
                                  </h3>
                                  <Badge
                                    variant="secondary"
                                    className={`capitalize text-xs ${getResultBadgeColor(result.type)}`}
                                  >
                                    {result.type}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 truncate mb-1">
                                  {result.subtitle}
                                </p>
                                <p className="text-xs text-gray-500">{result.metadata}</p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium mb-1">No results found</p>
                      <p className="text-sm">
                        Try searching with different keywords or check another category
                      </p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          )}

          {/* Empty State */}
          {!searchQuery && (
            <div className="flex-1 flex items-center justify-center p-12 text-gray-500">
              <div className="text-center max-w-md">
                <Search className="w-20 h-20 mx-auto mb-4 opacity-20" />
                <h3 className="text-xl font-semibold mb-2 text-gray-700">
                  Start Searching
                </h3>
                <p className="text-sm mb-6">
                  Search across all your data including customers, invoices, products, and
                  payments. Just start typing above!
                </p>
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Customers</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span>Invoices</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-purple-600" />
                    <span>Products</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-orange-600" />
                    <span>Payments</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Detail View Dialog */}
        <Dialog
          open={selectedResult !== null}
          onOpenChange={() => setSelectedResult(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedResult && getResultIcon(selectedResult.type)}
                {selectedResult?.type === "customer" && "Customer Details"}
                {selectedResult?.type === "invoice" && "Invoice Details"}
                {selectedResult?.type === "product" && "Product Details"}
                {selectedResult?.type === "payment" && "Payment Details"}
              </DialogTitle>
            </DialogHeader>

            {selectedResult && (
              <div className="space-y-4">
                {/* Customer Details */}
                {selectedResult.type === "customer" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-600 font-medium">Name</label>
                        <p className="text-base font-semibold">
                          {selectedResult.data.name}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">Type</label>
                        <p className="text-base font-semibold capitalize">
                          {selectedResult.data.type}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">Phone</label>
                        <p className="text-base">{selectedResult.data.phone}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">Email</label>
                        <p className="text-base">{selectedResult.data.email || "-"}</p>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-600 font-medium">Address</label>
                        <p className="text-base">{selectedResult.data.address || "-"}</p>
                      </div>
                    </div>
                    <Button onClick={() => handleNavigate(selectedResult)} className="w-full">
                      View Full Customer Profile
                    </Button>
                  </div>
                )}

                {/* Invoice Details */}
                {selectedResult.type === "invoice" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-600 font-medium">
                          Invoice Number
                        </label>
                        <p className="text-base font-semibold">
                          {selectedResult.data.invoiceNumber}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">Status</label>
                        <Badge
                          variant={
                            selectedResult.data.status === "paid" ? "default" : "secondary"
                          }
                          className={
                            selectedResult.data.status === "paid"
                              ? "bg-green-500"
                              : "bg-orange-500"
                          }
                        >
                          {selectedResult.data.status}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">Issue Date</label>
                        <p className="text-base">
                          {format(new Date(selectedResult.data.issueDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">
                          Total Amount
                        </label>
                        <p className="text-base font-bold text-blue-600">
                          £{selectedResult.data.total.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">
                          Customer
                        </label>
                        <p className="text-base">
                          {selectedResult.data.customer.name}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">Items</label>
                        <p className="text-base">
                          {selectedResult.data.lineItems.length} items
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => handleNavigate(selectedResult)} className="w-full">
                      View Full Invoice
                    </Button>
                  </div>
                )}

                {/* Product Details */}
                {selectedResult.type === "product" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-600 font-medium">
                          Product Name
                        </label>
                        <p className="text-base font-semibold">{selectedResult.data.name}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">SKU</label>
                        <p className="text-base">{selectedResult.data.sku || "-"}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">Category</label>
                        <p className="text-base">{selectedResult.data.category}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">Price</label>
                        <p className="text-base font-bold text-green-600">
                          £{selectedResult.data.price.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">Stock</label>
                        <p className="text-base">
                          {selectedResult.data.stock} units
                          {selectedResult.data.stock < selectedResult.data.lowStockThreshold && (
                            <Badge variant="destructive" className="ml-2">
                              Low Stock
                            </Badge>
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">
                          Low Stock Alert
                        </label>
                        <p className="text-base">{selectedResult.data.lowStockThreshold}</p>
                      </div>
                    </div>
                    <Button onClick={() => handleNavigate(selectedResult)} className="w-full">
                      View Product Details
                    </Button>
                  </div>
                )}

                {/* Payment Details */}
                {selectedResult.type === "payment" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-600 font-medium">
                          Invoice Number
                        </label>
                        <p className="text-base font-semibold">
                          {selectedResult.data.invoiceNumber}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">Amount</label>
                        <p className="text-base font-bold text-green-600">
                          £{selectedResult.data.latestPayment.amount.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">
                          Payment Method
                        </label>
                        <p className="text-base capitalize">
                          {selectedResult.data.latestPayment.method}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">Status</label>
                        <Badge
                          variant={
                            selectedResult.data.status === "paid" ? "default" : "secondary"
                          }
                          className={
                            selectedResult.data.status === "paid"
                              ? "bg-green-500"
                              : "bg-orange-500"
                          }
                        >
                          {selectedResult.data.status}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">Date</label>
                        <p className="text-base">
                          {format(new Date(selectedResult.data.latestPayment.date), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 font-medium">Time</label>
                        <p className="text-base">
                          {format(new Date(selectedResult.data.latestPayment.date), "h:mm a")}
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => handleNavigate(selectedResult)} className="w-full">
                      View Payment Details
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}