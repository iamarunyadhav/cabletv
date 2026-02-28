import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

interface ManualAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

const ManualAdjustmentDialog = ({ open, onOpenChange, customerId, customerName }: ManualAdjustmentDialogProps) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [reason, setReason] = useState("");
  const [connectionId, setConnectionId] = useState<string>("");

  const { data: connections } = useQuery({
    queryKey: ["customer-connections-for-adjustment", customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/customers/${customerId}/connections`);
      return response.data?.data ?? response.data ?? [];
    },
    enabled: open,
  });

  const createAdjustmentMutation = useMutation({
    mutationFn: async (adjustmentData: any) => {
      await apiClient.post(`/customers/${customerId}/adjustments`, {
        amount: adjustmentData.amount,
        type,
        reason: adjustmentData.reason,
        connection_id: adjustmentData.connectionId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-detail"] });
      queryClient.invalidateQueries({ queryKey: ["customer-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["customer-connections"] });
      toast.success("Adjustment recorded successfully!");
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record adjustment");
    },
  });

  const handleClose = () => {
    setAmount("");
    setType("credit");
    setReason("");
    setConnectionId("");
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const adjustmentAmount = parseFloat(amount);
    if (isNaN(adjustmentAmount) || adjustmentAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for the adjustment");
      return;
    }

    createAdjustmentMutation.mutate({
      amount: adjustmentAmount,
      reason,
      connectionId: connectionId || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manual Balance Adjustment - {customerName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Adjustment Type *</Label>
            <Select value={type} onValueChange={(value: "credit" | "debit") => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Credit (Reduce Balance)</SelectItem>
                <SelectItem value="debit">Debit (Increase Balance)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {type === "credit" 
                ? "Use credit to reduce customer's outstanding balance (e.g., goodwill discount, refund)" 
                : "Use debit to increase customer's outstanding balance (e.g., penalty, additional charge)"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {connections && connections.length > 1 && (
            <div className="space-y-2">
              <Label>Apply to Connection (Optional)</Label>
              <Select value={connectionId} onValueChange={setConnectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="All connections (proportional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All connections</SelectItem>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.box_number} (Balance: LKR{Number(conn.current_balance).toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the reason for this adjustment..."
              rows={3}
              required
            />
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Preview:</p>
            <p className="text-sm text-muted-foreground">
              This will {type === "credit" ? "reduce" : "increase"} the customer's balance by{" "}
              <span className={`font-bold ${type === "credit" ? "text-accent" : "text-destructive"}`}>
                LKR{amount || "0.00"}
              </span>
            </p>
            {connectionId && connections && (
              <p className="text-xs text-muted-foreground mt-1">
                Applied to: {connections.find(c => c.id === connectionId)?.box_number}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createAdjustmentMutation.isPending}>
              {createAdjustmentMutation.isPending ? "Processing..." : "Record Adjustment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ManualAdjustmentDialog;
