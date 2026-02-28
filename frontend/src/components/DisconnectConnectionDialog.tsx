import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface DisconnectConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  boxNumber: string;
  currentBalance: number;
  onSuccess?: () => void;
}

const DISCONNECT_REASONS = [
  { value: "non_payment", label: "Non-Payment / Outstanding Balance" },
  { value: "customer_request", label: "Customer Request / Voluntary" },
  { value: "relocation", label: "Customer Relocation" },
  { value: "service_issues", label: "Service Quality Issues" },
  { value: "violation", label: "Terms & Conditions Violation" },
  { value: "other", label: "Other" },
];

export function DisconnectConnectionDialog({
  open,
  onOpenChange,
  connectionId,
  boxNumber,
  currentBalance,
  onSuccess,
}: DisconnectConnectionDialogProps) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [sendSms, setSendSms] = useState(true);
  const queryClient = useQueryClient();

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/connections/${connectionId}/disconnect`, {
        reason,
        notes,
        notify: sendSms,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-connections"] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast.success("Connection disconnected successfully!");
      onOpenChange(false);
      onSuccess?.();
      setReason("");
      setNotes("");
      setSendSms(true);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect Connection</DialogTitle>
          <DialogDescription>
            Disconnect box {boxNumber}. Outstanding balance: LKR{currentBalance.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Disconnect Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {DISCONNECT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Details</Label>
            <Textarea
              id="notes"
              placeholder="Enter any additional information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {currentBalance > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-semibold text-destructive">Outstanding Balance Warning</p>
              <p className="text-sm text-muted-foreground mt-1">
                This connection has an outstanding balance of LKR{currentBalance.toFixed(2)}. Please ensure collection
                before final disconnection.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-semibold">Send SMS Notification</Label>
              <p className="text-xs text-muted-foreground">Notify the customer about this disconnection.</p>
            </div>
            <Switch checked={sendSms} onCheckedChange={setSendSms} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={disconnectMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => disconnectMutation.mutate()}
            disabled={!reason || disconnectMutation.isPending}
          >
            {disconnectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Disconnect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
