import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface EditPackageDialogProps {
  packageId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditPackageDialog = ({ packageId, open, onOpenChange }: EditPackageDialogProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    discount_type: "none",
    discount_value: "0",
    description: "",
    active: true,
  });

  useEffect(() => {
    if (packageId && open) {
      const fetchPackage = async () => {
        try {
          const response = await apiClient.get(`/packages/${packageId}`);
          const data = response.data?.data ?? response.data;
          if (data) {
            setFormData({
              name: data.name || "",
              price: data.price?.toString() || "",
              discount_type: data.discount_type || "none",
              discount_value: data.discount_value?.toString() || "0",
              description: data.description || "",
              active: data.active ?? true,
            });
          }
        } catch (error: any) {
          toast.error(error.message || "Unable to load package");
        }
      };
      fetchPackage();
    }
  }, [packageId, open]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiClient.put(`/packages/${packageId}`, {
        name: data.name,
        price: parseFloat(data.price),
        discount_type: data.discount_type,
        discount_value: parseFloat(data.discount_value),
        description: data.description,
        active: data.active,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Package updated successfully!");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Package</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Package Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Package"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
