import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface EditInvoiceDialogProps {
  invoice: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditInvoiceDialog({ invoice, open, onOpenChange }: EditInvoiceDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    billing_period_start: "",
    billing_period_end: "",
    due_date: "",
    total_amount: "",
    paid_amount: "",
  });

  useEffect(() => {
    if (invoice) {
      setFormData({
        billing_period_start: invoice.billing_period_start,
        billing_period_end: invoice.billing_period_end,
        due_date: invoice.due_date,
        total_amount: invoice.total_amount?.toString() || "0",
        paid_amount: invoice.paid_amount?.toString() || "0",
      });
    }
  }, [invoice]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const totalAmount = parseFloat(data.total_amount);
      const paidAmount = parseFloat(data.paid_amount);
      
      let status: "paid" | "unpaid" | "partially_paid" | "overdue" = "unpaid";
      if (paidAmount >= totalAmount) {
        status = "paid";
      } else if (paidAmount > 0) {
        status = "partially_paid";
      }

      await apiClient.put(`/invoices/${invoice.id}`, {
        billing_period_start: data.billing_period_start,
        billing_period_end: data.billing_period_end,
        due_date: data.due_date,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice updated successfully");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update invoice");
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
          <DialogTitle>Edit Invoice - {invoice?.invoice_number}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Billing Period Start</Label>
            <Input
              type="date"
              value={formData.billing_period_start}
              onChange={(e) => setFormData({ ...formData, billing_period_start: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Billing Period End</Label>
            <Input
              type="date"
              value={formData.billing_period_end}
              onChange={(e) => setFormData({ ...formData, billing_period_end: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Total Amount (LKR)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.total_amount}
              onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Paid Amount (LKR)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.paid_amount}
              onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
