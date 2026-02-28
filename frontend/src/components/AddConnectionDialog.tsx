import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Money } from "@/components/common/Money";
import { Badge } from "@/components/ui/badge";
import dayjs from "dayjs";
import { differenceInCalendarDays } from "date-fns";

interface AddConnectionDialogProps {
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddConnectionDialog = ({ customerId, open, onOpenChange }: AddConnectionDialogProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    box_number: "",
    package_id: "",
    special_amount: "",
    activation_date: dayjs().format("YYYY-MM-DD"),
    setup_box_price: "",
    setup_box_recurring: false,
    first_cycle_override: "",
    additional_channels: [] as string[],
    setup_items: [] as string[],
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

  const { data: setupItems } = useQuery({
    queryKey: ["setup-items"],
    queryFn: async () => {
      const response = await apiClient.get("/setup-items", { params: { active: true } });
      return response.data?.data ?? response.data ?? [];
    },
  });

  const { data: customer } = useQuery({
    queryKey: ["customer-meta", customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/customers/${customerId}`);
      return response.data?.data ?? response.data;
    },
    enabled: !!customerId,
  });

  const selectedPackage = packages?.find((pkg) => pkg.id === formData.package_id);
  const additionalChannelsTotal =
    additionalChannels
      ?.filter((channel) => formData.additional_channels.includes(channel.id))
      .reduce((sum, channel) => sum + Number(channel.monthly_amount || 0), 0) || 0;
  const basePackagePrice = Number(formData.special_amount || selectedPackage?.price || 0);
  const monthlyTotal = basePackagePrice + additionalChannelsTotal;

  const billingDay =
    customer?.billing_group?.billing_start_day ||
    (customer as any)?.billing_groups?.billing_start_day ||
    1;
  const activationDate = dayjs(formData.activation_date || dayjs().format("YYYY-MM-DD"));
  const nextBillingDate = (() => {
    const proposed = dayjs(activationDate).date(billingDay);
    if (proposed.isAfter(activationDate)) {
      return proposed;
    }
    return proposed.add(1, "month");
  })();
  const daysUntilCycle = Math.max(
    0,
    differenceInCalendarDays(nextBillingDate.toDate(), activationDate.toDate())
  );

  const recommendedFirstCharge = (() => {
    if (daysUntilCycle >= 25) return 0;
    if (daysUntilCycle <= 10) return 0;
    if (!selectedPackage) return 0;
    return Number(selectedPackage.price) / 2;
  })();

  useEffect(() => {
    if (!formData.first_cycle_override) {
      setFormData((prev) => ({
        ...prev,
        first_cycle_override: recommendedFirstCharge ? recommendedFirstCharge.toString() : "",
      }));
    }
  }, [recommendedFirstCharge]);

  useEffect(() => {
    if (formData.package_id || !packages?.length) {
      return;
    }
    const basicPackage = packages.find((pkg) => pkg.name === "Basic");
    if (basicPackage) {
      setFormData((prev) => ({ ...prev, package_id: basicPackage.id }));
    }
  }, [formData.package_id, packages]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        box_number: data.box_number,
        package_id: data.package_id,
        activation_date: data.activation_date,
        special_amount: data.special_amount ? Number(data.special_amount) : null,
        setup_box: data.setup_box_price
          ? {
              price: Number(data.setup_box_price),
              recurring: Boolean(data.setup_box_recurring),
            }
          : null,
        first_cycle_charge:
          daysUntilCycle >= 25
            ? 0
            : Number(data.first_cycle_override || recommendedFirstCharge || 0),
        additional_channel_ids: data.additional_channels,
        setup_item_ids: data.setup_items,
      };

      await apiClient.post(`/customers/${customerId}/connections`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-connections"] });
      toast.success("Connection added successfully!");
      onOpenChange(false);
      setFormData({
        box_number: "",
        package_id: "",
        special_amount: "",
        activation_date: dayjs().format("YYYY-MM-DD"),
        setup_box_price: "",
        setup_box_recurring: false,
        first_cycle_override: "",
        additional_channels: [],
        setup_items: [],
      });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Connection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Box Number *</Label>
              <Input
                value={formData.box_number}
                onChange={(e) => setFormData({ ...formData, box_number: e.target.value })}
                placeholder="e.g., BOX-001"
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
                      {pkg.name} - LKR{pkg.price}/mo
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
              <Label>Activation Date</Label>
              <Input
                type="date"
                value={formData.activation_date}
                onChange={(e) => setFormData({ ...formData, activation_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Setup Box Price</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.setup_box_price}
                onChange={(e) => setFormData({ ...formData, setup_box_price: e.target.value })}
                placeholder="0.00"
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="setup-box-recurring"
                  checked={formData.setup_box_recurring}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, setup_box_recurring: Boolean(checked) })
                  }
                />
                <Label htmlFor="setup-box-recurring" className="text-sm">
                  Collect monthly (installment)
                </Label>
              </div>
            </div>
          </div>

          {daysUntilCycle < 25 && (
            <div className="space-y-2">
              <Label>First Cycle Charge</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.first_cycle_override}
                onChange={(e) => setFormData({ ...formData, first_cycle_override: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Next billing date {nextBillingDate.format("MMM DD, YYYY")} ({daysUntilCycle} days). Recommended:
                <Money amount={recommendedFirstCharge} />.
              </p>
            </div>
          )}

          <Card className="bg-muted/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Charge Summary</p>
                  <p className="text-xs text-muted-foreground">
                    Setup and first-cycle charges staged for this connection
                  </p>
                </div>
                <Badge variant="secondary">{dayjs(formData.activation_date).format("MMM DD, YYYY")}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {formData.setup_items.length > 0 && (
                <div className="flex justify-between">
                  <span>Setup items</span>
                  <Money
                    amount={
                      setupItems
                        ?.filter((item) => formData.setup_items.includes(item.id))
                        .reduce((sum, item) => sum + Number(item.price), 0) || 0
                    }
                  />
                </div>
              )}
              {Number(formData.setup_box_price || 0) > 0 && (
                <div className="flex justify-between">
                  <span>Setup box ({formData.setup_box_recurring ? "installment" : "one-time"})</span>
                  <Money amount={Number(formData.setup_box_price)} />
                </div>
              )}
              {daysUntilCycle < 25 && (
                <div className="flex justify-between">
                  <span>Prorated package ({daysUntilCycle} days)</span>
                  <Money
                    amount={Number(formData.first_cycle_override || recommendedFirstCharge)}
                  />
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Opening balance</span>
                <Money
                  amount={
                    (setupItems
                      ?.filter((item) => formData.setup_items.includes(item.id))
                      .reduce((sum, item) => sum + Number(item.price), 0) || 0) +
                    Number(formData.setup_box_price || 0) +
                    (daysUntilCycle < 25
                      ? Number(formData.first_cycle_override || recommendedFirstCharge)
                      : 0)
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Additional Channels</Label>
            <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto border rounded-md p-3">
              {additionalChannels?.map((channel) => (
                <div key={channel.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`channel-${channel.id}`}
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
                  <label htmlFor={`channel-${channel.id}`} className="text-sm cursor-pointer">
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
            <Label>Setup Items</Label>
            <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto border rounded-md p-3">
              {setupItems?.map((item) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`setup-${item.id}`}
                    checked={formData.setup_items.includes(item.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({
                          ...formData,
                          setup_items: [...formData.setup_items, item.id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          setup_items: formData.setup_items.filter((id) => id !== item.id),
                        });
                      }
                    }}
                  />
                  <label htmlFor={`setup-${item.id}`} className="text-sm cursor-pointer">
                    {item.name} (LKR{item.price})
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Connection"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
