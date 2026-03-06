import { useState } from "react";
import { usePOS } from "@/app/context/pos-context";
import { Search, Plus, Edit, Trash2, Users, Shield, AlertTriangle } from "lucide-react";
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
import { Switch } from "@/app/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import { Staff, StaffRole } from "@/app/types";

const rolePermissions = {
  admin: {
    canManageProducts: true,
    canManagePurchases: true,
    canManageStaff: true,
    canViewReports: true,
    canProcessSales: true,
  },
  manager: {
    canManageProducts: true,
    canManagePurchases: true,
    canManageStaff: false,
    canViewReports: true,
    canProcessSales: true,
  },
  cashier: {
    canManageProducts: false,
    canManagePurchases: false,
    canManageStaff: false,
    canViewReports: false,
    canProcessSales: true,
  },
  inventory: {
    canManageProducts: true,
    canManagePurchases: true,
    canManageStaff: false,
    canViewReports: false,
    canProcessSales: false,
  },
};

export function StaffManagementView() {
  const { staff, addStaff, updateStaff, deleteStaff } = usePOS();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Delete confirmation dialog state (same pattern as CustomersView) ──
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    staffId: string;
    staffName: string;
  }>({
    open: false,
    staffId: "",
    staffName: "",
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "cashier" as StaffRole,
    salary: "",
    status: "active" as "active" | "inactive",
  });

  const [permissions, setPermissions] = useState({
    canManageProducts: false,
    canManagePurchases: false,
    canManageStaff: false,
    canViewReports: false,
    canProcessSales: true,
  });

  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "cashier",
      salary: "",
      status: "active",
    });
    setPermissions(rolePermissions.cashier);
    setIsAddDialogOpen(false);
    setEditingStaff(null);
  };

  const handleRoleChange = (role: StaffRole) => {
    setFormData({ ...formData, role });
    setPermissions(rolePermissions[role]);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.salary) {
      toast.error("Please fill in all required fields");
      return;
    }

    const staffData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      salary: parseFloat(formData.salary),
      joinDate: editingStaff ? editingStaff.joinDate : new Date(),
      status: formData.status,
      permissions,
    };

    if (editingStaff) {
      updateStaff(editingStaff.id, staffData);
      toast.success("Staff member updated successfully");
    } else {
      addStaff(staffData);
      toast.success("Staff member added successfully");
    }

    resetForm();
  };

  const handleEdit = (member: Staff) => {
    setEditingStaff(member);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      salary: member.salary.toString(),
      status: member.status,
    });
    setPermissions(member.permissions);
    setIsAddDialogOpen(true);
  };

  // ── Opens the confirmation dialog instead of browser confirm() ──
  const handleDelete = (member: Staff) => {
    setDeleteDialog({
      open: true,
      staffId: member.id,
      staffName: member.name,
    });
  };

  const activeStaff = staff.filter((s) => s.status === "active").length;
  const totalSalary = staff
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + s.salary, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{staff.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{activeStaff}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Salary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                £{totalSalary.toFixed(0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg Salary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                £{activeStaff > 0 ? (totalSalary / activeStaff).toFixed(0) : "0"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 z-10 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Staff Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="text-sm">{member.email}</TableCell>
                  <TableCell className="text-sm">{member.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    £{member.salary.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(member.joinDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={member.status === "active" ? "default" : "secondary"}
                      className={member.status === "active" ? "bg-green-600" : ""}
                    >
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(member)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      {/* ── Calls dialog, not confirm() ── */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(member)}
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

      {/* Add/Edit Staff Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={resetForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
            </DialogTitle>
            <DialogDescription>
              {editingStaff
                ? "Update staff member information and permissions."
                : "Enter staff member details and assign role."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="salary">Monthly Salary (£) *</Label>
                <Input
                  id="salary"
                  type="number"
                  step="100"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  placeholder="Enter monthly salary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="inventory">Inventory Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-gray-600" />
                <h4 className="font-semibold">Permissions</h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="canProcessSales" className="cursor-pointer">
                    Can Process Sales
                  </Label>
                  <Switch
                    id="canProcessSales"
                    checked={permissions.canProcessSales}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, canProcessSales: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="canManageProducts" className="cursor-pointer">
                    Can Manage Products
                  </Label>
                  <Switch
                    id="canManageProducts"
                    checked={permissions.canManageProducts}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, canManageProducts: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="canManagePurchases" className="cursor-pointer">
                    Can Manage Purchases
                  </Label>
                  <Switch
                    id="canManagePurchases"
                    checked={permissions.canManagePurchases}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, canManagePurchases: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="canViewReports" className="cursor-pointer">
                    Can View Reports
                  </Label>
                  <Switch
                    id="canViewReports"
                    checked={permissions.canViewReports}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, canViewReports: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="canManageStaff" className="cursor-pointer">
                    Can Manage Staff
                  </Label>
                  <Switch
                    id="canManageStaff"
                    checked={permissions.canManageStaff}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, canManageStaff: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingStaff ? "Update" : "Add"} Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ DELETE STAFF CONFIRMATION DIALOG ════ */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(o) =>
          !o && setDeleteDialog({ open: false, staffId: "", staffName: "" })
        }
      >
        <DialogContent className="w-[90vw] sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Staff Member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>"{deleteDialog.staffName}"</strong>? This will permanently
              remove the staff member and all associated data. This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col sm:flex-row pt-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() =>
                setDeleteDialog({ open: false, staffId: "", staffName: "" })
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => {
                deleteStaff(deleteDialog.staffId);
                toast.success("Staff member deleted successfully");
                setDeleteDialog({ open: false, staffId: "", staffName: "" });
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