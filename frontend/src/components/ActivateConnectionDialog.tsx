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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ActivateConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  boxNumber: string;
  onSuccess?: () => void;
}

export function ActivateConnectionDialog({
  open,
  onOpenChange,
  connectionId,
  boxNumber,
  onSuccess,
}: ActivateConnectionDialogProps) {
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const activateMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/connections/${connectionId}/activate`, {
        notes: notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-connections"] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast.success("Connection activated successfully!");
      onOpenChange(false);
      onSuccess?.();
      setNotes("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activate Connection</DialogTitle>
          <DialogDescription>
            Activate Box {boxNumber}. Monthly charges will begin from the next billing cycle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Activation Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Enter any notes about activation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={activateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => activateMutation.mutate()}
            disabled={activateMutation.isPending}
          >
            {activateMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Activate Connection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
