import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Calendar } from "lucide-react";

interface GenerateInvoiceDialogProps {
  connectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GenerateInvoiceDialog = ({
  connectionId,
  open,
  onOpenChange,
}: GenerateInvoiceDialogProps) => {
  const queryClient = useQueryClient();
  const [billingPeriodStart, setBillingPeriodStart] = useState("");
  const [billingPeriodEnd, setBillingPeriodEnd] = useState("");

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/connections/${connectionId}/invoices`, {
        billing_period_start: billingPeriodStart,
        billing_period_end: billingPeriodEnd,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customer-invoices"] });
      toast.success(
        `Invoice ${data.invoice_number} generated successfully! Total: LKR${data.total_amount.toFixed(2)}`
      );
      onOpenChange(false);
      setBillingPeriodStart("");
      setBillingPeriodEnd("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to generate invoice");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!billingPeriodStart || !billingPeriodEnd) {
      toast.error("Please select both billing period dates");
      return;
    }

    if (new Date(billingPeriodStart) >= new Date(billingPeriodEnd)) {
      toast.error("End date must be after start date");
      return;
    }

    generateMutation.mutate();
  };

  // Set default dates (current month)
  const setCurrentMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setBillingPeriodStart(start.toISOString().split("T")[0]);
    setBillingPeriodEnd(end.toISOString().split("T")[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for this connection with automatic calculations for package
            charges, additional channels, and tax.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Billing Period Start</Label>
            <Input
              type="date"
              value={billingPeriodStart}
              onChange={(e) => setBillingPeriodStart(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Billing Period End</Label>
            <Input
              type="date"
              value={billingPeriodEnd}
              onChange={(e) => setBillingPeriodEnd(e.target.value)}
              required
            />
          </div>

          <Button type="button" variant="outline" onClick={setCurrentMonth} className="w-full">
            <Calendar className="w-4 h-4 mr-2" />
            Use Current Month
          </Button>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={generateMutation.isPending}>
              {generateMutation.isPending ? "Generating..." : "Generate Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
