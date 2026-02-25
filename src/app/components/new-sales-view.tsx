import { useState, useMemo } from "react";
import { usePOS } from "@/app/context/pos-context";
import { useNavigate } from "react-router";
import {
  ShoppingCart,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  Users,
  Package,
  AlertCircle,
  FileText,
  X,
  Save,
  DollarSign,
  Edit,
  Scan,
  PackagePlus,
  ClipboardList,
  Clock,
  Trash,
  FolderOpen,
  UserSearch,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Receipt,
  Star,
  ChevronRight,
  BadgeCheck,
} from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { format } from "date-fns";
import { Product, Customer, Invoice, InvoiceLineItem } from "@/app/types";
import { toast } from "sonner";
import { BarcodeScanner } from "@/app/components/barcode-scanner";

interface SaleLineItem extends InvoiceLineItem {
  product: Product;
}

export function NewSalesView() {
  const { products, customers, invoices, createInvoice, updateInvoice, deleteInvoice, getProductPrice } = usePOS();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now()}`);
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [lineItems, setLineItems] = useState<SaleLineItem[]>([]);
  const [receiveAmount, setReceiveAmount] = useState(0);
  const [shippingCharge, setShippingCharge] = useState(0);
  const [paymentType, setPaymentType] = useState("cash");
  const [note, setNote] = useState("");
  const [priceEditDialog, setPriceEditDialog] = useState<{
    open: boolean;
    itemIndex: number | null;
    item: SaleLineItem | null;
    newPrice: string;
  }>({
    open: false,
    itemIndex: null,
    item: null,
    newPrice: "",
  });

  // Custom product dialog state
  const [customProductDialog, setCustomProductDialog] = useState(false);
  const [customProduct, setCustomProduct] = useState({
    description: "",
    unitPrice: "",
    quantity: "1",
    taxRate: "20",
    discount: "0",
  });

  // Draft Sales dialog
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);

  // Customer search dialog
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [viewCustomer, setViewCustomer] = useState<typeof customers[0] | null>(null);

  // Product list dialog
  const [productListOpen, setProductListOpen] = useState(false);
  const [productListQuery, setProductListQuery] = useState("");
  const [productListCategory, setProductListCategory] = useState("all");
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  sixDaysAgo.setHours(0, 0, 0, 0);

  const draftInvoices = invoices.filter(inv => {
    if (inv.status !== "draft") return false;
    const created = inv.createdAt ? new Date(inv.createdAt) : null;
    return created ? created >= sixDaysAgo : false;
  });

  // Stats
  const totalProducts = lineItems.length;
  const totalQuantity = lineItems.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate totals
  const calculations = useMemo(() => {
    const subtotalBeforeDiscount = lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    const totalDiscount = lineItems.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      return sum + (itemSubtotal * item.discount / 100);
    }, 0);

    const subtotal = subtotalBeforeDiscount - totalDiscount;

    const tax = lineItems.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const afterDiscount = itemSubtotal * (1 - item.discount / 100);
      return sum + (afterDiscount * item.taxRate / 100);
    }, 0);

    const total = subtotal + tax + shippingCharge;
    const changeAmount = receiveAmount > total ? receiveAmount - total : 0;
    const dueAmount = total - receiveAmount > 0 ? total - receiveAmount : 0;

    return {
      subtotalBeforeDiscount,
      totalDiscount,
      subtotal,
      tax,
      total,
      changeAmount,
      dueAmount,
    };
  }, [lineItems, shippingCharge, receiveAmount]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // Add product to sale
  const addProductToSale = (product: Product) => {
    const existingItem = lineItems.find(item => item.product.id === product.id);
    
    if (existingItem) {
      // Increase quantity
      if (existingItem.quantity < product.stock) {
        updateLineItem(lineItems.indexOf(existingItem), "quantity", existingItem.quantity + 1);
      } else {
        toast.error("Insufficient stock");
      }
    } else {
      // Add new item
      const price = selectedCustomer ? getProductPrice(product) : product.retailPrice;
      const newItem: SaleLineItem = {
        id: `item-${Date.now()}-${Math.random()}`,
        description: product.name,
        quantity: 1,
        unitPrice: price,
        taxRate: 20, // VAT 20%
        discount: 0,
        amount: price * 1.2, // including 20% VAT
        productId: product.id,
        product: product,
      };
      setLineItems(prev => [...prev, newItem]);
    }
    setSearchTerm("");
  };

  // Update line item
  const updateLineItem = (index: number, field: keyof SaleLineItem, value: any) => {
    setLineItems(prev => {
      const items = [...prev];
      const item = { ...items[index] };

      if (field === "quantity") {
        const maxQty = item.product.stock;
        item.quantity = Math.min(Math.max(1, value), maxQty);
      } else {
        (item as any)[field] = value;
      }

      // Recalculate amount
      const subtotal = item.quantity * item.unitPrice;
      const afterDiscount = subtotal * (1 - item.discount / 100);
      item.amount = afterDiscount * (1 + item.taxRate / 100);

      items[index] = item;
      return items;
    });
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate VAT included price display
  const getVatIncludedPrice = (item: SaleLineItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const vat = subtotal * item.taxRate / 100;
    return vat;
  };

  // Reset form
  const resetForm = () => {
    setSelectedCustomer(null);
    setInvoiceNumber(`INV-${Date.now()}`);
    setDueDate(format(new Date(), "yyyy-MM-dd"));
    setIssueDate(format(new Date(), "yyyy-MM-dd"));
    setLineItems([]);
    setReceiveAmount(0);
    setShippingCharge(0);
    setPaymentType("cash");
    setNote("");
  };

  // Add custom product to sale
  const handleAddCustomProduct = () => {
    if (!customProduct.description.trim()) {
      toast.error("Please enter a product description");
      return;
    }
    const price = parseFloat(customProduct.unitPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    const qty = parseInt(customProduct.quantity) || 1;
    const tax = parseFloat(customProduct.taxRate) || 0;
    const disc = parseFloat(customProduct.discount) || 0;

    const subtotal = qty * price;
    const afterDiscount = subtotal * (1 - disc / 100);
    const amount = afterDiscount * (1 + tax / 100);

    // Build a virtual product stub so the line item structure stays consistent
    const customId = `custom-${Date.now()}`;
    const virtualProduct: Product = {
      id: customId,
      sku: "CUSTOM",
      name: customProduct.description.trim(),
      category: "Custom",
      price: price,
      wholesalePrice: price,
      traderPrice: price,
      retailPrice: price,
      stock: 9999,
    };

    const newItem: SaleLineItem = {
      id: `item-${Date.now()}-custom`,
      description: customProduct.description.trim(),
      quantity: qty,
      unitPrice: price,
      taxRate: tax,
      discount: disc,
      amount,
      productId: customId,
      product: virtualProduct,
    };

    setLineItems(prev => [...prev, newItem]);
    toast.success("Custom product added to sale");
    setCustomProduct({ description: "", unitPrice: "", quantity: "1", taxRate: "20", discount: "0" });
    setCustomProductDialog(false);
  };

  // Create invoice
  const handleCreateInvoice = () => {
    if (lineItems.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    const invoice = {
      invoiceNumber,
      customer: selectedCustomer,
      lineItems: lineItems.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        discount: item.discount,
        amount: item.amount,
        productId: item.productId,
      })),
      subtotal: calculations.subtotal,
      totalDiscount: calculations.totalDiscount,
      taxAmount: calculations.tax,
      total: calculations.total,
      amountPaid: receiveAmount,
      amountDue: calculations.dueAmount,
      status: calculations.dueAmount > 0 ? ("partially_paid" as const) : ("paid" as const),
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      paymentTerms: "custom" as const,
      paymentHistory: receiveAmount > 0 ? [{
        id: `pay-${Date.now()}`,
        amount: receiveAmount,
        date: new Date(),
        method: paymentType,
        reference: invoiceNumber,
        notes: note,
      }] : [],
      notes: note,
      termsAndConditions: "Payment is due within specified period. Late payments may incur additional charges.",
      reference: invoiceNumber,
      createdAt: new Date(issueDate),
      updatedAt: new Date(),
    };

    createInvoice(invoice);
    toast.success("Invoice created successfully!");
    resetForm();
  };

  // Save to draft
  const handleSaveToDraft = () => {
    if (lineItems.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    const invoice = {
      invoiceNumber,
      customer: selectedCustomer,
      lineItems: lineItems.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        discount: item.discount,
        amount: item.amount,
        productId: item.productId,
      })),
      subtotal: calculations.subtotal,
      totalDiscount: calculations.totalDiscount,
      taxAmount: calculations.tax,
      total: calculations.total,
      amountPaid: 0,
      amountDue: calculations.total,
      status: "draft" as const,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      paymentTerms: "custom" as const,
      paymentHistory: [],
      notes: note,
      termsAndConditions: "Payment is due within specified period. Late payments may incur additional charges.",
      reference: invoiceNumber,
      createdAt: new Date(issueDate),
      updatedAt: new Date(),
    };

    createInvoice(invoice);
    toast.success("Invoice saved to draft!");
    resetForm();
  };

  // Open price edit dialog
  const openPriceDialog = (index: number, item: SaleLineItem) => {
    setPriceEditDialog({
      open: true,
      itemIndex: index,
      item: item,
      newPrice: item.unitPrice.toString(),
    });
  };

  // Close price edit dialog
  const closePriceDialog = () => {
    setPriceEditDialog({
      open: false,
      itemIndex: null,
      item: null,
      newPrice: "",
    });
  };

  // Update price from dialog
  const handleUpdatePrice = () => {
    if (priceEditDialog.itemIndex !== null) {
      const newPrice = parseFloat(priceEditDialog.newPrice);
      if (isNaN(newPrice) || newPrice <= 0) {
        toast.error("Please enter a valid price");
        return;
      }
      updateLineItem(priceEditDialog.itemIndex, "unitPrice", newPrice);
      toast.success("Price updated successfully");
      closePriceDialog();
    }
  };

  // Load a draft into the form
  const loadDraft = (draft: Invoice) => {
    setInvoiceNumber(draft.invoiceNumber);
    setIssueDate(format(new Date(draft.issueDate), "yyyy-MM-dd"));
    setDueDate(format(new Date(draft.dueDate), "yyyy-MM-dd"));
    setSelectedCustomer(draft.customer || null);
    setNote(draft.notes || "");

    const restored: SaleLineItem[] = (draft.lineItems || []).map(li => {
      const product = products.find(p => p.id === li.productId) || {
        id: li.productId || `custom-${li.id}`,
        sku: "CUSTOM",
        name: li.description,
        category: "Custom",
        price: li.unitPrice,
        wholesalePrice: li.unitPrice,
        traderPrice: li.unitPrice,
        retailPrice: li.unitPrice,
        stock: 9999,
      } as Product;
      return { ...li, product };
    });
    setLineItems(restored);
    setDraftDialogOpen(false);
    toast.success(`Draft "${draft.invoiceNumber}" loaded into the form`);
  };

  const deleteDraft = (id: string) => {
    if (!confirm("Delete this draft?")) return;
    deleteInvoice(id);
    toast.success("Draft deleted");
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Quick Action</h2>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 hover:bg-green-50 hover:border-green-600"
              onClick={() => navigate("/products")}
            >
              <CheckCircle className="w-4 h-4 text-green-600" />
              Add New Product
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 hover:bg-indigo-50 hover:border-indigo-600"
              onClick={() => setCustomProductDialog(true)}
            >
              <PackagePlus className="w-4 h-4 text-indigo-600" />
              Custom Product
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 hover:bg-blue-50 hover:border-blue-600"
              onClick={() => setProductListOpen(true)}
            >
              <Package className="w-4 h-4 text-blue-600" />
              Product List
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 hover:bg-orange-50 hover:border-orange-600"
              onClick={() => navigate("/reports")}
            >
              <ShoppingCart className="w-4 h-4 text-orange-600" />
              Today Sales
            </Button>
            {/* Draft Sales button */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 hover:bg-amber-50 hover:border-amber-500 relative"
              onClick={() => setDraftDialogOpen(true)}
            >
              <ClipboardList className="w-4 h-4 text-amber-600" />
              Draft Sales
              {draftInvoices.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow">
                  {draftInvoices.length}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 hover:bg-slate-50 hover:border-slate-400"
              onClick={() => setCustomerSearchOpen(true)}
            >
              <UserSearch className="w-4 h-4 text-slate-600" />
              Search Customer
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => navigate("/")}
            >
              <AlertCircle className="w-4 h-4" />
              Dashboard
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Top Form Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Product Search */}
            <div className="relative">
              <Label className="mb-2 block">Search product...</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {/* Product Search Dropdown */}
              {searchTerm && filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors group"
                      onClick={() => addProductToSale(product)}
                    >
                      {/* Thumbnail */}
                      <div className="shrink-0 w-12 h-12 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shadow-sm group-hover:border-blue-300 transition-colors">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-gray-300" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                          <span className="text-gray-200">·</span>
                          <p className={`text-xs font-medium ${product.stock === 0 ? "text-red-500" : product.stock <= 10 ? "text-amber-500" : "text-emerald-600"}`}>
                            {product.stock === 0 ? "Out of stock" : `Stock: ${product.stock}`}
                          </p>
                        </div>
                      </div>

                      {/* Price + category */}
                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-green-600">
                          £{selectedCustomer ? getProductPrice(product).toFixed(2) : product.retailPrice.toFixed(2)}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {product.category}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Selection */}
            <div>
              <Label className="mb-2 block">Select Customer</Label>
              <Select
                value={selectedCustomer?.id || ""}
                onValueChange={(value) => {
                  const customer = customers.find(c => c.id === value);
                  setSelectedCustomer(customer || null);
                  // Update prices for existing items
                  if (customer) {
                    setLineItems(prev => prev.map(item => {
                      const price = getProductPrice(item.product);
                      const subtotal = item.quantity * price;
                      const afterDiscount = subtotal * (1 - item.discount / 100);
                      return {
                        ...item,
                        unitPrice: price,
                        amount: afterDiscount * (1 + item.taxRate / 100),
                      };
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Invoice Number */}
            <div>
              <Label className="mb-2 block">Invoice</Label>
              <Input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Invoice number"
              />
            </div>
          </div>

          {/* Barcode Scanner + Date fields row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Barcode Scanner spans 2 cols */}
            <div className="md:col-span-2">
              <Label className="mb-2 flex items-center gap-1.5">
                <Scan className="w-3.5 h-3.5 text-blue-600" />
                Barcode Scanner
              </Label>
              <BarcodeScanner
                products={products}
                onProductFound={addProductToSale}
              />
            </div>

            {/* Invoice Creation Date */}
            <div>
              <Label className="mb-2 block text-sm font-medium text-gray-700">
                Invoice Date
              </Label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="border-blue-200 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Date of invoice creation</p>
            </div>

            {/* Due Date */}
            <div>
              <Label className="mb-2 block text-sm font-medium text-gray-700">
                Due Date
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="border-orange-200 focus:border-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">Payment due by</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-6 border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="w-12">SNo</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="w-24">Unit</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="text-right">Sale Price</TableHead>
                  <TableHead className="text-right w-28">Discount (%)</TableHead>
                  <TableHead className="text-right">Vat Include (20%)</TableHead>
                  <TableHead className="text-right">Sub Total</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length > 0 ? (
                  lineItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell 
                        className="font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                        onClick={() => openPriceDialog(index, item)}
                      >
                        {item.description}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{item.product.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Pcs</Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          max={item.product.stock}
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, "quantity", parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <div className="flex items-center justify-end gap-1">
                          £{item.unitPrice.toFixed(2)}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => openPriceDialog(index, item)}
                            title="Edit price"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={item.discount}
                          onChange={(e) => updateLineItem(index, "discount", parseFloat(e.target.value) || 0)}
                          className="w-24 text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        £{getVatIncludedPrice(item).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        £{item.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeLineItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-gray-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No items added yet. Search and add products above.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Left Side - Stats */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Total Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalProducts}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Total Quantity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalQuantity}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Details */}
              <div className="space-y-3 border rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Receive Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={receiveAmount}
                      onChange={(e) => setReceiveAmount(parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Change Amount</Label>
                    <Input
                      type="text"
                      value={calculations.changeAmount.toFixed(2)}
                      readOnly
                      className="mt-1 bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Due Amount</Label>
                    <Input
                      type="text"
                      value={calculations.dueAmount.toFixed(2)}
                      readOnly
                      className="mt-1 bg-gray-50 text-red-600 font-semibold"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Tax</Label>
                    <Input
                      type="text"
                      value={calculations.tax.toFixed(2)}
                      readOnly
                      className="mt-1 bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Shipping Charge</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingCharge}
                    onChange={(e) => setShippingCharge(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Right Side - Total & Payment */}
            <div className="space-y-4">
              {/* Discount Display */}
              {calculations.totalDiscount > 0 && (
                <Card className="bg-gradient-to-br from-green-500 to-green-700 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-green-100">
                      Total Discount Savings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      -£{calculations.totalDiscount.toFixed(2)}
                    </div>
                    <p className="text-xs text-green-100 mt-1">
                      Subtotal before discount: £{calculations.subtotalBeforeDiscount.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Total Amount */}
              <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-100">
                    Total Amount
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">
                    £{calculations.total.toFixed(2)}
                  </div>
                  {calculations.totalDiscount > 0 && (
                    <p className="text-xs text-blue-100 mt-1">
                      After discount: £{calculations.subtotal.toFixed(2)}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Payment Type */}
              <div>
                <Label className="mb-2 block">Payment Type</Label>
                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Note */}
              <div>
                <Label className="mb-2 block">Note</Label>
                <Textarea
                  placeholder="Type note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-4">
            <Button
              size="lg"
              variant="outline"
              className="bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600"
              onClick={resetForm}
            >
              <X className="w-5 h-5 mr-2" />
              Cancel
            </Button>

            <Button
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleSaveToDraft}
              disabled={lineItems.length === 0 || !selectedCustomer}
            >
              <Save className="w-5 h-5 mr-2" />
              Save to Draft
            </Button>

            <Button
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleCreateInvoice}
              disabled={lineItems.length === 0 || !selectedCustomer}
            >
              <FileText className="w-5 h-5 mr-2" />
              Create Invoice
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ════ DRAFT SALES DIALOG ════ */}
      <Dialog open={draftDialogOpen} onOpenChange={setDraftDialogOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-600" />
              Draft Sales
              {draftInvoices.length > 0 && (
                <span className="ml-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {draftInvoices.length} draft{draftInvoices.length !== 1 ? "s" : ""}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Showing drafts saved within the last 6 days. Load a draft to continue editing, or delete ones you no longer need.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {draftInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ClipboardList className="w-14 h-14 mb-3 opacity-25" />
                <p className="font-medium">No recent draft sales</p>
                <p className="text-sm mt-1">Drafts are kept for 6 days. Save a sale as draft and it will appear here.</p>
              </div>
            ) : (
              draftInvoices.map(draft => {
                const itemCount = draft.lineItems?.length ?? 0;
                const total = draft.total ?? 0;
                const createdAt = draft.createdAt ? new Date(draft.createdAt) : new Date();
                return (
                  <div
                    key={draft.id}
                    className="flex items-center gap-4 border border-gray-200 rounded-xl px-4 py-3 hover:border-amber-300 hover:bg-amber-50/40 transition-colors group"
                  >
                    {/* Icon */}
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">{draft.invoiceNumber}</p>
                        <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium uppercase tracking-wide">Draft</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {draft.customer?.name ?? "No customer"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {itemCount} item{itemCount !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(createdAt, "dd MMM yyyy, HH:mm")}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-gray-800">£{total.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">Total</p>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      <Button
                        size="sm"
                        className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white h-8 px-3"
                        onClick={() => loadDraft(draft)}
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => deleteDraft(draft.id)}
                        title="Delete draft"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button variant="outline" onClick={() => setDraftDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ PRODUCT LIST DIALOG ════ */}
      <Dialog open={productListOpen} onOpenChange={(o) => { setProductListOpen(o); if (!o) { setProductListQuery(""); setProductListCategory("all"); } }}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogTitle className="sr-only">Product List</DialogTitle>
          <DialogDescription className="sr-only">Browse all products, filter by category, and view full product details.</DialogDescription>

          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b bg-white">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-semibold text-gray-900">Product List</span>
              <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{products.length} products</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  autoFocus
                  placeholder="Search by name, SKU or category…"
                  value={productListQuery}
                  onChange={(e) => setProductListQuery(e.target.value)}
                  className="pl-9 h-9"
                />
                {productListQuery && (
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setProductListQuery("")}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Select value={productListCategory} onValueChange={setProductListCategory}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {[...new Set(products.map(p => p.category))].sort().map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {(() => {
              const q = productListQuery.toLowerCase();
              const filtered = products.filter(p => {
                const matchQ = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
                const matchCat = productListCategory === "all" || p.category === productListCategory;
                return matchQ && matchCat;
              });
              if (filtered.length === 0) return (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Package className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-medium">No products found</p>
                  <p className="text-sm">Try a different name, SKU or category.</p>
                </div>
              );
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filtered.map(prod => {
                    const stockStatus = prod.stock === 0 ? "out" : prod.stock <= 10 ? "low" : "ok";
                    const stockColour = { out: "text-red-500 bg-red-50 border-red-200", low: "text-amber-600 bg-amber-50 border-amber-200", ok: "text-emerald-600 bg-emerald-50 border-emerald-200" }[stockStatus];
                    return (
                      <button
                        key={prod.id}
                        className="text-left bg-white border border-gray-200 rounded-xl p-3 hover:border-blue-400 hover:shadow-md transition-all group flex flex-col gap-2"
                        onClick={() => { setViewProduct(prod); setProductListOpen(false); }}
                      >
                        {/* Image */}
                        <div className="w-full h-28 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
                          {prod.image ? (
                            <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                          ) : (
                            <Package className="w-10 h-10 text-gray-200" />
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate leading-tight">{prod.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">SKU: {prod.sku}</p>
                        </div>
                        {/* Footer row */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-blue-600 text-sm">£{prod.retailPrice.toFixed(2)}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${stockColour}`}>
                            {prod.stock === 0 ? "Out of stock" : `${prod.stock} left`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div className="px-6 py-3 border-t bg-gray-50 flex justify-between items-center">
            <p className="text-xs text-gray-400">Click a product to view full details</p>
            <Button variant="outline" size="sm" onClick={() => { setProductListOpen(false); setProductListQuery(""); setProductListCategory("all"); }}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════ PRODUCT DETAIL POPUP ════ */}
      <Dialog open={!!viewProduct} onOpenChange={(o) => { if (!o) setViewProduct(null); }}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogTitle className="sr-only">{viewProduct ? `Product – ${viewProduct.name}` : "Product Details"}</DialogTitle>
          <DialogDescription className="sr-only">Full product information including pricing tiers, stock and variants.</DialogDescription>

          {viewProduct && (() => {
            const stockStatus = viewProduct.stock === 0 ? "out" : viewProduct.stock <= 10 ? "low" : "ok";
            const stockLabel = { out: "Out of Stock", low: "Low Stock", ok: "In Stock" }[stockStatus];
            const stockBg    = { out: "bg-red-500", low: "bg-amber-500", ok: "bg-emerald-500" }[stockStatus];
            const activeVariants = viewProduct.variants?.filter(v => v.isActive) ?? [];

            return (
              <>
                {/* Top image + name bar */}
                <div className="relative flex gap-5 px-6 pt-6 pb-5 border-b">
                  {/* Image */}
                  <div className="shrink-0 w-28 h-28 rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center shadow-sm">
                    {viewProduct.image ? (
                      <img src={viewProduct.image} alt={viewProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-12 h-12 text-gray-200" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-bold text-gray-900 text-lg leading-tight">{viewProduct.name}</h2>
                        <p className="text-xs text-gray-400 mt-0.5">SKU: <span className="font-mono font-semibold text-gray-600">{viewProduct.sku}</span></p>
                        <p className="text-xs text-gray-400">ID: <span className="font-mono text-gray-500">{viewProduct.id}</span></p>
                      </div>
                      <button className="shrink-0 text-gray-300 hover:text-gray-600 transition-colors" onClick={() => setViewProduct(null)}>
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{viewProduct.category}</span>
                      <span className={`text-xs text-white px-2 py-0.5 rounded-full font-medium ${stockBg}`}>{stockLabel}</span>
                      {viewProduct.hasVariants && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{activeVariants.length} variants</span>
                      )}
                    </div>
                    {/* Stock bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Stock level</span>
                        <span className="font-semibold">{viewProduct.stock} units</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${stockBg}`}
                          style={{ width: `${Math.min(100, (viewProduct.stock / 200) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                  {/* Pricing tiers */}
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Pricing Tiers</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Retail",     sub: "Full price",    price: viewProduct.retailPrice,    colour: "from-blue-500 to-blue-700",     disc: null },
                        { label: "Trader",     sub: "15% discount",  price: viewProduct.traderPrice,    colour: "from-sky-500 to-sky-700",       disc: "-15%" },
                        { label: "Wholesale",  sub: "30% discount",  price: viewProduct.wholesalePrice, colour: "from-purple-500 to-purple-700", disc: "-30%" },
                      ].map(tier => (
                        <div key={tier.label} className={`bg-gradient-to-br ${tier.colour} rounded-xl p-3.5 text-white`}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-white/80">{tier.label}</p>
                            {tier.disc && <span className="text-[10px] bg-white/20 rounded-full px-1.5 py-0.5 font-bold">{tier.disc}</span>}
                          </div>
                          <p className="text-xl font-bold">£{tier.price.toFixed(2)}</p>
                          <p className="text-[10px] text-white/60 mt-0.5">{tier.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Variants table */}
                  {viewProduct.hasVariants && activeVariants.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
                        Variants <span className="normal-case font-normal text-gray-300">({activeVariants.length} active)</span>
                      </p>
                      <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                            <tr>
                              <th className="text-left px-3 py-2.5 font-semibold">Variant</th>
                              <th className="text-left px-3 py-2.5 font-semibold">SKU</th>
                              <th className="text-right px-3 py-2.5 font-semibold">Stock</th>
                              <th className="text-right px-3 py-2.5 font-semibold">Retail</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeVariants.map((v, i) => (
                              <tr key={v.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                                <td className="px-3 py-2 font-medium text-gray-800">{v.name}</td>
                                <td className="px-3 py-2 font-mono text-xs text-gray-500">{v.sku}</td>
                                <td className="px-3 py-2 text-right">
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${v.stock === 0 ? "bg-red-100 text-red-600" : v.stock <= 5 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                                    {v.stock}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-800">
                                  £{(v.retailPrice ?? viewProduct.retailPrice).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Quick stats */}
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Summary</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { label: "Category",      value: viewProduct.category },
                        { label: "Product ID",    value: viewProduct.id },
                        { label: "SKU",           value: viewProduct.sku },
                        { label: "Has Variants",  value: viewProduct.hasVariants ? `Yes (${activeVariants.length})` : "No" },
                        { label: "Units in Stock",value: `${viewProduct.stock} units` },
                        { label: "Base Price",    value: `£${viewProduct.price?.toFixed(2) ?? viewProduct.retailPrice.toFixed(2)}` },
                      ].map(row => (
                        <div key={row.label} className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">{row.label}</p>
                            <p className="text-sm font-semibold text-gray-800 truncate">{row.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between shrink-0">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setViewProduct(null); setProductListOpen(true); }}>
                    ← Back to List
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setViewProduct(null); navigate("/inventory"); }}>
                      Open in Inventory
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                      disabled={viewProduct.stock === 0}
                      onClick={() => {
                        addProductToSale(viewProduct);
                        setViewProduct(null);
                        toast.success(`${viewProduct.name} added to sale`);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Add to Sale
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Price Edit Dialog */}
      <Dialog open={priceEditDialog.open} onOpenChange={closePriceDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Edit Price - {priceEditDialog.item?.description}
            </DialogTitle>
            <DialogDescription>
              View and update the price for this product. Below are the reference prices based on customer type.
            </DialogDescription>
          </DialogHeader>
          
          {priceEditDialog.item && (
            <div className="space-y-4">
              {/* Product Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Product Code:</span>
                  <span className="font-medium">{priceEditDialog.item.product.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">SKU:</span>
                  <span className="font-medium">{priceEditDialog.item.product.sku}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Stock Available:</span>
                  <Badge variant={priceEditDialog.item.product.stock > 10 ? "default" : "destructive"}>
                    {priceEditDialog.item.product.stock} units
                  </Badge>
                </div>
              </div>

              {/* Price Tiers */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Reference Prices:</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-600 font-medium mb-1">Retail</p>
                    <p className="text-lg font-bold text-blue-700">£{priceEditDialog.item.product.retailPrice.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600 font-medium mb-1">Trader (-15%)</p>
                    <p className="text-lg font-bold text-green-700">£{priceEditDialog.item.product.traderPrice.toFixed(2)}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-purple-600 font-medium mb-1">Wholesale (-30%)</p>
                    <p className="text-lg font-bold text-purple-700">£{priceEditDialog.item.product.wholesalePrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Current Price Display */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-yellow-700 font-medium">Current Sale Price:</span>
                  <span className="text-lg font-bold text-yellow-800">£{priceEditDialog.item.unitPrice.toFixed(2)}</span>
                </div>
              </div>

              {/* New Price Input */}
              <div className="space-y-2">
                <Label htmlFor="newPrice" className="text-sm font-semibold">New Price (£)</Label>
                <Input
                  id="newPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceEditDialog.newPrice}
                  onChange={(e) => setPriceEditDialog(prev => ({ ...prev, newPrice: e.target.value }))}
                  className="text-lg font-semibold"
                  placeholder="Enter new price"
                />
              </div>

              {/* Quick Price Buttons */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Quick Select:</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="hover:bg-blue-50 hover:border-blue-600"
                    onClick={() => setPriceEditDialog(prev => ({ 
                      ...prev, 
                      newPrice: priceEditDialog.item!.product.retailPrice.toString() 
                    }))}
                  >
                    Retail
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="hover:bg-green-50 hover:border-green-600"
                    onClick={() => setPriceEditDialog(prev => ({ 
                      ...prev, 
                      newPrice: priceEditDialog.item!.product.traderPrice.toString() 
                    }))}
                  >
                    Trader
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="hover:bg-purple-50 hover:border-purple-600"
                    onClick={() => setPriceEditDialog(prev => ({ 
                      ...prev, 
                      newPrice: priceEditDialog.item!.product.wholesalePrice.toString() 
                    }))}
                  >
                    Wholesale
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closePriceDialog}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleUpdatePrice}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Update Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Product Dialog */}
      <Dialog open={customProductDialog} onOpenChange={setCustomProductDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-indigo-600" />
              Add Custom Product
            </DialogTitle>
            <DialogDescription>
              Add a product that is not in your stock catalogue directly to this sale.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="cp-description">
                Product Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cp-description"
                placeholder="e.g. Custom Brake Pad Set – Toyota Corolla"
                value={customProduct.description}
                onChange={(e) =>
                  setCustomProduct(prev => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            {/* Price + Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cp-price">
                  Unit Price (£) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cp-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={customProduct.unitPrice}
                  onChange={(e) =>
                    setCustomProduct(prev => ({ ...prev, unitPrice: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cp-qty">Quantity</Label>
                <Input
                  id="cp-qty"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={customProduct.quantity}
                  onChange={(e) =>
                    setCustomProduct(prev => ({ ...prev, quantity: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Tax + Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cp-tax">VAT / Tax Rate (%)</Label>
                <Select
                  value={customProduct.taxRate}
                  onValueChange={(v) => setCustomProduct(prev => ({ ...prev, taxRate: v }))}
                >
                  <SelectTrigger id="cp-tax">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Zero-rated)</SelectItem>
                    <SelectItem value="5">5% (Reduced rate)</SelectItem>
                    <SelectItem value="20">20% (Standard rate)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cp-discount">Discount (%)</Label>
                <Input
                  id="cp-discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                  value={customProduct.discount}
                  onChange={(e) =>
                    setCustomProduct(prev => ({ ...prev, discount: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Live preview */}
            {customProduct.unitPrice && parseFloat(customProduct.unitPrice) > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Line Total Preview</p>
                {(() => {
                  const price = parseFloat(customProduct.unitPrice) || 0;
                  const qty = parseInt(customProduct.quantity) || 1;
                  const tax = parseFloat(customProduct.taxRate) || 0;
                  const disc = parseFloat(customProduct.discount) || 0;
                  const subtotal = qty * price;
                  const afterDiscount = subtotal * (1 - disc / 100);
                  const total = afterDiscount * (1 + tax / 100);
                  return (
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Subtotal</p>
                        <p className="font-semibold">£{subtotal.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">After Disc.</p>
                        <p className="font-semibold text-green-700">£{afterDiscount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Total (inc. VAT)</p>
                        <p className="font-bold text-indigo-700">£{total.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCustomProductDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleAddCustomProduct}
            >
              <PackagePlus className="w-4 h-4 mr-2" />
              Add to Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ SEARCH CUSTOMER DIALOG ════ */}
      <Dialog open={customerSearchOpen} onOpenChange={(o) => { setCustomerSearchOpen(o); if (!o) setCustomerQuery(""); }}>
        <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-hidden flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <UserSearch className="w-4 h-4 text-slate-600" />
              </div>
              <DialogTitle className="text-base">Search Customer</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-gray-400 mb-3">
              Click any customer to view their full profile, invoices and credit history.
            </DialogDescription>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                autoFocus
                placeholder="Search by name, phone or email…"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                className="pl-9 h-10"
              />
              {customerQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setCustomerQuery("")}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {(() => {
              const q = customerQuery.toLowerCase();
              const results = customers.filter(c =>
                !q ||
                c.name.toLowerCase().includes(q) ||
                (c.phone ?? "").toLowerCase().includes(q) ||
                (c.email ?? "").toLowerCase().includes(q)
              );
              if (results.length === 0) return (
                <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                  <UserSearch className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-medium">No customers found</p>
                  <p className="text-sm">Try a different name, phone or email.</p>
                </div>
              );
              const typeColour: Record<string, string> = {
                wholesaler: "bg-purple-100 text-purple-700 border-purple-200",
                trader:     "bg-blue-100 text-blue-700 border-blue-200",
                retailer:   "bg-green-100 text-green-700 border-green-200",
              };
              return results.map(cust => {
                const custInvoices = invoices.filter(inv => inv.customer?.id === cust.id);
                const totalSpent   = custInvoices.reduce((s, inv) => s + (inv.amountPaid ?? 0), 0);
                return (
                  <button
                    key={cust.id}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 border-b last:border-b-0 transition-colors text-left group"
                    onClick={() => { setViewCustomer(cust); setCustomerSearchOpen(false); }}
                  >
                    {/* Avatar */}
                    <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold select-none">
                      {cust.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 truncate">{cust.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium capitalize ${typeColour[cust.type] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                          {cust.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                        {cust.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{cust.phone}</span>}
                        {cust.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{cust.email}</span>}
                      </div>
                    </div>
                    {/* Stats */}
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-gray-700 text-sm">£{totalSpent.toFixed(0)}</p>
                      <p className="text-[11px] text-gray-400">{custInvoices.length} inv.</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-slate-500 shrink-0 transition-colors" />
                  </button>
                );
              });
            })()}
          </div>

          <div className="px-6 py-3 border-t flex justify-between items-center bg-gray-50">
            <p className="text-xs text-gray-400">{customers.length} customers total</p>
            <Button variant="outline" size="sm" onClick={() => { setCustomerSearchOpen(false); setCustomerQuery(""); }}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════ CUSTOMER DETAIL POPUP ════ */}
      <Dialog open={!!viewCustomer} onOpenChange={(o) => { if (!o) setViewCustomer(null); }}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogTitle className="sr-only">
            {viewCustomer ? `Customer Profile – ${viewCustomer.name}` : "Customer Profile"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Full profile, invoice history and credit details for this customer.
          </DialogDescription>
          {viewCustomer && (() => {
            const custInvoices = invoices.filter(inv => inv.customer?.id === viewCustomer.id);
            const totalSpent   = custInvoices.reduce((s, inv) => s + (inv.amountPaid ?? 0), 0);
            const totalDue     = custInvoices.reduce((s, inv) => s + (inv.amountDue ?? 0), 0);
            const paidCount    = custInvoices.filter(inv => inv.status === "paid").length;
            const typeGradient: Record<string, string> = {
              wholesaler: "from-purple-600 to-purple-800",
              trader:     "from-blue-600 to-blue-800",
              retailer:   "from-emerald-600 to-emerald-800",
            };
            const statusColour: Record<string, string> = {
              paid:           "bg-green-100 text-green-700",
              partially_paid: "bg-yellow-100 text-yellow-700",
              pending:        "bg-orange-100 text-orange-700",
              overdue:        "bg-red-100 text-red-700",
              draft:          "bg-gray-100 text-gray-600",
              cancelled:      "bg-gray-100 text-gray-400",
              sent:           "bg-blue-100 text-blue-700",
            };
            return (
              <>
                {/* ── Gradient hero ── */}
                <div className={`bg-gradient-to-r ${typeGradient[viewCustomer.type] ?? "from-gray-600 to-gray-800"} px-6 pt-6 pb-5 text-white shrink-0`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-bold shadow-lg select-none">
                        {viewCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold leading-none">{viewCustomer.name}</h2>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize bg-white/20">
                            {viewCustomer.type}
                          </span>
                          <span className="text-xs text-white/70">
                            {viewCustomer.type === "wholesaler" ? "30% discount" : viewCustomer.type === "trader" ? "15% discount" : "Full price"}
                          </span>
                          <span className="text-xs text-white/60">
                            Since {viewCustomer.createdAt ? format(new Date(viewCustomer.createdAt), "MMM yyyy") : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="text-white/50 hover:text-white transition-colors" onClick={() => setViewCustomer(null)}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* KPI strip */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Total Spent",   value: `£${totalSpent.toFixed(0)}`,                      icon: <TrendingUp className="w-3.5 h-3.5" />, sub: `${custInvoices.length} invoices` },
                      { label: "Outstanding",   value: `£${totalDue.toFixed(0)}`,                        icon: <TrendingDown className="w-3.5 h-3.5" />, sub: `${custInvoices.length - paidCount} unpaid` },
                      { label: "Paid Invoices", value: paidCount,                                        icon: <Receipt className="w-3.5 h-3.5" />, sub: `of ${custInvoices.length} total` },
                      { label: "Credit Bal.",   value: `£${(viewCustomer.creditBalance ?? 0).toFixed(0)}`, icon: <CreditCard className="w-3.5 h-3.5" />, sub: viewCustomer.creditLimit ? `Limit £${viewCustomer.creditLimit}` : "No limit set" },
                    ].map(k => (
                      <div key={k.label} className="bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-1 text-white/60 mb-1">
                          {k.icon}
                          <span className="text-[10px] uppercase tracking-wide">{k.label}</span>
                        </div>
                        <p className="font-bold text-white">{k.value}</p>
                        <p className="text-[10px] text-white/50 mt-0.5">{k.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                  {/* Contact info */}
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Contact Information</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { icon: <Phone className="w-3.5 h-3.5 text-slate-400" />, label: "Phone",        value: viewCustomer.phone   || "—" },
                        { icon: <Mail  className="w-3.5 h-3.5 text-slate-400" />, label: "Email",        value: viewCustomer.email   || "—" },
                        { icon: <MapPin className="w-3.5 h-3.5 text-slate-400" />, label: "Address",    value: viewCustomer.address || "—" },
                        { icon: <BadgeCheck className="w-3.5 h-3.5 text-slate-400" />, label: "Customer ID", value: viewCustomer.id },
                      ].map(row => (
                        <div key={row.label} className="flex items-start gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                          <div className="mt-0.5 shrink-0">{row.icon}</div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">{row.label}</p>
                            <p className="text-sm font-medium text-gray-800 break-all">{row.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Credit usage bar */}
                  {(viewCustomer.creditLimit ?? 0) > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Credit Usage</p>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-500">Used: <strong className="text-gray-800">£{(viewCustomer.creditBalance ?? 0).toFixed(2)}</strong></span>
                          <span className="text-gray-500">Limit: <strong className="text-gray-800">£{viewCustomer.creditLimit!.toFixed(2)}</strong></span>
                        </div>
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                            style={{ width: `${Math.min(100, ((viewCustomer.creditBalance ?? 0) / viewCustomer.creditLimit!) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">
                          £{Math.max(0, viewCustomer.creditLimit! - (viewCustomer.creditBalance ?? 0)).toFixed(2)} remaining
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Invoice history */}
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
                      Invoice History &nbsp;<span className="normal-case font-normal text-gray-300">({custInvoices.length} total · {paidCount} paid)</span>
                    </p>
                    {custInvoices.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No invoices yet</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {custInvoices.slice(0, 7).map(inv => (
                          <div key={inv.id} className="flex items-center gap-3 px-3.5 py-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
                            <FileText className="w-4 h-4 text-gray-300 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-800">{inv.invoiceNumber}</p>
                              <p className="text-xs text-gray-400">{inv.issueDate ? format(new Date(inv.issueDate), "dd MMM yyyy") : "—"}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${statusColour[inv.status] ?? "bg-gray-100 text-gray-500"}`}>
                              {inv.status.replace("_", " ")}
                            </span>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-sm text-gray-800">£{(inv.total ?? 0).toFixed(2)}</p>
                              {(inv.amountDue ?? 0) > 0 && <p className="text-[10px] text-red-500">Due £{inv.amountDue!.toFixed(2)}</p>}
                            </div>
                          </div>
                        ))}
                        {custInvoices.length > 7 && (
                          <p className="text-center text-xs text-gray-400 py-2">+{custInvoices.length - 7} more invoices</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Recent credit transactions */}
                  {(viewCustomer.creditTransactions?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Recent Credit Activity</p>
                      <div className="space-y-1.5">
                        {[...viewCustomer.creditTransactions].reverse().slice(0, 5).map(tx => (
                          <div key={tx.id} className="flex items-center gap-3 px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${tx.type === "add" || tx.type === "refund" ? "bg-green-100" : "bg-red-50"}`}>
                              {tx.type === "add" || tx.type === "refund"
                                ? <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                                : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
                              <p className="text-xs text-gray-400">{format(new Date(tx.createdAt), "dd MMM yyyy")}</p>
                            </div>
                            <p className={`font-bold text-sm shrink-0 ${tx.type === "add" || tx.type === "refund" ? "text-green-600" : "text-red-500"}`}>
                              {tx.type === "add" || tx.type === "refund" ? "+" : "−"}£{Math.abs(tx.amount).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 border-t flex items-center justify-between bg-gray-50 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => { setViewCustomer(null); setCustomerSearchOpen(true); }}
                  >
                    ← Back to Search
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setViewCustomer(null); navigate("/customers"); }}
                    >
                      Open Full Profile
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                      onClick={() => {
                        setSelectedCustomer(viewCustomer);
                        setViewCustomer(null);
                        toast.success(`${viewCustomer.name} selected for this sale`);
                      }}
                    >
                      <BadgeCheck className="w-4 h-4" />
                      Select for Sale
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}