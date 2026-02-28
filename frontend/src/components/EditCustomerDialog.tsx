import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { AxiosError } from "axios";

interface EditCustomerDialogProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BillingGroupOption {
  id: string;
  name: string;
  area?: { name: string; code: string };
}

interface LookupResponse {
  billing_groups: BillingGroupOption[];
}

const getErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
  if (axiosError?.response?.data?.message) return axiosError.response.data.message;
  const errors = axiosError?.response?.data?.errors;
  if (errors) {
    const firstKey = Object.keys(errors)[0];
    if (firstKey && errors[firstKey]?.length) {
      return errors[firstKey][0];
    }
  }
  return axiosError?.message || "Unable to complete request";
};

export const EditCustomerDialog = ({ customerId, open, onOpenChange }: EditCustomerDialogProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    nic: "",
    address: "",
    billing_group_id: "",
    status: "active",
    agreement_number: "",
  });

  const { data: customer } = useQuery({
    queryKey: ["customer", customerId],
    enabled: !!customerId && open,
    queryFn: async () => {
      if (!customerId) return null;
      const response = await apiClient.get(`/customers/${customerId}`);
      return response.data?.data ?? response.data ?? null;
    },
  });

  const { data: lookups } = useQuery({
    queryKey: ["customer-form-lookups"],
    queryFn: async () => {
      const response = await apiClient.get("/lookups");
      const payload = response.data?.data ?? response.data ?? {};
      return payload as LookupResponse;
    },
  });

  const billingGroups = lookups?.billing_groups ?? [];

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        nic: customer.nic || "",
        address: customer.address || "",
        billing_group_id: customer.billing_group_id || "",
        status: customer.status || "active",
        agreement_number: customer.agreement_number || "",
      });
    }
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!customerId) return;
      await apiClient.put(`/customers/${customerId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      toast.success("Customer updated successfully!");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const selectedGroup = billingGroups.find((group) => group.id === formData.billing_group_id);
  const selectedAreaName = selectedGroup?.area?.name || "";
  const selectedAreaCode = selectedGroup?.area?.code || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>NIC Number</Label>
              <Input
                placeholder="National Identity Card Number"
                value={formData.nic}
                onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Agreement Number</Label>
              <Input
                placeholder="e.g., AGR-000123"
                value={formData.agreement_number}
                onChange={(e) => setFormData({ ...formData, agreement_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Billing Group *</Label>
              <Select
                value={formData.billing_group_id}
                onValueChange={(value) => setFormData({ ...formData, billing_group_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {billingGroups?.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Area</Label>
              <Input value={selectedAreaName} readOnly />
              {selectedAreaCode && (
                <p className="text-xs text-muted-foreground">Area code: {selectedAreaCode}</p>
              )}
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Address *</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
