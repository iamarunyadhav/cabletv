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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SuspendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionIds: string[];
  onSuccess?: () => void;
}

const SUSPENSION_REASONS = [
  { value: "non_payment", label: "Non-Payment" },
  { value: "customer_request", label: "Customer Request" },
  { value: "technical_issue", label: "Technical Issue" },
  { value: "maintenance", label: "Maintenance" },
  { value: "violation", label: "Terms Violation" },
  { value: "other", label: "Other" },
];

export function SuspendDialog({
  open,
  onOpenChange,
  connectionIds,
  onSuccess,
}: SuspendDialogProps) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [sendSms, setSendSms] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const suspendMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        connectionIds.map((id) =>
          apiClient.post(`/connections/${id}/suspend`, {
            reason,
            notes,
          })
        )
      );

      if (sendSms) {
        await apiClient.post("/sms/send", {
          connections: connectionIds,
          type: "suspension",
          message: `Your connection has been suspended due to ${reason.replace("_", " ")}.`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast({
        title: "Success",
        description: `${connectionIds.length} connection(s) suspended successfully`,
      });
      onOpenChange(false);
      onSuccess?.();
      setReason("");
      setNotes("");
      setSendSms(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend Connection(s)</DialogTitle>
          <DialogDescription>
            Suspending {connectionIds.length} connection(s). Please provide a reason.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {SUSPENSION_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Enter any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-semibold">Send SMS Notification</Label>
              <p className="text-xs text-muted-foreground">
                Automatically notify affected customers about this suspension.
              </p>
            </div>
            <Switch checked={sendSms} onCheckedChange={setSendSms} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={suspendMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => suspendMutation.mutate()}
            disabled={!reason || suspendMutation.isPending}
          >
            {suspendMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Suspend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
