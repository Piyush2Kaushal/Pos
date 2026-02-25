import { useState, useMemo, useRef, useEffect } from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  Search,
  FileText,
  Download,
  Eye,
  Plus,
  Edit,
  Send,
  Copy,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Filter,
  Calendar,
  Mail,
  ScanBarcode,
  GitMerge,
  ChevronDown,
  ChevronUp,
  Trash2,
  Info,
  X,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/app/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { format, addDays, isAfter, isBefore } from "date-fns";
import { Invoice, InvoiceStatus, InvoiceLineItem, Payment, PaymentTerms } from "@/app/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { EmailInvoiceDialog } from "@/app/components/email-invoice-dialog";
import { toast } from "sonner";

export function XeroInvoicesView() {
  const { invoices, customers, products, createInvoice, updateInvoice, recordPayment, deleteInvoice, getDefaultTemplate } = usePOS();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState<Partial<Invoice>>({
    customer: undefined,
    lineItems: [],
    paymentTerms: "net_30",
    notes: "",
    termsAndConditions: "Payment is due within specified period. Late payments may incur additional charges.",
    issueDate: new Date(),
  });

  // Payment form state
  const [paymentForm, setPaymentForm] = useState<Partial<Payment>>({
    amount: 0,
    date: new Date(),
    method: "cash",
    reference: "",
    notes: "",
  });

  // ── Merge state ────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeExpandPreview, setMergeExpandPreview] = useState(true);
  const [mergeInvoiceSearch, setMergeInvoiceSearch] = useState("");
  const [mergeDialogSelectedIds, setMergeDialogSelectedIds] = useState<Set<string>>(new Set());
  const [mergeOptions, setMergeOptions] = useState({
    paymentTerms: "net_30" as PaymentTerms,
    notes: "",
    reference: "",
    targetCustomerId: "",
    sourceAction: "cancel" as "cancel" | "delete",
  });

  // Barcode scanner state
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode input when dialog opens
  useEffect(() => {
    if (showInvoiceDialog && barcodeInputRef.current) {
      // Small delay to ensure dialog is fully rendered
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [showInvoiceDialog]);

  // Handle barcode scan/input
  const handleBarcodeSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      if ('key' in e && e.key !== 'Enter') return;
    }

    if (!barcodeInput.trim()) return;

    // Find product by barcode or SKU
    const product = products.find(
      (p) => p.barcode === barcodeInput.trim() || p.sku === barcodeInput.trim()
    );

    if (product) {
      // Check if product already exists in line items
      const existingItemIndex = (invoiceForm.lineItems || []).findIndex(
        (item) => item.description === product.name
      );

      if (existingItemIndex >= 0) {
        // Increase quantity if exists
        updateLineItem(existingItemIndex, "quantity", (invoiceForm.lineItems?.[existingItemIndex].quantity || 0) + 1);
        toast.success("Product Updated", {
          description: `Quantity increased for ${product.name}`,
        });
      } else {
        // Add new line item
        const newItem: InvoiceLineItem = {
          id: `item-${Date.now()}`,
          description: product.name,
          quantity: 1,
          unitPrice: product.price,
          taxRate: 8,
          discount: 0,
          amount: 0,
        };
        newItem.amount = calculateLineItemAmount(newItem);
        
        setInvoiceForm(prev => ({
          ...prev,
          lineItems: [...(prev.lineItems || []), newItem],
        }));
        
        toast.success("Product Added", {
          description: `${product.name} added to invoice`,
        });
      }
      
      // Clear barcode input
      setBarcodeInput("");
    } else {
      // Product not found
      toast.error("Product Not Found", {
        description: `No product found with barcode/SKU: ${barcodeInput}`,
      });
      setBarcodeInput("");
    }
  };

  // Get overdue invoices
  const checkIfOverdue = (invoice: Invoice): boolean => {
    if (invoice.status === "paid" || invoice.status === "cancelled") return false;
    return isAfter(new Date(), new Date(invoice.dueDate)) && invoice.amountDue > 0;
  };

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter((invoice) => {
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.reference?.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (statusFilter !== "all") {
        if (statusFilter === "overdue") {
          matchesStatus = checkIfOverdue(invoice);
        } else {
          matchesStatus = invoice.status === statusFilter;
        }
      }

      let matchesDate = true;
      if (dateFilter !== "all") {
        const invoiceDate = new Date(invoice.issueDate);
        const now = new Date();
        
        switch (dateFilter) {
          case "today":
            matchesDate = format(invoiceDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
            break;
          case "week":
            matchesDate = isAfter(invoiceDate, addDays(now, -7));
            break;
          case "month":
            matchesDate = isAfter(invoiceDate, addDays(now, -30));
            break;
          case "quarter":
            matchesDate = isAfter(invoiceDate, addDays(now, -90));
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });

    // Update status for overdue invoices
    filtered = filtered.map(invoice => {
      if (checkIfOverdue(invoice) && invoice.status !== "overdue") {
        return { ...invoice, status: "overdue" as InvoiceStatus };
      }
      return invoice;
    });

    return filtered;
  }, [invoices, searchTerm, statusFilter, dateFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalRevenue = invoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.total, 0);

    const outstanding = invoices
      .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled")
      .reduce((sum, inv) => sum + inv.amountDue, 0);

    const overdue = invoices
      .filter((inv) => checkIfOverdue(inv))
      .reduce((sum, inv) => sum + inv.amountDue, 0);

    const draft = invoices.filter((inv) => inv.status === "draft").length;

    return { totalRevenue, outstanding, overdue, draft };
  }, [invoices]);

  // Status badge
  const getStatusBadge = (invoice: Invoice) => {
    const isOverdue = checkIfOverdue(invoice);
    const status = isOverdue ? "overdue" : invoice.status;

    const variants: Record<InvoiceStatus | "overdue", { variant: "default" | "secondary" | "destructive" | "outline", icon: any, color: string }> = {
      draft: { variant: "outline", icon: Edit, color: "text-gray-600" },
      sent: { variant: "secondary", icon: Send, color: "text-blue-600" },
      paid: { variant: "default", icon: CheckCircle, color: "text-green-600" },
      partially_paid: { variant: "secondary", icon: Clock, color: "text-yellow-600" },
      overdue: { variant: "destructive", icon: AlertCircle, color: "text-red-600" },
      cancelled: { variant: "destructive", icon: XCircle, color: "text-gray-600" },
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  // Calculate due date
  const calculateDueDate = (issueDate: Date, terms: PaymentTerms): Date => {
    const date = new Date(issueDate);
    switch (terms) {
      case "due_on_receipt":
        return date;
      case "net_7":
        return addDays(date, 7);
      case "net_15":
        return addDays(date, 15);
      case "net_30":
        return addDays(date, 30);
      case "net_60":
        return addDays(date, 60);
      default:
        return addDays(date, 30);
    }
  };

  // Add line item
  const addLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: `item-${Date.now()}`,
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 8,
      discount: 0,
      amount: 0,
    };
    setInvoiceForm(prev => ({
      ...prev,
      lineItems: [...(prev.lineItems || []), newItem],
    }));
  };

  // Calculate line item amount
  const calculateLineItemAmount = (item: InvoiceLineItem): number => {
    const subtotal = item.quantity * item.unitPrice;
    const afterDiscount = subtotal * (1 - item.discount / 100);
    const withTax = afterDiscount * (1 + item.taxRate / 100);
    return withTax;
  };

  // Update line item
  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    setInvoiceForm(prev => {
      const lineItems = [...(prev.lineItems || [])];
      lineItems[index] = { ...lineItems[index], [field]: value };
      lineItems[index].amount = calculateLineItemAmount(lineItems[index]);
      return { ...prev, lineItems };
    });
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    setInvoiceForm(prev => ({
      ...prev,
      lineItems: (prev.lineItems || []).filter((_, i) => i !== index),
    }));
  };

  // Calculate invoice totals
  const calculateInvoiceTotals = (lineItems: InvoiceLineItem[]) => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalDiscount = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.discount / 100), 0);
    const taxAmount = lineItems.reduce((sum, item) => {
      const afterDiscount = (item.quantity * item.unitPrice) * (1 - item.discount / 100);
      return sum + (afterDiscount * item.taxRate / 100);
    }, 0);
    const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

    return { subtotal, totalDiscount, taxAmount, total };
  };

  // Open create invoice dialog
  const openCreateInvoice = () => {
    setIsCreatingNew(true);
    setInvoiceForm({
      customer: undefined,
      lineItems: [],
      paymentTerms: "net_30",
      notes: "",
      termsAndConditions: "Payment is due within specified period. Late payments may incur additional charges.",
      issueDate: new Date(),
      createdAt: new Date(),
    });
    setBarcodeInput(""); // Clear barcode input
    setShowInvoiceDialog(true);
  };

  // Open edit invoice dialog
  const openEditInvoice = (invoice: Invoice) => {
    setIsCreatingNew(false);
    setInvoiceForm(invoice);
    setBarcodeInput(""); // Clear barcode input
    setShowInvoiceDialog(true);
  };

  // Save invoice
  const saveInvoice = () => {
    if (!invoiceForm.customer || !invoiceForm.lineItems?.length) {
      alert("Please select a customer and add at least one line item");
      return;
    }

    const totals = calculateInvoiceTotals(invoiceForm.lineItems);
    const issueDate = invoiceForm.issueDate || new Date();
    const dueDate = calculateDueDate(issueDate, invoiceForm.paymentTerms || "net_30");

    if (isCreatingNew) {
      const newInvoice: Omit<Invoice, "id"> = {
        invoiceNumber: `INV-${String(invoices.length + 1).padStart(4, "0")}`,
        customer: invoiceForm.customer,
        lineItems: invoiceForm.lineItems,
        ...totals,
        amountPaid: 0,
        amountDue: totals.total,
        status: "draft",
        issueDate,
        dueDate,
        paymentTerms: invoiceForm.paymentTerms || "net_30",
        paymentHistory: [],
        notes: invoiceForm.notes,
        termsAndConditions: invoiceForm.termsAndConditions,
        reference: invoiceForm.reference,
        createdAt: invoiceForm.createdAt || new Date(),
        updatedAt: new Date(),
      };
      createInvoice(newInvoice);
    } else {
      updateInvoice(invoiceForm.id!, {
        ...invoiceForm,
        ...totals,
        amountDue: totals.total - (invoiceForm.amountPaid || 0),
        updatedAt: new Date(),
      });
    }

    setShowInvoiceDialog(false);
  };

  // Record payment
  const handleRecordPayment = () => {
    if (!selectedInvoice || !paymentForm.amount) return;

    const payment: Payment = {
      id: `pay-${Date.now()}`,
      amount: paymentForm.amount,
      date: paymentForm.date || new Date(),
      method: paymentForm.method || "cash",
      reference: paymentForm.reference,
      notes: paymentForm.notes,
    };

    recordPayment(selectedInvoice.id, payment);
    setShowPaymentDialog(false);
    setPaymentForm({
      amount: 0,
      date: new Date(),
      method: "cash",
      reference: "",
      notes: "",
    });
  };

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map(i => i.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ── Open merge dialog (seed dialog selection from table checkboxes) ────────
  const openMergeDialog = () => {
    const seed = selectedIds.size >= 2 ? new Set(selectedIds) : new Set<string>();
    setMergeDialogSelectedIds(seed);
    setMergeInvoiceSearch("");
    setMergeExpandPreview(true);
    // Pre-fill targetCustomer if all same
    const seedInvoices = invoices.filter(i => seed.has(i.id));
    const uniqueCustomers = new Set(seedInvoices.map(i => i.customer.id));
    setMergeOptions({
      paymentTerms: "net_30",
      notes: "",
      reference: "",
      targetCustomerId: uniqueCustomers.size === 1 ? [...uniqueCustomers][0] : "",
      sourceAction: "cancel",
    });
    setShowMergeDialog(true);
  };

  // ── Merge derived data ─────────────────────────────────────────────────────
  const selectedInvoicesForMerge = invoices.filter(i => mergeDialogSelectedIds.has(i.id));

  const mergeCustomerCount = new Set(selectedInvoicesForMerge.map(i => i.customer.id)).size;
  // Valid when ≥2 invoices selected AND a target customer chosen
  const isMergeValid = mergeDialogSelectedIds.size >= 2 && mergeOptions.targetCustomerId !== "";

  const buildMergeLineItems = (): InvoiceLineItem[] => {
    const all: InvoiceLineItem[] = [];
    selectedInvoicesForMerge.forEach(inv => {
      inv.lineItems.forEach(li => {
        const existing = all.find(
          x =>
            x.description === li.description &&
            x.unitPrice === li.unitPrice &&
            x.discount === li.discount &&
            x.taxRate === li.taxRate
        );
        if (existing) {
          existing.quantity += li.quantity;
          existing.amount = calculateLineItemAmount(existing);
        } else {
          all.push({ ...li, id: `merge-${Date.now()}-${Math.random()}` });
        }
      });
    });
    return all;
  };

  const mergePreviewLineItems = mergeDialogSelectedIds.size >= 2 ? buildMergeLineItems() : [];
  const mergeTotals = calculateInvoiceTotals(mergePreviewLineItems);

  // ── Execute merge ──────────────────────────────────────────────────────────
  const executeMerge = () => {
    if (!isMergeValid) return;
    const targetCustomer = customers.find(c => c.id === mergeOptions.targetCustomerId) ?? selectedInvoicesForMerge[0].customer;
    const issueDate = new Date();
    const dueDate = calculateDueDate(issueDate, mergeOptions.paymentTerms);
    const sourceNumbers = selectedInvoicesForMerge.map(i => i.invoiceNumber).join(", ");
    const items = buildMergeLineItems();
    const totals = calculateInvoiceTotals(items);
    const customer = targetCustomer;

    const newInvoice: Omit<Invoice, "id"> = {
      invoiceNumber: `INV-MERGED-${String(invoices.length + 1).padStart(4, "0")}`,
      customer,
      lineItems: items,
      ...totals,
      amountPaid: 0,
      amountDue: totals.total,
      status: "draft",
      issueDate,
      dueDate,
      paymentTerms: mergeOptions.paymentTerms,
      paymentHistory: [],
      notes: mergeOptions.notes
        ? `${mergeOptions.notes}\n\nMerged from: ${sourceNumbers}`
        : `Merged from: ${sourceNumbers}`,
      termsAndConditions: selectedInvoicesForMerge[0].termsAndConditions,
      reference: mergeOptions.reference || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    createInvoice(newInvoice);

    selectedInvoicesForMerge.forEach(inv => {
      if (mergeOptions.sourceAction === "delete") {
        deleteInvoice(inv.id);
      } else {
        updateInvoice(inv.id, { status: "cancelled" });
      }
    });

    toast.success(`Merged ${mergeDialogSelectedIds.size} invoices into ${newInvoice.invoiceNumber}`, {
      description: `Total: £${totals.total.toFixed(2)} · Billed to ${customer.name} · Source invoices ${mergeOptions.sourceAction === "delete" ? "deleted" : "cancelled"}`,
    });

    setShowMergeDialog(false);
    setMergeDialogSelectedIds(new Set());
    clearSelection();
  };

  // Export to PDF
  const exportToPDF = (invoice: Invoice) => {
    const doc = new jsPDF();

    // Add header
    doc.setFontSize(20);
    doc.text("INVOICE", 105, 20, { align: "center" });

    // Invoice details
    doc.setFontSize(10);
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, 40);
    doc.text(`Issue Date: ${format(new Date(invoice.issueDate), "MMM dd, yyyy")}`, 20, 46);
    doc.text(`Due Date: ${format(new Date(invoice.dueDate), "MMM dd, yyyy")}`, 20, 52);
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, 58);

    // Customer details
    doc.text("Bill To:", 20, 70);
    doc.text(invoice.customer.name, 20, 76);
    if (invoice.customer.email) doc.text(invoice.customer.email, 20, 82);
    if (invoice.customer.phone) doc.text(invoice.customer.phone, 20, 88);
    if (invoice.customer.address) doc.text(invoice.customer.address, 20, 94);

    // Line items table
    autoTable(doc, {
      startY: 105,
      head: [["Description", "Qty", "Unit Price", "Discount", "Tax", "Amount"]],
      body: invoice.lineItems.map(item => [
        item.description,
        item.quantity.toString(),
        `£${item.unitPrice.toFixed(2)}`,
        `${item.discount}%`,
        `${item.taxRate}%`,
        `£${item.amount.toFixed(2)}`,
      ]),
      foot: [
        ["", "", "", "", "Subtotal:", `£${invoice.subtotal.toFixed(2)}`],
        ["", "", "", "", "Discount:", `-£${invoice.totalDiscount.toFixed(2)}`],
        ["", "", "", "", "Tax:", `£${invoice.taxAmount.toFixed(2)}`],
        ["", "", "", "", "Total:", `£${invoice.total.toFixed(2)}`],
        ["", "", "", "", "Paid:", `-£${invoice.amountPaid.toFixed(2)}`],
        ["", "", "", "", "Amount Due:", `£${invoice.amountDue.toFixed(2)}`],
      ],
    });

    // Notes
    if (invoice.notes) {
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.text("Notes:", 20, finalY);
      doc.text(invoice.notes, 20, finalY + 6);
    }

    // Save
    doc.save(`${invoice.invoiceNumber}.pdf`);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all"
              onClick={openMergeDialog}
            >
              <GitMerge className="w-4 h-4" />
              Merge Invoices
              {selectedIds.size >= 2 && (
                <span className="ml-0.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {selectedIds.size}
                </span>
              )}
            </Button>
            <Button onClick={openCreateInvoice}>
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                £{stats.totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Paid invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                £{stats.outstanding.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Unpaid amount</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                £{stats.overdue.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Past due date</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Draft
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-600">
                {stats.draft}
              </div>
              <p className="text-xs text-gray-500 mt-1">Unsent invoices</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Selection banner */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-blue-50 border-blue-200 text-blue-800 text-sm mb-4 transition-all">
            <GitMerge className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{selectedIds.size} invoice{selectedIds.size !== 1 ? "s" : ""} selected</span>
            {selectedIds.size >= 2 && (
              <span className="text-blue-600 text-xs">
                Combined total: <strong>£{invoices.filter(i => selectedIds.has(i.id)).reduce((s, i) => s + i.total, 0).toFixed(2)}</strong>
                {new Set(invoices.filter(i => selectedIds.has(i.id)).map(i => i.customer.id)).size > 1 && (
                  <span className="ml-2 text-indigo-500">· Cross-customer merge supported</span>
                )}
              </span>
            )}
            {selectedIds.size < 2 && (
              <span className="text-blue-500 text-xs">Select 1 more invoice to enable merge</span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {selectedIds.size >= 2 && (
                <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-700 text-white gap-1.5 px-3" onClick={openMergeDialog}>
                  <GitMerge className="w-3.5 h-3.5" />
                  Merge Now
                </Button>
              )}
              <button onClick={clearSelection} className="flex items-center gap-1 text-xs font-medium opacity-60 hover:opacity-100 transition-opacity">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {filteredInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 pr-0">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                        checked={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0}
                        ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredInvoices.length; }}
                        onChange={toggleSelectAll}
                        title="Select all"
                      />
                    </TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${selectedIds.has(invoice.id) ? "bg-blue-50/50 hover:bg-blue-50" : ""}`}
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <TableCell className="pr-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                          checked={selectedIds.has(invoice.id)}
                          onChange={(e) => toggleSelect(invoice.id, e as any)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-semibold">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.customer.name}</div>
                          <div className="text-xs text-gray-500">{invoice.customer.type}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(invoice.issueDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="font-semibold">
                        £{invoice.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-green-600">
                        £{invoice.amountPaid.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-orange-600">
                        £{invoice.amountDue.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInvoice(invoice);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              openEditInvoice(invoice);
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                              <>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedInvoice(invoice);
                                  setPaymentForm({ ...paymentForm, amount: invoice.amountDue });
                                  setShowPaymentDialog(true);
                                }}>
                                  <DollarSign className="w-4 h-4 mr-2" />
                                  Record Payment
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  updateInvoice(invoice.id, { status: "sent" });
                                }}>
                                  <Send className="w-4 h-4 mr-2" />
                                  Mark as Sent
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIds(prev => { const n = new Set(prev); n.add(invoice.id); return n; });
                            }}>
                              <GitMerge className="w-4 h-4 mr-2" />
                              Select for Merge
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              exportToPDF(invoice);
                            }}>
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInvoice(invoice);
                              setShowEmailDialog(true);
                            }}>
                              <Mail className="w-4 h-4 mr-2" />
                              Email Invoice
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Are you sure you want to delete this invoice?")) {
                                  deleteInvoice(invoice.id);
                                }
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No invoices found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ════ MERGE DIALOG ════ */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">

          {/* Accessible title/description — visually hidden, replaced by custom header below */}
          <DialogHeader className="sr-only">
            <DialogTitle>Merge Invoices</DialogTitle>
            <DialogDescription>
              Select any invoices — from the same or different customers — and merge them into one new draft invoice.
            </DialogDescription>
          </DialogHeader>

          {/* Visual Header */}
          <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
              <GitMerge className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900">Merge Invoices</h2>
              <p className="text-xs text-gray-500">
                Select any invoices — from the same or different customers — and merge them into one new draft invoice.
              </p>
            </div>
            <button onClick={() => setShowMergeDialog(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Two-column body */}
          <div className="flex flex-1 overflow-hidden">

            {/* LEFT — Invoice picker */}
            <div className="w-[52%] border-r flex flex-col overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex-1">Select Invoices</h3>
                  <span className="text-xs text-gray-400">{mergeDialogSelectedIds.size} selected</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Search by number, customer, amount…"
                    value={mergeInvoiceSearch}
                    onChange={e => setMergeInvoiceSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
                {invoices
                  .filter(inv => {
                    const q = mergeInvoiceSearch.toLowerCase();
                    return (
                      !q ||
                      inv.invoiceNumber.toLowerCase().includes(q) ||
                      inv.customer.name.toLowerCase().includes(q) ||
                      inv.total.toFixed(2).includes(q)
                    );
                  })
                  .map(inv => {
                    const checked = mergeDialogSelectedIds.has(inv.id);
                    return (
                      <label
                        key={inv.id}
                        className={`flex items-center gap-3 border rounded-xl px-3 py-2.5 cursor-pointer transition-all select-none ${
                          checked
                            ? "bg-blue-50 border-blue-300 shadow-sm"
                            : "bg-white border-gray-200 hover:border-blue-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer shrink-0"
                          checked={checked}
                          onChange={() => {
                            setMergeDialogSelectedIds(prev => {
                              const n = new Set(prev);
                              n.has(inv.id) ? n.delete(inv.id) : n.add(inv.id);
                              return n;
                            });
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-xs text-blue-700">{inv.invoiceNumber}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${
                              inv.status === "paid" ? "bg-green-100 text-green-700" :
                              inv.status === "overdue" ? "bg-red-100 text-red-600" :
                              inv.status === "cancelled" ? "bg-gray-100 text-gray-400" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>{inv.status}</span>
                          </div>
                          <p className="text-xs text-gray-600 truncate mt-0.5 font-medium">{inv.customer.name}</p>
                          <p className="text-[10px] text-gray-400">{format(new Date(inv.issueDate), "dd MMM yyyy")} · {inv.lineItems.length} items</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm text-gray-800">£{inv.total.toFixed(2)}</p>
                          {inv.amountDue > 0 && <p className="text-[10px] text-orange-500">Due £{inv.amountDue.toFixed(2)}</p>}
                        </div>
                      </label>
                    );
                  })}
                {invoices.filter(inv => {
                  const q = mergeInvoiceSearch.toLowerCase();
                  return !q || inv.invoiceNumber.toLowerCase().includes(q) || inv.customer.name.toLowerCase().includes(q) || inv.total.toFixed(2).includes(q);
                }).length === 0 && (
                  <div className="text-center py-10 text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No invoices match</p>
                  </div>
                )}
              </div>

              {/* Selection summary strip */}
              <div className="px-4 py-2.5 border-t bg-gray-50 shrink-0">
                {mergeDialogSelectedIds.size === 0 && (
                  <p className="text-xs text-gray-400 text-center">Check invoices on the left to include them in the merge</p>
                )}
                {mergeDialogSelectedIds.size === 1 && (
                  <p className="text-xs text-orange-500 text-center font-medium">Select at least 1 more invoice to merge</p>
                )}
                {mergeDialogSelectedIds.size >= 2 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">{mergeDialogSelectedIds.size} invoices</span>
                    <span className="text-xs font-bold text-blue-700">Combined: £{selectedInvoicesForMerge.reduce((s, i) => s + i.total, 0).toFixed(2)}</span>
                    {mergeCustomerCount > 1 && (
                      <span className="text-xs text-indigo-600 font-medium">{mergeCustomerCount} customers</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Configuration */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                {/* Bill To Customer */}
                <div>
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                    Bill To Customer <span className="text-red-500">*</span>
                  </Label>
                  {mergeCustomerCount > 1 && mergeDialogSelectedIds.size >= 2 && (
                    <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-2">
                      <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-indigo-700">
                        You're merging invoices from <strong>{mergeCustomerCount} different customers</strong>. Choose which customer the merged invoice should be billed to.
                      </p>
                    </div>
                  )}
                  <Select
                    value={mergeOptions.targetCustomerId}
                    onValueChange={v => setMergeOptions(p => ({ ...p, targetCustomerId: v }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select customer for merged invoice…" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <span>{c.name}</span>
                            <span className="text-xs text-gray-400 capitalize">({c.type})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Terms + Reference */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Payment Terms</Label>
                    <Select
                      value={mergeOptions.paymentTerms}
                      onValueChange={(v: PaymentTerms) => setMergeOptions(p => ({ ...p, paymentTerms: v }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                        <SelectItem value="net_7">Net 7</SelectItem>
                        <SelectItem value="net_15">Net 15</SelectItem>
                        <SelectItem value="net_30">Net 30</SelectItem>
                        <SelectItem value="net_60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Reference</Label>
                    <Input
                      className="h-9 text-sm"
                      placeholder="Optional ref…"
                      value={mergeOptions.reference}
                      onChange={e => setMergeOptions(p => ({ ...p, reference: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Notes</Label>
                  <Textarea
                    rows={2}
                    placeholder="Optional note for the merged invoice…"
                    value={mergeOptions.notes}
                    onChange={e => setMergeOptions(p => ({ ...p, notes: e.target.value }))}
                    className="resize-none text-sm"
                  />
                </div>

                {/* Source action */}
                <div>
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Source Invoices After Merge</Label>
                  <div className="flex gap-2">
                    {[
                      { value: "cancel", label: "Cancel",  icon: XCircle, desc: "Kept as cancelled",      on: "border-orange-400 bg-orange-50 text-orange-700" },
                      { value: "delete", label: "Delete",  icon: Trash2,  desc: "Permanently removed",    on: "border-red-400 bg-red-50 text-red-700" },
                    ].map(opt => (
                      <label
                        key={opt.value}
                        className={`flex-1 flex items-center gap-2.5 border-2 rounded-xl px-3 py-2.5 cursor-pointer transition-all select-none ${
                          mergeOptions.sourceAction === opt.value ? opt.on : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <input type="radio" className="sr-only" value={opt.value} checked={mergeOptions.sourceAction === opt.value}
                          onChange={() => setMergeOptions(p => ({ ...p, sourceAction: opt.value as "cancel" | "delete" }))} />
                        <opt.icon className="w-4 h-4 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold">{opt.label}</p>
                          <p className="text-[11px] opacity-70">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Line items preview (collapsible) */}
                {mergeDialogSelectedIds.size >= 2 && (
                  <div>
                    <button
                      className="flex items-center gap-2 w-full mb-2 group"
                      onClick={() => setMergeExpandPreview(p => !p)}
                    >
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Line Items Preview</span>
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">{mergePreviewLineItems.length}</span>
                      <span className="ml-auto text-gray-400 group-hover:text-gray-600">
                        {mergeExpandPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </span>
                    </button>
                    {mergeExpandPreview && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="text-left px-3 py-2 font-semibold text-gray-500">Description</th>
                              <th className="text-center px-2 py-2 font-semibold text-gray-500 w-10">Qty</th>
                              <th className="text-right px-3 py-2 font-semibold text-gray-500 w-20">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {mergePreviewLineItems.map((item, i) => (
                              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                                <td className="px-3 py-1.5 text-gray-700 truncate max-w-[140px]">{item.description}</td>
                                <td className="px-2 py-1.5 text-center text-gray-500">{item.quantity}</td>
                                <td className="px-3 py-1.5 text-right font-semibold text-gray-800">£{item.amount.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                            <tr>
                              <td className="px-3 py-2" colSpan={2}>
                                {mergeTotals.totalDiscount > 0 && (
                                  <span className="text-red-500 font-medium">Disc: -£{mergeTotals.totalDiscount.toFixed(2)} &nbsp;</span>
                                )}
                                <span className="text-gray-500">Tax: £{mergeTotals.taxAmount.toFixed(2)}</span>
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-blue-700">£{mergeTotals.total.toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Info */}
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    The merged invoice is created as a <strong>Draft</strong>. Identical line items are combined by adding quantities. Invoices from different customers are fully supported — just pick the "Bill To" customer above. Source invoice numbers are recorded in the merged invoice's notes.
                  </p>
                </div>

              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t bg-gray-50 flex items-center justify-between shrink-0">
                <Button variant="outline" size="sm" onClick={() => setShowMergeDialog(false)}>Cancel</Button>
                <Button
                  disabled={!isMergeValid}
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white gap-2 disabled:opacity-40 px-5"
                  onClick={executeMerge}
                >
                  <GitMerge className="w-4 h-4" />
                  {isMergeValid
                    ? `Merge ${mergeDialogSelectedIds.size} Invoices → 1`
                    : mergeDialogSelectedIds.size < 2
                      ? "Select invoices first"
                      : "Select a customer"}
                </Button>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={selectedInvoice !== null && !showInvoiceDialog && !showPaymentDialog} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Invoice {selectedInvoice?.invoiceNumber}</span>
              {selectedInvoice && getStatusBadge(selectedInvoice)}
            </DialogTitle>
            <DialogDescription>
              View and manage invoice details
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  {/* Invoice Header */}
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Invoice Number</p>
                        <p className="font-mono font-bold text-lg">{selectedInvoice.invoiceNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Issue Date</p>
                        <p className="font-semibold">{format(new Date(selectedInvoice.issueDate), "MMM dd, yyyy")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Due Date</p>
                        <p className="font-semibold">{format(new Date(selectedInvoice.dueDate), "MMM dd, yyyy")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Payment Terms</p>
                        <p className="font-semibold capitalize">{selectedInvoice.paymentTerms.replace("_", " ")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Customer Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-semibold">{selectedInvoice.customer.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <Badge variant="outline" className="capitalize">
                          {selectedInvoice.customer.type}
                        </Badge>
                      </div>
                      {selectedInvoice.customer.email && (
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium">{selectedInvoice.customer.email}</p>
                        </div>
                      )}
                      {selectedInvoice.customer.phone && (
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium">{selectedInvoice.customer.phone}</p>
                        </div>
                      )}
                      {selectedInvoice.customer.address && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Address</p>
                          <p className="font-medium">{selectedInvoice.customer.address}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Line Items */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Line Items</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Qty</TableHead>
                              <TableHead className="text-right">Unit Price</TableHead>
                              <TableHead className="text-right">Discount</TableHead>
                              <TableHead className="text-right">Tax</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedInvoice.lineItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.description}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">£{item.unitPrice.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{item.discount}%</TableCell>
                                <TableCell className="text-right">{item.taxRate}%</TableCell>
                                <TableCell className="text-right font-semibold">£{item.amount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Totals */}
                      <div className="bg-gray-50 p-6 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="font-medium">£{selectedInvoice.subtotal.toFixed(2)}</span>
                        </div>
                        {selectedInvoice.totalDiscount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Discount</span>
                            <span className="font-medium text-red-600">-£{selectedInvoice.totalDiscount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax</span>
                          <span className="font-medium">£{selectedInvoice.taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-3 border-t">
                          <span>Total</span>
                          <span className="text-blue-600">£{selectedInvoice.total.toFixed(2)}</span>
                        </div>
                        {selectedInvoice.amountPaid > 0 && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Amount Paid</span>
                              <span className="font-medium text-green-600">-£{selectedInvoice.amountPaid.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold pt-2 border-t">
                              <span>Amount Due</span>
                              <span className="text-orange-600">£{selectedInvoice.amountDue.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  {selectedInvoice.notes && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedInvoice.notes}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Terms & Conditions */}
                  {selectedInvoice.termsAndConditions && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Terms & Conditions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedInvoice.termsAndConditions}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="payments" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Payment History</span>
                        <Button
                          size="sm"
                          onClick={() => {
                            setPaymentForm({ ...paymentForm, amount: selectedInvoice.amountDue });
                            setShowPaymentDialog(true);
                          }}
                          disabled={selectedInvoice.amountDue <= 0}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Record Payment
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedInvoice.paymentHistory.length > 0 ? (
                        <div className="space-y-3">
                          {selectedInvoice.paymentHistory.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                  <span className="font-semibold text-green-600">£{payment.amount.toFixed(2)}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {payment.method}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">
                                  {format(new Date(payment.date), "MMM dd, yyyy 'at' h:mm a")}
                                </p>
                                {payment.reference && (
                                  <p className="text-xs text-gray-500 mt-1">Ref: {payment.reference}</p>
                                )}
                                {payment.notes && (
                                  <p className="text-sm text-gray-700 mt-2">{payment.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No payments recorded yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Activity Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 border-l-2 border-blue-500 bg-blue-50">
                          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Invoice Created</p>
                            <p className="text-xs text-gray-600">
                              {format(new Date(selectedInvoice.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>

                        {selectedInvoice.status !== "draft" && (
                          <div className="flex items-start gap-3 p-3 border-l-2 border-green-500 bg-green-50">
                            <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Invoice Sent</p>
                              <p className="text-xs text-gray-600">
                                {format(new Date(selectedInvoice.updatedAt), "MMM dd, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedInvoice.paymentHistory.map((payment) => (
                          <div key={payment.id} className="flex items-start gap-3 p-3 border-l-2 border-green-600 bg-green-50">
                            <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Payment Received - £{payment.amount.toFixed(2)}</p>
                              <p className="text-xs text-gray-600">
                                {format(new Date(payment.date), "MMM dd, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                        ))}

                        {selectedInvoice.status === "paid" && (
                          <div className="flex items-start gap-3 p-3 border-l-2 border-green-700 bg-green-50">
                            <div className="flex-shrink-0 w-2 h-2 bg-green-700 rounded-full mt-1.5"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Invoice Paid in Full</p>
                              <p className="text-xs text-gray-600">
                                {selectedInvoice.paymentHistory.length > 0 && 
                                  format(new Date(selectedInvoice.paymentHistory[selectedInvoice.paymentHistory.length - 1].date), "MMM dd, yyyy 'at' h:mm a")
                                }
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => exportToPDF(selectedInvoice)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowEmailDialog(true);
                }}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email Invoice
                </Button>
                <Button variant="outline" onClick={() => openEditInvoice(selectedInvoice)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Invoice
                </Button>
                {selectedInvoice.amountDue > 0 && selectedInvoice.status !== "cancelled" && (
                  <Button onClick={() => {
                    setPaymentForm({ ...paymentForm, amount: selectedInvoice.amountDue });
                    setShowPaymentDialog(true);
                  }}>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Record Payment
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreatingNew ? "Create New Invoice" : "Edit Invoice"}
            </DialogTitle>
            <DialogDescription>
              {isCreatingNew 
                ? "Create a new invoice for your customer" 
                : "Update invoice details"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer *</Label>
                <Select
                  value={invoiceForm.customer?.id}
                  onValueChange={(value) => {
                    const customer = customers.find(c => c.id === value);
                    setInvoiceForm(prev => ({ ...prev, customer }));
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

              <div>
                <Label>Payment Terms</Label>
                <Select
                  value={invoiceForm.paymentTerms}
                  onValueChange={(value: PaymentTerms) =>
                    setInvoiceForm(prev => ({ ...prev, paymentTerms: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                    <SelectItem value="net_7">Net 7</SelectItem>
                    <SelectItem value="net_15">Net 15</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                    <SelectItem value="net_60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Creation Date, Invoice Date & Due Date */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Creation Date</Label>
                <Input
                  type="date"
                  value={
                    invoiceForm.createdAt
                      ? format(new Date(invoiceForm.createdAt), "yyyy-MM-dd")
                      : format(new Date(), "yyyy-MM-dd")
                  }
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    setInvoiceForm(prev => ({ ...prev, createdAt: d }));
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">When this invoice was created</p>
              </div>

              <div>
                <Label>Invoice Date *</Label>
                <Input
                  type="date"
                  value={invoiceForm.issueDate ? format(new Date(invoiceForm.issueDate), "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const newIssueDate = new Date(e.target.value);
                    setInvoiceForm(prev => ({ ...prev, issueDate: newIssueDate }));
                  }}
                />
              </div>

              <div>
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={
                    invoiceForm.issueDate 
                      ? format(calculateDueDate(new Date(invoiceForm.issueDate), invoiceForm.paymentTerms || "net_30"), "yyyy-MM-dd")
                      : ""
                  }
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                  title="Due date is automatically calculated based on invoice date and payment terms"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-calculated from payment terms
                </p>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Line Items *</Label>
                <Button size="sm" variant="outline" onClick={addLineItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {/* Barcode Scanner */}
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
                <Label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <ScanBarcode className="w-4 h-4 text-blue-600" />
                  Quick Add by Barcode/SKU
                </Label>
                <form onSubmit={handleBarcodeSubmit} className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <ScanBarcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5" />
                    <Input
                      ref={barcodeInputRef}
                      type="text"
                      placeholder="Scan or enter barcode/SKU and press Enter..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={handleBarcodeSubmit}
                      className="pl-10 bg-white/80 backdrop-blur"
                      autoComplete="off"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    variant="outline"
                    className="bg-white/80"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </form>
                <p className="text-xs text-gray-600 mt-2">
                  Tip: Focus this field and use a barcode scanner for instant product addition
                </p>
              </div>

              {invoiceForm.lineItems && invoiceForm.lineItems.length > 0 ? (
                <div className="space-y-3">
                  {invoiceForm.lineItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-start border p-3 rounded-lg">
                      <div className="col-span-5">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, "description", e.target.value)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Price"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          placeholder="%"
                          min="0"
                          max="100"
                          value={item.discount}
                          onChange={(e) => updateLineItem(index, "discount", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          placeholder="Tax%"
                          min="0"
                          max="100"
                          value={item.taxRate}
                          onChange={(e) => updateLineItem(index, "taxRate", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <div className="flex-1 text-right font-semibold text-sm">
                          £{item.amount.toFixed(2)}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeLineItem(index)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Totals Preview */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    {(() => {
                      const totals = calculateInvoiceTotals(invoiceForm.lineItems || []);
                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span className="font-medium">£{totals.subtotal.toFixed(2)}</span>
                          </div>
                          {totals.totalDiscount > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span>Discount:</span>
                              <span className="font-medium">-£{totals.totalDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span>Tax:</span>
                            <span className="font-medium">£{totals.taxAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold pt-2 border-t">
                            <span>Total:</span>
                            <span className="text-blue-600">£{totals.total.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed rounded-lg text-gray-500">
                  <p className="text-sm">No line items added yet</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={addLineItem}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Item
                  </Button>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Add any notes for this invoice"
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Terms & Conditions */}
            <div>
              <Label>Terms & Conditions</Label>
              <Textarea
                placeholder="Add terms and conditions"
                value={invoiceForm.termsAndConditions}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Reference */}
            <div>
              <Label>Reference (Optional)</Label>
              <Input
                placeholder="Add a reference number or note"
                value={invoiceForm.reference || ""}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, reference: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveInvoice}>
              {isCreatingNew ? "Create Invoice" : "Update Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Amount Due:</span>
                <span className="text-2xl font-bold text-blue-600">
                  £{selectedInvoice?.amountDue.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <Label>Payment Amount *</Label>
              <Input
                type="number"
                min="0"
                max={selectedInvoice?.amountDue}
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div>
              <Label>Payment Method *</Label>
              <Select
                value={paymentForm.method}
                onValueChange={(value) => setPaymentForm(prev => ({ ...prev, method: value }))}
              >
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

            <div>
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={paymentForm.date ? format(new Date(paymentForm.date), "yyyy-MM-dd") : ""}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, date: new Date(e.target.value) }))}
              />
            </div>

            <div>
              <Label>Reference Number</Label>
              <Input
                placeholder="e.g., Check #1234"
                value={paymentForm.reference || ""}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Add any notes about this payment"
                value={paymentForm.notes || ""}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={!paymentForm.amount || paymentForm.amount <= 0}>
              <DollarSign className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Invoice Dialog */}
      <EmailInvoiceDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        invoice={selectedInvoice}
      />
    </div>
  );
}