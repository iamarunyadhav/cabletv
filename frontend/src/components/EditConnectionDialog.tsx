import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Money } from "@/components/common/Money";
import { toast } from "sonner";

interface EditConnectionDialogProps {
  connectionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditConnectionDialog = ({ connectionId, open, onOpenChange }: EditConnectionDialogProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    box_number: "",
    package_id: "",
    special_amount: "",
    status: "active",
    additional_channels: [] as string[],
  });

  const { data: packages } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const response = await apiClient.get("/packages", { params: { active: true } });
      return response.data?.data ?? response.data ?? [];
    },
  });

  const { data: additionalChannels } = useQuery({
    queryKey: ["additional-channels"],
    queryFn: async () => {
      const response = await apiClient.get("/additional-channels", { params: { active: true } });
      return response.data?.data ?? response.data ?? [];
    },
  });

  const selectedPackage = packages?.find((pkg) => pkg.id === formData.package_id);
  const additionalChannelsTotal =
    additionalChannels
      ?.filter((channel) => formData.additional_channels.includes(channel.id))
      .reduce((sum, channel) => sum + Number(channel.monthly_amount || 0), 0) || 0;
  const basePackagePrice = Number(formData.special_amount || selectedPackage?.price || 0);
  const monthlyTotal = basePackagePrice + additionalChannelsTotal;

  useEffect(() => {
    if (connectionId && open) {
      const fetchConnection = async () => {
        try {
          const response = await apiClient.get(`/connections/${connectionId}`);
          const data = response.data?.data ?? response.data;
          if (data) {
            setFormData({
              box_number: data.box_number || "",
              package_id: data.package_id || "",
              special_amount: data.special_amount?.toString() || "",
              status: data.status || "active",
              additional_channels: data.additional_channels?.map((channel: any) => channel.id) || [],
            });
          }
        } catch (error: any) {
          toast.error(error.message || "Unable to load connection");
        }
      };
      fetchConnection();
    }
  }, [connectionId, open]);

  useEffect(() => {
    if (formData.package_id || !packages?.length) {
      return;
    }
    const basicPackage = packages.find((pkg) => pkg.name === "Basic");
    if (basicPackage) {
      setFormData((prev) => ({ ...prev, package_id: basicPackage.id }));
    }
  }, [formData.package_id, packages]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiClient.put(`/connections/${connectionId}`, {
        box_number: data.box_number,
        package_id: data.package_id,
        special_amount: data.special_amount ? parseFloat(data.special_amount) : null,
        status: data.status,
        additional_channel_ids: data.additional_channels,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast.success("Connection updated successfully!");
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
          <DialogTitle>Edit Connection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Box Number *</Label>
            <Input
              value={formData.box_number}
              onChange={(e) => setFormData({ ...formData, box_number: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Package *</Label>
            <Select value={formData.package_id} onValueChange={(value) => setFormData({ ...formData, package_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select package" />
              </SelectTrigger>
              <SelectContent>
                {packages?.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} - LKR{pkg.price}/month
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Special Amount (Optional)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.special_amount}
              onChange={(e) => setFormData({ ...formData, special_amount: e.target.value })}
              placeholder="Override package price"
            />
          </div>
          <div className="space-y-2">
            <Label>Additional Channels</Label>
            <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto border rounded-md p-3">
              {additionalChannels?.map((channel) => (
                <div key={channel.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-channel-${channel.id}`}
                    checked={formData.additional_channels.includes(channel.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({
                          ...formData,
                          additional_channels: [...formData.additional_channels, channel.id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          additional_channels: formData.additional_channels.filter((id) => id !== channel.id),
                        });
                      }
                    }}
                  />
                  <label htmlFor={`edit-channel-${channel.id}`} className="text-sm cursor-pointer">
                    {channel.name} (LKR{channel.monthly_amount}/mo)
                  </label>
                </div>
              ))}
            </div>
          </div>
          <Card className="bg-muted/40">
            <CardHeader>
              <div>
                <p className="text-sm font-semibold">Monthly Pricing</p>
                <p className="text-xs text-muted-foreground">
                  Package price plus selected add-on channels
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Package</span>
                <Money amount={basePackagePrice} />
              </div>
              <div className="flex justify-between">
                <span>Add-on channels</span>
                <Money amount={additionalChannelsTotal} />
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Grand total</span>
                <Money amount={monthlyTotal} />
              </div>
            </CardContent>
          </Card>
          <div className="space-y-2">
            <Label>Status *</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="disconnect">Disconnect</SelectItem>
                <SelectItem value="postpone">Postpone</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Connection"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
