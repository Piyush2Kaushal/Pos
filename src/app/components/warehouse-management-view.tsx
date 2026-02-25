import { useState } from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  Warehouse,
  MapPin,
  Package,
  Boxes,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Building2,
  Truck,
  AlertCircle,
  CheckCircle2,
  ArrowRightLeft,
  FileText,
  BarChart3,
  Archive,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Textarea } from "@/app/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";

interface WarehouseLocation {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  capacity: number;
  currentStock: number;
  manager: string;
  phone: string;
  email: string;
  status: "active" | "inactive" | "maintenance";
  createdAt: Date;
}

interface StockTransfer {
  id: string;
  fromWarehouse: string;
  toWarehouse: string;
  productId: string;
  productName: string;
  quantity: number;
  status: "pending" | "in-transit" | "completed" | "cancelled";
  requestedBy: string;
  requestDate: Date;
  completedDate?: Date;
  notes: string;
}

export function WarehouseManagementView() {
  const { products } = usePOS();
  const [warehouses, setWarehouses] = useState<WarehouseLocation[]>([
    {
      id: "wh1",
      warehouseId: "WH-001",
      name: "Main Distribution Center",
      code: "MDC-UK",
      address: "123 Industrial Estate",
      city: "London",
      country: "United Kingdom",
      capacity: 10000,
      currentStock: 6500,
      manager: "John Smith",
      phone: "+44 20 1234 5678",
      email: "john.smith@company.com",
      status: "active",
      createdAt: new Date("2024-01-15"),
    },
    {
      id: "wh2",
      warehouseId: "WH-002",
      name: "North Regional Hub",
      code: "NRH-UK",
      address: "456 Commerce Park",
      city: "Manchester",
      country: "United Kingdom",
      capacity: 5000,
      currentStock: 3200,
      manager: "Sarah Johnson",
      phone: "+44 161 234 5678",
      email: "sarah.johnson@company.com",
      status: "active",
      createdAt: new Date("2024-02-01"),
    },
    {
      id: "wh3",
      warehouseId: "WH-003",
      name: "South Storage Facility",
      code: "SSF-UK",
      address: "789 Logistics Drive",
      city: "Birmingham",
      country: "United Kingdom",
      capacity: 7500,
      currentStock: 4800,
      manager: "Michael Brown",
      phone: "+44 121 234 5678",
      email: "michael.brown@company.com",
      status: "active",
      createdAt: new Date("2024-03-10"),
    },
  ]);

  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([
    {
      id: "st1",
      fromWarehouse: "Main Distribution Center",
      toWarehouse: "North Regional Hub",
      productId: "1",
      productName: "iPhone 13 Pro Max Case",
      quantity: 50,
      status: "in-transit",
      requestedBy: "Admin User",
      requestDate: new Date("2024-02-15"),
      notes: "Urgent restocking request",
    },
    {
      id: "st2",
      fromWarehouse: "Main Distribution Center",
      toWarehouse: "South Storage Facility",
      productId: "2",
      productName: "Samsung Galaxy S21 Screen Protector",
      quantity: 100,
      status: "completed",
      requestedBy: "Admin User",
      requestDate: new Date("2024-02-10"),
      completedDate: new Date("2024-02-14"),
      notes: "Regular stock transfer",
    },
  ]);

  const [isWarehouseDialogOpen, setIsWarehouseDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseLocation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [warehouseForm, setWarehouseForm] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    country: "United Kingdom",
    capacity: 1000,
    manager: "",
    phone: "",
    email: "",
    status: "active" as "active" | "inactive" | "maintenance",
  });

  const [transferForm, setTransferForm] = useState({
    fromWarehouse: "",
    toWarehouse: "",
    productId: "",
    quantity: 0,
    notes: "",
  });

  const handleAddWarehouse = () => {
    if (!warehouseForm.name || !warehouseForm.code || !warehouseForm.manager) {
      toast.error("Please fill in all required fields");
      return;
    }

    const newWarehouse: WarehouseLocation = {
      id: `wh${Date.now()}`,
      warehouseId: `WH-${String(warehouses.length + 1).padStart(3, "0")}`,
      name: warehouseForm.name,
      code: warehouseForm.code,
      address: warehouseForm.address,
      city: warehouseForm.city,
      country: warehouseForm.country,
      capacity: warehouseForm.capacity,
      currentStock: 0,
      manager: warehouseForm.manager,
      phone: warehouseForm.phone,
      email: warehouseForm.email,
      status: warehouseForm.status,
      createdAt: new Date(),
    };

    setWarehouses([...warehouses, newWarehouse]);
    setIsWarehouseDialogOpen(false);
    resetWarehouseForm();
    toast.success("Warehouse added successfully");
  };

  const handleUpdateWarehouse = () => {
    if (!selectedWarehouse) return;

    const updatedWarehouses = warehouses.map((wh) =>
      wh.id === selectedWarehouse.id
        ? { ...wh, ...warehouseForm }
        : wh
    );

    setWarehouses(updatedWarehouses);
    setIsWarehouseDialogOpen(false);
    setSelectedWarehouse(null);
    resetWarehouseForm();
    toast.success("Warehouse updated successfully");
  };

  const handleDeleteWarehouse = (id: string) => {
    setWarehouses(warehouses.filter((wh) => wh.id !== id));
    toast.success("Warehouse deleted successfully");
  };

  const handleCreateTransfer = () => {
    if (!transferForm.fromWarehouse || !transferForm.toWarehouse || !transferForm.productId || transferForm.quantity <= 0) {
      toast.error("Please fill in all transfer details");
      return;
    }

    if (transferForm.fromWarehouse === transferForm.toWarehouse) {
      toast.error("Source and destination warehouses must be different");
      return;
    }

    const product = products.find((p) => p.id === transferForm.productId);
    if (!product) {
      toast.error("Product not found");
      return;
    }

    const newTransfer: StockTransfer = {
      id: `st${Date.now()}`,
      fromWarehouse: transferForm.fromWarehouse,
      toWarehouse: transferForm.toWarehouse,
      productId: transferForm.productId,
      productName: product.name,
      quantity: transferForm.quantity,
      status: "pending",
      requestedBy: "Admin User",
      requestDate: new Date(),
      notes: transferForm.notes,
    };

    setStockTransfers([newTransfer, ...stockTransfers]);
    setIsTransferDialogOpen(false);
    resetTransferForm();
    toast.success("Stock transfer created successfully");
  };

  const handleUpdateTransferStatus = (id: string, status: StockTransfer["status"]) => {
    const updatedTransfers = stockTransfers.map((transfer) =>
      transfer.id === id
        ? {
            ...transfer,
            status,
            completedDate: status === "completed" ? new Date() : transfer.completedDate,
          }
        : transfer
    );
    setStockTransfers(updatedTransfers);
    toast.success(`Transfer status updated to ${status}`);
  };

  const resetWarehouseForm = () => {
    setWarehouseForm({
      name: "",
      code: "",
      address: "",
      city: "",
      country: "United Kingdom",
      capacity: 1000,
      manager: "",
      phone: "",
      email: "",
      status: "active",
    });
  };

  const resetTransferForm = () => {
    setTransferForm({
      fromWarehouse: "",
      toWarehouse: "",
      productId: "",
      quantity: 0,
      notes: "",
    });
  };

  const openEditDialog = (warehouse: WarehouseLocation) => {
    setSelectedWarehouse(warehouse);
    setWarehouseForm({
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address,
      city: warehouse.city,
      country: warehouse.country,
      capacity: warehouse.capacity,
      manager: warehouse.manager,
      phone: warehouse.phone,
      email: warehouse.email,
      status: warehouse.status,
    });
    setIsWarehouseDialogOpen(true);
  };

  const filteredWarehouses = warehouses.filter((warehouse) => {
    const matchesSearch =
      warehouse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      warehouse.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      warehouse.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || warehouse.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalCapacity = warehouses.reduce((sum, wh) => sum + wh.capacity, 0);
  const totalStock = warehouses.reduce((sum, wh) => sum + wh.currentStock, 0);
  const utilizationRate = totalCapacity > 0 ? (totalStock / totalCapacity) * 100 : 0;
  const activeWarehouses = warehouses.filter((wh) => wh.status === "active").length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Warehouse className="w-7 h-7 text-blue-600" />
              Warehouse Management
            </h2>
            <p className="text-sm text-gray-600 mt-1">Manage multiple warehouse locations and stock transfers</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsTransferDialogOpen(true)} variant="outline" className="gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              New Transfer
            </Button>
            <Button onClick={() => { setSelectedWarehouse(null); resetWarehouseForm(); setIsWarehouseDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Warehouse
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Total Warehouses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{warehouses.length}</div>
              <p className="text-xs text-gray-500 mt-1">{activeWarehouses} active locations</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Boxes className="w-4 h-4" />
                Total Capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{totalCapacity.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">Units across all locations</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Current Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{totalStock.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">Total inventory units</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Utilization Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{utilizationRate.toFixed(1)}%</div>
              <p className="text-xs text-gray-500 mt-1">Average capacity usage</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="warehouses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="warehouses">Warehouse Locations</TabsTrigger>
          <TabsTrigger value="transfers">Stock Transfers</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Distribution</TabsTrigger>
        </TabsList>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Warehouse Locations</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search warehouses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Capacity</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Utilization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWarehouses.map((warehouse) => {
                    const utilization = (warehouse.currentStock / warehouse.capacity) * 100;
                    return (
                      <TableRow key={warehouse.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{warehouse.name}</p>
                            <p className="text-xs text-gray-500">{warehouse.code}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm">{warehouse.city}</p>
                              <p className="text-xs text-gray-500">{warehouse.country}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{warehouse.manager}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{warehouse.phone}</p>
                            <p className="text-xs text-gray-500">{warehouse.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{warehouse.capacity.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{warehouse.currentStock.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  utilization > 80 ? "bg-red-500" : utilization > 60 ? "bg-orange-500" : "bg-green-500"
                                }`}
                                style={{ width: `${utilization}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{utilization.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={warehouse.status === "active" ? "default" : "secondary"}
                            className={
                              warehouse.status === "active"
                                ? "bg-green-500"
                                : warehouse.status === "maintenance"
                                ? "bg-orange-500"
                                : "bg-gray-500"
                            }
                          >
                            {warehouse.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(warehouse)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteWarehouse(warehouse.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Transfers Tab */}
        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Transfer History</CardTitle>
              <CardDescription>Track stock movements between warehouses</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">{transfer.id.toUpperCase()}</TableCell>
                      <TableCell>{transfer.productName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Warehouse className="w-4 h-4 text-gray-400" />
                          {transfer.fromWarehouse}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Warehouse className="w-4 h-4 text-gray-400" />
                          {transfer.toWarehouse}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{transfer.quantity}</TableCell>
                      <TableCell>{format(transfer.requestDate, "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            transfer.status === "completed"
                              ? "bg-green-500 text-white"
                              : transfer.status === "in-transit"
                              ? "bg-blue-500 text-white"
                              : transfer.status === "pending"
                              ? "bg-orange-500 text-white"
                              : "bg-gray-500 text-white"
                          }
                        >
                          {transfer.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transfer.status !== "completed" && transfer.status !== "cancelled" && (
                          <Select
                            value={transfer.status}
                            onValueChange={(value) => handleUpdateTransferStatus(transfer.id, value as StockTransfer["status"])}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in-transit">In Transit</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Distribution Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Distribution Across Warehouses</CardTitle>
              <CardDescription>View stock levels by location</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {warehouses.map((warehouse) => {
                  const utilization = (warehouse.currentStock / warehouse.capacity) * 100;
                  return (
                    <Card key={warehouse.id} className="border-2">
                      <CardHeader>
                        <CardTitle className="text-base">{warehouse.name}</CardTitle>
                        <CardDescription>{warehouse.city}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Capacity</span>
                              <span className="font-semibold">{warehouse.capacity.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Current Stock</span>
                              <span className="font-semibold">{warehouse.currentStock.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Available Space</span>
                              <span className="font-semibold">
                                {(warehouse.capacity - warehouse.currentStock).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                utilization > 80 ? "bg-red-500" : utilization > 60 ? "bg-orange-500" : "bg-green-500"
                              }`}
                              style={{ width: `${utilization}%` }}
                            />
                          </div>
                          <p className="text-center text-sm font-medium">{utilization.toFixed(1)}% Utilized</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Warehouse Dialog */}
      <Dialog open={isWarehouseDialogOpen} onOpenChange={setIsWarehouseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedWarehouse ? "Edit Warehouse" : "Add New Warehouse"}</DialogTitle>
            <DialogDescription>
              {selectedWarehouse ? "Update warehouse information" : "Create a new warehouse location"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Warehouse Name *</Label>
              <Input
                id="name"
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                placeholder="Main Distribution Center"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Warehouse Code *</Label>
              <Input
                id="code"
                value={warehouseForm.code}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                placeholder="MDC-UK"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={warehouseForm.address}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
                placeholder="123 Industrial Estate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={warehouseForm.city}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, city: e.target.value })}
                placeholder="London"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={warehouseForm.country}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, country: e.target.value })}
                placeholder="United Kingdom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity (units)</Label>
              <Input
                id="capacity"
                type="number"
                value={warehouseForm.capacity}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, capacity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={warehouseForm.status}
                onValueChange={(value) => setWarehouseForm({ ...warehouseForm, status: value as any })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager">Manager Name *</Label>
              <Input
                id="manager"
                value={warehouseForm.manager}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, manager: e.target.value })}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={warehouseForm.phone}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, phone: e.target.value })}
                placeholder="+44 20 1234 5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={warehouseForm.email}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, email: e.target.value })}
                placeholder="manager@company.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWarehouseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={selectedWarehouse ? handleUpdateWarehouse : handleAddWarehouse}>
              {selectedWarehouse ? "Update" : "Add"} Warehouse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Transfer Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Stock Transfer</DialogTitle>
            <DialogDescription>Transfer inventory between warehouse locations</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fromWarehouse">From Warehouse *</Label>
              <Select
                value={transferForm.fromWarehouse}
                onValueChange={(value) => setTransferForm({ ...transferForm, fromWarehouse: value })}
              >
                <SelectTrigger id="fromWarehouse">
                  <SelectValue placeholder="Select source warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.name}>
                      {wh.name} - {wh.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="toWarehouse">To Warehouse *</Label>
              <Select
                value={transferForm.toWarehouse}
                onValueChange={(value) => setTransferForm({ ...transferForm, toWarehouse: value })}
              >
                <SelectTrigger id="toWarehouse">
                  <SelectValue placeholder="Select destination warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.name}>
                      {wh.name} - {wh.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select
                value={transferForm.productId}
                onValueChange={(value) => setTransferForm({ ...transferForm, productId: value })}
              >
                <SelectTrigger id="product">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (Stock: {product.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                value={transferForm.quantity}
                onChange={(e) => setTransferForm({ ...transferForm, quantity: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={transferForm.notes}
                onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                placeholder="Transfer notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTransfer}>Create Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
