import { useState } from "react";
import { usePOS } from "@/app/context/pos-context";
import { Plus, Edit, Trash2, Tag, AlertTriangle } from "lucide-react";
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

export function CategoriesView() {
  const { products, addCategory, deleteCategory } = usePOS();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; category: string }>({
    open: false,
    category: "",
  });

  const categories = [...new Set(products.map((p) => p.category))];
  
  const categoryStats = categories.map((category) => {
    const categoryProducts = products.filter((p) => p.category === category);
    return {
      name: category,
      productCount: categoryProducts.length,
      totalStock: categoryProducts.reduce((sum, p) => sum + p.stock, 0),
      totalValue: categoryProducts.reduce((sum, p) => sum + p.retailPrice * p.stock, 0),
    };
  });

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      toast.error("Category name is required");
      return;
    }

    if (categories.includes(newCategory)) {
      toast.error("Category already exists");
      return;
    }

    addCategory(newCategory);
    toast.success("Category added successfully");
    setNewCategory("");
    setIsAddDialogOpen(false);
  };

  const handleDeleteCategory = (category: string) => {
    setDeleteDialog({ open: true, category });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Categories Management</h2>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{categories.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{products.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg Products/Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {categories.length > 0
                  ? (products.length / categories.length).toFixed(1)
                  : "0"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                ${products
                  .reduce((sum, p) => sum + p.retailPrice * p.stock, 0)
                  .toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Categories Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Total Stock</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryStats.map((category) => (
                <TableRow key={category.name}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-500" />
                      {category.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{category.productCount} items</Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{category.totalStock}</TableCell>
                  <TableCell className="font-semibold text-green-600">
                    £{category.totalValue.toFixed(2)}
                  </TableCell>
                  <TableCell>
                  <Button
  size="sm"
  variant="ghost"
  onClick={() => handleDeleteCategory(category.name)}
  className="text-red-500 hover:text-red-600 hover:bg-red-50"
  title="Delete category"
>
  <Trash2 className="w-3.5 h-3.5" />
</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Enter a name for the new product category.
            </DialogDescription>
          </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter category name"
              />
            </div>
       
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ════ DELETE CATEGORY DIALOG ════ */}
<Dialog open={deleteDialog.open} onOpenChange={(o) => !o && setDeleteDialog({ open: false, category: "" })}>
  <DialogContent className="w-[90vw] sm:max-w-[400px]">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="w-5 h-5" />
        Delete Category
      </DialogTitle>
      <DialogDescription>
        Are you sure you want to delete the <strong>"{deleteDialog.category}"</strong> category? This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="gap-2 flex-col sm:flex-row pt-2">
      <Button
        variant="outline"
        className="w-full sm:w-auto"
        onClick={() => setDeleteDialog({ open: false, category: "" })}
      >
        Cancel
      </Button>
      <Button
        variant="destructive"
        className="w-full sm:w-auto"
        onClick={() => {
          const hasProducts = products.some((p) => p.category === deleteDialog.category);
          if (hasProducts) {
            toast.error("Cannot delete category with existing products");
            setDeleteDialog({ open: false, category: "" });
            return;
          }
          deleteCategory(deleteDialog.category);
          toast.success("Category deleted successfully");
          setDeleteDialog({ open: false, category: "" });
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