import { useState } from "react";
import { usePOS } from "@/app/context/pos-context";
import { Search, PoundSterling, TrendingUp } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";
import { Product } from "@/app/types";

export function PriceManagementView() {
  const { products, updateProduct } = usePOS();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [bulkUpdateType, setBulkUpdateType] = useState<"percent" | "amount">("percent");
  const [bulkUpdateValue, setBulkUpdateValue] = useState("");
  const [priceType, setPriceType] = useState<"all" | "wholesale" | "trader" | "retail">(
    "all"
  );
  const [formData, setFormData] = useState({
    wholesalePrice: "",
    traderPrice: "",
    retailPrice: "",
  });

  const categories = ["All", ...new Set(products.map((p) => p.category))];

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "" ||
      selectedCategory === "All" ||
      product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEditPrice = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      wholesalePrice: product.wholesalePrice.toString(),
      traderPrice: product.traderPrice.toString(),
      retailPrice: product.retailPrice.toString(),
    });
  };

  const handleUpdatePrice = () => {
    if (!editingProduct) return;

    const wholesalePrice = parseFloat(formData.wholesalePrice);
    const traderPrice = parseFloat(formData.traderPrice);
    const retailPrice = parseFloat(formData.retailPrice);

    if (isNaN(wholesalePrice) || isNaN(traderPrice) || isNaN(retailPrice)) {
      toast.error("Please enter valid prices");
      return;
    }

    if (wholesalePrice > traderPrice || traderPrice > retailPrice) {
      toast.error("Wholesale ≤ Trader ≤ Retail price order must be maintained");
      return;
    }

    updateProduct(editingProduct.id, {
      wholesalePrice,
      traderPrice,
      retailPrice,
      price: retailPrice, // Legacy field
    });

    toast.success("Prices updated successfully");
    setEditingProduct(null);
  };

  const handleBulkUpdate = () => {
    const value = parseFloat(bulkUpdateValue);
    if (isNaN(value)) {
      toast.error("Please enter a valid value");
      return;
    }

    const productsToUpdate =
      selectedCategory === "" || selectedCategory === "All"
        ? products
        : products.filter((p) => p.category === selectedCategory);

    let updatedCount = 0;

    productsToUpdate.forEach((product) => {
      const calculateNewPrice = (currentPrice: number) => {
        if (bulkUpdateType === "percent") {
          return currentPrice * (1 + value / 100);
        } else {
          return currentPrice + value;
        }
      };

      const updates: Partial<Product> = {};

      if (priceType === "all" || priceType === "wholesale") {
        updates.wholesalePrice = calculateNewPrice(product.wholesalePrice);
      }
      if (priceType === "all" || priceType === "trader") {
        updates.traderPrice = calculateNewPrice(product.traderPrice);
      }
      if (priceType === "all" || priceType === "retail") {
        updates.retailPrice = calculateNewPrice(product.retailPrice);
        updates.price = updates.retailPrice; // Legacy field
      }

      updateProduct(product.id, updates);
      updatedCount++;
    });

    toast.success(`${updatedCount} products updated successfully`);
    setIsBulkUpdateOpen(false);
    setBulkUpdateValue("");
  };

  const avgMargin = products.length > 0
    ? products.reduce(
        (sum, p) => sum + ((p.retailPrice - p.wholesalePrice) / p.retailPrice) * 100,
        0
      ) / products.length
    : 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Price Management</h2>
          <Button onClick={() => setIsBulkUpdateOpen(true)}>
            <TrendingUp className="w-4 h-4 mr-2" />
            Bulk Price Update
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{products.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {avgMargin.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Lowest Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                £{Math.min(...products.map((p) => p.retailPrice)).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Highest Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                £{Math.max(...products.map((p) => p.retailPrice)).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48 bg-white">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent  className=" bg-white">
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Wholesale</TableHead>
                <TableHead>Trader</TableHead>
                <TableHead>Retail</TableHead>
                <TableHead>Margin</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const margin =
                  ((product.retailPrice - product.wholesalePrice) /
                    product.retailPrice) *
                  100;
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell>£{product.wholesalePrice.toFixed(2)}</TableCell>
                    <TableCell>£{product.traderPrice.toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">
                      £{product.retailPrice.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={margin >= 30 ? "default" : "secondary"}
                        className={margin >= 30 ? "bg-green-600" : ""}
                      >
                        {margin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditPrice(product)}
                      >
                        Edit Prices
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Price Dialog */}
      <Dialog open={editingProduct !== null} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Prices</DialogTitle>
            <DialogDescription>
              Update pricing tiers for {editingProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wholesalePrice">Wholesale Price</Label>
              <div className="relative">
              <PoundSterling className="absolute left-3 top-1/2 text-gray-500 -translate-y-1/2 w-4 h-4  z-10 pointer-events-none" />
                <Input
                  id="wholesalePrice"
                  type="number"
                  step="0.01"
                  value={formData.wholesalePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, wholesalePrice: e.target.value })
                  }
                  className="pl-10 bg-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="traderPrice">Trader Price</Label>
              <div className="relative">
              <PoundSterling className="absolute left-3 text-gray-500 top-1/2 -translate-y-1/2 w-4 h-4  z-10 pointer-events-none" />
                <Input
                  id="traderPrice"
                  type="number"
                  step="0.01"
                  value={formData.traderPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, traderPrice: e.target.value })
                  }
                  className="pl-10 bg-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="retailPrice">Retail Price</Label>
              <div className="relative">
              <PoundSterling className="absolute text-gray-500 left-3 top-1/2 -translate-y-1/2 w-4 h-4  z-10 pointer-events-none" />
                <Input
                  id="retailPrice"
                  type="number"
                  step="0.01"
                  value={formData.retailPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, retailPrice: e.target.value })
                  }
                  className="pl-10 bg-white"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePrice}>Update Prices</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Update Dialog */}
      <Dialog open={isBulkUpdateOpen} onOpenChange={setIsBulkUpdateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Price Update</DialogTitle>
            <DialogDescription>
              Apply price changes to multiple products at once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent  className=" bg-white">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price Type</Label>
              <Select
                value={priceType}
                onValueChange={(value: typeof priceType) => setPriceType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent  className=" bg-white">
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="wholesale">Wholesale Only</SelectItem>
                  <SelectItem value="trader">Trader Only</SelectItem>
                  <SelectItem value="retail">Retail Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Update Type</Label>
              <Select
                value={bulkUpdateType}
                onValueChange={(value: typeof bulkUpdateType) =>
                  setBulkUpdateType(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent  className=" bg-white">
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                  <SelectItem value="amount">Fixed Amount (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input
                type="number"
                step="0.01"
                value={bulkUpdateValue}
                onChange={(e) => setBulkUpdateValue(e.target.value)}
                placeholder={bulkUpdateType === "percent" ? "e.g., 10 for +10%" : "e.g., 5.00"}
              />
              <p className="text-xs text-gray-500 mt-1">
                {bulkUpdateType === "percent"
                  ? "Enter percentage to increase/decrease (use negative for decrease)"
                  : "Enter amount to add/subtract (use negative to subtract)"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkUpdateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate}>Apply Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}