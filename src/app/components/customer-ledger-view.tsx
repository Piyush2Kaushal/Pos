import { useState } from "react";
import { usePOS } from "@/app/context/pos-context";
import { Search, FileText, Eye, TrendingUp, DollarSign, Plus, Wallet } from "lucide-react";
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
import { format } from "date-fns";
import { Customer, Invoice, CreditTransaction } from "@/app/types";
import { useAuth } from "@/app/context/auth-context";
import { toast } from "sonner";

export function CustomerLedgerView() {
  const { customers, invoices, getCustomerLedger, addCreditTransaction, getCreditTransactions, updateCustomer } = usePOS();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [showCashPaymentDialog, setShowCashPaymentDialog] = useState(false);
  const [cashPaymentAmount, setCashPaymentAmount] = useState("");
  const [cashPaymentDescription, setCashPaymentDescription] = useState("");
  const [cashPaymentReference, setCashPaymentReference] = useState("");

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm);
    const matchesType =
      customerTypeFilter === "all" || customer.type === customerTypeFilter;
    return matchesSearch && matchesType;
  });

  const customersWithStats = filteredCustomers.map((customer) => {
    const customerInvoices = getCustomerLedger(customer.id);
    const totalPurchases = customerInvoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.total, 0);
    const totalPending = customerInvoices
      .filter((inv) => inv.status === "pending")
      .reduce((sum, inv) => sum + inv.total, 0);
    const lastPurchaseDate =
      customerInvoices.length > 0
        ? new Date(Math.max(...customerInvoices.map((inv) => new Date(inv.date).getTime())))
        : null;

    return {
      ...customer,
      totalPurchases,
      totalPending,
      invoiceCount: customerInvoices.length,
      lastPurchaseDate,
    };
  });

  const viewCustomerLedger = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const openCashPaymentDialog = () => {
    setCashPaymentAmount("");
    setCashPaymentDescription("Cash payment for old purchases");
    setCashPaymentReference("");
    setShowCashPaymentDialog(true);
  };

  const handleRecordCashPayment = () => {
    if (!selectedCustomer) return;

    const amount = parseFloat(cashPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!cashPaymentDescription.trim()) {
      toast.error("Please enter a description");
      return;
    }

    // Get current credit balance
    const currentBalance = selectedCustomer.creditBalance || 0;
    const newBalance = currentBalance + amount;

    // Create credit transaction
    const transaction: CreditTransaction = {
      id: `CREDIT-${Date.now()}`,
      customerId: selectedCustomer.id,
      type: "payment",
      amount: amount,
      balance: newBalance,
      description: cashPaymentDescription,
      reference: cashPaymentReference || undefined,
      createdBy: user?.name || "System",
      createdAt: new Date(),
    };

    // Add transaction
    addCreditTransaction(transaction);

    // Update customer credit balance
    updateCustomer(selectedCustomer.id, {
      creditBalance: newBalance,
      creditTransactions: [...(selectedCustomer.creditTransactions || []), transaction],
    });

    // Update selected customer state
    setSelectedCustomer({
      ...selectedCustomer,
      creditBalance: newBalance,
      creditTransactions: [...(selectedCustomer.creditTransactions || []), transaction],
    });

    toast.success(`Cash payment of £${amount.toFixed(2)} recorded successfully`);
    setShowCashPaymentDialog(false);
  };

  const customerLedger = selectedCustomer ? getCustomerLedger(selectedCustomer.id) : [];
  const customerCreditTransactions = selectedCustomer ? getCreditTransactions(selectedCustomer.id) : [];

  const totalRevenue = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.total, 0);
  const totalPending = invoices
    .filter((inv) => inv.status === "pending")
    .reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Customer Ledger</h2>
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
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                £{totalRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                £{totalPending.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{invoices.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="wholesaler">Wholesalers</SelectItem>
              <SelectItem value="trader">Traders</SelectItem>
              <SelectItem value="retailer">Retailers</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead>Total Purchases</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Credit Balance</TableHead>
                <TableHead>Last Purchase</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customersWithStats.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {customer.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{customer.invoiceCount}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-green-600">
                    £{customer.totalPurchases.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-semibold text-orange-600">
                    £{customer.totalPending.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-semibold text-blue-600">
                    £{(customer.creditBalance || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {customer.lastPurchaseDate
                      ? format(customer.lastPurchaseDate, "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewCustomerLedger(customer)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Ledger Dialog */}
      <Dialog
        open={selectedCustomer !== null}
        onOpenChange={() => setSelectedCustomer(null)}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>
                  Customer Ledger - {selectedCustomer?.name}
                </DialogTitle>
                <DialogDescription>
                  Complete transaction history for this customer.
                </DialogDescription>
              </div>
              <Button onClick={openCashPaymentDialog} size="sm">
                <Wallet className="w-4 h-4 mr-2" />
                Record Cash Payment
              </Button>
            </div>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-600">
                      Customer Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline" className="capitalize">
                      {selectedCustomer.type}
                    </Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-600">
                      Total Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{customerLedger.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-600">
                      Total Paid
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      £
                      {customerLedger
                        .filter((inv) => inv.status === "paid")
                        .reduce((sum, inv) => sum + inv.total, 0)
                        .toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-600">
                      Total Pending
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      £
                      {customerLedger
                        .filter((inv) => inv.status === "pending")
                        .reduce((sum, inv) => sum + inv.total, 0)
                        .toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-600">
                      Credit Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      £{(selectedCustomer.creditBalance || 0).toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* All Transactions - Invoices and Credit Transactions Combined */}
              <div>
                <h4 className="font-semibold mb-2">Complete Transaction History</h4>
                {(customerLedger.length > 0 || customerCreditTransactions.length > 0) ? (
                  <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status/Balance</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Invoices */}
                        {customerLedger.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50">
                                <FileText className="w-3 h-3 mr-1" />
                                Invoice
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {invoice.id}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(invoice.date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-sm">
                              {invoice.items.reduce((sum, item) => sum + item.quantity, 0)} items
                            </TableCell>
                            <TableCell className="font-semibold">
                              £{invoice.total.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  invoice.status === "paid"
                                    ? "default"
                                    : invoice.status === "pending"
                                    ? "secondary"
                                    : "destructive"
                                }
                                className="capitalize"
                              >
                                {invoice.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedInvoice(invoice)}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Credit Transactions */}
                        {customerCreditTransactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-50">
                                <Wallet className="w-3 h-3 mr-1" />
                                {transaction.type === "payment" ? "Cash Payment" : transaction.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {transaction.reference || "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(transaction.createdAt), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-sm">
                              {transaction.description}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              +£{transaction.amount.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">
                                Balance: £{transaction.balance.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-gray-500">
                                By {transaction.createdBy}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No transactions found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cash Payment Dialog */}
      <Dialog open={showCashPaymentDialog} onOpenChange={setShowCashPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Cash Payment</DialogTitle>
            <DialogDescription>
              Record a cash payment from {selectedCustomer?.name} for old purchases.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (£) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={cashPaymentAmount}
                onChange={(e) => setCashPaymentAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="E.g., Cash payment for old purchases"
                value={cashPaymentDescription}
                onChange={(e) => setCashPaymentDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="reference">Reference (Optional)</Label>
              <Input
                id="reference"
                type="text"
                placeholder="E.g., Receipt #123"
                value={cashPaymentReference}
                onChange={(e) => setCashPaymentReference(e.target.value)}
                className="mt-1"
              />
            </div>
            {selectedCustomer && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Current Credit Balance:</strong> £{(selectedCustomer.creditBalance || 0).toFixed(2)}
                </p>
                {cashPaymentAmount && !isNaN(parseFloat(cashPaymentAmount)) && (
                  <p className="text-sm text-gray-700 mt-1">
                    <strong>New Balance:</strong> £
                    {((selectedCustomer.creditBalance || 0) + parseFloat(cashPaymentAmount)).toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCashPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordCashPayment}>
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog
        open={selectedInvoice !== null}
        onOpenChange={() => setSelectedInvoice(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>Detailed invoice information.</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Invoice ID</p>
                    <p className="font-mono font-semibold">{selectedInvoice.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-semibold">
                      {format(new Date(selectedInvoice.date), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items.map((item, index) => {
                      const price =
                        selectedInvoice.customer.type === "wholesaler"
                          ? item.product.wholesalePrice
                          : selectedInvoice.customer.type === "trader"
                          ? item.product.traderPrice
                          : item.product.retailPrice;
                      return (
                        <TableRow key={index}>
                          <TableCell>{item.product.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>£{price.toFixed(2)}</TableCell>
                          <TableCell className="font-semibold">
                            £{(price * item.quantity).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">
                    £{selectedInvoice.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (8%)</span>
                  <span className="font-medium">£{selectedInvoice.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-blue-600">
                    £{selectedInvoice.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
