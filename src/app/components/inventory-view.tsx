import { useState } from "react";
import { usePOS } from "@/app/context/pos-context";
import { Search, Package, AlertCircle } from "lucide-react";
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
import { toast } from "sonner";

export function InventoryView() {
  const { products, updateProductStock } = usePOS();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [newStock, setNewStock] = useState<string>("");

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = products.filter((p) => p.stock <= 10).length;
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  const handleUpdateStock = () => {
    if (editingProduct) {
      const stock = parseInt(newStock);
      if (isNaN(stock) || stock < 0) {
        toast.error("Invalid stock value");
        return;
      }
      updateProductStock(editingProduct, stock);
      setEditingProduct(null);
      setNewStock("");
      toast.success("Stock updated successfully");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Inventory Management</h2>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                Low Stock Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{lowStockCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Inventory Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                £{totalValue.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
  <Input
    type="text"
    placeholder="Search inventory..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="pl-11 bg-white"
  />
</div>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>£{product.price.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">{product.stock}</TableCell>
                  <TableCell>
                    {product.stock <= 10 ? (
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <AlertCircle className="w-3 h-3" />
                        Low Stock
                      </Badge>
                    ) : product.stock <= 30 ? (
                      <Badge variant="secondary">Medium</Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-600">In Stock</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">
                    £{(product.price * product.stock).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingProduct(product.id);
                        setNewStock(product.stock.toString());
                      }}
                    >
                      Update
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Stock Dialog */}
      <Dialog open={editingProduct !== null} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>Enter the new stock quantity for the product.</DialogDescription>
          </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="stock">New Stock Quantity</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                placeholder="Enter new stock quantity"
              />
            </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStock}>Update Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}