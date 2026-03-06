import { useState } from "react";
import { usePOS } from "@/app/context/pos-context";
import { useAuth } from "@/app/context/auth-context";
import { Search, UserPlus, Users, Edit, Trash2, BookOpen, Eye, FileText, TrendingUp, ArrowLeft, X, PoundSterling, Calendar, Plus, Minus, CreditCard, History, AlertTriangle } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
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
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Textarea } from "@/app/components/ui/textarea";
import { toast } from "sonner";
import { Customer, CustomerType, Invoice, CreditTransaction, CreditTransactionType } from "@/app/types";
import { format } from "date-fns";

export function CustomersView() {
  const { customers, addCustomer, updateCustomer, deleteCustomer, getCustomerLedger, addCreditTransaction, getCreditTransactions } = usePOS();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<Customer | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [creditTransactionType, setCreditTransactionType] = useState<CreditTransactionType>("add");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [creditReference, setCreditReference] = useState("");


  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    customerId: string;
    customerName: string;
  }>({
    open: false,
    customerId: "",
    customerName: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    type: "retailer" as CustomerType,
    phone: "",
    email: "",
    address: "",
    creditBalance: 0,
    creditLimit: 1000,
    creditTransactions: [] as CreditTransaction[],
  });

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customerTypeCounts = {
    wholesaler: customers.filter((c) => c.type === "wholesaler").length,
    trader: customers.filter((c) => c.type === "trader").length,
    retailer: customers.filter((c) => c.type === "retailer").length,
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.phone) {
      toast.error("Name and phone are required");
      return;
    }

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, formData);
      toast.success("Customer updated successfully");
    } else {
      addCustomer(formData);
      toast.success("Customer added successfully");
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "retailer",
      phone: "",
      email: "",
      address: "",
      creditBalance: 0,
      creditLimit: 1000,
      creditTransactions: [],
    });
    setIsAddDialogOpen(false);
    setEditingCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      type: customer.type,
      phone: customer.phone,
      email: customer.email || "",
      address: customer.address || "",
      creditBalance: customer.creditBalance || 0,
      creditLimit: customer.creditLimit || 1000,
      creditTransactions: customer.creditTransactions || [],
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (customer: Customer) => {
    setDeleteDialog({
      open: true,
      customerId: customer.id,
      customerName: customer.name,
    });
  };

  const getCustomerTypeBadge = (type: CustomerType) => {
    const variants = {
      wholesaler: "default",
      trader: "secondary",
      retailer: "outline",
    } as const;

    return (
      <Badge variant={variants[type]} className="capitalize">
        {type}
      </Badge>
    );
  };

  const openCustomerLedger = (customer: Customer) => {
    setSelectedCustomerForLedger(customer);
  };

  const openCreditDialog = (customer: Customer, type: CreditTransactionType) => {
    setSelectedCustomerForLedger(customer);
    setCreditTransactionType(type);
    setCreditAmount("");
    setCreditDescription("");
    setCreditReference("");
    setIsCreditDialogOpen(true);
  };

  const handleCreditTransaction = () => {
    if (!selectedCustomerForLedger || !creditAmount || parseFloat(creditAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const amount = parseFloat(creditAmount);
    const currentBalance = selectedCustomerForLedger.creditBalance || 0;
    let newBalance = currentBalance;

    if (creditTransactionType === "add" || creditTransactionType === "refund") {
      newBalance = currentBalance + amount;
    } else if (creditTransactionType === "deduct" || creditTransactionType === "payment") {
      if (amount > currentBalance) {
        toast.error("Insufficient credit balance");
        return;
      }
      newBalance = currentBalance - amount;
    }

    const transaction: CreditTransaction = {
      id: `CREDIT-${Date.now()}`,
      customerId: selectedCustomerForLedger.id,
      type: creditTransactionType,
      amount: amount,
      balance: newBalance,
      description: creditDescription || `${creditTransactionType.charAt(0).toUpperCase() + creditTransactionType.slice(1)} Credit`,
      reference: creditReference,
      createdBy: user?.name || "System",
      createdAt: new Date(),
    };

    addCreditTransaction(transaction);
    
    // Update customer credit balance and transactions
    const updatedTransactions = [...(selectedCustomerForLedger.creditTransactions || []), transaction];
    updateCustomer(selectedCustomerForLedger.id, {
      creditBalance: newBalance,
      creditTransactions: updatedTransactions,
    });

    toast.success(`Credit ${creditTransactionType} successful`);
    setIsCreditDialogOpen(false);
    setCreditAmount("");
    setCreditDescription("");
    setCreditReference("");
  };

  // Get customer ledger data
  const customerLedger = selectedCustomerForLedger 
    ? getCustomerLedger(selectedCustomerForLedger.id) 
    : [];

  const customerCreditTransactions = selectedCustomerForLedger
    ? (selectedCustomerForLedger.creditTransactions || [])
    : [];

  const ledgerStats = selectedCustomerForLedger ? {
    totalPurchases: customerLedger
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.total, 0),
    totalPending: customerLedger
      .filter((inv) => inv.status !== "paid")
      .reduce((sum, inv) => sum + inv.total, 0),
    invoiceCount: customerLedger.length,
  } : null;

  // If viewing ledger, show full-screen ledger view
  if (selectedCustomerForLedger && ledgerStats) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCustomerForLedger(null);
                  setSelectedInvoice(null);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Customers
              </Button>
              <div className="h-8 w-px bg-gray-300" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                  {selectedCustomerForLedger.name}
                </h2>
                <p className="text-sm text-gray-600">Customer Account Ledger</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => openCreditDialog(selectedCustomerForLedger, "add")}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Credit
              </Button>
              <Button
                variant="outline"
                onClick={() => openCreditDialog(selectedCustomerForLedger, "deduct")}
                className="gap-2"
              >
                <Minus className="w-4 h-4" />
                Deduct Credit
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Customer Info Card */}
            <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                  <div>
                    <p className="text-xs text-blue-200 mb-2 uppercase tracking-wide">Customer Type</p>
                    <Badge variant="secondary" className="capitalize text-sm bg-white text-blue-600">
                      {selectedCustomerForLedger.type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-blue-200 mb-2 uppercase tracking-wide">Phone Number</p>
                    <p className="font-semibold text-lg">{selectedCustomerForLedger.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-200 mb-2 uppercase tracking-wide">Email Address</p>
                    <p className="font-semibold text-lg">{selectedCustomerForLedger.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-200 mb-2 uppercase tracking-wide">Address</p>
                    <p className="font-semibold text-lg">{selectedCustomerForLedger.address || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-200 mb-2 uppercase tracking-wide">Credit Balance</p>
                    <p className="font-bold text-2xl text-green-300">
                      £{(selectedCustomerForLedger.creditBalance || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-200 mb-2 uppercase tracking-wide">Credit Limit</p>
                    <p className="font-semibold text-lg">
                      £{(selectedCustomerForLedger.creditLimit || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Invoices</p>
                      <p className="text-4xl font-bold text-gray-900">{ledgerStats.invoiceCount}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Purchases</p>
                      <p className="text-4xl font-bold text-green-600">
                        £{ledgerStats.totalPurchases.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <PoundSterling className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Pending Amount</p>
                      <p className="text-4xl font-bold text-orange-600">
                        £{ledgerStats.totalPending.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Store Credit</p>
                      <p className="text-4xl font-bold text-purple-600">
                        £{(selectedCustomerForLedger.creditBalance || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <CreditCard className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for Transaction History and Credit History */}
            <Tabs defaultValue="invoices" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="invoices">Invoice History</TabsTrigger>
                <TabsTrigger value="credits">Credit History</TabsTrigger>
              </TabsList>

              {/* Invoice History Tab */}
              <TabsContent value="invoices">
                <Card>
                  <CardHeader className="border-b bg-gray-50">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      Transaction History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {customerLedger.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="font-semibold">Invoice Number</TableHead>
                              <TableHead className="font-semibold">Date</TableHead>
                              <TableHead className="font-semibold">Items</TableHead>
                              <TableHead className="font-semibold">Subtotal</TableHead>
                              <TableHead className="font-semibold">Tax</TableHead>
                              <TableHead className="font-semibold">Total Amount</TableHead>
                              <TableHead className="font-semibold">Status</TableHead>
                              <TableHead className="font-semibold">Payment Method</TableHead>
                              <TableHead className="font-semibold">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerLedger.map((invoice) => (
                              <TableRow key={invoice.id} className="hover:bg-gray-50">
                                <TableCell className="font-medium text-blue-600">
                                  {invoice.invoiceNumber}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {format(new Date(invoice.issueDate), "MMM d, yyyy")}
                                  <br />
                                  <span className="text-xs text-gray-500">
                                    {format(new Date(invoice.issueDate), "h:mm a")}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="font-medium">
                                    {invoice.lineItems.length} items
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                  £{invoice.subtotal.toFixed(2)}
                                </TableCell>
                                <TableCell className="font-medium">
                                  £{invoice.taxAmount.toFixed(2)}
                                </TableCell>
                                <TableCell className="font-bold text-lg text-blue-600">
                                  £{invoice.total.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      invoice.status === "paid"
                                        ? "default"
                                        : invoice.status === "pending"
                                        ? "secondary"
                                        : "outline"
                                    }
                                    className={
                                      invoice.status === "paid"
                                        ? "bg-green-500 hover:bg-green-600"
                                        : invoice.status === "pending"
                                        ? "bg-orange-500 hover:bg-orange-600"
                                        : ""
                                    }
                                  >
                                    {invoice.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="capitalize">
                                  {invoice.paymentHistory && invoice.paymentHistory.length > 0 
                                    ? invoice.paymentHistory[invoice.paymentHistory.length - 1].method 
                                    : "N/A"}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedInvoice(invoice)}
                                    className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-600"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    View Details
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-16 text-gray-500">
                        <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No transactions yet</p>
                        <p className="text-sm">This customer hasn't made any purchases</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Credit History Tab */}
              <TabsContent value="credits">
                <Card>
                  <CardHeader className="border-b bg-gray-50">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <History className="w-5 h-5 text-purple-600" />
                      Credit Transaction History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {customerCreditTransactions.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="font-semibold">Date</TableHead>
                              <TableHead className="font-semibold">Type</TableHead>
                              <TableHead className="font-semibold">Description</TableHead>
                              <TableHead className="font-semibold">Reference</TableHead>
                              <TableHead className="font-semibold">Amount</TableHead>
                              <TableHead className="font-semibold">Balance After</TableHead>
                              <TableHead className="font-semibold">Created By</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerCreditTransactions.map((transaction) => (
                              <TableRow key={transaction.id} className="hover:bg-gray-50">
                                <TableCell className="text-sm">
                                  {format(new Date(transaction.createdAt), "MMM d, yyyy")}
                                  <br />
                                  <span className="text-xs text-gray-500">
                                    {format(new Date(transaction.createdAt), "h:mm a")}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      transaction.type === "add" || transaction.type === "refund"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className={
                                      transaction.type === "add" || transaction.type === "refund"
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                    }
                                  >
                                    {transaction.type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {transaction.description}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {transaction.reference || "-"}
                                </TableCell>
                                <TableCell className={`font-bold text-lg ${
                                  transaction.type === "add" || transaction.type === "refund"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}>
                                  {transaction.type === "add" || transaction.type === "refund" ? "+" : "-"}
                                  £{transaction.amount.toFixed(2)}
                                </TableCell>
                                <TableCell className="font-bold text-lg text-purple-600">
                                  £{transaction.balance.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {transaction.createdBy}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-16 text-gray-500">
                        <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No credit transactions</p>
                        <p className="text-sm">This customer hasn't had any credit activity</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Invoice Detail Dialog */}
        <Dialog open={selectedInvoice !== null} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Invoice Details - {selectedInvoice?.invoiceNumber}</DialogTitle>
              <DialogDescription>
                {selectedInvoice && format(new Date(selectedInvoice.issueDate), "MMMM d, yyyy 'at' h:mm a")}
              </DialogDescription>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-6">
                {/* Invoice Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-xs text-gray-600">Customer</Label>
                    <p className="font-semibold mt-1">{selectedCustomerForLedger.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Payment Method</Label>
                    <p className="font-semibold capitalize mt-1">
                      {selectedInvoice.paymentHistory && selectedInvoice.paymentHistory.length > 0 
                        ? selectedInvoice.paymentHistory[selectedInvoice.paymentHistory.length - 1].method 
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Status</Label>
                    <div className="mt-1">
                      <Badge
                        variant={selectedInvoice.status === "paid" ? "default" : "secondary"}
                        className={selectedInvoice.status === "paid" ? "bg-green-500" : "bg-orange-500"}
                      >
                        {selectedInvoice.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Invoice Date</Label>
                    <p className="font-semibold mt-1">{format(new Date(selectedInvoice.issueDate), "MMM d, yyyy")}</p>
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <Label className="text-lg font-semibold mb-3 block">Items Purchased</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Description</TableHead>
                          <TableHead className="font-semibold">Quantity</TableHead>
                          <TableHead className="text-right font-semibold">Unit Price</TableHead>
                          <TableHead className="text-right font-semibold">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.lineItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.quantity}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              £{item.unitPrice.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-blue-600">
                              £{item.amount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-6">
                  <div className="space-y-3 max-w-sm ml-auto bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between text-base">
                      <span className="text-gray-700 font-medium">Subtotal:</span>
                      <span className="font-semibold">£{selectedInvoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span className="text-gray-700 font-medium">Tax:</span>
                      <span className="font-semibold">£{selectedInvoice.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t border-gray-300 pt-3">
                      <span>Total:</span>
                      <span className="text-blue-600">£{selectedInvoice.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Credit Transaction Dialog */}
        <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                {creditTransactionType === "add" ? "Add Credit" : "Deduct Credit"}
              </DialogTitle>
              <DialogDescription>
                Current Balance: £{(selectedCustomerForLedger?.creditBalance || 0).toFixed(2)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={creditDescription}
                  onChange={(e) => setCreditDescription(e.target.value)}
                  placeholder="Enter reason for credit transaction"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="reference">Reference (Optional)</Label>
                <Input
                  id="reference"
                  value={creditReference}
                  onChange={(e) => setCreditReference(e.target.value)}
                  placeholder="Invoice number, receipt number, etc."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreditTransaction}>
                {creditTransactionType === "add" ? "Add Credit" : "Deduct Credit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Default customer list view
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{customers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Wholesalers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {customerTypeCounts.wholesaler}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Traders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {customerTypeCounts.trader}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Retailers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {customerTypeCounts.retailer}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 z-10 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Credit Balance</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell 
                    className="font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline"
                    onClick={() => openCustomerLedger(customer)}
                  >
                    {customer.name}
                  </TableCell>
                  <TableCell>{getCustomerTypeBadge(customer.type)}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {customer.email || "-"}
                  </TableCell>
                  <TableCell className="font-bold text-purple-600">
                    £{(customer.creditBalance || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(customer.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(customer)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
  size="sm"
  variant="outline"
  onClick={() => handleDelete(customer)}
  className="text-red-600 hover:text-red-700"
>
  <Trash2 className="w-3 h-3" />
</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={resetForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer" : "Add New Customer"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? "Update customer information below."
                : "Enter customer details to create a new customer."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Customer Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label htmlFor="type">Customer Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: CustomerType) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='bg-white'>
                  <SelectItem value="wholesaler">Wholesaler (30% off)</SelectItem>
                  <SelectItem value="trader">Trader (15% off)</SelectItem>
                  <SelectItem value="retailer">Retailer (Full Price)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter customer address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="creditLimit">Credit Limit</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                  placeholder="1000.00"
                />
              </div>
              {editingCustomer && (
                <div>
                  <Label htmlFor="creditBalance">Current Balance</Label>
                  <Input
                    id="creditBalance"
                    type="number"
                    step="0.01"
                    value={formData.creditBalance}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingCustomer ? "Update" : "Add"} Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ════ DELETE CUSTOMER CONFIRMATION DIALOG ════ */}
<Dialog
  open={deleteDialog.open}
  onOpenChange={(o) =>
    !o &&
    setDeleteDialog({ open: false, customerId: "", customerName: "" })
  }
>
  <DialogContent className="w-[90vw] sm:max-w-[400px]">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="w-5 h-5" />
        Delete Customer
      </DialogTitle>
      <DialogDescription>
        Are you sure you want to delete{" "}
        <strong>"{deleteDialog.customerName}"</strong>? This will
        permanently remove the customer and all associated data. This
        action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="gap-2 flex-col sm:flex-row pt-2">
      <Button
        variant="outline"
        className="w-full sm:w-auto"
        onClick={() =>
          setDeleteDialog({
            open: false,
            customerId: "",
            customerName: "",
          })
        }
      >
        Cancel
      </Button>
      <Button
        variant="destructive"
        className="w-full sm:w-auto"
        onClick={() => {
          deleteCustomer(deleteDialog.customerId);
          toast.success("Customer deleted successfully");
          setDeleteDialog({
            open: false,
            customerId: "",
            customerName: "",
          });
        }}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  );
}