import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface SendSMSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SendSMSDialog = ({ open, onOpenChange }: SendSMSDialogProps) => {
  const [formData, setFormData] = useState({
    filter_type: "all",
    filter_value: "",
    message: "",
  });

  const { data: areas } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const response = await apiClient.get("/areas");
      return response.data?.data ?? response.data ?? [];
    },
  });

  const { data: billingGroups } = useQuery({
    queryKey: ["billing-groups"],
    queryFn: async () => {
      const response = await apiClient.get("/billing-groups");
      return response.data?.data ?? response.data ?? [];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload: any = {
        message: data.message,
        type: "custom",
      };

      if (data.filter_type === "area") {
        payload.area_id = data.filter_value;
      } else if (data.filter_type === "group") {
        payload.billing_group_id = data.filter_value;
      }

      const response = await apiClient.post("/sms/send", payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "SMS sent successfully!");
      onOpenChange(false);
      setFormData({
        filter_type: "all",
        filter_value: "",
        message: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Custom SMS</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Send To</Label>
            <Select
              value={formData.filter_type}
              onValueChange={(value) =>
                setFormData({ ...formData, filter_type: value, filter_value: "" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Active Customers</SelectItem>
                <SelectItem value="area">By Area</SelectItem>
                <SelectItem value="group">By Billing Group</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.filter_type === "area" && (
            <div className="space-y-2">
              <Label>Select Area</Label>
              <Select
                value={formData.filter_value}
                onValueChange={(value) => setFormData({ ...formData, filter_value: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose area" />
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
          )}

          {formData.filter_type === "group" && (
            <div className="space-y-2">
              <Label>Select Billing Group</Label>
              <Select
                value={formData.filter_value}
                onValueChange={(value) => setFormData({ ...formData, filter_value: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose group" />
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
          )}

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter your message. Use {{name}}, {{balance}}, {{box_number}} as placeholders."
              rows={6}
              required
            />
            <p className="text-sm text-muted-foreground">
              Available placeholders: {"{{name}}"}, {"{{balance}}"}, {"{{box_number}}"}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sendMutation.isPending}>
              {sendMutation.isPending ? "Sending..." : "Send SMS"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
