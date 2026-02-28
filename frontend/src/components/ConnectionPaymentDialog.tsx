import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/apiClient";
import {
  PAYMENT_METHODS,
  PaymentMethodValue,
  methodRequiresReference,
  referencePlaceholder,
} from "@/constants/paymentMethods";

interface ConnectionPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  connectionId: string;
  boxNumber: string;
  currentBalance: number;
  onSuccess?: () => void;
}

export const ConnectionPaymentDialog = ({
  open,
  onOpenChange,
  customerId,
  connectionId,
  boxNumber,
  currentBalance,
  onSuccess,
}: ConnectionPaymentDialogProps) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethodValue>("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        throw new Error("Invalid payment amount");
      }

      const trimmedReference = referenceNumber.trim();
      if (methodRequiresReference(method) && !trimmedReference) {
        throw new Error("Cheque payments need a cheque number");
      }

      await apiClient.post(`/connections/${connectionId}/payments`, {
        customer_id: customerId,
        amount: paymentAmount,
        payment_method: method,
        reference_number: trimmedReference || null,
        notes: notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-connections"] });
      queryClient.invalidateQueries({ queryKey: ["customer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["customer-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["customer-detail"] });
      toast.success("Payment recorded successfully");
      onOpenChange(false);
      setAmount("");
      setReferenceNumber("");
      setNotes("");
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record payment");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPaymentMutation.mutate();
  };

  const paymentAmount = parseFloat(amount) || 0;
  const remainingBalance = currentBalance - paymentAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Record Payment - Box {boxNumber}</DialogTitle>
        </DialogHeader>

        <Card className="p-4 bg-muted">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Current Balance:</span>
              <span className="text-lg font-bold text-destructive">
                LKR{currentBalance.toFixed(2)}
              </span>
            </div>
            {paymentAmount > 0 && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Payment Amount:</span>
                  <span className="text-lg font-semibold text-primary">
                    -LKR{paymentAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">New Balance:</span>
                  <span className={`text-lg font-bold ${remainingBalance > 0 ? 'text-destructive' : 'text-accent'}`}>
                    LKR{remainingBalance.toFixed(2)}
                  </span>
                </div>
                {remainingBalance < 0 && (
                  <Badge variant="secondary" className="w-full justify-center">
                    Credit Balance: LKR{Math.abs(remainingBalance).toFixed(2)}
                  </Badge>
                )}
              </>
            )}
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Payment Amount *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select value={method} onValueChange={(value: any) => setMethod(value)}>
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
            <Label>
              Reference Number {methodRequiresReference(method) ? <span className="text-destructive">*</span> : null}
            </Label>
            <Input
              placeholder={referencePlaceholder(method)}
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              required={methodRequiresReference(method)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={createPaymentMutation.isPending} className="flex-1">
              {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
