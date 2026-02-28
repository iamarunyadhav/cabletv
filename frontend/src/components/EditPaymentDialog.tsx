import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  PAYMENT_METHODS,
  methodRequiresReference,
  referencePlaceholder,
} from "@/constants/paymentMethods";

const SELF_COLLECTOR_VALUE = "self";

interface EditPaymentDialogProps {
  payment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toLocalDateTimeInput = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd'T'HH:mm");
};

export function EditPaymentDialog({ payment, open, onOpenChange }: EditPaymentDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    amount: "",
    payment_method: "cash",
    payment_date: "",
    reference_number: "",
    notes: "",
    collector_id: SELF_COLLECTOR_VALUE,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["payment-agents"],
    queryFn: async () => {
      const response = await apiClient.get("/payment-agents");
      return response.data?.data ?? response.data ?? [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (payment) {
      setFormData({
        amount: payment.amount?.toString() || "0",
        payment_method: payment.payment_method || "cash",
        payment_date: payment.payment_date ? toLocalDateTimeInput(payment.payment_date) : "",
        reference_number: payment.reference_number || "",
        notes: payment.notes || "",
        collector_id: payment.payment_agent_id || SELF_COLLECTOR_VALUE,
      });
    }
  }, [payment]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const parsedDate = new Date(data.payment_date);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error("Please select a valid payment date and time.");
      }

      const trimmedReference = data.reference_number.trim();
      if (methodRequiresReference(data.payment_method) && !trimmedReference) {
        throw new Error("Cheque payments need a cheque number.");
      }

      await apiClient.put(`/payments/${payment.id}`, {
        amount: parseFloat(data.amount),
        payment_method: data.payment_method,
        payment_date: parsedDate.toISOString(),
        reference_number: trimmedReference || null,
        notes: data.notes || null,
        payment_agent_id: data.collector_id === SELF_COLLECTOR_VALUE ? null : data.collector_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Payment updated successfully");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update payment");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Payment - {payment?.receipt_number}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Amount (LKR)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Payment Date & Time</Label>
            <Input
              type="datetime-local"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Collector / Agent</Label>
            <Select
              value={formData.collector_id || SELF_COLLECTOR_VALUE}
              onValueChange={(value) => setFormData({ ...formData, collector_id: value })}
              disabled={!agents.length}
            >
              <SelectTrigger>
                <SelectValue placeholder={agents.length ? "Select collector" : "No agents available"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELF_COLLECTOR_VALUE}>Counter / Self</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name} {agent.code ? `(${agent.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reference Number</Label>
            <Input
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              placeholder={referencePlaceholder(formData.payment_method)}
              required={methodRequiresReference(formData.payment_method)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
