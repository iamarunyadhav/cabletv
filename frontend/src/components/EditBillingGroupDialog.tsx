import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditBillingGroupDialogProps {
  groupId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditBillingGroupDialog = ({ groupId, open, onOpenChange }: EditBillingGroupDialogProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    billing_start_day: 1,
    billing_end_day: 10,
    grace_days: 5,
    friendly_reminder_days: 2,
    disconnect_notice_days: 7,
    maximum_debit_balance: 5000,
    description: "",
    area_id: "",
  });

  const { data: areas } = useQuery({
    queryKey: ["areas", "options"],
    queryFn: async () => {
      const response = await apiClient.get("/areas");
      return response.data?.data ?? response.data ?? [];
    },
  });

  useEffect(() => {
    if (groupId && open) {
      const fetchGroup = async () => {
        try {
          const response = await apiClient.get(`/billing-groups/${groupId}`);
          const data = response.data?.data ?? response.data;
          if (data) {
            setFormData({
              name: data.name || "",
              billing_start_day: data.billing_start_day || 1,
              billing_end_day: data.billing_end_day || 10,
              grace_days: data.grace_days || 5,
              friendly_reminder_days: data.friendly_reminder_days || 2,
              disconnect_notice_days: data.disconnect_notice_days || 7,
              maximum_debit_balance: Number(data.maximum_debit_balance) || 5000,
              description: data.description || "",
              area_id: data.area?.id || "",
            });
          }
        } catch (error: any) {
          toast.error(error.message || "Unable to load billing group");
        }
      };
      fetchGroup();
    }
  }, [groupId, open]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiClient.put(`/billing-groups/${groupId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-groups"] });
      toast.success("Billing group updated successfully!");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.area_id) {
      toast.error("Please select an area for this billing group.");
      return;
    }
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Billing Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Group Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Area *</Label>
            <Select value={formData.area_id} onValueChange={(value) => setFormData({ ...formData, area_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                {areas?.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Start Day *</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.billing_start_day}
                onChange={(e) => setFormData({ ...formData, billing_start_day: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Day *</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.billing_end_day}
                onChange={(e) => setFormData({ ...formData, billing_end_day: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Grace Days *</Label>
              <Input
                type="number"
                min="0"
                value={formData.grace_days}
                onChange={(e) => setFormData({ ...formData, grace_days: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Friendly Reminder (days) *</Label>
              <Input
                type="number"
                min="0"
                value={formData.friendly_reminder_days}
                onChange={(e) => setFormData({ ...formData, friendly_reminder_days: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Disconnect Notice (days) *</Label>
              <Input
                type="number"
                min="0"
                value={formData.disconnect_notice_days}
                onChange={(e) => setFormData({ ...formData, disconnect_notice_days: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Max Debit Balance *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.maximum_debit_balance}
                onChange={(e) => setFormData({ ...formData, maximum_debit_balance: parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
