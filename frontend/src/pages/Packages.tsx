import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { EditPackageDialog } from "@/components/EditPackageDialog";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";
import type { AxiosError } from "axios";

interface PackageRecord {
  id: string;
  name: string;
  price: number;
  discount_type: "none" | "percentage" | "fixed";
  discount_value?: number;
  description?: string;
  active: boolean;
  customer_count?: number;
}

const parseErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
  if (axiosError?.response?.data?.message) return axiosError.response.data.message;
  const errors = axiosError?.response?.data?.errors;
  if (errors) {
    const firstKey = Object.keys(errors)[0];
    if (firstKey && errors[firstKey]?.length) {
      return errors[firstKey][0];
    }
  }
  return axiosError?.message || "Something went wrong";
};

const Packages = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editPackageId, setEditPackageId] = useState<string | null>(null);
  const [deletePackageId, setDeletePackageId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    discount_type: "none",
    discount_value: "0",
    description: "",
  });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = DEFAULT_PAGE_SIZE;

  const { data: packages, isLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const response = await apiClient.get("/packages");
      const payload = response.data?.data ?? response.data ?? [];
      return payload as PackageRecord[];
    },
  });

  const totalPackages = packages?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalPackages / PAGE_SIZE) || 1);

  useEffect(() => {
    setPage(1);
  }, [totalPackages]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const startIndex = (page - 1) * PAGE_SIZE;
  const visiblePackages = packages?.slice(startIndex, startIndex + PAGE_SIZE) ?? [];
  const showingFrom = totalPackages === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(totalPackages, startIndex + visiblePackages.length);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiClient.post("/packages", {
        ...data,
        price: parseFloat(data.price),
        discount_value: parseFloat(data.discount_value),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Package created successfully!");
      setOpen(false);
      setFormData({
        name: "",
        price: "",
        discount_type: "none",
        discount_value: "0",
        description: "",
      });
    },
    onError: (error: any) => {
      toast.error(parseErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/packages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Package deleted successfully!");
      setDeletePackageId(null);
    },
    onError: (error: any) => {
      toast.error(parseErrorMessage(error));
      setDeletePackageId(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Packages</h2>
          <p className="text-muted-foreground mt-2">Manage subscription plans and pricing</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Package
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Package</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Package Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Basic Plan"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Price (LKR) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                  >
                    <option value="none">No Discount</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (LKR)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={formData.discount_type === "percentage" ? "100" : undefined}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    disabled={formData.discount_type === "none"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Package features and details..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Package"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>All Packages</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Total (with discount)</TableHead>
                  <TableHead>Customers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiblePackages.map((pkg) => {
                  const price = Number(pkg.price);
                  let discountAmount = 0;
                  if (pkg.discount_type === 'percentage') {
                    discountAmount = (price * Number(pkg.discount_value)) / 100;
                  } else if (pkg.discount_type === 'fixed') {
                    discountAmount = Number(pkg.discount_value);
                  }
                  const totalWithDiscount = price - discountAmount;
                  
                  return (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell>Rs {price.toFixed(2)}</TableCell>
                      <TableCell>
                        {pkg.discount_type === 'none' ? 'No Discount' : 
                         pkg.discount_type === 'percentage' ? `${Number(pkg.discount_value).toFixed(2)}%` :
                         `Rs ${Number(pkg.discount_value).toFixed(2)}`}
                      </TableCell>
                      <TableCell className="font-medium">Rs {totalWithDiscount.toFixed(2)}</TableCell>
                      <TableCell>{pkg.customer_count || 0}</TableCell>
                      <TableCell>
                        <Badge variant={pkg.active ? "default" : "secondary"}>
                          {pkg.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditPackageId(pkg.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeletePackageId(pkg.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {totalPackages === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No packages found. Create one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {!isLoading && totalPackages > 0 && (
            <div className="flex flex-col gap-4 border-t pt-4 mt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {`${showingFrom} - ${showingTo}`} of {totalPackages} packages
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EditPackageDialog
        packageId={editPackageId}
        open={!!editPackageId}
        onOpenChange={(open) => !open && setEditPackageId(null)}
      />

      <AlertDialog open={!!deletePackageId} onOpenChange={(open) => !open && setDeletePackageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this package? This action cannot be undone.
              Packages with existing connections cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePackageId && deleteMutation.mutate(deletePackageId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Packages;
